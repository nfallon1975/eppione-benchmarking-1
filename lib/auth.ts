import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import { compare } from "bcryptjs";
import { checkRateLimit } from "./rate-limit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "ADMIN" | "CLIENT" | "BROKER";
      status: "PENDING" | "APPROVED" | "REJECTED";
      companyId?: string | null;
      companyRole?: "OWNER" | "CONTRIBUTOR" | "VIEWER" | null;
    };
  }

  interface User {
    role: "ADMIN" | "CLIENT" | "BROKER";
    status: "PENDING" | "APPROVED" | "REJECTED";
    companyId?: string | null;
    companyRole?: "OWNER" | "CONTRIBUTOR" | "VIEWER" | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "CLIENT" | "BROKER";
    status: "PENDING" | "APPROVED" | "REJECTED";
    companyId?: string | null;
    companyRole?: "OWNER" | "CONTRIBUTOR" | "VIEWER" | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — sensitive compensation data
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Rate limit login attempts by email (5 per 15 minutes)
        const rateLimited = checkRateLimit(
          `login:${credentials.email.toLowerCase()}`,
          15 * 60 * 1000,
          5
        );
        if (rateLimited) {
          throw new Error("Too many login attempts. Please try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          // Increment failed attempts
          const attempts = (user.failedLoginAttempts || 0) + 1;
          const lockout = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: lockout,
            },
          });
          if (lockout) {
            throw new Error("Account locked after too many failed attempts. Try again in 30 minutes.");
          }
          throw new Error("Invalid email or password");
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        if (user.status === "PENDING") {
          throw new Error("Your account is pending approval");
        }

        if (user.status === "REJECTED") {
          throw new Error("Your account has not been approved");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          companyId: user.companyId,
          companyRole: user.companyRole,
        };
      },
    }),
    ...(() => {
      const smtp =
        process.env.EMAIL_SERVER ||
        (process.env.RESEND_API_KEY
          ? `smtp://resend:${process.env.RESEND_API_KEY}@smtp.resend.com:465`
          : null);
      if (!smtp) return [];
      return [
        EmailProvider({
          server: smtp,
          from:
            process.env.EMAIL_FROM ||
            "Eppione Benchmarking <noreply@eppione.com>",
        }),
      ];
    })(),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
        token.companyId = user.companyId;
        token.companyRole = user.companyRole;
      }
      // Refresh companyId/companyRole from DB if not yet set (e.g. admin created company after login)
      if (!token.companyId && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { companyId: true, companyRole: true },
        });
        if (dbUser?.companyId) {
          token.companyId = dbUser.companyId;
          token.companyRole = dbUser.companyRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.companyId = token.companyId;
        session.user.companyRole = token.companyRole;
      }
      return session;
    },
  },
};

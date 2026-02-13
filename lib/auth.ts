import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import { compare } from "bcryptjs";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
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
    ...(process.env.EMAIL_SERVER
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM || "noreply@eppione.com",
          }),
        ]
      : []),
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

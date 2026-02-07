import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes require ADMIN role
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Pending users can only access a limited set of pages
    if (
      token?.status === "PENDING" &&
      !path.startsWith("/pending") &&
      !path.startsWith("/api")
    ) {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    // Rejected users are redirected to a rejection page
    if (
      token?.status === "REJECTED" &&
      !path.startsWith("/rejected") &&
      !path.startsWith("/api")
    ) {
      return NextResponse.redirect(new URL("/rejected", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/company/:path*",
    "/benefits/:path*",
    "/benchmarking/:path*",
    "/admin/:path*",
    "/pending",
    "/rejected",
  ],
};

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Monitor } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("email", {
      email: magicEmail,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setMagicLinkSent(true);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand (desktop only) */}
      <div className="hidden flex-col justify-center bg-eppione-navy px-12 lg:flex lg:w-1/2">
        <Link href="/" className="inline-flex items-center gap-3">
          <Monitor className="h-10 w-10 text-eppione-cyan" />
          <span className="text-3xl font-bold text-white">Eppione</span>
        </Link>
        <p className="mt-4 text-lg text-white/80">
          Benchmark your employee benefits against the market.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Data-driven insights across 11 countries and 20+ industries.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-4">
        {/* Mobile brand header */}
        <div className="mb-8 text-center lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <Monitor className="h-8 w-8 text-eppione-cyan" />
            <span className="text-2xl font-bold text-eppione-navy">Eppione</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">
            Benefits Benchmarking Platform
          </p>
        </div>

        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleCredentialLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400">
                  OR
                </span>
              </div>

              {magicLinkSent ? (
                <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
                  Check your email for a magic link to sign in.
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Sign in with Magic Link</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@company.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    Send Magic Link
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-eppione-cyan hover:underline"
                >
                  Register
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Monitor, BarChart3, Shield, Globe2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-slate-900">
              Eppione Benchmarking
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Benchmark Your Employee Benefits
            <br />
            <span className="text-indigo-600">Against the Market</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Understand how your benefits package compares to industry peers.
            Make data-driven decisions about health, pension, life insurance,
            and more across 11 countries.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base">
                Start Benchmarking
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-8 shadow-sm">
              <BarChart3 className="h-10 w-10 text-indigo-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Market Benchmarking
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Compare your benefits against anonymous aggregated data from
                companies in your country and industry. See where you lead and
                where there are gaps.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-8 shadow-sm">
              <Globe2 className="h-10 w-10 text-indigo-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Multi-Country Support
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Covering Ireland, UK, France, Spain, Portugal, USA, Germany,
                Netherlands, UAE, Singapore, and Australia with
                country-specific benefit categories.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-8 shadow-sm">
              <Shield className="h-10 w-10 text-indigo-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Confidential &amp; Secure
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Your data is never shared individually. All benchmarking
                results are fully anonymised and aggregated to protect
                company confidentiality.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-slate-50 py-8 text-center text-sm text-slate-500">
        Eppione Benchmarking &mdash; Employee Benefits Intelligence
      </footer>
    </div>
  );
}

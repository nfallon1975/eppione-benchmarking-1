"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Heart,
  ClipboardList,
  BarChart3,
  Monitor,
  Shield,
  Database,
  LogOut,
  Users,
  FileCheck,
  ShieldCheck,
  Settings,
  Upload,
  BookOpen,
  Search,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/notification-bell";

const clientNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company", label: "Company Profile", icon: Building2 },
  { href: "/benefits", label: "Benefits", icon: Heart },
  { href: "/survey", label: "Survey", icon: ClipboardList },
  { href: "/survey/upload", label: "Upload Benefits", icon: Upload },
  { href: "/benchmarking", label: "Benchmarking", icon: BarChart3 },
  { href: "/data-explorer", label: "Data Explorer", icon: Search },
  { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/admin/benchmarks", label: "Benchmark Data", icon: Database },
  { href: "/admin/reference-data", label: "Reference Data", icon: BookOpen },
  { href: "/admin/baseline", label: "Baseline Data", icon: Database },
  { href: "/admin/sources", label: "Source Library", icon: BookOpen },
  { href: "/admin/reviews", label: "Data Reviews", icon: RefreshCw },
  { href: "/admin/baseline/import-pdf", label: "PDF Import", icon: FileCheck },
  { href: "/data-explorer", label: "Data Explorer", icon: Search },
  { href: "/admin/upload", label: "Bulk Upload", icon: Upload },
  { href: "/admin/import", label: "Smart Import", icon: Sparkles },
];

const brokerNavItems = [
  { href: "/broker/dashboard", label: "Broker Overview", icon: LayoutDashboard },
  { href: "/broker/clients", label: "My Clients", icon: Users },
  { href: "/broker/import", label: "Smart Import", icon: Sparkles },
  { href: "/broker/upload", label: "Upload Clients", icon: Upload },
  { href: "/broker/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/broker/compliance", label: "Compliance Data", icon: FileCheck },
  { href: "/broker/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/data-explorer", label: "Data Explorer", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems =
    session?.user?.role === "ADMIN"
      ? [...clientNavItems, ...adminNavItems]
      : session?.user?.role === "BROKER"
        ? [...brokerNavItems, ...clientNavItems]
        : clientNavItems;

  return (
    <div className="flex h-full w-64 flex-col bg-eppione-navy">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Monitor className="h-6 w-6 text-eppione-cyan" />
          <span className="text-lg font-bold text-white">
            Eppione
          </span>
        </Link>
        <p className="mt-1 text-xs text-white/70">Benefits Benchmarking</p>
      </div>
      <Separator className="bg-white/10" />
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-eppione-cyan" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator className="bg-white/10" />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between px-3">
          <div>
            <p className="text-sm font-medium text-white">
              {session?.user?.name}
            </p>
            <p className="text-xs text-white/70">{session?.user?.email}</p>
          </div>
          <NotificationBell />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-white/70 hover:bg-white/5 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

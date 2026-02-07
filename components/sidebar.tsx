"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Heart,
  BarChart3,
  Monitor,
  Shield,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const clientNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company", label: "Company Profile", icon: Building2 },
  { href: "/benefits", label: "Benefits", icon: Heart },
  { href: "/benchmarking", label: "Benchmarking", icon: BarChart3 },
];

const adminNavItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems =
    session?.user?.role === "ADMIN"
      ? [...clientNavItems, ...adminNavItems]
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
      <nav className="flex-1 space-y-1 p-4">
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
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-white">
            {session?.user?.name}
          </p>
          <p className="text-xs text-white/70">{session?.user?.email}</p>
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

"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="mt-4">Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Your account is being reviewed by an Eppione administrator. You
            will receive an email once your account has been approved and you
            can access the platform.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

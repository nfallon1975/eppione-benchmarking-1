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
import { XCircle } from "lucide-react";

export default function RejectedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="mt-4">Account Not Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Unfortunately, your account registration was not approved. If you
            believe this is an error, please contact support at
            support@eppione.com.
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

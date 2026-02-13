"use client";

import { AdminUploadPanel } from "@/components/upload/admin-upload-panel";

export default function AdminUploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Upload</h1>
        <p className="mt-1 text-slate-500">
          Create broker and client accounts in bulk from CSV files
        </p>
      </div>
      <AdminUploadPanel />
    </div>
  );
}

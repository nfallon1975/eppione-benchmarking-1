"use client";

import { ClientUploadWizard } from "@/components/upload/client-upload-wizard";

export default function SurveyUploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload Benefits</h1>
        <p className="mt-1 text-slate-500">
          Import your company benefits from a CSV spreadsheet
        </p>
      </div>
      <ClientUploadWizard />
    </div>
  );
}

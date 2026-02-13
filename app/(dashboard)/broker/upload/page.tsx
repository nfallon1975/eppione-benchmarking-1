"use client";

import { BrokerUploadWizard } from "@/components/upload/broker-upload-wizard";

export default function BrokerUploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload Clients</h1>
        <p className="mt-1 text-slate-500">
          Import benefit data for multiple client companies from a CSV spreadsheet
        </p>
      </div>
      <BrokerUploadWizard />
    </div>
  );
}

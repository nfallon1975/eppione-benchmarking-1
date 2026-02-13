import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getClientBenefitTemplate,
  getBrokerClientTemplate,
  getAdminBrokerTemplate,
  getAdminClientTemplate,
} from "@/lib/upload-templates";

function toCSV(data: Record<string, string>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? "";
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

const TEMPLATES: Record<string, { fn: () => Record<string, string>[]; filename: string }> = {
  client_benefits: { fn: getClientBenefitTemplate, filename: "client_benefits_template.csv" },
  broker_clients: { fn: getBrokerClientTemplate, filename: "broker_clients_template.csv" },
  admin_brokers: { fn: getAdminBrokerTemplate, filename: "admin_brokers_template.csv" },
  admin_clients: { fn: getAdminClientTemplate, filename: "admin_clients_template.csv" },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");
  if (!type || !TEMPLATES[type]) {
    return NextResponse.json(
      { error: "Invalid template type. Use: client_benefits, broker_clients, admin_brokers, admin_clients" },
      { status: 400 }
    );
  }

  const { fn, filename } = TEMPLATES[type];
  const csv = toCSV(fn());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

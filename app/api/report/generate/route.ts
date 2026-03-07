import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeReportData } from "@/lib/pdf/report-token-store";
import type { ReportData } from "@/lib/pdf/report-types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportData: ReportData = await req.json();

    // Store the data and get a token
    const token = storeReportData(reportData);

    // Determine the base URL for the internal render page
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${proto}://${host}`;
    const renderUrl = `${baseUrl}/report/${token}`;

    // Launch Puppeteer
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    // Set viewport for 2x resolution rendering
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Navigate to the render page
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 30000 });

    // Wait for the report to signal it's ready
    await page.waitForFunction("window.__REPORT_READY__ === true", { timeout: 15000 });

    // Wait a bit more for charts to fully paint
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="eppione-benchmarking-report.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}

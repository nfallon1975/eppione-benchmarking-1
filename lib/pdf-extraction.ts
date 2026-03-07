import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "crypto";

const MAX_PAGES_PER_BATCH = 4;
const ESTIMATED_COST_PER_PAGE = 0.02;
const MAX_API_CALLS_PER_MINUTE = 20;

interface ExtractedPoint {
  country: string;
  industry?: string | null;
  benefit_category: string;
  metric_type: string;
  metric_label: string;
  value: number;
  unit: string;
  currency?: string | null;
  percentile_25?: number | null;
  percentile_75?: number | null;
  salary_band?: string | null;
  company_size?: string | null;
  page_number: number;
  raw_context: string;
  confidence: number;
}

interface AIExtractionResponse {
  source_context: string;
  data_points: ExtractedPoint[];
}

const SYSTEM_PROMPT = `You are a data extraction specialist for employee benefits benchmarking. You are analysing pages from a PDF report about employee benefits or pensions.

Extract ALL quantitative data points you can find. For each data point, identify:
- country (ISO code if determinable)
- industry/sector (if specific to a sector)
- benefit_category (map to: PENSION, HEALTH, LIFE, DISABILITY, DENTAL, VISION, EAP, WELLNESS, INCOME_PROTECTION, CRITICAL_ILLNESS, TRAVEL, MEAL_VOUCHERS, TRANSPORT, CHILDCARE, EDUCATION, OTHER)
- metric_type (map to: PREVALENCE, MEDIAN_CONTRIBUTION_RATE, AVERAGE_CONTRIBUTION_RATE, MEDIAN_COST_PER_EMPLOYEE, AVERAGE_COST_PER_EMPLOYEE, PLAN_TYPE_SPLIT_DC, PLAN_TYPE_SPLIT_DB, DEATH_BENEFIT_MULTIPLE, EMPLOYER_FUNDING_RATE, COVER_LEVEL_MEDIAN, PLATFORM_ADOPTION_RATE, SPOUSE_COVER_PREVALENCE, DEPENDENT_COVER_PREVALENCE, REPLACEMENT_RATIO, CUSTOM)
- metric_label (human readable description)
- value (numeric)
- unit (percent, currency, multiple, ratio, count)
- currency (if applicable)
- percentile_25 (if available)
- percentile_75 (if available)
- salary_band (if the data is specific to a salary range)
- company_size (if the data is specific to company size)
- page_number
- raw_context (the surrounding text/table from which this was extracted)
- confidence (0.0 to 1.0)

Be thorough — extract every number that represents a benchmark. Include sample sizes, sector breakdowns, salary band breakdowns, percentile ranges.

If a chart shows data points, extract each individual data point (e.g. a bar chart with 18 sectors means 18 separate data points).

If you cannot determine the country, default to the country provided in the metadata.

This page may contain charts and/or infographics. Read the visual data carefully. For bar charts, extract each bar's value. For pie/donut charts, extract each segment's percentage. For scatter plots, extract each labelled point's coordinates. For tables, extract every cell. Note: chart values may be approximate from visual reading — set confidence accordingly (typically 0.7-0.85 for chart-read values vs 0.9+ for text-read values).

Respond ONLY in valid JSON format:
{
  "source_context": "brief description of what this section covers",
  "data_points": [
    {
      "country": "BE",
      "industry": null,
      "benefit_category": "PENSION",
      "metric_type": "MEDIAN_CONTRIBUTION_RATE",
      "metric_label": "Median DC contribution rate",
      "value": 5.95,
      "unit": "percent",
      "currency": null,
      "percentile_25": null,
      "percentile_75": null,
      "salary_band": null,
      "company_size": null,
      "page_number": 21,
      "raw_context": "Chart showing median contribution rate at 5.95%",
      "confidence": 0.95
    }
  ]
}`;

const VALID_CATEGORIES = new Set([
  "PENSION", "HEALTH", "LIFE", "DISABILITY", "DENTAL", "VISION", "EAP",
  "WELLNESS", "INCOME_PROTECTION", "CRITICAL_ILLNESS", "TRAVEL",
  "MEAL_VOUCHERS", "TRANSPORT", "CHILDCARE", "EDUCATION", "OTHER",
]);

const VALID_METRICS = new Set([
  "PREVALENCE", "MEDIAN_CONTRIBUTION_RATE", "AVERAGE_CONTRIBUTION_RATE",
  "MEDIAN_COST_PER_EMPLOYEE", "AVERAGE_COST_PER_EMPLOYEE",
  "PLAN_TYPE_SPLIT_DC", "PLAN_TYPE_SPLIT_DB", "DEATH_BENEFIT_MULTIPLE",
  "EMPLOYER_FUNDING_RATE", "COVER_LEVEL_MEDIAN", "PLATFORM_ADOPTION_RATE",
  "SPOUSE_COVER_PREVALENCE", "DEPENDENT_COVER_PREVALENCE",
  "REPLACEMENT_RATIO", "CUSTOM",
]);

/**
 * Compute SHA-256 hash of a buffer.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Estimate extraction cost for a PDF.
 */
export function estimateExtractionCost(pageCount: number): {
  estimatedCost: number;
  estimatedMinutes: number;
  batches: number;
} {
  const batches = Math.ceil(pageCount / MAX_PAGES_PER_BATCH);
  return {
    estimatedCost: Math.round(pageCount * ESTIMATED_COST_PER_PAGE * 100) / 100,
    estimatedMinutes: Math.ceil(batches * 0.5),
    batches,
  };
}

/**
 * Extract text from PDF pages using pdf-parse.
 */
async function extractPdfText(
  buffer: Buffer
): Promise<{ text: string; pageCount: number; pages: string[] }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buffer);

  // pdf-parse doesn't give per-page text easily, so we split on form feeds
  const pages = data.text.split("\f").filter((p: string) => p.trim().length > 0);

  return {
    text: data.text,
    pageCount: data.numpages,
    pages: pages.length > 0 ? pages : [data.text],
  };
}

/**
 * Convert PDF pages to base64 images for vision-based extraction.
 * Falls back to text extraction if conversion fails.
 */
async function convertPagesToImages(
  buffer: Buffer,
  pageCount: number
): Promise<{ images: { page: number; base64: string }[]; method: "vision" | "text" }> {
  // Try using Puppeteer to render PDF pages as images
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const images: { page: number; base64: string }[] = [];
    const page = await browser.newPage();

    // Create a data URL from the PDF buffer
    const base64Pdf = buffer.toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    // Use pdf.js in the browser to render each page
    for (let i = 0; i < Math.min(pageCount, 50); i++) {
      try {
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
        await page.setContent(`
          <html>
          <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          </head>
          <body style="margin:0">
            <canvas id="canvas"></canvas>
            <script>
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              async function render() {
                const pdf = await pdfjsLib.getDocument('${dataUrl}').promise;
                const pg = await pdf.getPage(${i + 1});
                const viewport = pg.getViewport({ scale: 2 });
                const canvas = document.getElementById('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                window.__DONE__ = true;
              }
              render().catch(e => { window.__ERROR__ = e.message; window.__DONE__ = true; });
            </script>
          </body>
          </html>
        `, { waitUntil: "networkidle0" });

        await page.waitForFunction("window.__DONE__ === true", { timeout: 15000 });

        const screenshot = await page.screenshot({ type: "png", fullPage: true });
        images.push({
          page: i + 1,
          base64: Buffer.from(screenshot).toString("base64"),
        });
      } catch {
        // Skip pages that fail to render
      }
    }

    await browser.close();

    if (images.length > 0) {
      return { images, method: "vision" };
    }
  } catch {
    // Puppeteer not available or failed
  }

  return { images: [], method: "text" };
}

/**
 * Process a PDF ingestion — extract data points using AI.
 */
export async function processPdfIngestion(ingestionId: string): Promise<void> {
  const ingestion = await prisma.pDFIngestion.findUnique({
    where: { id: ingestionId },
  });

  if (!ingestion || !ingestion.filePath) {
    throw new Error("Ingestion not found or no file path");
  }

  await prisma.pDFIngestion.update({
    where: { id: ingestionId },
    data: { status: "PROCESSING" },
  });

  try {
    const fs = await import("fs/promises");
    const buffer = await fs.readFile(ingestion.filePath);
    const { pages, pageCount } = await extractPdfText(buffer);

    await prisma.pDFIngestion.update({
      where: { id: ingestionId },
      data: { pageCount },
    });

    // Try vision extraction for better chart reading
    const { images, method } = await convertPagesToImages(buffer, pageCount);

    const client = new Anthropic();
    const allExtractions: AIExtractionResponse[] = [];
    let totalCost = 0;
    let apiCallCount = 0;

    const defaultCountry = ingestion.sourceCountry || "XX";

    if (method === "vision" && images.length > 0) {
      // Vision-based extraction (batches of pages as images)
      for (let i = 0; i < images.length; i += MAX_PAGES_PER_BATCH) {
        if (apiCallCount >= MAX_API_CALLS_PER_MINUTE) {
          await new Promise((r) => setTimeout(r, 60000));
          apiCallCount = 0;
        }

        const batch = images.slice(i, i + MAX_PAGES_PER_BATCH);
        const pageNumbers = batch.map((b) => b.page).join(", ");

        const content: Anthropic.MessageParam["content"] = [
          {
            type: "text" as const,
            text: `Extract data from pages ${pageNumbers} of "${ingestion.sourceName || ingestion.filename}". Default country: ${defaultCountry}. Publisher: ${ingestion.sourcePublisher || "unknown"}. Year: ${ingestion.sourceYear || "unknown"}.`,
          },
          ...batch.map((b) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: "image/png" as const,
              data: b.base64,
            },
          })),
        ];

        try {
          const message = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content }],
          });

          apiCallCount++;
          totalCost += batch.length * ESTIMATED_COST_PER_PAGE;

          const textContent = message.content.find((c) => c.type === "text");
          if (textContent && textContent.type === "text") {
            let json = textContent.text;
            const match = json.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) json = match[1];
            const parsed: AIExtractionResponse = JSON.parse(json.trim());
            allExtractions.push(parsed);
          }
        } catch (err) {
          console.error(`Vision extraction failed for pages ${pageNumbers}:`, err);
        }
      }
    } else {
      // Text-based extraction
      for (let i = 0; i < pages.length; i += MAX_PAGES_PER_BATCH) {
        if (apiCallCount >= MAX_API_CALLS_PER_MINUTE) {
          await new Promise((r) => setTimeout(r, 60000));
          apiCallCount = 0;
        }

        const batch = pages.slice(i, i + MAX_PAGES_PER_BATCH);
        const startPage = i + 1;
        const endPage = Math.min(i + MAX_PAGES_PER_BATCH, pages.length);

        const userPrompt = `Extract data from pages ${startPage}-${endPage} of "${ingestion.sourceName || ingestion.filename}". Default country: ${defaultCountry}. Publisher: ${ingestion.sourcePublisher || "unknown"}. Year: ${ingestion.sourceYear || "unknown"}.

Page content:
${batch.map((p, j) => `--- PAGE ${startPage + j} ---\n${p.slice(0, 4000)}`).join("\n\n")}`;

        try {
          const message = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          apiCallCount++;
          totalCost += batch.length * ESTIMATED_COST_PER_PAGE;

          const textContent = message.content.find((c) => c.type === "text");
          if (textContent && textContent.type === "text") {
            let json = textContent.text;
            const match = json.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) json = match[1];
            const parsed: AIExtractionResponse = JSON.parse(json.trim());
            allExtractions.push(parsed);
          }
        } catch (err) {
          console.error(`Text extraction failed for pages ${startPage}-${endPage}:`, err);
        }
      }
    }

    // Store extracted data points
    const dataPointsToCreate: {
      ingestionId: string;
      pageNumber: number;
      rawText: string;
      country: string;
      industry: string | null;
      benefitCategory: string;
      metricType: string;
      metricLabel: string;
      value: number;
      unit: string;
      currency: string | null;
      percentile25: number | null;
      percentile75: number | null;
      salaryBand: string | null;
      companySize: string | null;
      aiConfidence: number;
    }[] = [];

    for (const extraction of allExtractions) {
      for (const dp of extraction.data_points) {
        // Validate and normalize
        const category = VALID_CATEGORIES.has(dp.benefit_category)
          ? dp.benefit_category
          : "OTHER";
        const metricType = VALID_METRICS.has(dp.metric_type)
          ? dp.metric_type
          : "CUSTOM";

        if (typeof dp.value !== "number" || isNaN(dp.value)) continue;

        dataPointsToCreate.push({
          ingestionId,
          pageNumber: dp.page_number || 1,
          rawText: dp.raw_context || "",
          country: dp.country || defaultCountry,
          industry: dp.industry || null,
          benefitCategory: category,
          metricType: metricType,
          metricLabel: dp.metric_label || `${category} - ${metricType}`,
          value: dp.value,
          unit: dp.unit || "percent",
          currency: dp.currency || null,
          percentile25: dp.percentile_25 ?? null,
          percentile75: dp.percentile_75 ?? null,
          salaryBand: dp.salary_band || null,
          companySize: dp.company_size || null,
          aiConfidence: Math.max(0, Math.min(1, dp.confidence || 0.5)),
        });
      }
    }

    // Batch create
    if (dataPointsToCreate.length > 0) {
      await prisma.extractedDataPoint.createMany({
        data: dataPointsToCreate as never[],
      });
    }

    await prisma.pDFIngestion.update({
      where: { id: ingestionId },
      data: {
        status: "REVIEW_READY",
        aiExtractionLog: allExtractions as never,
        processingCost: Math.round(totalCost * 100) / 100,
      },
    });
  } catch (error) {
    console.error("PDF extraction failed:", error);
    await prisma.pDFIngestion.update({
      where: { id: ingestionId },
      data: {
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

/**
 * Import confirmed data points into the baseline system.
 */
export async function importConfirmedPoints(ingestionId: string): Promise<{
  imported: number;
  skipped: number;
  conflicts: number;
}> {
  const ingestion = await prisma.pDFIngestion.findUnique({
    where: { id: ingestionId },
    include: {
      extractedPoints: {
        where: { status: { in: ["CONFIRMED", "EDITED"] } },
      },
    },
  });

  if (!ingestion) throw new Error("Ingestion not found");
  if (ingestion.extractedPoints.length === 0) {
    return { imported: 0, skipped: 0, conflicts: 0 };
  }

  // Create BaselineDataSource
  const source = await prisma.baselineDataSource.create({
    data: {
      name: ingestion.sourceName || ingestion.filename,
      publisher: ingestion.sourcePublisher || "Extracted from PDF",
      country: ingestion.sourceCountry || ingestion.extractedPoints[0].country,
      year: ingestion.sourceYear || new Date().getFullYear(),
      sourceType: (ingestion.sourceType as never) || "OTHER",
      importedById: ingestion.uploadedById,
      licenseNotes: ingestion.licenseNotes || "Extracted from uploaded PDF",
      isActive: true,
    },
  });

  let imported = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const point of ingestion.extractedPoints) {
    const value = point.adminEditedValue ?? point.value;

    // Check for exact duplicates
    const existing = await prisma.baselineBenchmark.findFirst({
      where: {
        sourceId: source.id,
        country: point.country,
        benefitCategory: point.benefitCategory as never,
        metricType: point.metricType as never,
        industry: point.industry,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Check for conflicts from other sources
    const conflict = await prisma.baselineBenchmark.findFirst({
      where: {
        country: point.country,
        benefitCategory: point.benefitCategory as never,
        metricType: point.metricType as never,
        industry: point.industry,
        sourceId: { not: source.id },
      },
    });

    if (conflict) conflicts++;

    await prisma.baselineBenchmark.create({
      data: {
        sourceId: source.id,
        country: point.country,
        industry: point.industry,
        benefitCategory: point.benefitCategory as never,
        metricType: point.metricType as never,
        metricLabel: point.metricLabel,
        value,
        unit: point.unit,
        currency: point.currency,
        percentile25: point.percentile25,
        percentile75: point.percentile75,
        salaryBand: point.salaryBand,
        companySize: point.companySize,
      },
    });
    imported++;
  }

  // Update ingestion
  await prisma.pDFIngestion.update({
    where: { id: ingestionId },
    data: {
      status: "APPROVED",
      linkedBaselineSourceId: source.id,
    },
  });

  return { imported, skipped, conflicts };
}

"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  downloadFilename?: string;
}

export function ChartWrapper({ title, description, children, downloadFilename }: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${downloadFilename || title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // html2canvas not installed — silent fail
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {downloadFilename && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1 h-3 w-3" />
            PNG
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>{children}</div>
      </CardContent>
    </Card>
  );
}

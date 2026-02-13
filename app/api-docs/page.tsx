"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Eppione API Documentation</h1>
        <p className="mt-2 text-lg text-slate-600">
          Programmatic access to your company benefit data for HR platform integrations.
        </p>
      </div>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>All API requests require an API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Getting an API Key</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>Log in to Eppione and go to <strong>Settings &rarr; API Keys</strong></li>
              <li>Click <strong>Create API Key</strong></li>
              <li>Give it a name and select the required permissions (scopes)</li>
              <li>Copy the key immediately &mdash; it is shown only once</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Using the API Key</h3>
            <p className="text-sm text-slate-600">
              Include the key in the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">Authorization</code> header:
            </p>
            <pre className="rounded-md bg-slate-900 p-4 text-sm text-slate-100 overflow-x-auto">{`Authorization: Bearer epk_your_api_key_here`}</pre>
            <p className="text-sm text-slate-500">
              Alternatively, use the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">X-API-Key</code> header.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Available Scopes</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">benefits:read</Badge>
              <Badge variant="outline">benefits:write</Badge>
              <Badge variant="outline">company:read</Badge>
              <Badge variant="outline">company:write</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Benefits Endpoints</CardTitle>
          <CardDescription>Read and write benefit entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GET /api/v1/benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">GET</Badge>
              <code className="text-sm font-mono">/api/v1/benefits</code>
            </div>
            <p className="text-sm text-slate-600">
              Returns all benefit entries for the authenticated company.
            </p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">QUERY PARAMETERS</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><code className="rounded bg-slate-100 px-1 py-0.5 text-xs">country</code> &mdash; Filter by country code (e.g. IE, GB)</li>
                <li><code className="rounded bg-slate-100 px-1 py-0.5 text-xs">category</code> &mdash; Filter by benefit category (e.g. HEALTH, PENSION)</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">SCOPE</p>
              <Badge variant="outline">benefits:read</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">EXAMPLE (curl)</p>
              <pre className="rounded-md bg-slate-900 p-4 text-sm text-slate-100 overflow-x-auto">{`curl -H "Authorization: Bearer epk_xxx" \\
  "https://your-domain.com/api/v1/benefits?country=IE"`}</pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">EXAMPLE (JavaScript)</p>
              <pre className="rounded-md bg-slate-900 p-4 text-sm text-slate-100 overflow-x-auto">{`const res = await fetch("/api/v1/benefits?country=IE", {
  headers: { "Authorization": "Bearer epk_xxx" }
});
const { benefits, total } = await res.json();`}</pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">EXAMPLE (Python)</p>
              <pre className="rounded-md bg-slate-900 p-4 text-sm text-slate-100 overflow-x-auto">{`import requests

resp = requests.get(
    "https://your-domain.com/api/v1/benefits",
    headers={"Authorization": "Bearer epk_xxx"},
    params={"country": "IE"}
)
data = resp.json()`}</pre>
            </div>
          </div>

          <hr />

          {/* POST /api/v1/benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600">POST</Badge>
              <code className="text-sm font-mono">/api/v1/benefits</code>
            </div>
            <p className="text-sm text-slate-600">
              Create or replace benefit entries. By default, existing entries for the uploaded countries are replaced.
            </p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">BODY</p>
              <pre className="rounded-md bg-slate-900 p-4 text-sm text-slate-100 overflow-x-auto">{`{
  "benefits": [
    {
      "country": "IE",
      "benefitCategory": "HEALTH",
      "benefitName": "Group Health Insurance",
      "coverLevel": "Level 2",
      "isCore": true,
      "employerFunded": true,
      "annualCostPerEmployee": 2500,
      "costCurrency": "EUR",
      "provider": "VHI"
    }
  ],
  "replaceExisting": true
}`}</pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">SCOPE</p>
              <Badge variant="outline">benefits:write</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Company Endpoints</CardTitle>
          <CardDescription>Read and update company profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GET /api/v1/company */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">GET</Badge>
              <code className="text-sm font-mono">/api/v1/company</code>
            </div>
            <p className="text-sm text-slate-600">
              Returns the company profile including country profiles.
            </p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">SCOPE</p>
              <Badge variant="outline">company:read</Badge>
            </div>
          </div>

          <hr />

          {/* PUT /api/v1/company */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-600">PUT</Badge>
              <code className="text-sm font-mono">/api/v1/company</code>
            </div>
            <p className="text-sm text-slate-600">
              Update company profile fields.
            </p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">BODY (all fields optional)</p>
              <pre className="rounded-md bg-slate-900 p-4 text-sm text-slate-100 overflow-x-auto">{`{
  "name": "Updated Company Name",
  "country": "IE",
  "industry": "J62",
  "employeeCount": 300,
  "benefitBudget": 500000,
  "benefitBudgetCurrency": "EUR"
}`}</pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">SCOPE</p>
              <Badge variant="outline">company:write</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex gap-4">
              <Badge variant="destructive">401</Badge>
              <span className="text-slate-600">Invalid or expired API key</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive">403</Badge>
              <span className="text-slate-600">Insufficient scope / permission</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive">400</Badge>
              <span className="text-slate-600">Validation error (check <code>details</code> array in response)</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive">404</Badge>
              <span className="text-slate-600">Resource not found (e.g., no company linked to account)</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive">500</Badge>
              <span className="text-slate-600">Internal server error</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Patterns</CardTitle>
          <CardDescription>Recommended approaches for HR platform integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Push Model</h3>
            <p className="text-sm text-slate-600">
              Your HR system pushes benefit data to Eppione. Use <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST /api/v1/benefits</code>{" "}
              with <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">replaceExisting: true</code> for full sync, or{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">replaceExisting: false</code> to append new entries.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Pull Model</h3>
            <p className="text-sm text-slate-600">
              Eppione pulls benefit data from your system. Use <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">GET /api/v1/benefits</code>{" "}
              to read current data and compare against your records. Webhook support is planned for future releases.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Periodic Sync</h3>
            <p className="text-sm text-slate-600">
              Schedule a daily or weekly job that pushes the full benefits dataset with{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">replaceExisting: true</code>.
              This ensures Eppione always reflects the latest state of your benefits program.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500 pb-8">
        Need help? Contact <a href="mailto:support@eppione.com" className="text-eppione-cyan underline">support@eppione.com</a>
      </div>
    </div>
  );
}

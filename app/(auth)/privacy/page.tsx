import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/register"
          className="mb-8 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Register
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">Privacy Notice</h1>
        <p className="mb-8 text-sm text-slate-500">
          Eppione Limited &mdash; Benefits Benchmarking Tool
        </p>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
          <h2>1. Introduction</h2>
          <p>
            Eppione Limited (&ldquo;Eppione&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Notice explains how we
            collect, use, disclose, and safeguard your information when you use our Benefits Benchmarking
            Tool.
          </p>
          <p>
            Eppione Limited is the data controller for the personal data processed through the Tool. We are
            registered in Ireland and our registered office is at our principal place of business.
          </p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Personal Data</h3>
          <p>We collect personal data that you provide directly to us, including:</p>
          <ul>
            <li>Contact information: name, email address, phone number, job title</li>
            <li>Account credentials: username and password (encrypted)</li>
            <li>Communication data: records of correspondence with us</li>
          </ul>

          <h3>2.2 Organisation Data</h3>
          <p>
            We collect information about your organisation that you provide through the Tool:
          </p>
          <ul>
            <li>Company name, industry, size (employee count), locations</li>
            <li>Current employee benefits (types, providers, coverage levels)</li>
            <li>Benefits spend data (where provided)</li>
            <li>Priorities and pain points</li>
          </ul>

          <h3>2.3 Technical Data</h3>
          <p>
            We automatically collect certain technical information when you use the Tool, including IP
            address, browser type, device information, pages viewed, and actions taken within the Tool.
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information for the following purposes:</p>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Data Used</th>
                  <th>Legal Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Providing the benchmarking service</td>
                  <td>Personal data, organisation data</td>
                  <td>Contract performance</td>
                </tr>
                <tr>
                  <td>Generating your benchmark report</td>
                  <td>Organisation data</td>
                  <td>Contract performance</td>
                </tr>
                <tr>
                  <td>Creating industry benchmarks</td>
                  <td>Anonymised, aggregated organisation data</td>
                  <td>Legitimate interests</td>
                </tr>
                <tr>
                  <td>Improving our services</td>
                  <td>Technical data, usage patterns</td>
                  <td>Legitimate interests</td>
                </tr>
                <tr>
                  <td>Marketing communications</td>
                  <td>Contact information</td>
                  <td>Consent</td>
                </tr>
                <tr>
                  <td>Connecting you with partners/brokers</td>
                  <td>Contact information, organisation data</td>
                  <td>Consent</td>
                </tr>
                <tr>
                  <td>Compliance with legal obligations</td>
                  <td>All data as required</td>
                  <td>Legal obligation</td>
                </tr>
                <tr>
                  <td>Fraud prevention and security</td>
                  <td>Technical data, account data</td>
                  <td>Legitimate interests</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>4. How We Share Your Information</h2>

          <h3>4.1 Service Providers</h3>
          <p>
            We share data with third-party service providers who assist us in operating the Tool, including
            cloud hosting providers (AWS), email service providers, and analytics providers. These providers
            are contractually obligated to protect your data.
          </p>

          <h3>4.2 Broker Partners</h3>
          <p>
            If you accessed the Tool through a broker partner or consented to broker contact, we may share
            your contact information and benchmark summary with that broker to facilitate follow-up
            discussions about your benefits.
          </p>

          <h3>4.3 Aggregated Data</h3>
          <p>
            We use your organisation data (anonymised and aggregated with data from other organisations) to
            create industry benchmarks and market intelligence reports. This aggregated data cannot be used
            to identify your organisation.
          </p>

          <h3>4.4 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or governmental authority, or
            if we believe disclosure is necessary to protect our rights, your safety, or the safety of
            others.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as necessary to fulfil the purposes for which it was collected:
          </p>
          <ul>
            <li>Free tier data: 24 months from last activity, then anonymised</li>
            <li>Paid subscription data: Duration of subscription plus 24 months</li>
            <li>Anonymised benchmark data: Retained indefinitely for industry analysis</li>
            <li>Marketing consents: Until you withdraw consent or 36 months of inactivity</li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>
            Under GDPR and applicable data protection laws, you have the following rights:
          </p>
          <ul>
            <li>
              <strong>Right of access:</strong> Request a copy of the personal data we hold about you
            </li>
            <li>
              <strong>Right to rectification:</strong> Request correction of inaccurate data
            </li>
            <li>
              <strong>Right to erasure:</strong> Request deletion of your data (subject to legal obligations)
            </li>
            <li>
              <strong>Right to restrict processing:</strong> Request limitation of how we use your data
            </li>
            <li>
              <strong>Right to data portability:</strong> Receive your data in a structured, machine-readable
              format
            </li>
            <li>
              <strong>Right to object:</strong> Object to processing based on legitimate interests or for
              marketing
            </li>
            <li>
              <strong>Right to withdraw consent:</strong> Withdraw marketing consent at any time
            </li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{" "}
            <a href="mailto:privacy@eppione.com" className="text-eppione-cyan hover:underline">
              privacy@eppione.com
            </a>
            . We will respond within 30 days.
          </p>

          <h2>7. International Data Transfers</h2>
          <p>
            Your data is primarily stored and processed within the European Economic Area (EEA). Where we
            transfer data outside the EEA (e.g., to service providers in the US), we ensure appropriate
            safeguards are in place, such as Standard Contractual Clauses approved by the European
            Commission.
          </p>

          <h2>8. Data Security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your data, including
            encryption in transit and at rest, access controls, regular security assessments, and staff
            training. Eppione is ISO 27001:2022 certified.
          </p>

          <h2>9. Cookies and Tracking</h2>
          <p>
            The Tool uses cookies and similar technologies to enhance your experience and analyse usage. You
            can manage cookie preferences through your browser settings.
          </p>

          <h2>10. Contact Us and Complaints</h2>
          <p>
            For questions about this Privacy Notice or to exercise your rights, contact:
          </p>
          <p>
            Data Protection Officer
            <br />
            Eppione Limited
            <br />
            Email:{" "}
            <a href="mailto:privacy@eppione.com" className="text-eppione-cyan hover:underline">
              privacy@eppione.com
            </a>
          </p>
          <p>
            You also have the right to lodge a complaint with the Data Protection Commission (Ireland) at{" "}
            <a
              href="https://www.dataprotection.ie"
              target="_blank"
              rel="noopener noreferrer"
              className="text-eppione-cyan hover:underline"
            >
              www.dataprotection.ie
            </a>{" "}
            or your local supervisory authority.
          </p>
        </div>
      </div>
    </div>
  );
}

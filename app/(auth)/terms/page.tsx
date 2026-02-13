import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Terms and Conditions of Use
        </h1>
        <p className="mb-8 text-sm text-slate-500">
          Eppione Limited &mdash; Benefits Benchmarking Tool
        </p>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
          <h2>1. Introduction and Acceptance</h2>
          <p>
            1.1 These Terms and Conditions (&ldquo;Terms&rdquo;) govern your use of the Eppione Benefits
            Benchmarking Tool (&ldquo;Tool&rdquo;), operated by Eppione Limited, a company registered in
            Ireland (&ldquo;Eppione&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
          </p>
          <p>
            1.2 By accessing or using the Tool, you agree to be bound by these Terms. If you do not agree
            to these Terms, you must not use the Tool.
          </p>
          <p>
            1.3 If you are using the Tool on behalf of a company or other legal entity
            (&ldquo;Organisation&rdquo;), you represent and warrant that you have the authority to bind that
            Organisation to these Terms, and &ldquo;you&rdquo; and &ldquo;your&rdquo; will refer to that
            Organisation.
          </p>
          <p>
            1.4 We may update these Terms from time to time. We will notify you of any material changes by
            posting the new Terms on our website. Your continued use of the Tool after such changes
            constitutes acceptance of the updated Terms.
          </p>

          <h2>2. Description of the Tool</h2>
          <p>2.1 The Tool is a benefits benchmarking service that allows you to:</p>
          <ul>
            <li>Enter information about your organisation&rsquo;s current employee benefits;</li>
            <li>Receive a competitiveness score comparing your benefits to industry benchmarks;</li>
            <li>Identify gaps in your benefits offering; and</li>
            <li>Receive recommendations for improvements.</li>
          </ul>
          <p>
            2.2 The Tool is available in both a free version (&ldquo;Free Tier&rdquo;) and paid subscription
            versions (&ldquo;Professional&rdquo; and &ldquo;Enterprise&rdquo;). The features available to
            you will depend on your subscription level.
          </p>

          <h2>3. Account Registration</h2>
          <p>
            3.1 To use the Tool, you must provide accurate and complete information including your name,
            email address, company name, and other details as requested.
          </p>
          <p>
            3.2 You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account.
          </p>
          <p>
            3.3 You must notify us immediately of any unauthorised use of your account or any other breach
            of security.
          </p>

          <h2>4. Data and Privacy</h2>
          <p>
            4.1 Your use of the Tool is subject to our{" "}
            <Link href="/privacy" className="text-eppione-cyan hover:underline">
              Privacy Notice
            </Link>
            , which describes how we collect, use, and protect your personal data and organisation data.
          </p>
          <p>4.2 By using the Tool, you consent to:</p>
          <ul>
            <li>
              The collection and processing of information you provide about your organisation&rsquo;s
              benefits;
            </li>
            <li>
              The use of your data (in anonymised and aggregated form) to compile industry benchmarks;
            </li>
            <li>
              The sharing of your contact details with Eppione for marketing purposes (subject to your
              consent preferences).
            </li>
          </ul>
          <p>
            4.3 You warrant that you have the authority to provide the data you enter into the Tool and that
            such data does not contain personal data of identifiable individuals without appropriate consent.
          </p>

          <h2>5. Subscription and Payment (Paid Tiers)</h2>
          <p>
            5.1 If you subscribe to a paid tier (Professional or Enterprise), you agree to pay the
            applicable fees as displayed at the time of subscription.
          </p>
          <p>
            5.2 Subscriptions are billed annually in advance. All fees are non-refundable except as required
            by law.
          </p>
          <p>
            5.3 We may change our fees upon reasonable notice. If you do not agree to the new fees, you may
            cancel your subscription before the next billing period.
          </p>
          <p>
            5.4 All prices are exclusive of VAT or other applicable taxes, which will be added where
            required.
          </p>

          <h2>6. Acceptable Use and Restrictions</h2>
          <p>
            6.1 You agree to use the Tool only for lawful purposes and in accordance with these Terms.
          </p>
          <p>6.2 You must not:</p>
          <ul>
            <li>
              Use the Tool to provide benchmarking services to third parties without our prior written
              consent;
            </li>
            <li>Attempt to reverse engineer, decompile, or disassemble any part of the Tool;</li>
            <li>
              Use automated systems or software to extract data from the Tool (scraping);
            </li>
            <li>Provide false or misleading information;</li>
            <li>
              Use the Tool in any way that could damage, disable, or impair the Tool or interfere with any
              other party&rsquo;s use.
            </li>
          </ul>

          <h2>7. Intellectual Property</h2>
          <p>
            7.1 The Tool, including all content, features, and functionality, is owned by Eppione and
            protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            7.2 You retain ownership of the data you input into the Tool. By using the Tool, you grant
            Eppione a non-exclusive, worldwide, royalty-free licence to use your data (in anonymised and
            aggregated form) to compile benchmarks and improve our services.
          </p>
          <p>
            7.3 Your benchmark report is provided for your internal business use only. You may not publish,
            distribute, or share the full report content without our prior written consent, except for brief
            quotations with attribution.
          </p>

          <h2>8. Disclaimers and Limitation of Liability</h2>
          <p>
            8.1 The Tool and benchmark reports are provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, either express or implied, including but not
            limited to implied warranties of merchantability, fitness for a particular purpose, and
            non-infringement.
          </p>
          <p>
            8.2 Benchmark data and recommendations are provided for informational purposes only and do not
            constitute financial, legal, or professional advice. You should consult appropriate professionals
            before making business decisions based on the Tool&rsquo;s output.
          </p>
          <p>
            8.3 To the maximum extent permitted by law, Eppione shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
            whether incurred directly or indirectly.
          </p>
          <p>
            8.4 Our total liability for any claims arising from or related to your use of the Tool shall not
            exceed the amount you paid to us (if any) in the twelve (12) months preceding the claim.
          </p>

          <h2>9. Termination</h2>
          <p>
            9.1 You may stop using the Tool at any time. For paid subscriptions, cancellation will take
            effect at the end of your current billing period.
          </p>
          <p>
            9.2 We may suspend or terminate your access to the Tool immediately if you breach these Terms or
            for any other reason at our discretion, with or without notice.
          </p>
          <p>
            9.3 Upon termination, your right to use the Tool will cease immediately. Provisions of these
            Terms that by their nature should survive termination shall survive.
          </p>

          <h2>10. Governing Law and Disputes</h2>
          <p>
            10.1 These Terms shall be governed by and construed in accordance with the laws of Ireland.
          </p>
          <p>
            10.2 Any disputes arising from or relating to these Terms or your use of the Tool shall be
            subject to the exclusive jurisdiction of the courts of Ireland.
          </p>

          <h2>11. General Provisions</h2>
          <p>
            11.1 These Terms constitute the entire agreement between you and Eppione regarding the Tool and
            supersede all prior agreements.
          </p>
          <p>
            11.2 If any provision of these Terms is found to be unenforceable, the remaining provisions
            shall continue in full force and effect.
          </p>
          <p>
            11.3 Our failure to enforce any right or provision of these Terms shall not constitute a waiver
            of such right or provision.
          </p>
          <p>
            11.4 You may not assign or transfer these Terms or your rights hereunder without our prior
            written consent. We may assign our rights and obligations under these Terms without restriction.
          </p>

          <h2>12. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <p>
            Eppione Limited
            <br />
            Email:{" "}
            <a href="mailto:legal@eppione.com" className="text-eppione-cyan hover:underline">
              legal@eppione.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

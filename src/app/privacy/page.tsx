import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effective="August 26, 2026"
      intro="This policy explains how MUBER collects, uses, discloses, and protects personal information when you use our moving and junk-removal marketplace, apply as a provider, or use our operational tools."
    >
      <LegalSection id="scope" title="1. Scope and operator">
        <p>
          This policy applies to the MUBER website, customer accounts, provider
          applications and portals, dispatcher workflows, and support
          interactions. “MUBER,” “we,” and “us” refer to the operator of this
          marketplace. It does not govern an independent provider’s separate
          practices outside MUBER.
        </p>
      </LegalSection>
      <LegalSection id="collection" title="2. Information we collect">
        <p>Depending on how you use MUBER, we may collect:</p>
        <ul>
          <li>
            <strong>Account and contact information:</strong> name, email,
            telephone number, authentication records, and account role.
          </li>
          <li>
            <strong>Job information:</strong> service addresses, requested
            dates, access notes, item descriptions, photographs, quotes, offers,
            assignments, and communications.
          </li>
          <li>
            <strong>Provider information:</strong> business identity and
            contacts, service territory, capabilities, vehicles, crews, pending
            invitations, licenses, permits, insurance, credential numbers, and
            private credential documents.
          </li>
          <li>
            <strong>Operational information:</strong> dispatch classifications,
            risk flags, eligibility results, credential status, incidents, and
            audit records.
          </li>
          <li>
            <strong>Device and usage information:</strong> IP address,
            browser/device attributes, pages, timestamps, security events, and
            essential session cookies.
          </li>
        </ul>
        <p>
          Do not upload unnecessary sensitive information. Job photos may reveal
          people, possessions, vehicle plates, or home interiors. Provider
          documents should contain only information reasonably required for
          verification.
        </p>
      </LegalSection>
      <LegalSection id="sources" title="3. Sources">
        <p>
          We receive information from customers, provider applicants, provider
          owners and managers, crew users, and authorized MUBER personnel.
          Devices and hosting/security systems provide technical information
          automatically. Providers may submit crew information only when
          authorized.
        </p>
      </LegalSection>
      <LegalSection id="uses" title="4. How we use information">
        <ul>
          <li>Create and secure accounts and provide password recovery.</li>
          <li>
            Review service requests, photos, access conditions, and schedules.
          </li>
          <li>
            Prepare quotes, record acceptance, assess provider eligibility, send
            offers, and manage assignments.
          </li>
          <li>
            Review provider applications, credentials, vehicles, crews,
            territories, and compliance.
          </li>
          <li>
            Prevent fraud, enforce role boundaries, investigate incidents,
            maintain audit trails, provide support, and comply with law.
          </li>
        </ul>
        <p>
          MUBER does not currently use uploaded images for automated or
          AI-generated pricing. Photos support human scope and quote review.
        </p>
      </LegalSection>
      <LegalSection id="disclosures" title="5. How we disclose information">
        <ul>
          <li>
            <strong>Independent providers and crews:</strong> before offer
            acceptance, providers receive limited scope, approximate areas,
            scheduling, equipment needs, and compensation. Exact addresses and
            necessary customer contacts are available only after valid
            assignment.
          </li>
          <li>
            <strong>Infrastructure vendors:</strong> vendors supporting hosting,
            database, authentication, private storage, security, and delivery
            process information for MUBER. Core infrastructure currently
            includes Supabase and Vercel.
          </li>
          <li>
            <strong>Advisers and authorities:</strong> lawyers, insurers,
            auditors, regulators, courts, or law enforcement when reasonably
            necessary or legally required.
          </li>
          <li>
            <strong>Business transactions:</strong> participants in financing,
            diligence, reorganization, merger, acquisition, or sale, subject to
            appropriate safeguards.
          </li>
        </ul>
        <p>
          We do not disclose one provider’s offers, internal performance data,
          or raw credential documents to competing providers or customers.
        </p>
      </LegalSection>
      <LegalSection
        id="tracking"
        title="6. Sale, sharing, advertising, and tracking"
      >
        <p>
          MUBER does not currently sell personal information, share it for
          cross-context behavioral advertising, or use third-party behavioral
          advertising trackers. Essential authentication and security cookies
          support signed-in features.
        </p>
        <p>
          Because those sale and advertising practices are not used, browser “Do
          Not Track” and opt-out preference signals do not change current
          practices. If practices change, we will update this policy and honor
          legally required preference signals.
        </p>
      </LegalSection>
      <LegalSection id="retention" title="7. Retention">
        <p>
          We retain information as reasonably necessary to provide services,
          preserve quote and job history, verify providers, resolve disputes,
          prevent fraud, enforce agreements, and meet legal, insurance, tax, and
          recordkeeping obligations. Duration depends on record type, account
          status, operational need, law, and pending disputes or investigations.
          We may retain deidentified information and immutable security records
          where permitted.
        </p>
      </LegalSection>
      <LegalSection id="security" title="8. Security">
        <p>
          We use role-based access, row-level database security, private
          storage, short-lived signed links, server-authorized commands, audit
          logging, and transport protections. No system is completely secure.
          Keep credentials confidential and contact Support if you suspect
          unauthorized use.
        </p>
      </LegalSection>
      <LegalSection id="rights" title="9. Your choices and privacy rights">
        <p>
          You may request access, correction, or deletion of certain account
          information through Support. Records may be retained for security,
          compliance, fraud prevention, disputes, or completing requested
          services.
        </p>
        <p>
          California residents may have additional rights to know, access,
          correct, delete, or obtain certain personal information and
          information about its collection and disclosure. If the CCPA applies
          to MUBER, covered residents may also have applicable opt-out,
          limitation, portability, and non-discrimination rights. MUBER does not
          currently sell or share personal information for cross-context
          behavioral advertising. Learn more from the{" "}
          <a href="https://cppa.ca.gov/faq" target="_blank" rel="noreferrer">
            California Privacy Protection Agency
          </a>
          .
        </p>
        <p>
          Submit requests through <Link href="/support">Support</Link> and
          describe the account and request. We will verify identity and
          authority as appropriate.
        </p>
      </LegalSection>
      <LegalSection id="children" title="10. Children">
        <p>
          MUBER is not directed to children under 18. Users must be legally able
          to enter requested transactions, and we do not knowingly collect
          personal information directly from children for marketplace accounts.
        </p>
      </LegalSection>
      <LegalSection id="changes" title="11. Changes">
        <p>
          We may update this policy as the marketplace, vendors, or law changes.
          We will post a new effective date and provide additional notice when
          legally required.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

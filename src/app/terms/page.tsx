import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      effective="August 26, 2026"
      intro="These Terms govern access to MUBER’s managed marketplace for moving and junk-removal requests, provider applications, quotes, offers, assignments, and operational tools."
    >
      <LegalSection id="agreement" title="1. Agreement and eligibility">
        <p>
          By creating an account, submitting a request or provider application,
          accepting a quote or offer, or using MUBER, you agree to these Terms
          and the <Link href="/privacy">Privacy Policy</Link>. You must be at
          least 18 and legally able to enter a binding agreement. If acting for
          a company, you represent that you can bind it.
        </p>
      </LegalSection>
      <LegalSection id="role" title="2. MUBER’s role">
        <p>
          MUBER operates a managed marketplace that helps customers describe
          work, supports quote and dispatch review, evaluates provider
          eligibility, and facilitates assignments. Unless expressly stated
          otherwise in writing, moving, hauling, labor, transportation, and
          disposal are performed by independent provider businesses—not MUBER
          employees.
        </p>
        <p>
          Approval, eligibility, an offer, or assignment does not guarantee
          availability, timing, quality, licensing in every jurisdiction, or
          completion. MUBER may review credentials and operations, but customers
          should raise job-specific concerns before work starts.
        </p>
      </LegalSection>
      <LegalSection id="requests" title="3. Requests, scope, and availability">
        <p>
          A request is not a confirmed booking. Customers must accurately
          disclose contacts, addresses, access, inventory, photos, dates,
          hazards, heavy items, stairs, parking restrictions, and other facts
          affecting safety, equipment, labor, disposal, or price. Service
          depends on review, provider acceptance, lawful scope, and
          availability.
        </p>
        <p>
          Material omissions or changed conditions may require a revised quote,
          rescheduling, cancellation, or refusal of unsafe or unlawful work.
        </p>
      </LegalSection>
      <LegalSection id="quotes" title="4. Quotes and acceptance">
        <p>
          Quotes identify customer-facing scope, line items, total, expiration,
          and version. Browser totals are not authoritative; MUBER calculates
          totals on the server. New versions may supersede earlier ones.
          Expired, declined, canceled, or superseded quotes cannot be accepted.
        </p>
        <p>
          Accepting a quote confirms that version but{" "}
          <strong>does not mean payment occurred</strong>. MUBER does not
          currently collect cards or process payments in the app. Payment terms
          require separate disclosure before payment functionality launches.
          Scope changes may require a revised quote or change order.
        </p>
      </LegalSection>
      <LegalSection id="photos" title="5. Photographs and estimates">
        <p>
          You represent that you may upload submitted photos and that they do
          not unlawfully violate privacy or intellectual-property rights. Do not
          upload unrelated sensitive material. MUBER does not currently use
          photos for automated or AI pricing; they support human review and
          cannot guarantee every condition is visible.
        </p>
      </LegalSection>
      <LegalSection id="restricted" title="6. Prohibited and restricted work">
        <p>
          Do not request transport, removal, concealment, or disposal of illegal
          or stolen goods, explosives, unlawfully handled firearms or
          ammunition, regulated hazardous materials, biohazards, medical waste,
          asbestos, unknown chemicals, or other items a provider cannot lawfully
          and safely handle. Disclose batteries, fuel, paint, cylinders,
          pesticides, sharp objects, infestation, waste, and other hazards
          before quoting.
        </p>
        <p>
          Providers may stop or refuse work that is unsafe, unlawful, materially
          different from scope, or beyond their license, permit, insurance,
          equipment, or disposal authority.
        </p>
      </LegalSection>
      <LegalSection id="customer" title="7. Customer responsibilities">
        <ul>
          <li>
            Provide lawful access, accurate instructions, safe conditions, and
            required parking or building authorization.
          </li>
          <li>
            Secure valuables, records, medicine, cash, jewelry, and
            irreplaceable items unless expressly included in writing.
          </li>
          <li>
            Remain available for questions and inspect work when reasonably
            requested.
          </li>
          <li>
            Do not harass, discriminate, threaten, or circumvent authorized
            users.
          </li>
        </ul>
      </LegalSection>
      <LegalSection id="provider" title="8. Provider and crew responsibilities">
        <p>
          Providers must submit truthful, current ownership, licensing, permit,
          insurance, credential, vehicle, crew, territory, and availability
          information. Application does not create provider access; approval is
          separate. Missing, expired, rejected, or suspended credentials may
          prevent eligibility.
        </p>
        <p>
          Providers remain responsible for personnel, vehicles, equipment,
          permits, insurance, taxes, wages, safety, compliance, and disposal.
          Only authorized owners or managers may accept company offers.
          Providers may not change offered compensation or access competitors’
          offers.
        </p>
      </LegalSection>
      <LegalSection id="accounts" title="9. Accounts and acceptable use">
        <p>
          Keep credentials confidential. You may not self-promote roles,
          impersonate others, bypass access controls, scrape private data,
          upload malware, interfere with service, or use another customer’s or
          provider’s identifiers. MUBER may restrict access to protect users,
          investigate abuse, comply with law, or enforce these Terms. Security
          and operational actions may be recorded.
        </p>
      </LegalSection>
      <LegalSection
        id="cancellation"
        title="10. Cancellation, reassignment, and incidents"
      >
        <p>
          Before payments launch, applicable cancellation or rescheduling terms
          will be shown in the quote or written communication. MUBER may
          reassign after decline, expiration, eligibility changes, credential
          lapse, schedule conflicts, or incidents. An incident hold is not a
          final finding of fault.
        </p>
      </LegalSection>
      <LegalSection id="content" title="11. Platform and content">
        <p>
          MUBER software, branding, interface, and original content are
          protected by law. You receive a limited, revocable, non-transferable
          right to use the service as intended. You retain submitted content
          rights and permit MUBER to host, process, reproduce, and disclose it
          as reasonably necessary to operate, secure, improve, and support the
          marketplace and comply with law.
        </p>
      </LegalSection>
      <LegalSection
        id="responsibility"
        title="12. Disclaimers and responsibility"
      >
        <p>
          The platform is provided on an “as available” basis. To the extent
          permitted by law, MUBER disclaims implied warranties of uninterrupted
          or error-free operation. Nothing excludes non-waivable rights or
          remedies.
        </p>
        <p>
          Independent providers are responsible for their services. MUBER
          remains responsible for its own conduct and does not disclaim
          liability where prohibited. Any additional liability allocation,
          indemnity, insurance, or claims process should appear in a
          job-specific or provider agreement reviewed for the service and
          jurisdiction.
        </p>
      </LegalSection>
      <LegalSection id="law" title="13. Disputes and governing law">
        <p>
          Contact <Link href="/support">Support</Link> first. California law
          governs except where mandatory law provides otherwise. No forced
          arbitration or class-action waiver is included. Courts with lawful
          jurisdiction may hear unresolved disputes.
        </p>
      </LegalSection>
      <LegalSection id="changes" title="14. Changes and contact">
        <p>
          We may update these Terms as features, areas, payments, or legal
          requirements change. The effective date identifies the current
          version. Material changes receive additional notice when required.
          Submit questions through <Link href="/support">Support</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

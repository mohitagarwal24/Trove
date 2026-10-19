import Link from "next/link";
export function Legal({ page }: { page: "privacy" | "terms" }) {
  return (
    <article className="panel legal-page">
      <h1>{page === "privacy" ? "Privacy" : "Terms of use"}</h1>
      {page === "privacy" ? (
        <>
          <h2>Information we store</h2>
          <p>
            Trove stores your name, email, password hash or Google account
            identifier, workspace activity, research tasks, purchase records and
            agent-token hashes. Session cookies keep you signed in. PayPal
            handles payment credentials; Trove stores transaction references.
          </p>
          <h2>Research and source data</h2>
          <p>
            AI research sends your question and catalogue metadata to Google
            Gemini. Requesting an AI summary sends the licensed purchased
            subset. Google’s free API tier may use submitted content to improve
            its products under its API terms. Avoid confidential information.
            Published source data is stored as encrypted, versioned snapshots.
          </p>
          <h2>Access and retention</h2>
          <p>
            Purchased batches can be downloaded again without another charge,
            subject to the source licence and account access. Delivery caches
            expire and are rebuilt from retained source snapshots. You can
            export account records or close your account in{" "}
            <Link href="/account">Account settings</Link>. Closing redacts your
            profile and revokes access; financial records remain for accounting
            and dispute handling.
          </p>
        </>
      ) : (
        <>
          <h2>Purchasing data</h2>
          <p>
            Each purchase covers the listed fields, record quantity, source
            version and price. You approve the exact total through PayPal.
            Results are released after payment confirmation. Reuse of the same
            purchased batch and scope is free; updated batches, additional scope
            or a different permitted use require a new quote. Source licences
            continue to govern the underlying data.
          </p>
          <h2>Research use</h2>
          <p>
            Regulatory records are provided for research. They do not replace
            original agency notices, professional judgement or clinical advice.
            Publication dates and individual record dates may differ. AI
            summaries can be incomplete or incorrect.
          </p>
          <h2>Providers and refunds</h2>
          <p>
            Providers must hold the rights to distribute their uploads and
            supply accurate attribution and licence terms. Provider profiles are
            reviewed before discovery. Refund requests are available from
            completed purchases and revoke result access when confirmed. Source
            availability and payment processing can be interrupted.
          </p>
          <h2>Payment environment</h2>
          <p>
            When checkout displays PayPal Sandbox, transactions use test funds.
            Live payments require an enabled live merchant account.
          </p>
        </>
      )}
      <h2>Contact</h2>
      <p>
        Contact the operator through{" "}
        <a
          className="text-link"
          href="https://github.com/mohitagarwal24/Trove/issues"
          target="_blank"
          rel="noreferrer"
        >
          Trove support
        </a>
        .
      </p>
    </article>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">How It Works</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          A one-page guide to what this tracker is, where the data comes from,
          and how the team uses it day to day.
        </p>
      </div>

      <Card title="Purpose">
        <p>
          The Sponsored Student Activation Tracker is for agency-sponsored
          students who carry an open AR balance. It tracks each student from
          "agency approved" through "paid", makes sure no one slips through
          the cracks before they start class, and shows leadership the AR
          we expect to collect from each agency by week.
        </p>
      </Card>

      <Card title="Where the data comes from">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left py-2 pr-3 w-44">Source</th>
              <th className="text-left py-2 pr-3">What it provides</th>
              <th className="text-left py-2">How it gets in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <Row
              source="PowerSuite (Enrollment)"
              provides="Student name, email, phone, location, advisor, agency / funding type, class start date"
              method="Download report → Import CSV"
            />
            <Row
              source="QuickBooks Online"
              provides="Invoice number, open AR balance"
              method="Download report → Import CSV"
            />
            <Row
              source="OSS team (this app)"
              provides="Lifecycle status, contact history, follow-up dates, notes, forecast overrides"
              method="Click a row → Update panel"
            />
          </tbody>
        </table>
      </Card>

      <Card title="Daily / weekly data flow">
        <p className="mb-3">
          The data toolbar (always visible at the top of the app) has{' '}
          <strong>four import buttons</strong>, one per source:
        </p>
        <table className="w-full text-sm mb-4">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left py-2 pr-3 w-36">Button</th>
              <th className="text-left py-2 pr-3">Behavior</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <Row
              source="PowerSuite"
              provides="Primary student roster. Adds new students; refreshes balance, location, start date, funding for existing. Self-Paid filtered."
              method=""
            />
            <Row
              source="Enrollment"
              provides="Fills enrollment date, advisor, specific agency on students that already exist. Won't create new students."
              method=""
            />
            <Row
              source="QuickBooks"
              provides="Refreshes invoice number and AR balance on existing students. Won't create new students."
              method=""
            />
            <Row
              source="OSS Names"
              provides="Two-column CSV (Location, OSS Owner). Updates the location→OSS lookup and backfills oss_owner on students who don't have one."
              method=""
            />
          </tbody>
        </table>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Download the relevant report (PowerSuite, Enrollment, QBO) → save
            as CSV.
          </li>
          <li>
            Click the matching <em>Import</em> button in the toolbar at the
            top of the app.
          </li>
          <li>
            The app <strong>upserts</strong>: existing students get their
            source-of-truth fields refreshed, and OSS-entered fields
            (lifecycle, notes, follow-ups) are{' '}
            <strong>never overwritten</strong>. New PowerSuite students arrive
            with lifecycle defaulting to <em>"Start Date Confirmed"</em>{' '}
            (Tentative) if they have a class start date, otherwise{' '}
            <em>"Agency Approved / Pending Start Date"</em>.
          </li>
          <li>
            Rows where Funding = "Self Paid" are filtered out of PowerSuite
            imports. Rows with an empty Funding column are kept — those may
            be future-agency students whose funding hasn't been set up yet.
          </li>
          <li>
            <strong>OSS team works the app daily.</strong> Click a student
            row → update lifecycle, log contact, set follow-up, write notes.
            Every change stamps your name and the time.
          </li>
          <li>
            <strong>Leadership opens the Dashboard and Daily Report.</strong>{' '}
            Finance opens the Forecast tab.
          </li>
        </ol>
      </Card>

      <Card title="The tabs">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left py-2 pr-3 w-48">Tab</th>
              <th className="text-left py-2 pr-3 w-32">Audience</th>
              <th className="text-left py-2">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <Row
              source="Dashboard"
              provides="Leadership"
              method="KPI cards, charts, AR exposure, CSV controls"
            />
            <Row
              source="Daily Report"
              provides="OSS + Leadership"
              method="Started yesterday / missed yesterday / starting today / starting this week / missing start dates"
            />
            <Row
              source="Priority This Week"
              provides="OSS"
              method="High-risk + upcoming-start students, sorted by urgency"
            />
            <Row
              source="My Students"
              provides="OSS"
              method="Scoped to the selected OSS in the header dropdown"
            />
            <Row
              source="All Sponsored Students"
              provides="All"
              method="Full filterable list with search"
            />
            <Row
              source="Forecast"
              provides="Finance + Leadership"
              method="Expected agency collections by week and confidence"
            />
            <Row
              source="How It Works"
              provides="Anyone"
              method="This page"
            />
          </tbody>
        </table>
      </Card>

      <Card title="Lifecycle states">
        <ul className="space-y-1.5 text-sm">
          <Lifecycle label="Agency Approved / Pending Start Date">
            Paperwork done, no class start scheduled yet.
          </Lifecycle>
          <Lifecycle label="Start Date Confirmed">
            Class start date set and student confirmed.
          </Lifecycle>
          <Lifecycle label="Student Contacted – Awaiting Confirmation">
            Outreach in progress; awaiting student's confirmation.
          </Lifecycle>
          <Lifecycle label="Student Unreachable">
            Outreach failed — escalation needed.
          </Lifecycle>
          <Lifecycle label="Rescheduled">
            Start date changed — risk of further slippage.
          </Lifecycle>
          <Lifecycle label="Started">
            Student began class.
          </Lifecycle>
          <Lifecycle label="Completed / Ready to Bill">
            Student finished — Finance can invoice the agency.
          </Lifecycle>
          <Lifecycle label="Billing Submitted to Agency">
            Invoice sent — awaiting payment.
          </Lifecycle>
          <Lifecycle label="Paid">
            Agency paid in full.
          </Lifecycle>
          <Lifecycle label="Dropped / No-Show">
            Student didn't start or stopped attending.
          </Lifecycle>
          <Lifecycle label="Issue / Escalation">
            Problem requiring leadership attention.
          </Lifecycle>
        </ul>
      </Card>

      <Card title="How risk and priority are scored">
        <p className="mb-2">
          The app flags each student as <strong>High</strong>,{' '}
          <strong>Medium</strong>, or <strong>Low</strong> risk based on:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>High</strong>: Unreachable, Dropped / No-Show, no class
            start date, no contact recorded, no contact in 7+ days, student
            rescheduled, starting within 7 days without a confirmed status, or
            open AR with no follow-up scheduled.
          </li>
          <li>
            <strong>Medium</strong>: Start date set but not Confirmed, last
            contact 4–7 days ago, awaiting confirmation, student requested
            delay, or paperwork needed.
          </li>
          <li>
            <strong>Low</strong>: Confirmed start, contact within 3 days, no
            blocking issues.
          </li>
        </ul>
      </Card>

      <Card title="How the forecast works">
        <p className="mb-2">
          Each student's expected agency collection date is computed from the
          lifecycle:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Completed / Ready to Bill</strong> → today + 14 days, High
            confidence
          </li>
          <li>
            <strong>Billing Submitted to Agency</strong> → today + 14 days,
            High confidence
          </li>
          <li>
            <strong>Started</strong> → class start + 28-day program + 14 days,
            Medium confidence
          </li>
          <li>
            <strong>Start Date Confirmed</strong> → class start + 28 days + 21
            days, Medium confidence
          </li>
          <li>
            <strong>Agency Approved / Pending Start Date</strong> and similar
            pre-start states → TBD, Low confidence
          </li>
          <li>
            <strong>Student Unreachable / Dropped / Issue</strong> → $0 expected
            unless manually overridden
          </li>
        </ul>
        <p className="mt-3">
          Finance can override any student's expected date, amount, confidence,
          and notes from the Forecast section of the update panel.
        </p>
      </Card>

      <Card title="Sponsored vs. cash students">
        <p>
          This tracker focuses on <strong>sponsored students</strong> —
          students where an agency, employer, or financing program is paying
          (UNISA, WIOA, GI-Bill, Voc Rehab, Affirm, Finance). At import we
          drop rows marked <strong>"Self Paid"</strong> — those are tracked
          by Finance separately. Rows with an empty Funding column are kept
          on the tracker as potential future-agency students; an OSS can
          confirm and update funding when it's set up.
        </p>
      </Card>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </section>
  )
}

function Row({ source, provides, method }) {
  return (
    <tr>
      <td className="py-2 pr-3 font-medium text-slate-900 align-top">{source}</td>
      <td className="py-2 pr-3 text-slate-700 align-top">{provides}</td>
      <td className="py-2 text-slate-700 align-top">{method}</td>
    </tr>
  )
}

function Lifecycle({ label, children }) {
  return (
    <li>
      <span className="font-medium text-slate-900">{label}</span>{' '}
      <span className="text-slate-600">— {children}</span>
    </li>
  )
}

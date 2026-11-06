
export const NAV_LINKS = [
  { href: "#week", label: "A week with us" },
  { href: "#inside", label: "What’s inside" },
  { href: "#team", label: "For your team" },
  { href: "#trust", label: "Security" },
];

export const DIARY = [
  {
    day: "Monday",
    note: "Chidi wants 3 days off next week. Handover note already attached, nice.",
    snippet: {
      title: "Leave request · Chidi Obi",
      tag: "Annual",
      rows: [
        { label: "Dates", value: "3 – 5 Nov · 3 days" },
        { label: "Balance this period", value: "14 days" },
      ],
      steps: [
        ["Line manager", true],
        ["HR", true],
        ["Final step", false],
      ],
    },
  },
  {
    day: "Tuesday",
    note: "Grace asked about a salary advance. Already checked against our loan policy.",
    snippet: {
      title: "Salary advance · Grace Adeyemi",
      tag: "₦150,000",
      rows: [
        { label: "Repayment", value: "Through payroll · 3 months" },
        { label: "Repayment limit", value: "Within policy ✓", tone: "ok" },
      ],
    },
  },
  {
    day: "Wednesday",
    note: "New starter Musa uploaded his own documents!! Two approved already.",
    snippet: {
      title: "Documents · Musa Bello",
      tag: "Self-service",
      rows: [
        { label: "ID card", value: "Approved ✓", tone: "ok" },
        { label: "Guarantor form", value: "Approved ✓", tone: "ok" },
        { label: "Degree certificate", value: "Awaiting review", tone: "wait" },
      ],
    },
  },
  {
    day: "Thursday",
    note: "Q4 appraisals are open. Targets are in, self-assessments next.",
    snippet: {
      title: "Q4 appraisal cycle",
      tag: "Open",
      rows: [
        { label: "KPIs & targets", value: "Set ✓", tone: "ok" },
        { label: "Self-assessments", value: "In progress", tone: "wait" },
        { label: "Reviewer", value: "Line managers" },
      ],
    },
  },
  {
    day: "Friday",
    star: true,
    note: "PAYROLL. PAYE, pension and NHF all worked out. Approved, and sent.",
    snippet: {
      title: "November payroll",
      tag: "42 employees",
      rows: [
        { label: "PAYE", value: "Nigeria Tax Act 2025" },
        { label: "Approval", value: "Approved ✓", tone: "ok" },
        { label: "“Payslip available” emails", value: "Sent ✓", tone: "ok" },
      ],
    },
  },
];

export const BINDER = [
  {
    tab: "PAYROLL",
    title: "Payroll",
    body: "Pay grades and line items, PAYE under the Nigeria Tax Act 2025 with pension, NHF and NHIS reliefs, an approval step before anything goes out, and payslip emails when it does.",
    color: "bg-lp-lilac",
    x: "left-[2%]",
  },
  {
    tab: "LEAVE",
    title: "Leave",
    body: "Requests with handover notes, balances for each period, approvals that follow your workflow, and a nudge to the approver when one is waiting too long.",
    color: "bg-lp-sun",
    x: "left-[13%]",
  },
  {
    tab: "LOANS",
    title: "Loans & salary advances",
    body: "Loan policies with repayment limits, salary advances, repayments taken through payroll, and loan agreements.",
    color: "bg-lp-mint",
    x: "left-[24%]",
  },
  {
    tab: "APPRAISALS",
    title: "Appraisals",
    body: "Appraisal cycles, KPIs and targets, self-assessments and reviewer feedback.",
    color: "bg-lp-white",
    x: "left-[35%]",
  },
  {
    tab: "APPROVALS",
    title: "Approval workflows",
    body: "Set up the steps once, by job role. Every request then lands in one approvals inbox, with comments and a full history.",
    color: "bg-lp-lavender",
    x: "left-[46%]",
  },
  {
    tab: "DIRECTORY",
    title: "Directory",
    body: "Employees, departments, job titles, pay grades and office locations, all in one place.",
    color: "bg-lp-peach",
    x: "left-[57%]",
  },
  {
    tab: "SELF-SERVICE",
    title: "Self-service",
    body: "Every employee gets their profile, payslips, leave, loans, documents and appraisals in one portal. Managers see their team.",
    color: "bg-lp-sky",
    x: "left-[68%]",
  },
  {
    tab: "CONTROL",
    title: "Access & audit trail",
    body: "Permissions per module, an audit trail of what was done, and your own logo and colours on the workspace.",
    color: "bg-lp-kraft",
    x: "left-[79%]",
  },
];

export const QUESTIONS = [
  { initials: "KB", name: "Kemi", time: "Mon 9:02", question: "Where's my November payslip?" },
  { initials: "TA", name: "Tunde", time: "Tue 11:40", question: "How many leave days do I have left?" },
  { initials: "GA", name: "Grace", time: "Wed 2:15", question: "Has anyone approved my advance?" },
  { initials: "MB", name: "Musa", time: "Thu 4:51", question: "I changed banks. Who do I tell?" },
];

export const POLAROIDS = [
  { caption: "Finance team, Friday", src: null, tilt: "-rotate-6 translate-y-2.5 -mr-[3%]" },
  { caption: "Musa's first day!", src: null, tilt: "rotate-3 -translate-y-[18px] z-[2]" },
  { caption: "ops offsite '26", src: null, tilt: "-rotate-2 translate-y-4 -ml-[3%]" },
];

export const TRUST = [
  {
    label: "Permissions",
    text: "Access is set by role, per module and per action, so people only see what their role allows. Salaries included.",
  },
  {
    label: "Single sign-on",
    text: "Let your team sign in through your own identity provider, like Microsoft Entra ID or Okta, using OpenID Connect. Or keep email and password.",
  },
  {
    label: "Audit trail",
    text: "Important actions are logged, so you can always look back at who did what, and when.",
  },
  {
    label: "Your own workspace",
    text: "Each organisation gets its own workspace, and every record in it belongs to that organisation alone.",
  },
];

export const SETUP_STEPS = [
  "Office locations",
  "Departments",
  "Job titles",
  "Pay grades & benefits",
  "Approval workflows",
  "Employees",
];

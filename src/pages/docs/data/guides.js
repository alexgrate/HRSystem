export const ROLES = [
  { id: "all", label: "Everything" },
  { id: "admin", label: "I run HR" },
  { id: "approver", label: "I approve requests" },
  { id: "employee", label: "I'm an employee" },
];

export const ROLE_NAMES = {
  admin: "HR admins",
  approver: "Approvers & managers",
  employee: "Employees",
};

export const SECTIONS = [
  { id: "account", title: "Signing in & your account", color: "bg-lp-sky" },
  { id: "dashboard", title: "Dashboard & notifications", color: "bg-lp-peach" },
  { id: "getting-started", title: "Getting started", color: "bg-lp-lilac" },
  { id: "directory", title: "Directory & setups", color: "bg-lp-sun" },
  { id: "workflows", title: "Approval workflows", color: "bg-lp-mint" },
  { id: "approvals", title: "Approvals inbox", color: "bg-lp-white" },
  { id: "payroll", title: "Payroll", color: "bg-lp-lavender" },
  { id: "leave", title: "Leave", color: "bg-lp-peach" },
  { id: "loans", title: "Loans & advances", color: "bg-lp-sky" },
  { id: "appraisals", title: "Appraisals", color: "bg-lp-kraft" },
  { id: "self-service", title: "Self-service portal", color: "bg-lp-mint" },
  { id: "access", title: "Access & audit trail", color: "bg-lp-white" },
  { id: "settings", title: "Company settings & SSO", color: "bg-lp-lavender" },
];

export const GUIDES = [
  {
    slug: "create-your-workspace",
    section: "account",
    roles: ["admin"],
    title: "Create your organisation's workspace",
    summary:
      "Sign your organisation up for dashhr. You become the workspace's first administrator, and your team gets its own address to sign in at.",
    opensFrom: "dashhr.app/signup",
    steps: [
      {
        title: "Fill in the sign-up form",
        body: "Enter your organisation's name, the workspace address you want (such as acme for acme.dashhr.app), your first and last name, your email and a password of at least 6 characters.",
        where: ["dashhr.app", "Start your workspace"],
        tip: "the address fills itself in from your organisation name. you can change it.",
      },
      {
        title: "Create the workspace",
        body: "Choose Create workspace. By doing so you agree to the Terms and Privacy Policy linked under the button.",
        where: ["Sign up", "Create workspace"],
      },
      {
        title: "Verify your email",
        body: "dashhr sends a verification link to the email you gave. Open it to activate the workspace and sign in.",
        where: ["Your inbox", "Verification link"],
      },
      {
        title: "Set everything up",
        body: "You're the first administrator. Getting Started walks you through the rest.",
        where: ["Getting Started"],
        link: { slug: "set-up-your-workspace", label: "Set up your workspace" },
      },
    ],
    related: ["sign-in", "set-up-your-workspace"],
  },
  {
    slug: "sign-in",
    section: "account",
    roles: ["admin", "approver", "employee"],
    title: "Sign in and sign out",
    summary:
      "Sign in with your work email. Depending on how your organisation is set up, you'll use a password or your company's single sign-on.",
    opensFrom: "dashhr.app/login",
    steps: [
      {
        title: "Enter your work email and password",
        body: "On the sign-in page, enter your work email and password and choose Sign in to dash.",
        where: ["Log in"],
      },
      {
        title: "Or continue with single sign-on",
        body: "If your organisation uses single sign-on, you'll see Continue with single sign-on instead of a password box. It takes you to your company's sign-in page and brings you back to dashhr.",
        where: ["Log in", "Continue with single sign-on"],
      },
      {
        title: "Choose whether to stay signed in",
        body: "Remember me is ticked by default. Untick it on a shared computer and you'll be signed out when the browser closes.",
        where: ["Log in", "Remember me"],
      },
      {
        title: "Sign out",
        body: "Use the red Sign out button in the top bar, next to your name.",
        where: ["Top bar", "Sign out"],
      },
    ],
    notes: [
      "Your account can be signed in on one browser or device at a time. If it's already signed in somewhere else, dashhr asks whether to sign out that session and continue.",
    ],
    related: ["set-or-reset-your-password", "find-your-way-around"],
  },
  {
    slug: "set-or-reset-your-password",
    section: "account",
    roles: ["admin", "approver", "employee"],
    title: "Set or reset your password",
    summary:
      "New to dashhr? Set your password from your welcome email. Forgotten it? Reset it with a code sent to your work email.",
    opensFrom: "dashhr.app/login",
    steps: [
      {
        title: "First time: open your onboarding email",
        body: "When HR adds you, they send you an onboarding email. Choose Set Your Password in it, then create a password to activate your account.",
        where: ["Your inbox", "Set Your Password"],
      },
      {
        title: "Forgot it: ask for a code",
        body: "On the sign-in page, choose Forgot password? and enter your work email. dashhr emails you a verification code.",
        where: ["Log in", "Forgot password?"],
      },
      {
        title: "Enter the code and a new password",
        body: "Type the code, then your new password twice. It needs at least 6 characters. Then go back and sign in.",
        where: ["Reset your password"],
        tip: "no code yet? you can ask for another after a short wait.",
      },
    ],
    notes: [
      "If your organisation uses single sign-on, your password is managed by your company's identity provider, not dashhr.",
    ],
    related: ["sign-in"],
  },
  {
    slug: "find-your-way-around",
    section: "dashboard",
    roles: ["admin", "approver", "employee"],
    title: "Find your way around",
    summary:
      "The side menu holds every part of dashhr. You only see the pages your role allows, so your menu may be shorter than this list.",
    opensFrom: "Side menu",
    glossary: [
      { term: "Dashboard", text: "Your home page: what needs your attention, your own leave, pay, loans and appraisal, and organisation figures if your role can see them." },
      { term: "Getting Started", text: "The setup checklist for a new workspace." },
      { term: "Directory & Setups", text: "Your people, and the offices, departments, titles, grades, pay and leave types everything else uses." },
      { term: "Self-Service Portal", text: "Everything about you: profile, records, leave, appraisals, payslips, loans, documents and your team. Everyone has it." },
      { term: "Approval Workflows", text: "Who approves what, stage by stage." },
      { term: "Approvals Inbox", text: "Leave, documents, profile updates and loans waiting for your decision." },
      { term: "Payroll Processing", text: "Line items, payroll runs and their approvals, lock-in and distribution." },
      { term: "Leave Administration", text: "Every leave request in the organisation." },
      { term: "Administration Periods", text: "Your HR calendar windows, which leave and appraisals belong to." },
      { term: "Loans", text: "Loan policy, products, requests, disbursements and repayments." },
      { term: "Appraisals", text: "Your team's appraisals, cycles, the indicator library and reports." },
      { term: "Access Management", text: "Roles, permissions and who has them." },
      { term: "Audit Trail", text: "Who did what, and when." },
      { term: "Company Settings", text: "Name, logo, colours, currency, appraisal type and sign-in method." },
    ],
    notes: ["On a phone, the side menu opens from the menu button at the top of the screen."],
    related: ["your-dashboard", "roles-and-permissions"],
  },
  {
    slug: "your-dashboard",
    section: "dashboard",
    roles: ["admin", "approver", "employee"],
    title: "Your dashboard",
    summary:
      "The Dashboard opens with what needs your attention today, then your own work, then your team and organisation if your role covers them.",
    opensFrom: "Dashboard",
    glossary: [
      { term: "Action items", text: "Things waiting on you, by priority. For example: approvals to review, team reviews to score, an appraisal to acknowledge, payroll runs or adjustments awaiting action, or your profile to complete." },
      { term: "My workspace", text: "Your employment summary, leave, latest payslip, loans and appraisal, with shortcuts to apply for leave or a loan and to view your payslip." },
      { term: "My team", text: "For managers: your direct reports and the reviews in progress." },
      { term: "Organization", text: "For HR and other roles that can see it: headcount, pending approvals, appraisal completion, payroll, the loan portfolio, the roster by department, recent hires, the net pay trend and recent activity." },
      { term: "Organisation health", text: "Gaps in your setup, such as employees without a manager, department, pay grade, job role or office, or no leave types, workflows or pay groups yet." },
      { term: "Quick actions", text: "Shortcuts to the things your role does most, such as onboarding an employee, reviewing approvals or running payroll." },
      { term: "Notifications", text: "Your latest updates. Mark them all read in one go." },
    ],
    notes: ["Use Refresh dashboard to pull the latest figures."],
    related: ["notifications", "find-your-way-around"],
  },
  {
    slug: "notifications",
    section: "dashboard",
    roles: ["admin", "approver", "employee"],
    title: "Notifications and emails",
    summary:
      "dashhr keeps you posted in the app and by email. The bell at the top of every page shows how many notifications you haven't read.",
    opensFrom: "Dashboard",
    steps: [
      {
        title: "See what's new",
        body: "Choose the bell. It takes you to your Dashboard, where your notifications are listed newest first.",
        where: ["Bell", "Dashboard", "Notifications"],
      },
      {
        title: "Clear them",
        body: "Choose Mark all read once you've caught up.",
        where: ["Dashboard", "Notifications", "Mark all read"],
      },
    ],
    glossary: [
      { term: "Your requests", text: "Updates on your own leave, loans and appraisal reviews." },
      { term: "Activity", text: "If your role can see the audit trail, recent activity across the organisation." },
      { term: "Final approvals", text: "If your job title is set to be notified on final approval, a notice whenever any process gets its last approval." },
      { term: "Emails", text: "Sent for things like a request waiting for your approval, a reminder about one, a payslip being available, or your onboarding and password codes." },
    ],
    notes: ["Notifications refresh on their own while dashhr is open."],
    related: ["your-dashboard", "directory-and-setups"],
  },
  {
    slug: "set-up-your-workspace",
    section: "getting-started",
    roles: ["admin"],
    title: "Set up your workspace",
    summary:
      "The Getting Started page lists six things to add, in this order, and counts how many of each you have so far. Work down the list once and your workspace is ready for its first payroll.",
    opensFrom: "Getting Started",
    steps: [
      {
        title: "Add your office locations",
        body: "Where your people are based. Give each office a street address, state and country, and mark one as your headquarters.",
        where: ["Directory & Setups", "Offices"],
        tip: "just one office? add it anyway.",
      },
      {
        title: "Create your departments",
        body: "A name and a short code for each unit, such as Finance and FIN. You can also set a parent department and a department head.",
        where: ["Directory & Setups", "Departments"],
        tip: "the department head is who “department head” approval steps go to.",
      },
      {
        title: "Add job titles",
        body: "The roles people are hired into, each with a role code. You can list the documents anyone in that job must upload, such as a National ID.",
        where: ["Directory & Setups", "Job Titles"],
      },
      {
        title: "Set pay grades and benefit levels",
        body: "Pay grades hold a salary band, from minimum to maximum salary, and the largest loan someone on that grade can apply for. Benefit levels group the benefits that go with a grade.",
        where: ["Directory & Setups", "Pay Grades"],
      },
      {
        title: "Build your approval workflows",
        body: "Decide who approves leave, payroll, loans, documents and profile changes, step by step.",
        where: ["Approval Workflows"],
        link: { slug: "build-an-approval-workflow", label: "How to build a workflow" },
      },
      {
        title: "Add your employees",
        body: "One at a time, or a whole file at once. Then send everyone an email to set their password.",
        where: ["Directory & Setups", "Employees"],
        link: { slug: "add-your-employees", label: "How to add employees" },
        tip: "all six done = ready for payroll ✓",
      },
    ],
    notes: [
      "You'll also need a pay group before you can run payroll, and leave types before anyone can request leave. Both are tabs in Directory & Setups.",
      "Leave dates have to fall inside an administration period, so open one before your team starts requesting leave.",
    ],
    related: ["directory-and-setups", "open-an-administration-period"],
  },
  {
    slug: "add-your-employees",
    section: "getting-started",
    roles: ["admin"],
    title: "Add your employees",
    summary:
      "Add people one at a time or upload a whole file. Then send each person an onboarding email so they can set a password and sign in.",
    opensFrom: "Directory & Setups",
    steps: [
      {
        title: "Add one person",
        body: "Choose New employee and fill in their details: name, email, phone, job title, department, manager, pay grade, pay group, report location, start date and base salary.",
        where: ["Directory & Setups", "Employees", "New employee"],
        tip: "the manager you pick is who “line manager” approval steps go to.",
      },
      {
        title: "Or upload many at once",
        body: "Download the Template, fill it in, then use Bulk upload with a CSV or JSON file. Column headers are matched flexibly, and any column dashhr doesn't recognise is ignored and listed in the results.",
        where: ["Directory & Setups", "Employees", "Bulk upload"],
      },
      {
        title: "Send onboarding emails",
        body: "Pick Send onboarding email from a person's menu, or select several people and send to all of them at once. The email has a Set Your Password button that finishes their sign-up.",
        where: ["Directory & Setups", "Employees"],
      },
      {
        title: "Keep records up to date",
        body: "Use Change status when someone goes on leave, is suspended, resigns, retires or leaves. Set an exit date and an optional reason. You can reactivate someone later.",
        where: ["Directory & Setups", "Employees", "Change status"],
        tip: "you can't change your own account status.",
      },
    ],
    notes: [
      "Everyone you add can sign in to the Self-Service Portal once they've set their password.",
    ],
    related: ["your-self-service-portal", "roles-and-permissions"],
  },
  {
    slug: "directory-and-setups",
    section: "directory",
    roles: ["admin"],
    title: "What each Directory & Setups tab is for",
    summary:
      "Directory & Setups holds your people and the building blocks everything else uses: offices, departments, titles, grades, pay and leave.",
    opensFrom: "Directory & Setups",
    glossary: [
      { term: "Employees", text: "Everyone in your organisation, with their job, pay and account status. Search, filter, sort and bulk upload from here." },
      { term: "Offices", text: "Your office locations, with one marked as headquarters." },
      { term: "Departments", text: "Your organisational units, each with a code, an optional parent department and a department head." },
      { term: "Job Titles", text: "The roles people are hired into. Each can list required documents, and can be set to notify its holders when any process gets its final approval." },
      { term: "Grades", text: "Levels in your organisation, such as G1 Entry Level. Approval stages can be limited to a grade." },
      { term: "Pay Grades", text: "Salary bands with a minimum and maximum salary, a benefit level, and the largest loan someone on the grade can apply for." },
      { term: "Pay Groups", text: "Groups of staff who are paid together, such as Monthly Staff. Payroll is run one pay group at a time." },
      { term: "Benefit Levels", text: "Named benefit packages, such as a management level package, linked to pay grades." },
      { term: "Allowances", text: "Named allowances with an amount, such as a housing or transport allowance." },
      { term: "Leave Types", text: "Kinds of leave, with the days allowed per period, whether it's paid, whether it needs approval, and which pay grades can use it. Pick no pay grades and everyone can use it." },
    ],
    notes: [
      "Every setup tab has a Template and Bulk upload, so you can add offices, departments, titles and the rest from a CSV or JSON file too.",
      "For employee uploads, only first name, last name and email are required. Everything else, including staff ID, start date and office, is optional.",
    ],
    related: ["set-up-your-workspace", "add-your-employees"],
  },
  {
    slug: "view-and-edit-an-employee",
    section: "directory",
    roles: ["admin"],
    title: "View and edit an employee's record",
    summary:
      "Open anyone in the directory to see their whole record in one panel, from personal details to leave and loan history.",
    opensFrom: "Directory & Setups",
    steps: [
      {
        title: "Find the person",
        body: "Search the Employees tab, filter by grade or account status, and sort by most recent, oldest first or name. Choose how many rows to show per page.",
        where: ["Directory & Setups", "Employees"],
      },
      {
        title: "Open their record",
        body: "Choose View details. The panel shows personal, employment, contact, address and emergency contact details, financial information and compensation, next of kin, family, dependants, education, work experience, training, documents, leave history, loan history and profile update requests.",
        where: ["Directory & Setups", "Employees", "View details"],
      },
      {
        title: "Edit employment details",
        body: "Choose Edit to change things like job title, department, manager, pay grade, pay group, report location, dates, contract type and base salary.",
        where: ["Directory & Setups", "Employees", "Edit"],
        tip: "a person's name is set when they're created and can't be edited here.",
      },
      {
        title: "Change their status",
        body: "Use Change status to mark someone on leave, inactive, suspended, terminated, resigned or retired, with an exit date and an optional reason where it applies. Reactivate brings someone back.",
        where: ["Directory & Setups", "Employees", "Change status"],
      },
    ],
    notes: [
      "Changes a person makes to their own details in the Self-Service Portal come to HR as profile update requests, which go through approval before they're saved.",
    ],
    related: ["add-your-employees", "approve-or-reject-a-request"],
  },
  {
    slug: "build-an-approval-workflow",
    section: "workflows",
    roles: ["admin"],
    title: "Build an approval workflow",
    summary:
      "A workflow is the chain of approvals a request goes through, one stage at a time. Leave, payroll, loans and documents each need an active workflow of their type before requests can go through.",
    opensFrom: "Approval Workflows",
    steps: [
      {
        title: "Start a new workflow",
        body: "Choose New workflow, give it a name and pick the process it's for: Leave Request, Payroll Submission, Payroll Lock-in, Payroll Distribution, Profile Update, Document Upload or Loan Request.",
        where: ["Approval Workflows", "New workflow"],
      },
      {
        title: "Add the approval stages",
        body: "Use Add stage for each approval. A stage's approver can be a job role, the requester's line manager, or the requester's department head. You can limit a job-role stage to one grade, and choose whether everyone holding that role has to approve.",
        where: ["Approval Workflows", "Add stage"],
        tip: "line manager and department head are worked out per request, from each person's own record.",
      },
      {
        title: "Put the stages in order",
        body: "Requests move through the stages from top to bottom. Use the arrows to reorder them, and check the live preview to see the route a request will take.",
        where: ["Approval Workflows", "Live preview"],
      },
      {
        title: "Keep it active",
        body: "Leave Workflow active switched on. An inactive workflow keeps its history but stops handling new requests.",
        where: ["Approval Workflows", "Workflow active"],
      },
    ],
    notes: [
      "Payroll needs three workflows, one for each stage after the preview: Payroll Submission, Payroll Lock-in and Payroll Distribution.",
      "Use Duplicate to start a new workflow from an existing one.",
      "The Recent approval decisions panel shows the latest decisions from your audit trail.",
    ],
    related: ["approve-or-reject-a-request", "run-payroll"],
  },
  {
    slug: "approve-or-reject-a-request",
    section: "approvals",
    roles: ["approver", "admin"],
    title: "Approve or reject a request",
    summary:
      "Everything waiting on you is in the Approvals Inbox, sorted into leave requests, documents, profile updates and loans.",
    opensFrom: "Approvals Inbox",
    steps: [
      {
        title: "Open your inbox",
        body: "Pick the tab for the kind of request you want to work through. Sort by newest, oldest or requester name.",
        where: ["Approvals Inbox"],
      },
      {
        title: "Look at the details",
        body: "Open a request to see what's being asked for: the requested changes on a profile update, a preview of an uploaded document, and the approval timeline showing where it is in its workflow.",
        where: ["Approvals Inbox", "Details"],
      },
      {
        title: "Decide, with a note",
        body: "Add a note with your reason or any context, then choose Approve or Reject. The request moves to the next stage, or finishes if yours was the last one.",
        where: ["Approvals Inbox", "Approve / Reject"],
        tip: "your note stays on the request's history.",
      },
    ],
    notes: [
      "You'll only see the Approvals Inbox if your role can approve at least one of these request types.",
      "Payroll is approved on the Payroll Processing page, not in the inbox.",
      "The person who asked can send you a reminder if a leave request has been waiting.",
    ],
    related: ["build-an-approval-workflow", "manage-leave-requests"],
  },
  {
    slug: "cover-as-relief-officer",
    section: "approvals",
    roles: ["employee", "approver"],
    title: "Cover for a colleague as relief officer",
    summary:
      "When a colleague names you as their relief officer and their leave is approved, you stand in for them while they're away, including their approvals.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "See who you're covering",
        body: "Your Leave tab shows the leave you're covering, with the dates and a link to their handover document.",
        where: ["Self-Service Portal", "Leave", "You're covering"],
      },
      {
        title: "Act for them while they're away",
        body: "From the first to the last day of their approved leave, you get their access in dashhr. Requests that would go to them for approval come to you as well, in your Approvals Inbox.",
        where: ["Approvals Inbox"],
        tip: "it ends by itself when their leave does.",
      },
    ],
    notes: [
      "Cover only goes one level. If the person you cover is also covering for someone else, you don't pick that up too.",
    ],
    related: ["request-leave", "approve-or-reject-a-request"],
  },
  {
    slug: "set-up-payroll-line-items",
    section: "payroll",
    roles: ["admin"],
    title: "Set up payroll line items",
    summary:
      "Line items decide how each pay grade's salary turns into gross pay, deductions and net pay. Set them once per pay grade.",
    opensFrom: "Payroll Processing",
    steps: [
      {
        title: "Pick a pay grade",
        body: "Open Line items and choose the pay grade you want to set up.",
        where: ["Payroll Processing", "Line items"],
      },
      {
        title: "Add each item",
        body: "Choose Add item and pick what it is: an earning (part of gross pay), a deduction (taken off the employee's pay) or an employer cost (paid by the company, such as employer pension, NSITF or ITF).",
        where: ["Payroll Processing", "Line items", "Add item"],
      },
      {
        title: "Choose how it's calculated",
        body: "A fixed amount, a percentage of base salary, a percentage of another line item, or the sum of other line items. PAYE is its own option and is calculated automatically.",
        where: ["Payroll Processing", "Line items", "Calculation"],
        tip: "PAYE follows the Nigeria Tax Act 2025 bands.",
      },
      {
        title: "Mark tax reliefs",
        body: "Tick Tax relief on deductions that come out of taxable income before PAYE is worked out: the staff pension contribution, National Housing Fund and NHIS.",
        where: ["Payroll Processing", "Line items", "Tax relief"],
      },
      {
        title: "Check the split",
        body: "The “How base salary is split on this grade” panel shows the result. Or skip the typing: Bulk upload can start you from the standard salary structure, with a template to download.",
        where: ["Payroll Processing", "Line items", "Bulk upload"],
      },
    ],
    related: ["run-payroll", "directory-and-setups"],
  },
  {
    slug: "run-payroll",
    section: "payroll",
    roles: ["admin", "approver"],
    title: "Run payroll, from preview to payslips",
    summary:
      "Every payroll run goes through four stages: preview, approval, lock-in and distribution. Each stage after the preview is approved through its own workflow.",
    opensFrom: "Payroll Processing",
    steps: [
      {
        title: "Create a preview",
        body: "Choose Run payroll and pick the month, year, pay group and number of working days in the month. dashhr works out every employee's pay as a preview.",
        where: ["Payroll Processing", "Run payroll"],
        tip: "no pay group yet? create one in Directory & Setups → Pay Groups first.",
      },
      {
        title: "Check the preview",
        body: "Review each person's days, gross pay, deductions, net pay and employer cost. If someone worked fewer days, change their days and choose Recalculate. Download schedule (CSV) gives you every employee's figures, account number, PAYE ID and pension details.",
        where: ["Payroll Processing", "Preview"],
        tip: "a run can only be deleted while it's still a preview.",
      },
      {
        title: "Submit for approval",
        body: "Choose Submit for approval. Approvers in your Payroll Submission workflow then approve or reject it.",
        where: ["Payroll Processing", "Approval"],
      },
      {
        title: "Make late changes, if you need to",
        body: "Once a run is approved, and until its distribution is approved, you can add an adjustment (a one-off earning or deduction for one person, with a reason) or a column (an extra earning or deduction for one person or everyone). Adjustments are approved by the approvers for the run's current stage.",
        where: ["Payroll Processing", "Adjustments"],
      },
      {
        title: "Lock it in",
        body: "Once approved, choose Request lock-in. When the lock-in is approved, payslips appear in each employee's Self-Service Portal.",
        where: ["Payroll Processing", "Lock-in"],
      },
      {
        title: "Distribute",
        body: "Choose Request distribution. When it's approved, everyone gets a “Payslip available” email, and loan repayments set to payroll deduction are taken.",
        where: ["Payroll Processing", "Distribution"],
        tip: "fully distributed = done for the month ✓",
      },
    ],
    notes: [
      "You need active workflows for Payroll Submission, Payroll Lock-in and Payroll Distribution.",
      "Adjustments can't be added or approved once a payroll has been distributed.",
    ],
    related: ["set-up-payroll-line-items", "build-an-approval-workflow"],
  },
  {
    slug: "open-an-administration-period",
    section: "leave",
    roles: ["admin"],
    title: "Open an administration period",
    summary:
      "An administration period is a window in your HR calendar, such as H2 2026. Leave requests and appraisal cycles belong to one.",
    opensFrom: "Administration Periods",
    steps: [
      {
        title: "Schedule a period, or open one now",
        body: "Choose Schedule period and set a start and end date, with an optional name. Or choose Open period now to start one today.",
        where: ["Administration Periods", "Schedule period"],
      },
      {
        title: "Line up the next one",
        body: "Periods can't overlap, and each one completes automatically when its end date passes. Schedule the next period before the current one ends.",
        where: ["Administration Periods"],
        tip: "leave dates must fall inside an open or scheduled period.",
      },
    ],
    notes: [
      "Each leave type's days allowed are counted per period.",
      "You can run one appraisal cycle per administration period.",
    ],
    related: ["request-leave", "run-an-appraisal-cycle"],
  },
  {
    slug: "request-leave",
    section: "leave",
    roles: ["employee"],
    title: "Request leave",
    summary:
      "Ask for time off from the Self-Service Portal, see your balances, and follow your request until it's approved.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Check your balances",
        body: "The Leave tab shows the leave types available to you and how many days you have left.",
        where: ["Self-Service Portal", "Leave"],
      },
      {
        title: "Fill in the request",
        body: "Choose Request leave, then pick the leave type, start and end dates, and give a reason. You can name a relief officer to cover for you and attach a handover document.",
        where: ["Self-Service Portal", "Leave", "Request leave"],
        tip: "a handover note makes approvers' lives easier.",
      },
      {
        title: "Follow it through",
        body: "My leave requests shows the status of everything you've asked for. You can edit or cancel a request, or send the approver a reminder.",
        where: ["Self-Service Portal", "Leave", "My leave requests"],
      },
    ],
    notes: [
      "The leave types you can pick depend on your pay grade. If none show, ask HR.",
      "Some leave types don't need approval. Those requests are approved as soon as you submit them.",
      "You can only edit or cancel a request while it's still waiting for approval.",
      "Each leave type has a number of days allowed per administration period. dashhr won't accept a request that goes over it, counting what's already approved or pending.",
      "Dates can't overlap a leave request you've already made.",
      "If someone names you as their relief officer, you'll see what you're covering in your Leave tab.",
    ],
    related: ["your-self-service-portal", "manage-leave-requests"],
  },
  {
    slug: "manage-leave-requests",
    section: "leave",
    roles: ["admin", "approver"],
    title: "Manage leave requests",
    summary:
      "Leave Administration shows every leave request in your organisation, so you can act on them and keep cover in view.",
    opensFrom: "Leave Administration",
    steps: [
      {
        title: "Find the request",
        body: "Filter by Pending, Approved or Rejected, or search by employee, leave type or reason. Each row shows the dates, working days, reason and handover.",
        where: ["Leave Administration"],
      },
      {
        title: "Act on it",
        body: "Approve or reject directly, or use Send reminder to approver when a request is stuck with someone.",
        where: ["Leave Administration", "Approve / Reject"],
      },
    ],
    notes: [
      "This page needs permission to manage leave requests. Approvers usually work from the Approvals Inbox instead.",
    ],
    related: ["approve-or-reject-a-request", "open-an-administration-period"],
  },
  {
    slug: "set-up-loans",
    section: "loans",
    roles: ["admin"],
    title: "Set up loans and salary advances",
    summary:
      "Set your organisation's loan policy, decide who funds loans, and create the loan products your team can apply for.",
    opensFrom: "Loans",
    steps: [
      {
        title: "Set your loan policy",
        body: "In Loan settings, set the most a person's monthly repayments can be as a share of their gross salary, how many loans someone can have at once, the minimum months of employment, the grace period and the default repayment method. Turn on salary advances here if you offer them.",
        where: ["Loans", "Loan settings"],
      },
      {
        title: "Choose who funds loans",
        body: "Allow internal loans, funded by your organisation, and/or loans against Dash, funded by the platform. A Dash loan needs the employee to sign an agreement in the app.",
        where: ["Loans", "Loan settings", "Loan source"],
      },
      {
        title: "Turn on repayment methods",
        body: "Payroll deduction takes each instalment automatically when a payroll distribution is approved. External means you record each repayment by hand, such as a bank transfer.",
        where: ["Loans", "Repayment methods"],
      },
      {
        title: "Create a loan product",
        body: "Choose New product and set the interest rate and method, the minimum and maximum amount and tenure, and whether it needs a guarantor, collateral or approval. Make it active so people can apply.",
        where: ["Loans", "Loan products", "New product"],
        tip: "untick Requires approval and requests are approved automatically.",
      },
      {
        title: "Handle requests",
        body: "Requests from the Self-Service Portal show up here. Approve or reject them, disburse approved loans, record repayments and view each repayment schedule.",
        where: ["Loans"],
      },
    ],
    notes: [
      "Nobody can request a loan until at least one loan product is active.",
      "You can also set what happens to a loan when someone resigns or a payroll run misses an instalment.",
    ],
    related: ["request-a-loan", "run-payroll"],
  },
  {
    slug: "manage-loan-requests",
    section: "loans",
    roles: ["admin"],
    title: "Approve, disburse and track loans",
    summary:
      "Loan requests from the Self-Service Portal land on the Loans page. Take each one from request to fully repaid.",
    opensFrom: "Loans",
    steps: [
      {
        title: "Review the request",
        body: "Open a request to see the product, amount, instalment, tenure, interest and repayment method. A loan from Dash also shows the agreement the employee signed.",
        where: ["Loans"],
      },
      {
        title: "Approve or reject it",
        body: "Decide here or in the Approvals Inbox. Products that don't require approval are approved automatically.",
        where: ["Loans", "Approve / Reject"],
      },
      {
        title: "Disburse it",
        body: "Choose Disburse once the money has gone out. If your policy disburses on approval, this happens by itself.",
        where: ["Loans", "Disburse"],
      },
      {
        title: "Follow the repayments",
        body: "The repayment schedule shows every due date, principal, interest and balance. Instalments on payroll deduction are taken when a payroll distribution is approved. For external repayments, choose Record repayment and enter the amount, payment date and an optional note, such as a bank transfer reference.",
        where: ["Loans", "Repayment schedule"],
      },
    ],
    glossary: [
      { term: "Loan statuses", text: "Draft, Pending approval, Approved, Disbursed, Active, Repaid, Rejected, Cancelled and Defaulted." },
      { term: "On resignation or termination", text: "Your policy can switch the loan to external repayment, stop payroll deductions, flag it for settlement, or just notify HR." },
      { term: "When a payroll misses an instalment", text: "Your policy can catch it up next run, skip it, extend the schedule, or mark it overdue." },
      { term: "Loan product types", text: "Labels for grouping and reporting on products, such as Education. Archive a type to hide it from new products while keeping reports intact, or delete it if it's unused." },
    ],
    related: ["set-up-loans", "request-a-loan"],
  },
  {
    slug: "request-a-loan",
    section: "loans",
    roles: ["employee"],
    title: "Request a loan or salary advance",
    summary:
      "Apply from the Self-Service Portal, see what you'll repay each month before you send it, and track every repayment.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Start a request",
        body: "In the Loans tab, choose Request a loan. If your organisation offers both, pick who the loan is from: your organisation or Dash.",
        where: ["Self-Service Portal", "Loans", "Request a loan"],
      },
      {
        title: "Pick the amount and tenure",
        body: "Choose the loan type, amount and number of months, and say what it's for. dashhr shows your monthly instalment, the interest, and the most you can repay each month.",
        where: ["Self-Service Portal", "Loans"],
      },
      {
        title: "Sign the agreement for a Dash loan",
        body: "A loan from Dash comes with a loan agreement. Read it and sign it in the app before you submit.",
        where: ["Self-Service Portal", "Loans", "Loan agreement"],
      },
      {
        title: "Track it",
        body: "My loan requests shows each loan's status. Once it's running, View schedule shows every due date, payment and your outstanding balance.",
        where: ["Self-Service Portal", "Loans", "View schedule"],
      },
    ],
    notes: ["If you can't request a loan yet, HR hasn't set up an active loan product."],
    related: ["your-self-service-portal", "set-up-loans"],
  },
  {
    slug: "run-an-appraisal-cycle",
    section: "appraisals",
    roles: ["admin"],
    title: "Run an appraisal cycle",
    summary:
      "A cycle takes your team from choosing what to measure, to setting targets, to reviews and final ratings. You can run one cycle per administration period.",
    opensFrom: "Appraisals",
    steps: [
      {
        title: "Build your indicator library",
        body: "Create the KPIs you measure people on, such as Sales Volume or Tickets Resolved, with a unit like units, % or tickets.",
        where: ["Appraisals", "Indicator Library", "New indicator"],
      },
      {
        title: "Open a cycle",
        body: "Choose Open appraisal cycle, pick the administration period, and choose who reviews each person: their manager or department head, HR, or a specific employee.",
        where: ["Appraisals", "Cycles", "Open appraisal cycle"],
      },
      {
        title: "Set indicators and targets",
        body: "Add indicators for a whole department or one job role, with a weight for each. Accept or reject indicators that have been proposed, then lock them. Staff set their targets, and you lock those in too.",
        where: ["Appraisals", "Cycles", "Manage"],
      },
      {
        title: "Call up reviews",
        body: "Move the cycle into reviews. Reviewers call up interim or final reviews from My Team and score them.",
        where: ["Appraisals", "My Team", "Call up review"],
      },
      {
        title: "Close and report",
        body: "Closing the cycle works out final ratings, and no more changes can be made. Reports show completion, status and average scores by department.",
        where: ["Appraisals", "Reports"],
      },
    ],
    notes: [
      "A cycle moves through Draft, Indicators & targets, Reviews and Closed.",
      "Company Settings → Appraisals sets who creates the indicators. Top to bottom: department heads and HR choose them. Bottom to top: employees propose them and their department head reviews.",
      "Reports also count reviews that are published and acknowledged, and any appeals.",
    ],
    related: ["your-appraisal", "open-an-administration-period"],
  },
  {
    slug: "your-appraisal",
    section: "appraisals",
    roles: ["employee"],
    title: "Your appraisal, from targets to results",
    summary:
      "Your appraisal lives in the Self-Service Portal under Appraisals, in two parts: My Targets and My Reviews.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Propose indicators, if you're asked to",
        body: "If your organisation runs appraisals bottom to top, you propose the indicators you'll be measured on: a name, an optional unit and a proposed weight. Your department head reviews them. You can withdraw a proposal while it's waiting.",
        where: ["Self-Service Portal", "Appraisals", "Propose indicator"],
        tip: "top to bottom? your department head or HR picks them for you.",
      },
      {
        title: "Set your targets",
        body: "My Targets lists the indicators that apply to you, with their weights. Set a target for each, say how it will be measured, and submit it. Targets can only be set while the cycle is taking targets, and they're frozen while a review is open.",
        where: ["Self-Service Portal", "Appraisals", "My Targets"],
      },
      {
        title: "Enter your results",
        body: "When a review is opened for you, choose Enter my results, fill in what you achieved against each target, add any comments, and choose Submit my results.",
        where: ["Self-Service Portal", "Appraisals", "Enter my results"],
      },
      {
        title: "Read and acknowledge your review",
        body: "Once your reviewer completes and publishes your review, it appears in My Reviews with your rating and their comments. Choose Acknowledge to confirm you've seen it.",
        where: ["Self-Service Portal", "Appraisals", "My Reviews"],
      },
      {
        title: "Appeal, if you disagree",
        body: "On a published or acknowledged review, choose Appeal and give your reason. You can have one open appeal on a review at a time.",
        where: ["Self-Service Portal", "Appraisals", "My Reviews", "Appeal"],
      },
    ],
    notes: [
      "Your overall rating averages every completed review in the period, including the final review.",
      "The Dashboard tells you when a published review is waiting for you to acknowledge it.",
    ],
    related: ["review-your-team", "your-self-service-portal"],
  },
  {
    slug: "review-your-team",
    section: "appraisals",
    roles: ["approver", "admin"],
    title: "Review your team's performance",
    summary:
      "Managers, department heads and designated reviewers follow their people's appraisals and score them from the Appraisals page.",
    opensFrom: "Appraisals",
    steps: [
      {
        title: "Follow your team",
        body: "My Team shows the people you oversee in the current cycle: how many indicators they have, whether their targets are submitted, and their progress. Filter by relationship or progress, or search by name, department or role.",
        where: ["Appraisals", "My Team"],
      },
      {
        title: "Handle indicators and targets",
        body: "If your team proposes indicators, accept, edit or reject them, then lock them in. When everyone's targets are in, lock the department's targets.",
        where: ["Appraisals", "Cycles", "Manage"],
      },
      {
        title: "Call up a review",
        body: "Once someone has submitted their targets, choose Call up review. Pick an interim review, or the final review at the end of the cycle.",
        where: ["Appraisals", "My Team", "Call up review"],
      },
      {
        title: "Score, complete and publish",
        body: "Open the review, rate each target against what was achieved, add your comments and choose Complete review. Then choose Publish to employee so they can see it.",
        where: ["Appraisals", "Reviews"],
      },
      {
        title: "Resolve appeals",
        body: "If the employee appeals, the appeal shows on the review. Read their reason and resolve it.",
        where: ["Appraisals", "Reviews", "Resolve appeal"],
      },
    ],
    related: ["your-appraisal", "run-an-appraisal-cycle"],
  },
  {
    slug: "your-self-service-portal",
    section: "self-service",
    roles: ["employee"],
    title: "Your Self-Service Portal",
    summary:
      "Everything about you at work in one place: your profile, payslips, leave, loans, documents and appraisals.",
    opensFrom: "Self-Service Portal",
    glossary: [
      { term: "Profile", text: "Your personal and employment details. Changes you make are sent to HR to review before they go on your record. Track them under My change requests." },
      { term: "Records", text: "Next of kin, family members, dependants, education, work experience, training and certifications. New entries go to HR for review." },
      { term: "Leave", text: "Your balances, new requests, and anything you're covering as a relief officer." },
      { term: "Appraisals", text: "Your indicators and targets for the current cycle." },
      { term: "Payslips", text: "Your payslips, which appear once a payroll has been locked in." },
      { term: "Loans", text: "Request a loan or salary advance, and see each loan's repayment schedule." },
      { term: "Documents", text: "Upload documents HR needs, such as your ID. PDF, PNG or JPG files up to 8 MB. Each upload goes through approval." },
      { term: "My Team", text: "The people in your department." },
    ],
    notes: ["To cancel a profile change that's waiting for review, contact HR."],
    related: ["update-your-profile", "upload-documents"],
  },
  {
    slug: "update-your-profile",
    section: "self-service",
    roles: ["employee"],
    title: "Update your profile and records",
    summary:
      "Keep your details current yourself. Every change goes to HR to review before it's saved on your record.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Change your details",
        body: "In Profile, edit the details you're allowed to change, such as your contact details, address, bank details or next of kin, and submit. Your employment details are shown for reference; HR manages those.",
        where: ["Self-Service Portal", "Profile"],
      },
      {
        title: "Add to your records",
        body: "In Records, choose Add to record next of kin, family members, dependants, education, work experience, or training and certifications. Each new entry is sent to HR for review.",
        where: ["Self-Service Portal", "Records", "Add"],
      },
      {
        title: "Track your requests",
        body: "My change requests shows each update you've sent and whether it's still waiting, approved or rejected.",
        where: ["Self-Service Portal", "Profile", "My change requests"],
        tip: "to cancel one that's waiting, contact HR.",
      },
    ],
    related: ["your-self-service-portal", "approve-or-reject-a-request"],
  },
  {
    slug: "upload-documents",
    section: "self-service",
    roles: ["employee"],
    title: "Upload your documents",
    summary:
      "Send HR the documents your job needs, such as your ID or certificates. Each upload is checked and approved.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "See what's needed",
        body: "The Documents tab lists the documents for your job title. Ones marked Required are mandatory.",
        where: ["Self-Service Portal", "Documents"],
      },
      {
        title: "Upload the file",
        body: "Drop a file onto the document, or choose one. PDF, PNG and JPG files up to 8 MB are accepted.",
        where: ["Self-Service Portal", "Documents"],
      },
      {
        title: "Track it",
        body: "My uploaded documents shows the status of each upload. Preview a file, or remove an upload if you need to send a different one.",
        where: ["Self-Service Portal", "Documents", "My uploaded documents"],
      },
    ],
    notes: ["HR sets the documents each job title needs in Directory & Setups → Job Titles."],
    related: ["your-self-service-portal", "approve-or-reject-a-request"],
  },
  {
    slug: "view-your-payslips",
    section: "self-service",
    roles: ["employee"],
    title: "View your payslips",
    summary: "Every payslip that's been issued to you is in the Self-Service Portal.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Open your payroll history",
        body: "The Payslips tab lists your payslips by month. A payslip appears once that month's payroll has been locked in.",
        where: ["Self-Service Portal", "Payslips"],
      },
      {
        title: "Open a payslip",
        body: "Choose View to see your earnings, deductions, total deductions and net pay for the month.",
        where: ["Self-Service Portal", "Payslips", "View"],
        tip: "you'll also get a “Payslip available” email when payroll goes out.",
      },
    ],
    related: ["your-self-service-portal", "run-payroll"],
  },
  {
    slug: "roles-and-permissions",
    section: "access",
    roles: ["admin"],
    title: "Roles and permissions",
    summary:
      "Access Management decides what each person can see and do. Give each role exactly the resources and actions it needs.",
    opensFrom: "Access Management",
    steps: [
      {
        title: "Create a role",
        body: "In Roles, choose New role and give it a name and code, such as Payroll Officer. Duplicate copies every permission from an existing role into a new one.",
        where: ["Access Management", "Roles", "New role"],
      },
      {
        title: "Grant its permissions",
        body: "In Role Permissions, pick the role, then tick the resources and actions it needs.",
        where: ["Access Management", "Role Permissions"],
        tip: "full-access roles skip permission checks, so there's nothing to set.",
      },
      {
        title: "Give it to people",
        body: "In User Assignments, find a person and use Assign role. Revoke takes it away again.",
        where: ["Access Management", "User Assignments"],
      },
      {
        title: "Set defaults by job title",
        body: "In Job Title Defaults, choose the roles everyone with a job title gets automatically. People see these as inherited via job title.",
        where: ["Access Management", "Job Title Defaults"],
      },
    ],
    notes: [
      "System roles come with dashhr. Their code is locked, but you can rename them and edit their description.",
      "Changing roles and permissions needs Manage rights on Roles & Permissions. Without them, the page is read-only.",
    ],
    related: ["audit-trail", "add-your-employees"],
  },
  {
    slug: "audit-trail",
    section: "access",
    roles: ["admin"],
    title: "Check the audit trail",
    summary: "The Audit Trail shows who did what, and when, across every module in your organisation.",
    opensFrom: "Audit Trail",
    steps: [
      {
        title: "Narrow it down",
        body: "Filter by module, such as Payroll, Leave, Approvals, Documents or Access, or search by person, action or module.",
        where: ["Audit Trail"],
      },
      {
        title: "Read the entry",
        body: "Each row shows when it happened, who did it, the module and the action.",
        where: ["Audit Trail"],
      },
    ],
    related: ["roles-and-permissions"],
  },
  {
    slug: "company-settings",
    section: "settings",
    roles: ["admin"],
    title: "Brand your workspace",
    summary:
      "Company Settings holds your organisation's name, logo, colours and currency. Changes apply across the whole workspace when you save.",
    opensFrom: "Company Settings",
    steps: [
      {
        title: "Name and logo",
        body: "Set your organisation name, upload a company logo (PNG, JPG or SVG) for the sidebar, and a square favicon for the browser tab.",
        where: ["Company Settings", "Organization"],
      },
      {
        title: "Colours and theme",
        body: "Set your primary, secondary and accent colours as 6-digit hex codes, and choose light, dark or match system. The preview shows how the sidebar will look.",
        where: ["Company Settings", "Branding"],
      },
      {
        title: "Currency and appraisals",
        body: "Pick the default currency for payroll, loans and self-service amounts. Under Appraisals, choose Top to bottom (department heads and HR set indicators) or Bottom to top (employees propose them).",
        where: ["Company Settings", "Localization"],
      },
    ],
    notes: ["Editing Company Settings needs Manage rights on System Config."],
    related: ["single-sign-on"],
  },
  {
    slug: "single-sign-on",
    section: "settings",
    roles: ["admin"],
    title: "Turn on single sign-on",
    summary:
      "Let your team sign in through your own identity provider, such as Microsoft Entra ID, Okta or Keycloak, using OpenID Connect.",
    opensFrom: "Company Settings",
    steps: [
      {
        title: "Switch the sign-in method",
        body: "In Authentication, change from Password to Single sign-on (OIDC).",
        where: ["Company Settings", "Authentication"],
      },
      {
        title: "Register dashhr with your provider",
        body: "Copy the Redirect URI and add it to the app registration in your identity provider.",
        where: ["Company Settings", "Authentication", "Redirect URI"],
      },
      {
        title: "Fill in your provider's details",
        body: "Enter the Issuer URL, Client ID and Client secret from your identity provider, and the scopes to request.",
        where: ["Company Settings", "Authentication"],
      },
      {
        title: "Decide on new accounts",
        body: "By default, people must already be added in Directory & Setups before they can sign in. Turn on JIT provisioning to create an account automatically the first time someone signs in.",
        where: ["Company Settings", "Authentication", "JIT provisioning"],
      },
    ],
    related: ["company-settings", "add-your-employees"],
  },
];

export const guideBySlug = (slug) => GUIDES.find((g) => g.slug === slug);
export const guidesInSection = (sectionId) => GUIDES.filter((g) => g.section === sectionId);
export const sectionById = (id) => SECTIONS.find((s) => s.id === id);

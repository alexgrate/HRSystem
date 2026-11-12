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
      "Sign your organisation up for DashHR. You become its first administrator, and your team gets its own address to sign in at, such as acme.dashhr.app.",
    opensFrom: "dashhr.app",
    steps: [
      {
        title: "Open the sign-up form",
        where: ["dashhr.app", "Start your workspace"],
        actions: [
          "Go to **dashhr.app**.",
          "Click **Start your workspace** (or **Get started** on a phone).",
        ],
      },
      {
        title: "Fill in your organisation and your own details",
        where: ["Sign up"],
        actions: [
          "Type your **Organization name**. The **Workspace URL** fills itself in from it, for example **acme** for acme.dashhr.app. Change it if you want a different address.",
          "Enter your **First name**, **Last name** and **Your email**.",
          "Choose a **Password** of at least 6 characters and type it again in **Confirm password**.",
          "Click **Create workspace**. Doing so means you agree to the Terms and Privacy Policy linked under the button.",
        ],
      },
      {
        title: "Verify your email",
        where: ["Your inbox"],
        actions: [
          "You'll see **Check your email**. Open the email DashHR sent you.",
          "Click the verification link in it. Your workspace is activated and you're signed in.",
        ],
      },
      {
        title: "Set up the rest",
        where: ["Getting Started"],
        actions: ["Open **Getting Started** in the side menu and work through the checklist."],
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
      "Every organisation signs in at its own address. You'll use a password or your company's single sign-on, depending on how your organisation is set up.",
    opensFrom: "your-company.dashhr.app",
    steps: [
      {
        title: "Go to your workspace address",
        where: ["your-company.dashhr.app", "Log in"],
        actions: [
          "Open your company's address, for example **dmfb.dashhr.app**.",
          "Don't know it? Go to **dashhr.app**, click **Log in**, type your workspace name and click **Continue**. DashHR takes you to the right address.",
        ],
        tip: "it's in your onboarding email, or ask HR.",
      },
      {
        title: "Sign in with your password",
        where: ["Log in"],
        actions: [
          "Enter your **Work email** and **Password**.",
          "Leave **Remember me** ticked on your own device. Untick it on a shared computer, and you'll be signed out when the browser closes.",
          "Click **Sign in to dash**.",
        ],
      },
      {
        title: "Or sign in with single sign-on",
        where: ["Log in", "Continue with single sign-on"],
        actions: [
          "If your company uses single sign-on, you'll see **Continue with single sign-on** instead of a password box. Click it.",
          "Sign in on your company's page. You're brought back to DashHR, signed in.",
        ],
      },
      {
        title: "Sign out",
        where: ["Top bar", "Sign out"],
        actions: ["Click the red **Sign out** button in the top bar, next to your name."],
      },
    ],
    notes: [
      "Your account can be signed in on one browser or device at a time. If it's already signed in somewhere else, DashHR asks whether to sign out that session. Click **Sign out & continue** to carry on here.",
      "Accounts set to Inactive, Suspended or Terminated can't sign in.",
    ],
    related: ["set-or-reset-your-password", "find-your-way-around"],
  },
  {
    slug: "set-or-reset-your-password",
    section: "account",
    roles: ["admin", "approver", "employee"],
    title: "Set or reset your password",
    summary:
      "New to DashHR? Set your password from your onboarding email. Forgotten it? Reset it with a code sent to your work email.",
    opensFrom: "Log in",
    steps: [
      {
        title: "First time: set your password",
        where: ["Your inbox", "Set Your Password"],
        actions: [
          "Open the onboarding email HR sent you.",
          "Click **Set Your Password**.",
          "Type a password of at least 6 characters, type it again to confirm, and save it. Your account is now active.",
        ],
        tip: "the link expires after 48 hours. ask HR to resend it if it has.",
      },
      {
        title: "Forgot it: ask for a code",
        where: ["Log in", "Forgot password?"],
        actions: [
          "On your workspace's sign-in page, click **Forgot password?**",
          "Enter your **Work email** and send. DashHR emails you a **Verification code**.",
        ],
      },
      {
        title: "Enter the code and a new password",
        where: ["Reset your password"],
        actions: [
          "Type the **Verification code** from the email.",
          "Enter your **New password** and type it again in **Confirm password**, then submit.",
          "When you see that you can now sign in, click **Continue to sign in** and sign in with your new password.",
        ],
        tip: "no email? click resend code after the short wait.",
      },
    ],
    notes: [
      "If your organisation uses single sign-on, you don't have a DashHR password. Your password is managed by your company's identity provider.",
    ],
    related: ["sign-in"],
  },
  {
    slug: "find-your-way-around",
    section: "dashboard",
    roles: ["admin", "approver", "employee"],
    title: "Find your way around",
    summary:
      "The side menu holds every part of DashHR. You only see the pages your role allows, so your menu may be shorter than this list.",
    opensFrom: "Side menu",
    glossary: [
      { term: "Dashboard", text: "Your home page: what needs your attention, your own leave, pay, loans and appraisal, and organisation figures if your role can see them. Everyone has it." },
      { term: "Getting Started", text: "The setup checklist for a new workspace. Administrators." },
      { term: "Directory & Setups", text: "Staff records and the building blocks everything else uses: offices, departments, titles, grades, pay and leave types. HR." },
      { term: "Self-Service Portal", text: "Everything about you: profile, records, leave, appraisals, payslips, loans, documents and your team. Everyone has it." },
      { term: "Approval Workflows", text: "Who approves each kind of request, stage by stage. Administrators." },
      { term: "Approvals Inbox", text: "Leave, documents, profile updates and loans waiting for your decision. Approvers." },
      { term: "Payroll Processing", text: "Salary structure, monthly payroll runs and their approvals. Payroll and finance." },
      { term: "Leave Administration", text: "Every leave request in the organisation. HR." },
      { term: "Administration Periods", text: "The calendar windows that leave and appraisals belong to. HR." },
      { term: "Loans", text: "Loan policy, products, requests, disbursements and repayments. HR and finance." },
      { term: "Appraisals", text: "Your team's appraisals, cycles, the indicator library and reports. HR, managers and heads of department." },
      { term: "Access Management", text: "Roles, permissions and who holds them. Administrators." },
      { term: "Audit Trail", text: "A log of who did what, and when. Administrators and audit." },
      { term: "Company Settings", text: "Name, logo, colours, currency, appraisal type and sign-in method. Administrators." },
    ],
    notes: [
      "On a phone, open the side menu with the menu button at the top of the screen.",
      "If a page you should have is missing, ask an administrator to check your roles, then sign out and back in.",
    ],
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
    steps: [
      {
        title: "Deal with what's waiting",
        where: ["Dashboard", "Action items"],
        actions: [
          "Open **Dashboard** in the side menu.",
          "Read **Action items** at the top. Each one says what needs doing, such as approvals to review, an appraisal to acknowledge, or your profile to complete. Click it to go straight there.",
        ],
      },
      {
        title: "Use the shortcuts",
        where: ["Dashboard", "Quick actions"],
        actions: [
          "Under **My workspace**, use **Apply for leave**, **Apply for a loan** or **View payslip**.",
          "Under **Quick actions**, open the things your role does most, such as **Onboard employee**, **Review approvals** or **Run payroll**.",
        ],
      },
      {
        title: "Refresh the figures",
        where: ["Dashboard"],
        actions: ["Click **Refresh dashboard** to pull the latest numbers."],
      },
    ],
    glossary: [
      { term: "My workspace", text: "Your employment summary, leave, latest payslip, loans and appraisal." },
      { term: "My team", text: "For managers: your direct reports and the reviews in progress." },
      { term: "Organization", text: "For HR and other roles that can see it: headcount, pending approvals, appraisal completion, payroll, the loan portfolio, the roster by department, recent hires, the net pay trend and recent activity." },
      { term: "Organization health", text: "Gaps in your setup, such as employees without a manager, department, pay grade, job role or office, or no leave types, workflows or pay groups yet." },
    ],
    related: ["notifications", "find-your-way-around"],
  },
  {
    slug: "notifications",
    section: "dashboard",
    roles: ["admin", "approver", "employee"],
    title: "Notifications and emails",
    summary:
      "DashHR keeps you posted in the app and by email. The bell at the top of every page shows how many notifications you haven't read.",
    opensFrom: "Bell",
    steps: [
      {
        title: "Read your notifications",
        where: ["Bell", "Dashboard", "Notifications"],
        actions: [
          "Click the **bell** at the top of any page. It opens your **Dashboard**.",
          "Find **Notifications**. They're listed newest first.",
        ],
      },
      {
        title: "Clear them",
        where: ["Dashboard", "Notifications", "Mark all read"],
        actions: ["Click **Mark all read** once you've caught up."],
      },
    ],
    glossary: [
      { term: "Your requests", text: "Updates on your own leave, loans and appraisal reviews." },
      { term: "Activity", text: "If your role can see the audit trail, recent activity across the organisation." },
      { term: "Final approvals", text: "If your job title is set to Notify on final approval of any process, a notice whenever any request gets its last approval." },
      { term: "Emails", text: "Sent for things like a request waiting for your approval, a reminder about one, a payslip being available, and your onboarding and password codes." },
    ],
    notes: ["Notifications refresh by themselves while DashHR is open."],
    related: ["your-dashboard", "directory-and-setups"],
  },
  {
    slug: "set-up-your-workspace",
    section: "getting-started",
    roles: ["admin"],
    title: "Set up your workspace",
    summary:
      "Set your organisation up once, in this order, before adding staff. Each step uses what the one before it created. Getting Started tracks your progress.",
    opensFrom: "Getting Started",
    steps: [
      {
        title: "Open the checklist",
        where: ["Getting Started"],
        actions: [
          "Click **Getting Started** in the side menu. It lists Office Locations, Departments, Job Titles, Pay Grades & Benefits, Approval Workflows, Employees and Access control, and counts what you've added to each.",
          "Optional: click **Start with a template**, then **Load starter template**, to load sample departments, job titles, pay grades and leave types. Edit them afterwards to fit.",
        ],
        tip: "the template is the fastest way to see how it all fits together.",
      },
      {
        title: "Add your offices",
        where: ["Directory & Setups", "Offices"],
        actions: [
          "Go to **Directory & Setups** and open the **Offices** tab.",
          "Click **Add Office Location**.",
          "Fill in **Street Address**, **State** and **Country**. Tick **Set as Headquarters** for your head office.",
          "Click **Create Office Location**. Repeat for each office.",
        ],
      },
      {
        title: "Create your departments",
        where: ["Directory & Setups", "Departments"],
        actions: [
          "Open the **Departments** tab and click **Add Department**.",
          "Enter the **Department Name** and **Department Code**, for example Finance and FIN.",
          "Optionally choose a **Parent department** and the **Department head**.",
          "Click **Create Department**.",
        ],
        tip: "the department head approves “HOD” steps and runs the department's appraisals.",
      },
      {
        title: "Add job titles",
        where: ["Directory & Setups", "Job Titles"],
        actions: [
          "Open the **Job Titles** tab and click **Add Job Title**.",
          "Enter the **Job Title** and **Role Code**, for example HR Manager and HRM, and pick its **Department**.",
          "Under **Required Documents**, list what people in this job must upload, such as National ID.",
          "Tick **Notify on final approval of any process** for roles that should hear whenever a request is fully approved, such as HR Lead.",
          "Click **Create Job Title**.",
        ],
      },
      {
        title: "Set up grades, pay and benefits",
        where: ["Directory & Setups", "Pay Grades"],
        actions: [
          "In **Benefit Levels**, add your benefit packages first.",
          "In **Grades**, add your staff levels with their salary range.",
          "In **Pay Grades**, add each salary band: **Min Salary**, **Max Salary**, its **Benefit Level** and **Max Loan Applicable**.",
          "In **Pay Groups**, add the groups you pay together, such as Monthly Staff. Payroll runs one pay group at a time.",
          "In **Allowances**, add named allowances with an amount for each benefit level.",
          "In **Leave Types**, add each kind of leave with its **Days Allowed**, whether it's paid, whether it needs approval, and which pay grades can use it.",
        ],
      },
      {
        title: "Build your approval workflows",
        where: ["Approval Workflows"],
        actions: ["Create one active workflow for each kind of request your organisation uses."],
        link: { slug: "build-an-approval-workflow", label: "How to build a workflow" },
      },
      {
        title: "Add your employees, then give out access",
        where: ["Directory & Setups", "Employees"],
        actions: [
          "Add your people one at a time or with a file.",
          "Then set up roles in **Access Management** so each person sees the right pages.",
        ],
        link: { slug: "add-your-employees", label: "How to add employees" },
        tip: "all done = ready for your first payroll ✓",
      },
    ],
    notes: [
      "Leave dates must fall inside an administration period, so open one before your team starts requesting leave.",
      "Every setup tab has **Template** and **Bulk upload**, so you can load any of them from a CSV or JSON file.",
    ],
    related: ["directory-and-setups", "open-an-administration-period"],
  },
  {
    slug: "add-your-employees",
    section: "getting-started",
    roles: ["admin"],
    title: "Add your employees",
    summary:
      "HR creates each employee record, the employee activates their account from an emailed link, and HR keeps the record current.",
    opensFrom: "Directory & Setups",
    before: [
      "Offices, departments, job titles, pay grades and pay groups exist, so you can pick them.",
    ],
    steps: [
      {
        title: "Add one person",
        where: ["Directory & Setups", "Employees", "New employee"],
        actions: [
          "Go to **Directory & Setups** and open the **Employees** tab.",
          "Click **New employee**.",
          "Fill in their name, email, phone, job title, department, manager, pay grade, pay group, report location, start date and base salary. New staff start on **Probation** as their employment status.",
          "Click **Create employee**.",
        ],
        tip: "the manager you pick is who “line manager” approval steps go to.",
      },
      {
        title: "Or add many at once",
        where: ["Directory & Setups", "Employees", "Bulk upload"],
        actions: [
          "On the **Employees** tab, click **Template** to download the file layout.",
          "Fill in one row per person. Only first name, last name and email are required.",
          "Click **Bulk upload**, choose your CSV or JSON file, and upload it.",
          "Read the results. Rows that weren't added are listed with the reason, so you can fix them and upload just those again.",
        ],
      },
      {
        title: "Send their onboarding emails",
        where: ["Directory & Setups", "Employees"],
        actions: [
          "For one person: open the menu on their row and click **Send onboarding email**.",
          "For several: tick the boxes beside their names, or **Select all employees on this page**, then click **Send emails**.",
          "Each person gets a link to set their password. It expires after 48 hours, so send it again if it lapses.",
        ],
        tip: "on single sign-on? staff skip this and just sign in.",
      },
    ],
    notes: [
      "Bank details aren't on the **New employee** form or in the bulk upload. Each employee adds their own in **Self-Service Portal → Profile → Financial Information**, and HR approves it. Ask new staff to do this before their first payroll.",
    ],
    related: ["view-and-edit-an-employee", "update-your-profile"],
  },
  {
    slug: "directory-and-setups",
    section: "directory",
    roles: ["admin"],
    title: "What each Directory & Setups tab is for",
    summary:
      "Directory & Setups holds your people and the building blocks everything else uses. Each tab has an Add button, plus Template and Bulk upload for loading a file.",
    opensFrom: "Directory & Setups",
    steps: [
      {
        title: "Add or change an entry on any tab",
        where: ["Directory & Setups"],
        actions: [
          "Open the tab, for example **Departments**.",
          "Click **Add Department** (each tab's button is named after it), fill in the form and click **Create Department**.",
          "To change one, open its menu and click **Edit**, change the details and click **Save Changes**. **Delete** removes it.",
        ],
      },
    ],
    glossary: [
      { term: "Employees", text: "Everyone in your organisation. Search, filter by grade or status, sort, and set rows per page." },
      { term: "Offices", text: "Your office locations, with one marked as headquarters." },
      { term: "Departments", text: "Units with a code, an optional parent department and a department head." },
      { term: "Job Titles", text: "The roles people are hired into, with their department, required documents, and whether holders are notified when any request is fully approved." },
      { term: "Grades", text: "Staff levels, such as G1 Entry Level, with a salary range. Approval stages can be limited to a grade." },
      { term: "Pay Grades", text: "Salary bands with a minimum and maximum, a benefit level, and the largest loan someone on the grade can apply for." },
      { term: "Pay Groups", text: "Staff who are paid together, such as Monthly Staff. Payroll runs one pay group at a time." },
      { term: "Benefit Levels", text: "Named benefit packages, such as a management level package." },
      { term: "Allowances", text: "Named allowances, such as housing or transport, with an amount for a benefit level." },
      { term: "Leave Types", text: "Kinds of leave with Days Allowed per period, paid or unpaid, whether approval is needed, its benefit level, and which pay grades can use it. Pick no pay grades and everyone can." },
    ],
    related: ["set-up-your-workspace", "add-your-employees"],
  },
  {
    slug: "view-and-edit-an-employee",
    section: "directory",
    roles: ["admin"],
    title: "View and edit an employee's record",
    summary:
      "Open anyone in the directory to see their whole record, change their details, or change their status when things change.",
    opensFrom: "Directory & Setups",
    steps: [
      {
        title: "Find the person",
        where: ["Directory & Setups", "Employees"],
        actions: [
          "Go to **Directory & Setups → Employees**.",
          "Type in **Search…**, or use the grade and status filters and the sort menu.",
        ],
      },
      {
        title: "Open their record",
        where: ["Employees", "View details"],
        actions: [
          "Open the menu on their row and click **View details**.",
          "Read their personal, employment, contact, address, emergency contact, financial and compensation details, next of kin, family, dependants, education, work experience, training, documents, leave history, loan history and profile update requests.",
        ],
      },
      {
        title: "Edit their employment details",
        where: ["Employees", "Edit"],
        actions: [
          "Click **Edit**.",
          "Change job title, department, manager, pay grade, pay group, report location, dates, contract type, **Employment status** or base salary.",
          "Click **Save Changes**.",
        ],
        tip: "a person's name is set when they're created and can't be edited here.",
      },
      {
        title: "Change their account status",
        where: ["Employees", "Change status"],
        actions: [
          "Open the menu on their row and click **Change status**.",
          "Choose Active, On leave, Inactive, Suspended, Terminated, Resigned or Retired.",
          "When someone leaves, set their **Exit date** and an optional **Reason**.",
          "To bring someone back later, click **Reactivate**.",
        ],
      },
    ],
    notes: [
      "**Employment status** (Probation, Confirmed, Suspended, Terminated, Resigned) records their employment. **Account status** controls sign-in: Inactive, Suspended and Terminated accounts can't sign in.",
      "You can't change your own account status.",
      "Bank details show under **Financial Information** in **View details**, but HR can't type them in here. The employee enters them in Self-Service, and you approve the change in the **Approvals Inbox**.",
      "Changes people make to their own details in the Self-Service Portal come to HR as profile update requests and are saved only once approved.",
    ],
    related: ["add-your-employees", "approve-or-reject-a-request"],
  },
  {
    slug: "build-an-approval-workflow",
    section: "workflows",
    roles: ["admin"],
    title: "Build an approval workflow",
    summary:
      "A workflow is the ordered list of approvals a request goes through. A request is final only after its last stage approves; a rejection at any stage ends it.",
    opensFrom: "Approval Workflows",
    steps: [
      {
        title: "Start a new workflow",
        where: ["Approval Workflows", "New workflow"],
        actions: [
          "Open **Approval Workflows** in the side menu and click **New workflow**.",
          "Type a **Workflow name**, for example “Manager → HR leave approval”.",
          "Pick the **Process type**: Leave Request, Loan Request, Profile Update, Document Upload, Payroll Submission, Payroll Lock-in or Payroll Distribution.",
        ],
      },
      {
        title: "Add the approval stages",
        where: ["Approval Workflows", "Add stage"],
        actions: [
          "Click **Add stage** for each approval, in order.",
          "For each stage, choose who approves: **Job role** (anyone with that job title), **Requester's line manager**, or **Requester's department head (HOD)**.",
          "For a job role, optionally limit it to one **Grade**, and tick **All holders must approve** if everyone with that role must sign off.",
          "Use the up and down arrows to reorder stages. Check **Live preview** to see the route a request will take.",
        ],
        tip: "line manager and HOD are worked out per request, from each person's own record.",
      },
      {
        title: "Switch it on and save",
        where: ["Approval Workflows", "Workflow active"],
        actions: [
          "Make sure **Workflow active** is switched on.",
          "Click **Create workflow** (or **Save changes** when editing).",
        ],
      },
    ],
    notes: [
      "Leave, payroll, loans and documents can't be submitted until an active workflow of their type exists.",
      "If a stage has nobody to approve, for example the requester has no line manager, that stage is skipped automatically.",
      "Payroll needs three workflows: Payroll Submission, Payroll Lock-in and Payroll Distribution.",
      "Use **Duplicate** to copy a workflow, the toggle to switch one off (it keeps its history), and **Recent approval decisions** to see what was decided lately.",
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
        where: ["Approvals Inbox"],
        actions: [
          "Click **Approvals Inbox** in the side menu.",
          "Pick a tab: **Leave Requests**, **Documents**, **Profile Updates** or **Loans**. Use **Sort** to order them by newest, oldest or requester.",
        ],
      },
      {
        title: "Look at the request",
        where: ["Approvals Inbox", "Details"],
        actions: [
          "Click a request, or **Details**, to open it.",
          "Check what's being asked: the dates and balance on leave, the **Requested changes** on a profile update, or a **Preview** of an uploaded document.",
          "Look at **Approval workflow** to see which stages are done and which remain.",
        ],
      },
      {
        title: "Decide",
        where: ["Approvals Inbox", "Approve / Reject"],
        actions: [
          "Write your reason in **Add a note**.",
          "Click **Approve** or **Reject**. Approving passes it to the next stage, or finishes it if yours was the last. Rejecting ends it.",
        ],
        tip: "your note stays on the request's history.",
      },
    ],
    notes: [
      "You only see the Approvals Inbox if your role can approve at least one of these request types.",
      "Payroll is approved on the Payroll Processing page, not in the inbox.",
      "The person who asked can send you a reminder if a leave request has been waiting.",
    ],
    related: ["build-an-approval-workflow", "cover-as-relief-officer"],
  },
  {
    slug: "cover-as-relief-officer",
    section: "approvals",
    roles: ["employee", "approver"],
    title: "Cover for a colleague as relief officer",
    summary:
      "When a colleague names you as relief officer and their leave is approved, you stand in for them while they're away, including their approvals.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "See who you're covering",
        where: ["Self-Service Portal", "Leave", "You're covering"],
        actions: [
          "Go to **Self-Service Portal → Leave**.",
          "Find **You're covering**. It shows whose leave you're covering and the dates. Click **View handover** to read their handover document if they attached one.",
        ],
      },
      {
        title: "Act for them while they're away",
        where: ["Approvals Inbox"],
        actions: [
          "From the first to the last day of their approved leave, you get their access in DashHR.",
          "Check your **Approvals Inbox**: requests that would go to them come to you as well.",
        ],
        tip: "it ends by itself when their leave does.",
      },
    ],
    notes: ["Cover only goes one level. If the person you cover is covering for someone else, you don't pick that up too."],
    related: ["request-leave", "approve-or-reject-a-request"],
  },
  {
    slug: "set-up-payroll-line-items",
    section: "payroll",
    roles: ["admin"],
    title: "Set up the salary structure",
    summary:
      "Line items decide how each pay grade's base salary turns into gross pay, deductions and net pay. Set them once per pay grade.",
    opensFrom: "Payroll Processing",
    before: ["Pay grades exist in Directory & Setups."],
    steps: [
      {
        title: "Pick a pay grade",
        where: ["Payroll Processing", "Line items"],
        actions: [
          "Open **Payroll Processing** and go to **Line items**.",
          "Choose the **Pay grade** you want to set up.",
        ],
      },
      {
        title: "Add each line item",
        where: ["Payroll Processing", "Line items", "Add item"],
        actions: [
          "Click **Add item** and give it a **Name**, such as Basic, Housing or Pension.",
          "Pick what it is: **Earning** (part of gross pay), **Deduction** (taken off the employee's pay) or **Employer cost** (paid by the company on top, such as employer pension, NSITF or ITF).",
          "Pick how it's calculated: **Fixed amount**, **Percentage of base salary**, **Percentage of another line item**, **Sum of other line items**, or **PAYE — calculated automatically** for income tax.",
          "For the staff pension contribution, National Housing Fund and NHIS, tick **Tax relief** so they come out of taxable income before PAYE.",
          "Save the item. Repeat for the rest.",
        ],
        tip: "PAYE uses the Nigeria Tax Act 2025 bands.",
      },
      {
        title: "Check how base salary is split",
        where: ["Payroll Processing", "Line items"],
        actions: [
          "Read **How base salary is split on this grade**. Earnings split the base salary, and anything not allocated shows as **Balance of base salary**.",
          "Make sure earnings don't add up to more than 100%. Payroll won't run if they do.",
        ],
      },
      {
        title: "Or load it from a file",
        where: ["Payroll Processing", "Line items", "Bulk upload"],
        actions: [
          "Click **Bulk upload**.",
          "Use **Start from the standard salary structure**, or **Download template**, fill it in and upload the **CSV file**.",
        ],
      },
    ],
    related: ["run-payroll", "directory-and-setups"],
  },
  {
    slug: "run-payroll",
    section: "payroll",
    roles: ["admin", "approver"],
    title: "Run monthly payroll",
    summary:
      "Every payroll run goes through four stages: preview, approval, lock-in and distribution. Payslips are released when distribution is approved.",
    opensFrom: "Payroll Processing",
    before: [
      "The salary structure is set up for each pay grade.",
      "A pay group exists, with staff in it.",
      "Payroll Submission, Payroll Lock-in and Payroll Distribution workflows are active.",
    ],
    steps: [
      {
        title: "Create the run",
        where: ["Payroll Processing", "Run payroll"],
        actions: [
          "Open **Payroll Processing** and click **Run payroll**.",
          "Choose the **Month**, **Year** and **Pay group**, and confirm the **Working days in the month**.",
          "Confirm. DashHR works out everyone's pay as a preview.",
        ],
      },
      {
        title: "Check the preview",
        where: ["Payroll Processing", "Preview"],
        actions: [
          "Click the run to open it. Each employee's days, gross pay, deductions, net pay and employer cost are shown.",
          "If someone worked fewer days, change their **Days** and click **Recalculate**. **Discard** undoes your changes.",
          "Click **Download schedule (CSV)** for every employee's figures, account number, PAYE ID and pension details.",
        ],
        tip: "made a mistake? click delete run while it's still a preview and start again.",
      },
      {
        title: "Submit it for approval",
        where: ["Payroll Processing", "Approval"],
        actions: [
          "Click **Submit for approval**.",
          "Approvers open the run on this page and click **Approve payroll** or **Reject payroll**. If it's rejected, it goes back to preview for you to fix and submit again.",
        ],
      },
      {
        title: "Lock it in",
        where: ["Payroll Processing", "Lock-in"],
        actions: [
          "Once approved, click **Request lock-in**.",
          "Approvers click **Approve lock-in** or **Reject lock-in**.",
        ],
      },
      {
        title: "Distribute it",
        where: ["Payroll Processing", "Distribution"],
        actions: [
          "Once locked in, click **Request distribution**.",
          "When an approver clicks **Approve distribution**, the run is **Fully distributed**: payslips appear in everyone's Self-Service Portal, everyone gets a “Payslip available” email, and loan repayments on payroll deduction are taken.",
        ],
        tip: "fully distributed = done for the month ✓",
      },
      {
        title: "Make late changes, if needed",
        where: ["Payroll Processing", "Adjustments"],
        actions: [
          "From approval until distribution is approved, click **Add adjustment** for a one-off earning or deduction for one person: choose the **Type**, enter the **Amount** and a **Reason**. Adjustments are approved with **Approve adjustment**.",
          "Or click **Add column** for an extra earning or deduction for one person or everyone on the run.",
        ],
      },
    ],
    notes: ["Adjustments can't be added or approved once a payroll has been distributed."],
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
        title: "Create a period",
        where: ["Administration Periods", "Schedule period"],
        actions: [
          "Open **Administration Periods** in the side menu.",
          "Click **Schedule period** for a future window, or **Open period now** to start one today.",
          "Give it an optional **Name**, such as H2 2026, and set the **Start date** and **End date**.",
          "Click **Schedule period** (or **Open period**) to save.",
        ],
      },
      {
        title: "Keep the calendar going",
        where: ["Administration Periods"],
        actions: [
          "Check **Current period** and **Next scheduled** at the top.",
          "Schedule the next period before the current one ends. Periods can't overlap.",
        ],
        tip: "statuses move by themselves: scheduled → active → completed.",
      },
    ],
    notes: [
      "Leave dates must fall inside an active or scheduled period.",
      "Each leave type's Days Allowed are counted per period, so balances start fresh each period.",
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
      "Ask for time off from the Self-Service Portal, see your balances, and follow your request until it's decided.",
    opensFrom: "Self-Service Portal",
    before: ["HR has set up leave types for your pay grade, an administration period covering your dates, and an active Leave Request workflow."],
    steps: [
      {
        title: "Open your leave",
        where: ["Self-Service Portal", "Leave"],
        actions: [
          "Go to **Self-Service Portal → Leave**, or click **Apply for leave** on your Dashboard.",
          "Check your balances for each leave type.",
        ],
      },
      {
        title: "Fill in the request",
        where: ["Self-Service Portal", "Leave", "Request leave"],
        actions: [
          "Click **Request leave**.",
          "Pick the leave type, then your **Start Date** and **End Date**.",
          "Write your **Purpose / Reason**.",
          "Optionally choose a **Relief officer** to cover for you, and attach a **Handover document**.",
          "Click **Submit Leave Request**. It goes to the first approver in your workflow.",
        ],
        tip: "a handover note makes approvers' lives easier.",
      },
      {
        title: "Follow it through",
        where: ["Self-Service Portal", "Leave", "My leave requests"],
        actions: [
          "Watch its status under **My leave requests**. You're notified when it's approved or declined.",
          "While it's still waiting, you can click **Edit** or **Cancel**, or **Remind** to nudge the approver.",
        ],
      },
    ],
    notes: [
      "Some leave types don't need approval. Those requests are approved as soon as you submit them.",
      "DashHR won't accept a request that goes over the days allowed for the period, counting what's already approved or pending.",
      "Dates can't overlap a leave request you've already made.",
    ],
    related: ["cover-as-relief-officer", "manage-leave-requests"],
  },
  {
    slug: "manage-leave-requests",
    section: "leave",
    roles: ["admin", "approver"],
    title: "Manage leave requests",
    summary:
      "Leave Administration shows every leave request in your organisation, so HR can act on them and chase ones that are stuck.",
    opensFrom: "Leave Administration",
    steps: [
      {
        title: "Find the request",
        where: ["Leave Administration"],
        actions: [
          "Open **Leave Administration** in the side menu.",
          "Click **Pending**, **Approved**, **Rejected** or **All**, or type in the search box to filter by employee, type or reason.",
          "Each row shows the dates, working days, reason, status and handover.",
        ],
      },
      {
        title: "Act on it",
        where: ["Leave Administration", "Approve / Reject"],
        actions: [
          "Click **Approve** or **Reject**.",
          "If a request is stuck with someone, click **Send reminder to approver**.",
        ],
      },
    ],
    notes: ["This page needs permission to manage all leave requests. Approvers usually work from the Approvals Inbox instead."],
    related: ["approve-or-reject-a-request", "open-an-administration-period"],
  },
  {
    slug: "set-up-loans",
    section: "loans",
    roles: ["admin"],
    title: "Set up loans and salary advances",
    summary:
      "Set your organisation's loan rules once, decide who funds loans, and create the products your team can apply for.",
    opensFrom: "Loans",
    steps: [
      {
        title: "Set the loan policy",
        where: ["Loans", "Loan settings", "Organization loan policy"],
        actions: [
          "Open **Loans** in the side menu and go to **Loan settings**.",
          "Under **Organization loan policy**, set the **Max repayment ratio (% of monthly gross)**, **Max concurrent active loans**, **Minimum employment (months)**, **Repayment grace period (days)** and **Default repayment method**.",
          "Switch on what applies: **Allow probation employees**, **Allow duplicate active loans**, **Salary advance enabled**, **Payroll deduction mandatory**, **Allow external repayment**, **Disburse on approval**.",
          "Choose what happens **On resignation / termination** and the **Missed payroll behaviour**.",
          "Click **Save**.",
        ],
      },
      {
        title: "Choose who funds loans",
        where: ["Loans", "Loan settings", "Loan source"],
        actions: [
          "Under **Loan source**, tick **Allow internal (organization-funded) loans**, **Allow loans against Dash**, or both.",
          "A loan against Dash is funded by the platform, and the employee signs a loan agreement in the app.",
          "Click **Save**.",
        ],
      },
      {
        title: "Switch on repayment methods",
        where: ["Loans", "Repayment methods"],
        actions: [
          "Under **Repayment methods**, switch on **Payroll deduction** (instalments are taken when a payroll distribution is approved) and/or **External (manual)** (you record each repayment by hand).",
        ],
      },
      {
        title: "Create loan products",
        where: ["Loans", "Loan products", "New product"],
        actions: [
          "Optionally add **Loan product types**, such as Education, for grouping and reports.",
          "Click **New product**. Set the **Name**, **Product type**, **Interest (% / yr)**, **Interest method**, amount limits and tenure limits.",
          "Tick **Requires guarantor** or **Requires collateral** if needed. Untick **Requires approval** to approve requests automatically.",
          "Choose **Active — employees can request it** and click **Create product**.",
        ],
      },
    ],
    notes: [
      "Nobody can request a loan until at least one product is active.",
      "The most anyone can borrow is capped by their pay grade's Max Loan Applicable.",
      "Make sure a Loan Request approval workflow is active.",
    ],
    related: ["manage-loan-requests", "request-a-loan"],
  },
  {
    slug: "manage-loan-requests",
    section: "loans",
    roles: ["admin"],
    title: "Approve, disburse and track loans",
    summary:
      "A loan moves from requested to approved, disbursed, active and repaid. Loan requests from the Self-Service Portal land on the Loans page.",
    opensFrom: "Loans",
    steps: [
      {
        title: "Find the request",
        where: ["Loans"],
        actions: [
          "Open **Loans** and filter by status, or search by employee, product or reason.",
          "Open a request to see the product, amount, instalment, tenure, interest and repayment method. A loan against Dash also shows its signed **Loan agreement**.",
        ],
      },
      {
        title: "Approve or reject it",
        where: ["Loans", "Approve / Reject"],
        actions: [
          "Click **Approve loan** or **Reject loan** here, or decide in **Approvals Inbox → Loans**.",
        ],
      },
      {
        title: "Disburse it",
        where: ["Loans", "Disburse"],
        actions: [
          "Once the money has been paid out, click **Disburse** and confirm.",
          "If **Disburse on approval** is on in your policy, this happens by itself.",
        ],
      },
      {
        title: "Track the repayments",
        where: ["Loans", "Repayment schedule"],
        actions: [
          "Open the loan's **Repayment schedule** to see each due date, principal, interest and balance.",
          "Payroll-deduction instalments are taken when a payroll distribution is approved.",
          "For money paid directly, click **Record repayment**, enter the amount, **Payment date** and an optional **Note** such as a bank transfer reference, and click **Record repayment**.",
        ],
      },
    ],
    glossary: [
      { term: "Loan statuses", text: "Draft, Pending approval, Approved, Disbursed, Active, Repaid, Rejected, Cancelled and Defaulted." },
      { term: "Product types", text: "Archive a type to hide it from new products while keeping reports intact. Delete only works if it's unused." },
    ],
    related: ["set-up-loans", "request-a-loan"],
  },
  {
    slug: "request-a-loan",
    section: "loans",
    roles: ["employee"],
    title: "Request a loan or salary advance",
    summary:
      "Apply from the Self-Service Portal, see what you'll repay each month before you send it, and follow every repayment.",
    opensFrom: "Self-Service Portal",
    before: ["HR has set up at least one active loan product."],
    steps: [
      {
        title: "Start a request",
        where: ["Self-Service Portal", "Loans", "Request a loan"],
        actions: [
          "Go to **Self-Service Portal → Loans**, or click **Apply for a loan** on your Dashboard.",
          "Click **Request a loan**.",
          "If your organisation offers both, pick the **Loan source**: **My organization** or **Dash**.",
        ],
      },
      {
        title: "Choose the amount and tenure",
        where: ["Self-Service Portal", "Loans"],
        actions: [
          "Pick the **Loan type**, then enter the **Amount**, **Tenure (months)** and **Start date**, and say what it's for.",
          "Check the quote as you type: **Monthly installment**, interest, and your **Max monthly repayment**.",
        ],
      },
      {
        title: "Submit it",
        where: ["Self-Service Portal", "Loans"],
        actions: [
          "For a loan from your organisation, click **Submit Loan Request**.",
          "For a loan against Dash, click **Continue to Agreement**, read the agreement, sign it, and submit.",
        ],
      },
      {
        title: "Follow it",
        where: ["Self-Service Portal", "Loans", "My loan requests"],
        actions: [
          "Watch its status under **My loan requests**. While it's pending you can edit or cancel it.",
          "Once it's running, click **View schedule** for every due date, payment and your outstanding balance. Click **View agreement** to reopen a signed Dash agreement.",
        ],
      },
    ],
    notes: ["The most you can borrow depends on your pay grade, and your monthly repayments can't go over your organisation's limit."],
    related: ["your-self-service-portal", "set-up-loans"],
  },
  {
    slug: "run-an-appraisal-cycle",
    section: "appraisals",
    roles: ["admin"],
    title: "Run an appraisal cycle",
    summary:
      "A cycle runs from agreeing indicators, to setting targets, to reviewing results and publishing them. You can run one cycle per administration period.",
    opensFrom: "Appraisals",
    before: [
      "An administration period covers the appraisal window.",
      "Your appraisal type is set in Company Settings → Appraisals: Top to bottom (department heads choose indicators) or Bottom to top (staff propose them).",
    ],
    steps: [
      {
        title: "Build the indicator library",
        where: ["Appraisals", "Indicator Library", "New indicator"],
        actions: [
          "Open **Appraisals** and go to the **Indicator Library** tab.",
          "Click **New indicator**. Enter the **Name**, an optional **Description** and a **Measurement unit**, such as units, % or tickets. Click **Save**.",
          "Use **Deactivate** to retire one and **Show inactive** to find it again.",
        ],
      },
      {
        title: "Open the cycle",
        where: ["Appraisals", "Cycles", "Open appraisal cycle"],
        actions: [
          "Go to the **Cycles** tab and click **Open appraisal cycle**.",
          "Pick the **Administration period**, give an optional **Cycle name**, and choose the **Reviewer assignment**: relationship (manager or department head), manager only, department head only, HR (a designated employee), or a specific employee.",
        ],
      },
      {
        title: "Set the indicators",
        where: ["Appraisals", "Cycles", "Manage"],
        actions: [
          "Open the cycle and pick a department.",
          "Top to bottom: click **Add department indicator**, choose the indicator, give it a **Weight**, and optionally limit it to one **Job role**.",
          "Bottom to top: staff propose their own. The department head opens each proposal and clicks **Accept**, **Edit** or **Reject**.",
          "Click **Lock indicators** for the department. Staff can't set targets until indicators are locked.",
        ],
      },
      {
        title: "Lock in targets",
        where: ["Appraisals", "Cycles", "Target progress"],
        actions: [
          "Open **Target progress** to see each person's indicators, targets set and submitted.",
          "When everyone's ready, click **Lock targets**. Only an administrator, or someone allowed to unlock, can click **Unlock**.",
        ],
      },
      {
        title: "Run the reviews",
        where: ["Appraisals", "Cycles", "Start reviewing"],
        actions: [
          "Click **Start reviewing** to move the cycle into reviews.",
          "Under **Performance reviews**, call up a review session for a department. Staff enter their results, and reviewers score them.",
          "Click **Close session** when a department's reviews are done.",
        ],
        link: { slug: "review-your-team", label: "How reviewers score" },
      },
      {
        title: "Close and report",
        where: ["Appraisals", "Reports"],
        actions: [
          "Click **Close cycle** when everything's finished. Closing freezes the cycle: no more target or review edits.",
          "Open **Reports** for completion, status, average scores by department, publications, acknowledgements and appeals.",
          "Click **Archive** to file a closed cycle away, or **Reopen to active** if you need to make changes.",
        ],
      },
    ],
    related: ["review-your-team", "your-appraisal"],
  },
  {
    slug: "your-appraisal",
    section: "appraisals",
    roles: ["employee"],
    title: "Your appraisal, from targets to results",
    summary:
      "Your appraisal lives in the Self-Service Portal under Appraisals, in two parts: My Targets and My Reviews. You only see your own.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Propose indicators, if you're asked to",
        where: ["Self-Service Portal", "Appraisals", "Propose indicator"],
        actions: [
          "In a bottom-to-top cycle, go to **Self-Service Portal → Appraisals** and click **Propose indicator**.",
          "Enter the **Indicator name**, an optional **Measurement unit** and **Description**, and a **Proposed weight**. Save it.",
          "Your department head reviews it. You can **Withdraw** a proposal while it's waiting.",
        ],
        tip: "top to bottom? your department head or HR picks them for you.",
      },
      {
        title: "Set your targets",
        where: ["Self-Service Portal", "Appraisals", "My Targets"],
        actions: [
          "Open **My Targets**. It lists your indicators and their weights.",
          "Click **Set target** on each one, enter the target and how it will be measured, and click **Save**. It's saved as a draft.",
          "When you're ready, open it with **Edit target** and click **Submit target**. A submitted target can't be edited.",
        ],
      },
      {
        title: "Enter your results",
        where: ["Self-Service Portal", "Appraisals", "Enter my results"],
        actions: [
          "When a review is opened for you, click **Enter my results**.",
          "Fill in what you achieved against each target, add any comments, and click **Submit my results**.",
        ],
      },
      {
        title: "Acknowledge or appeal your review",
        where: ["Self-Service Portal", "Appraisals", "My Reviews"],
        actions: [
          "When your reviewer publishes it, open **My Reviews** to read your rating and their comments.",
          "Click **Acknowledge** to confirm you've seen it.",
          "If you disagree, click **Appeal**, write your **Reason for appeal**, and click **Submit appeal**.",
        ],
      },
    ],
    notes: [
      "Your overall rating averages every completed review in the period, including the final review.",
      "Targets are frozen while a review is open, and can only be set while the cycle is taking targets.",
    ],
    related: ["review-your-team", "your-self-service-portal"],
  },
  {
    slug: "review-your-team",
    section: "appraisals",
    roles: ["approver", "admin"],
    title: "Review your team's performance",
    summary:
      "Line managers, department heads and designated reviewers follow their people's appraisals and score them from the Appraisals page.",
    opensFrom: "Appraisals",
    steps: [
      {
        title: "Follow your team",
        where: ["Appraisals", "My Team"],
        actions: [
          "Open **Appraisals** and go to **My Team**.",
          "See each person's indicators, whether their targets are submitted, and their progress. Filter by relationship or progress, or search by name, department or role.",
        ],
      },
      {
        title: "Call up a review",
        where: ["Appraisals", "My Team", "Call up review"],
        actions: [
          "Once someone has submitted their targets, click **Call up review** on their row.",
          "Choose **Interim** or the final review.",
        ],
      },
      {
        title: "Score it",
        where: ["Appraisals", "Reviews"],
        actions: [
          "Open the review from **Reviews** or **Open review**.",
          "Rate each target against what was achieved, and add your comments.",
          "Click **Complete review**, then **Publish to employee**.",
        ],
      },
      {
        title: "Resolve appeals",
        where: ["Appraisals", "Reviews", "Resolve appeal"],
        actions: [
          "If the employee appeals, it shows under **Appeals** on the review.",
          "Read their reason and click **Resolve appeal**.",
        ],
      },
    ],
    notes: [
      "Being someone's line manager or department head gives you this access without any extra role.",
      "Department heads also handle their department's indicators and lock its targets.",
    ],
    related: ["your-appraisal", "run-an-appraisal-cycle"],
  },
  {
    slug: "your-self-service-portal",
    section: "self-service",
    roles: ["employee"],
    title: "Your Self-Service Portal",
    summary:
      "Everything about you at work in one place. Open Self-Service Portal in the side menu and pick a tab.",
    opensFrom: "Self-Service Portal",
    glossary: [
      { term: "Profile", text: "Your employment details and the personal details you can change. Changes go to HR for approval. Track them under My change requests." },
      { term: "Records", text: "Next of kin, family members, dependants, education, work experience, and training and certifications. New entries go to HR for review." },
      { term: "Leave", text: "Your balances, new requests, and any leave you're covering as a relief officer." },
      { term: "Appraisals", text: "Propose indicators, set targets, enter results, and read, acknowledge or appeal your review." },
      { term: "Payslips", text: "Your payroll history and each month's payslip, once that month's payroll is distributed." },
      { term: "Loans", text: "Request a loan or salary advance, and follow each loan's repayment schedule." },
      { term: "Documents", text: "Upload the documents your job needs. PDF, PNG or JPG up to 8 MB. Each upload goes through approval." },
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
        where: ["Self-Service Portal", "Profile"],
        actions: [
          "Go to **Self-Service Portal → Profile**.",
          "Change the details you're allowed to. They're grouped into sections such as **Personal Information**, **Contact Information**, **Address Information** and **Emergency Contacts**.",
          "To add or change your bank account, go to **Financial Information** and fill in **Bank Name**, **Account Type**, **Account Name**, **Account Number** and **BVN**. It goes on the payroll schedule HR uses to pay your salary.",
          "Click **Submit Requests**. Nothing changes on your record until HR approves it.",
          "Your employment details are shown for reference. HR manages those.",
        ],
      },
      {
        title: "Add to your records",
        where: ["Self-Service Portal", "Records", "Add"],
        actions: [
          "Open **Records** and pick a section: next of kin, family members, dependants, education, work experience, or training and certifications.",
          "Click **Add**, fill in the entry and send it. It's added once HR approves it.",
        ],
      },
      {
        title: "Track your requests",
        where: ["Self-Service Portal", "Profile", "My change requests"],
        actions: ["Check **My change requests** to see whether each update is waiting, approved or rejected."],
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
    summary: "Send HR the documents your job needs, such as your ID or certificates. Each upload is checked and approved.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "See what's needed",
        where: ["Self-Service Portal", "Documents"],
        actions: [
          "Go to **Self-Service Portal → Documents**.",
          "Look at the documents listed for your job title. Ones marked **Required** are mandatory.",
        ],
      },
      {
        title: "Upload the file",
        where: ["Self-Service Portal", "Documents"],
        actions: [
          "Drop a file onto the document, or click to choose one. PDF, PNG and JPG files up to 8 MB are accepted.",
        ],
      },
      {
        title: "Track it",
        where: ["Self-Service Portal", "Documents", "My uploaded documents"],
        actions: [
          "Check **My uploaded documents** for each upload's status.",
          "Click **Preview** to look at a file, or **Remove** to send a different one.",
        ],
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
    summary: "Every payslip issued to you is in the Self-Service Portal.",
    opensFrom: "Self-Service Portal",
    steps: [
      {
        title: "Open your payroll history",
        where: ["Self-Service Portal", "Payslips"],
        actions: [
          "Go to **Self-Service Portal → Payslips**, or click **View payslip** on your Dashboard.",
          "Your payslips are listed by month. A month appears once its payroll has been distributed.",
        ],
      },
      {
        title: "Open a payslip",
        where: ["Self-Service Portal", "Payslips", "View"],
        actions: ["Click **View →** on a month to see your earnings, deductions and net pay."],
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
      "What a person can see and do comes from the roles they hold. Each role grants actions (Read, Create, Update, Delete or Manage) on resources such as Payroll Run or Staff Loan.",
    opensFrom: "Access Management",
    steps: [
      {
        title: "Create a role",
        where: ["Access Management", "Roles"],
        actions: [
          "Open **Access Management** and go to the **Roles** tab.",
          "Click **New role**, give it a name and code, such as Payroll Officer, and click **Save**.",
          "Or click **Default roles** to load the standard set, or **Duplicate** to copy an existing role.",
        ],
      },
      {
        title: "Grant its permissions",
        where: ["Access Management", "Role Permissions"],
        actions: [
          "Go to **Role Permissions** and pick the role.",
          "Tick the actions it needs on each resource. **Manage** includes every action on that resource.",
          "Click **Save permissions**.",
        ],
        tip: "full-access roles skip permission checks, so there's nothing to tick.",
      },
      {
        title: "Give it to people",
        where: ["Access Management", "User Assignments"],
        actions: [
          "Go to **User Assignments**, find the person, and click **Assign role**.",
          "Pick the role and save. **Revoke** takes it away again.",
        ],
      },
      {
        title: "Optional: set defaults by job title",
        where: ["Access Management", "Job Title Defaults"],
        actions: [
          "Go to **Job Title Defaults** and pick roles for a job title.",
          "Everyone with that job title gets them automatically, shown as inherited via job title.",
        ],
      },
      {
        title: "Ask them to sign in again",
        where: ["Top bar", "Sign out"],
        actions: ["If the new pages don't show up straight away, ask the person to sign out and back in."],
      },
    ],
    glossary: [
      { term: "Manage appraisal cycles", text: "Appraisal Cycle → Manage" },
      { term: "Maintain the indicator library", text: "Performance Indicator → Create and Update" },
      { term: "Rate any review", text: "Appraisal Review → Manage" },
      { term: "Run payroll", text: "Payroll Run → Create and Update" },
      { term: "Manage loans", text: "Staff Loan → Manage" },
      { term: "See the audit trail", text: "Audit Log → Read" },
    ],
    notes: [
      "Relationships also give access without a role: line managers see their direct reports' appraisals, department heads handle their department's indicators and targets, and approvers see their requests in the Approvals Inbox.",
      "System roles come with DashHR. Their code is locked, but you can rename them and edit their description.",
      "Changing roles needs Manage rights on Roles & Permissions. Without them, the page is read-only.",
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
        where: ["Audit Trail"],
        actions: [
          "Open **Audit Trail** in the side menu.",
          "Pick a module in **All modules**, such as Payroll, Leave, Approvals, Documents or Access, or type a person, action or module in the search box.",
        ],
      },
      {
        title: "Read the entries",
        where: ["Audit Trail"],
        actions: [
          "Each row shows **When**, **Who**, the **Module** and the **Action**.",
          "Use **Prev** and **Next** to page through, and **Refresh** for the latest.",
        ],
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
      "Company Settings holds your organisation's name, logo, colours, currency and appraisal type. Changes apply across the whole workspace when you save.",
    opensFrom: "Company Settings",
    steps: [
      {
        title: "Name and logo",
        where: ["Company Settings", "Organization"],
        actions: [
          "Open **Company Settings** in the side menu.",
          "Under **Organization**, enter the **Organization name**, upload a **Company logo** (PNG, JPG or SVG) and a square **Favicon**.",
        ],
      },
      {
        title: "Colours and theme",
        where: ["Company Settings", "Branding"],
        actions: [
          "Under **Branding**, set the **Primary color**, **Secondary color** and **Accent color** as 6-digit hex codes, such as #4f1a60.",
          "Pick a **Theme mode**: **Light**, **Dark** or **Match system**. The preview shows how the sidebar will look.",
        ],
      },
      {
        title: "Currency and appraisals",
        where: ["Company Settings", "Localization"],
        actions: [
          "Under **Localization**, pick the **Currency** for payroll, loans and self-service amounts.",
          "Under **Appraisals**, choose the **Appraisal type**: **Top to bottom** or **Bottom to top**.",
        ],
      },
      {
        title: "Save",
        where: ["Company Settings"],
        actions: ["Click **Save changes**. **Discard** throws away unsaved changes."],
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
    before: ["Your staff's emails in DashHR match the emails they sign in with at your company. That's how DashHR matches each person to their account."],
    steps: [
      {
        title: "Register DashHR with your provider",
        where: ["Company Settings", "Authentication"],
        actions: [
          "Open **Company Settings** and find **Authentication**.",
          "Choose **Single sign-on (OIDC)**.",
          "Click **Copy redirect URI** and add it to the app registration in your identity provider.",
        ],
      },
      {
        title: "Enter your provider's details",
        where: ["Company Settings", "Authentication"],
        actions: [
          "Fill in the **Issuer URL**, **Client ID** and **Client secret** from your identity provider.",
          "Leave **Scope** as it is unless your provider needs something different.",
        ],
      },
      {
        title: "Decide about new accounts",
        where: ["Company Settings", "Authentication", "JIT provisioning"],
        actions: [
          "By default, people must already be added in Directory & Setups before they can sign in.",
          "Tick **Automatically create accounts on first sign-in (JIT provisioning)** if you want accounts created the first time someone signs in.",
        ],
      },
      {
        title: "Save and test",
        where: ["Company Settings", "Authentication"],
        actions: [
          "Click **Save sign-in method**.",
          "Ask one person to sign in at your workspace address with **Continue with single sign-on** before telling everyone.",
        ],
      },
    ],
    notes: ["Switching to single sign-on doesn't change anyone's records, department or history."],
    related: ["company-settings", "add-your-employees"],
  },
];

export const guideBySlug = (slug) => GUIDES.find((g) => g.slug === slug);
export const guidesInSection = (sectionId) => GUIDES.filter((g) => g.section === sectionId);
export const sectionById = (id) => SECTIONS.find((s) => s.id === id);

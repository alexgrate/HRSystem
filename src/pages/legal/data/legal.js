export const LEGAL_STATUS = {
  draft: true,
  lastUpdated: null,
  version: "0.1",
};

const todo = (text) => ({ todo: text });

export const TERMS = {
  path: "/terms",
  docName: "Terms of service",
  description: "The terms for using DashHR, the HR and payroll software at dashhr.app, written in plain words.",
  title: ["The rules of", "the workspace."],
  hand: "every section comes with a plain-words note",
  clauses: [
    {
      id: "who-we-are",
      title: "Who we are",
      inShort: "who you're agreeing with.",
      body: [
        [
          "DashHR is HR and payroll software at dashhr.app, provided by Dash Microfinance Bank Ltd (“Dash”, “we”, “us”). ",
          todo("legal entity that operates DashHR, its RC number and registered address"),
        ],
      ],
    },
    {
      id: "your-workspace",
      title: "Your workspace",
      inShort: "your company signs up. your people get invited.",
      body: [
        ["When an organisation signs up, it gets its own DashHR workspace. The person who creates it confirms they're allowed to accept these terms for that organisation."],
        ["The organisation decides who gets an account. Employees use DashHR through their employer, under these terms and their employer's own policies."],
      ],
    },
    {
      id: "accounts",
      title: "Accounts & sign-in",
      inShort: "your admins hold the keys.",
      body: [
        ["Keep your password to yourself. Organisations can switch sign-in to their own identity provider through single sign-on (OpenID Connect)."],
        ["Your organisation's admins decide what each role can see and do. They're responsible for the access they give."],
      ],
    },
    {
      id: "your-data",
      title: "Your data",
      inShort: "it's yours. we look after it.",
      body: [
        [
          "Your organisation owns the information it puts into DashHR. We use it to run the service, as our ",
          { to: "/privacy", label: "privacy policy" },
          " explains.",
        ],
      ],
    },
    {
      id: "payroll",
      title: "Payroll figures",
      inShort: "DashHR does the maths. you still sign it off.",
      body: [
        ["DashHR works out PAYE, pension, NHF and other deductions from the details you enter and the tax rules built into the app, including the Nigeria Tax Act 2025."],
        ["Every payroll has an approval step. Check the figures before you approve them. Filing returns and paying deductions to the authorities stays your organisation's responsibility."],
      ],
    },
    {
      id: "loans",
      title: "Dash-funded loans",
      inShort: "a Dash loan has its own agreement.",
      body: [
        ["Your organisation can let employees apply for loans funded by Dash. Those loans are between the employee and Dash Microfinance Bank, under the loan agreement the employee reads and signs in the app."],
        ["Loans your organisation funds itself stay between you and your employee."],
      ],
    },
    {
      id: "fair-use",
      title: "Fair use",
      inShort: "be decent.",
      body: [
        {
          list: [
            ["Don't try to get into another organisation's workspace."],
            ["Don't upload anything unlawful, or anything you have no right to share."],
            ["Don't overload, copy or take apart the service."],
          ],
        },
      ],
    },
    {
      id: "fees",
      title: "Fees",
      inShort: "to be decided.",
      body: [[todo("pricing, billing cycle, and what happens when a payment is late")]],
    },
    {
      id: "changes",
      title: "Changes & ending",
      inShort: "no surprises. you can leave.",
      body: [
        [
          "We'll tell admins before we make a significant change to these terms. Your organisation can close its workspace at any time. ",
          todo("how long you have to export your data, and when it's deleted"),
        ],
        [todo("limits on liability, to be written by your lawyer")],
      ],
    },
    {
      id: "law",
      title: "Law & contact",
      inShort: "ask us anything.",
      body: [
        ["These terms are governed by the laws of the Federal Republic of Nigeria. ", todo("confirm")],
        ["Questions about these terms: ", todo("legal contact email")],
      ],
    },
  ],
};

export const PRIVACY = {
  path: "/privacy",
  docName: "Privacy policy",
  description: "What personal data DashHR holds and why, who can see it, how it's kept safe, and your rights under the Nigeria Data Protection Act 2023.",
  title: ["What we keep,", "and why."],
  hand: "the short version comes first",
  extraMeta: "Nigeria Data Protection Act 2023",
  short: [
    "Your employer decides what goes into DashHR. We run the software for them.",
    "Salaries and bank details are only visible to the roles your organisation allows.",
    "There are no advertising or analytics trackers on DashHR.",
    "Dash's platform team can see loan requests made in DashHR, so it can run and oversee lending.",
  ],
  clauses: [
    {
      id: "responsible",
      title: "Who's responsible",
      inShort: "ask your HR team first. they hold the pen.",
      body: [
        ["Your employer is the data controller for your employee record: they decide what's collected and why. Dash processes it on their behalf to run DashHR."],
        ["If you apply for a loan funded by Dash, Dash Microfinance Bank is also a controller of that application and the agreement you sign."],
      ],
    },
    {
      id: "what-we-hold",
      title: "What we hold",
      inShort: "what an HR file holds, kept tidier.",
      body: [
        {
          table: {
            head: ["What", "For example", "Why"],
            rows: [
              ["Who you are", "Name, date of birth, gender, marital status, email, phone, address, and religion or mother's maiden name if your employer asks for them", "Your account and employee record"],
              ["Your job", "Department, job title, grade, office, manager, status", "Running HR and approvals"],
              ["Your pay", "Salary, pay grade, PAYE, pension, NHF, NHIS", "Payroll and payslips"],
              ["Bank details", "Bank name, account name, type and number, and BVN", "Paying your salary"],
              ["Your background", "Next of kin, spouse, family, dependants, education, work experience, training", "What your employer keeps on file"],
              ["Documents", "ID card, certificates, guarantor forms you upload", "Checks your employer asks for"],
              ["Requests", "Leave, loans, appraisals, profile changes, and the signature on a Dash loan agreement", "Approvals and records"],
              ["Activity", "A log of important actions, such as approvals and settings changes", "Security and accountability"],
            ],
          },
        },
      ],
    },
    {
      id: "where-from",
      title: "Where it comes from",
      inShort: "from HR, from you, and from your sign-in.",
      body: [
        ["Most of it is added by your HR team. You add the rest yourself in the Self-Service Portal. If your organisation uses single sign-on, your identity provider confirms who you are when you sign in."],
      ],
    },
    {
      id: "who-can-see",
      title: "Who can see it",
      inShort: "a short list, on purpose.",
      body: [
        {
          list: [
            [{ b: "People in your organisation" }, ", as far as their role allows, and approvers for the requests they approve."],
            [{ b: "Dash's platform team" }, ", who can see each organisation's details and headcount, and every loan request made in DashHR, including the employee's name and email and the loan's details. That covers loans your organisation funds itself as well as loans funded by Dash."],
            [{ b: "Microsoft" }, ", which delivers DashHR's emails through Microsoft 365."],
            [{ b: "Your identity provider" }, ", if your organisation uses single sign-on."],
            [todo("hosting provider, and the country your data is stored in")],
          ],
        },
        ["We don't sell your data."],
      ],
    },
    {
      id: "emails-browser",
      title: "Emails & your browser",
      inShort: "no cookie banner needed. nothing to track.",
      body: [
        ["DashHR emails you when something needs you or is ready for you, such as a request to approve or a payslip being available."],
        ["Your browser keeps your sign-in token and your display preferences in local storage. DashHR uses no advertising or analytics cookies."],
      ],
    },
    {
      id: "safety",
      title: "Keeping it safe",
      inShort: "locked, logged, and need-to-know.",
      body: [
        ["Passwords are stored hashed, never as plain text. Access is set by role, for each module and action. Important actions are recorded in an audit trail, and organisations can require single sign-on."],
      ],
    },
    {
      id: "how-long",
      title: "How long we keep it",
      inShort: "to be decided.",
      body: [[todo("retention periods: while the workspace is active, after it closes, and for payroll and loan records the law requires you to keep")]],
    },
    {
      id: "your-rights",
      title: "Your rights",
      inShort: "it's your data. you can ask.",
      body: [
        ["Under the Nigeria Data Protection Act 2023 you can ask to see, correct or delete your data, or object to how it's used. You can correct most details yourself with a profile update in the Self-Service Portal."],
        ["Contact your HR team first. You can also write to ", todo("privacy contact email"), ", or complain to the Nigeria Data Protection Commission."],
      ],
    },
  ],
};

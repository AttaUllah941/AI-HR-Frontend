/** Context-specific messages for SmartLoaderComponent. */
export const LOADER_MESSAGES = {
  payroll: [
    'Calculating salaries…',
    'Applying tax rules…',
    'Generating payslips…',
    'Verifying deductions…',
    'Finalizing payroll run…',
  ],
  nova: [
    'Nova is thinking…',
    'Reviewing company data…',
    'Drafting a response…',
    'Checking the details…',
  ],
  resume: [
    'Reading the resume…',
    'Matching skills to the role…',
    'Scoring the candidate…',
    'Summarizing strengths…',
  ],
  export: [
    'Gathering records…',
    'Preparing your file…',
    'Formatting the export…',
    'Almost ready…',
  ],
  generation: [
    'Generating your draft…',
    'Structuring the content…',
    'Polishing the wording…',
    'Almost there…',
  ],
  default: ['Loading…', 'Just a moment…', 'Working on it…', 'Almost there…'],
} as const satisfies Record<string, readonly string[]>;

export type LoaderMessageSet = keyof typeof LOADER_MESSAGES;

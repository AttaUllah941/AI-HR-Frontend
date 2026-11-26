/** Icon, colour tone and a one-line description for each notification category (shared by the inbox and preferences). */
export const CATEGORY_ICONS: Record<string, string> = {
  SYSTEM: 'settings',
  LEAVE: 'event_available',
  ATTENDANCE: 'schedule',
  PAYROLL: 'payments',
  RECRUITMENT: 'work',
  PERFORMANCE: 'trending_up',
  AI: 'auto_awesome',
  SECURITY: 'shield',
  OTHER: 'notifications',
};

export const CATEGORY_TONES: Record<string, string> = {
  SYSTEM: 'neutral',
  LEAVE: 'primary',
  ATTENDANCE: 'warning',
  PAYROLL: 'success',
  RECRUITMENT: 'purple',
  PERFORMANCE: 'info',
  AI: 'purple',
  SECURITY: 'danger',
  OTHER: 'neutral',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  SYSTEM: 'Product updates, maintenance and account notices',
  LEAVE: 'Leave requests, approvals and balance changes',
  ATTENDANCE: 'Check-ins, late arrivals and attendance corrections',
  PAYROLL: 'Payslips, payroll runs and payment updates',
  RECRUITMENT: 'Candidates, interviews and job offers',
  PERFORMANCE: 'Goals, reviews, feedback and promotions',
  AI: 'Insights and results from Nova, the AI assistant',
  SECURITY: 'Sign-ins, password changes and suspicious activity',
  OTHER: 'Anything that does not fit another category',
};

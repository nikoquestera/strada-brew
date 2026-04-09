export const FINANCE_EMAILS = ['selena@stradacoffee.com'] as const

export function isFinanceUser(email?: string | null) {
  return FINANCE_EMAILS.includes((email ?? '').toLowerCase() as (typeof FINANCE_EMAILS)[number])
}

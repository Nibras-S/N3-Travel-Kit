// Calendar months, clamped to the last day of shorter months (Jan 31 -> Feb 28).
export function addPlanMonths(value, months) {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

export const PRO_TOOLS = Object.freeze(['flight', 'bahrain', 'qatar', 'uae', 'oman', 'saudi']);
export const ALL_TOOLS = Object.freeze(['invoice', 'flight', 'brochure', 'bahrain', 'qatar', 'uae', 'oman', 'saudi']);

export function normalizePlan(plan) {
  return typeof plan === 'string' && plan.trim().toLowerCase() === 'pro max' ? 'Pro Max' : 'Pro';
}

export function allowedTools(plan, isSuperadmin = false) {
  return [...(isSuperadmin || normalizePlan(plan) === 'Pro Max' ? ALL_TOOLS : PRO_TOOLS)];
}

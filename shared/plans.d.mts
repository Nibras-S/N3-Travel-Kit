export function addPlanMonths(value: Date | string, months: number): Date;
export const PRO_TOOLS: readonly string[];
export const ALL_TOOLS: readonly string[];
export function normalizePlan(plan: unknown): 'Pro' | 'Pro Max';
export function allowedTools(plan: unknown, isSuperadmin?: boolean): string[];

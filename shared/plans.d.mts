export function addPlanMonths(value: Date | string, months: number): Date;
export const PLUS_TOOLS: readonly string[];
export const ALL_TOOLS: readonly string[];
export function normalizePlan(plan: unknown): 'Plus' | 'Pro';
export function allowedTools(plan: unknown, isSuperadmin?: boolean): string[];

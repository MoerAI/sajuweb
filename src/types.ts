export interface Pillar {
  ganZhi: string; stemId: string; branchId: string; hiddenStemIds: string[];
  stemElement: string; branchElement: string; tenGod: string | null; hiddenTenGods: string[] | null;
}
export interface Chart {
  id: string; alias: string; createdAt: string; saved: boolean;
  inputPrecision: string; pillars: Record<string, Pillar | null>;
  facts: Record<string, string>; warnings: string[];
  elements: { counts: Record<string, number>; denominator: number };
  engine: { name: string; version: string; commit: string };
  policies: { dayBoundarySect: number; yunSect: number; tzdbVersion: string; id: string };
  timeContext: { zone: string; historicalOffsetMinutes: number | null; normalizedWallTime: string; birthInstant: string | null };
  candidates: Record<string, string[]> | null;
  yun: null | { direction: string; engineClockStart: string; startOffset: { years: number; months: number; days: number; hours: number }; periods: { kind: string; ganZhi: string | null; yearLabel: { start: number; end: number }; startAge: number; endAge: number }[] };
}
export interface Month {
  month: number; zone: string; segments: { start: string; end: string; ganZhi: string; yearGanZhi: string; boundaryName: string | null }[];
}
export interface Report {
  id: string; chartId: string; productId: string; title: string; summary: string[]; saved: boolean; createdAt: string;
  targetYear: number | null; safetyStop?: boolean; warnings: string[];
  sections: { sectionId: string; title: string; claims: { text: string; factRefs: string[]; ruleRefs: string[]; limitations: string[] }[]; actions: { text: string }[] }[];
  months: Month[] | null; followUpQuestions: string[]; versions: Record<string, string>;
}
export interface Library { charts: Chart[]; reports: Report[]; expiresAt: string }

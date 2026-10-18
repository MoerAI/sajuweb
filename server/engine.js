import lunar from 'lunar-javascript';
import { DateTime, IANAZone } from 'luxon';

const { Solar, LunarUtil } = lunar;
export const POLICY = Object.freeze({
  id: 'civil-dual-context-v1-draft', engineVersion: '1.7.7',
  engineCommit: '4c45a59f79b856125516f31aefa8295035c16afd',
  adapterVersion: '0.1.0', tzdbVersion: process.versions.tz,
  dayBoundarySect: 2, yunSect: 2, pillarClock: 'local-civil',
  lunarCalendarPolicy: 'solar-only', approval: 'development-only',
  supportedZones: ['Asia/Seoul', 'Asia/Shanghai', 'America/New_York'],
  minYear: 1950, maxYear: 2026,
});
export class DomainError extends Error {
  constructor(code, message, details = undefined) {
    super(message); this.code = code; this.details = details;
  }
}
const fail = (code, text, details) => { throw new DomainError(code, text, details); };
const solarAt = dt => Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second);
const eightAt = (dt, sect) => {
  const eight = solarAt(dt).getLunar().getEightChar();
  eight.setSect(sect);
  return eight;
};
const fieldsEqual = (dt, parts) => Object.entries(parts).every(([key, value]) => dt[key] === value);

export function normalizeBirth(input, now = DateTime.now()) {
  if (!input || typeof input !== 'object') fail('INVALID_DATE', '출생정보를 입력해 주세요.');
  if (input.calendar && input.calendar !== 'solar') fail('UNSUPPORTED_TIME_POLICY', '음력과 진태양시는 검수 전 지원하지 않습니다.');
  if (input.pillarClock && input.pillarClock !== 'local-civil') fail('UNSUPPORTED_TIME_POLICY', '현지 민간시계 정책만 지원합니다.');
  const zone = input.zone ?? 'Asia/Seoul';
  if (typeof zone !== 'string' || !IANAZone.isValidZone(zone) || !POLICY.supportedZones.includes(zone))
    fail('UNSUPPORTED_TIME_POLICY', '개발 검증 대상 시간대가 아닙니다.');
  if (typeof input.timeKnown !== 'boolean') fail('INVALID_DATE', '출생시간을 아는지 선택해 주세요.');
  if (input.yunGenderCode != null && input.yunGenderCode !== 0 && input.yunGenderCode !== 1)
    fail('INVALID_YUN_METHOD', '대운 산식 코드는 숫자 0 또는 1이어야 합니다.');
  const sect = input.dayBoundarySect ?? 2;
  const yunSect = input.yunSect ?? 2;
  if (![1, 2].includes(sect) || ![1, 2].includes(yunSect)) fail('UNSUPPORTED_TIME_POLICY', 'sect는 1 또는 2만 지원합니다.');
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date ?? '');
  if (!parsed) fail('INVALID_DATE', '양력 생년월일을 확인해 주세요.');
  const [, year, month, day] = parsed.map(Number);
  const parts = { year, month, day, hour: 0, minute: 0, second: 0 };
  if (input.timeKnown) {
    const time = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(input.time ?? '');
    if (!time) fail('INVALID_DATE', '출생시간을 24시간 형식으로 입력해 주세요.');
    Object.assign(parts, { hour: Number(time[1]), minute: Number(time[2]), second: Number(time[3] ?? 0) });
  }
  const local = DateTime.fromObject(parts, { zone });
  if (!local.isValid) fail('INVALID_DATE', '존재하지 않는 날짜나 시간입니다.');
  if (year < POLICY.minYear || year > POLICY.maxYear) fail('UNSUPPORTED_TIME_POLICY', '개발 검증 범위는 1950~2026년입니다.');
  if (input.date > now.setZone(zone).toISODate() || (input.timeKnown && local.toMillis() > now.toMillis()))
    fail('INVALID_DATE', '미래 출생일시는 입력할 수 없습니다.');
  if (input.timeKnown && !fieldsEqual(local, parts)) fail('NONEXISTENT_LOCAL_TIME', '서머타임 전환으로 존재하지 않는 현지 시각입니다.');
  let chosen = local;
  const possible = local.getPossibleOffsets();
  if (input.timeKnown && possible.length > 1) {
    if (typeof input.offsetMinutes !== 'number' || !possible.some(dt => dt.offset === input.offsetMinutes))
      fail('AMBIGUOUS_LOCAL_TIME', '두 번 존재하는 현지 시각입니다. 당시 UTC offset을 선택해 주세요.', { offsets: possible.map(dt => dt.offset) });
    chosen = possible.find(dt => dt.offset === input.offsetMinutes);
  }
  return { local: chosen, zone, sect, yunSect, timeKnown: input.timeKnown, yunGenderCode: input.yunGenderCode ?? null };
}

export function jieBoundaries(year) {
  const table = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar().getJieQiTable();
  const names = new Set(['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪']);
  return Object.entries(table).filter(([name]) => names.has(name)).map(([name, s]) => ({
    name,
    instant: DateTime.fromObject({ year: s.getYear(), month: s.getMonth(), day: s.getDay(), hour: s.getHour(), minute: s.getMinute(), second: s.getSecond() }, { zone: 'UTC+8' }).toUTC().toISO(),
  })).sort((a, b) => a.instant.localeCompare(b.instant));
}

function rawPillars(local, sect) {
  const term = eightAt(local.toUTC().setZone('UTC+8'), sect);
  const civil = eightAt(local, sect);
  return { year: term.getYear(), month: term.getMonth(), day: civil.getDay(), time: civil.getTime() };
}

export function pillarDTO(ganZhi, dayStem) {
  if (ganZhi == null) return null;
  const [stemId, branchId] = [...ganZhi];
  const hiddenStemIds = [...LunarUtil.ZHI_HIDE_GAN[branchId]];
  return {
    ganZhi, stemId, branchId, hiddenStemIds,
    stemElement: LunarUtil.WU_XING_GAN[stemId], branchElement: LunarUtil.WU_XING_ZHI[branchId],
    tenGod: dayStem ? LunarUtil.SHI_SHEN[dayStem + stemId] : null,
    hiddenTenGods: dayStem ? hiddenStemIds.map(s => LunarUtil.SHI_SHEN[dayStem + s]) : null,
  };
}

function yunDTO(normalized) {
  if (!normalized.timeKnown || normalized.yunGenderCode === null) return null;
  const e = eightAt(normalized.local.toUTC().setZone('UTC+8'), normalized.sect);
  const y = e.getYun(normalized.yunGenderCode, normalized.yunSect);
  return {
    status: 'technical-preview', direction: y.isForward() ? 'forward' : 'backward',
    startOffset: { years: y.getStartYear(), months: y.getStartMonth(), days: y.getStartDay(), hours: y.getStartHour() },
    engineClockStart: y.getStartSolar().toYmdHms(), startSolarWallTime: null, startInstant: null,
    ageConvention: 'year-difference-plus-one',
    periods: y.getDaYun(11).map(d => ({
      kind: d.getIndex() === 0 ? 'pre-yun' : 'da-yun',
      yearLabel: { start: d.getStartYear(), end: d.getEndYear() },
      startAge: d.getStartAge(), endAge: d.getEndAge(), ganZhi: d.getGanZhi() || null,
      exactBoundary: null, boundaryProvenance: 'upstream-year-label',
    })),
  };
}

export function calculateChart(input) {
  const n = normalizeBirth(input);
  const candidates = [];
  if (n.timeKnown) candidates.push(rawPillars(n.local, n.sect));
  else {
    const start = n.local.startOf('day');
    const end = start.plus({ days: 1 }).startOf('day');
    const instants = new Set([start.toMillis(), end.toMillis() - 1000]);
    // Civil two-hour boundaries include 23:00 day-boundary variation.
    for (let hour = 0; hour < 24; hour++) {
      const local = start.set({ hour });
      for (const dt of local.getPossibleOffsets()) instants.add(dt.toMillis());
    }
    for (const boundary of jieBoundaries(start.year)) {
      const millis = DateTime.fromISO(boundary.instant).toMillis();
      if (millis >= start.toMillis() && millis < end.toMillis()) {
        instants.add(millis); if (millis > start.toMillis()) instants.add(millis - 1000);
      }
    }
    for (const millis of [...instants].sort((a, b) => a - b))
      candidates.push(rawPillars(DateTime.fromMillis(millis, { zone: n.zone }), n.sect));
  }
  const common = {};
  const ranges = {};
  for (const key of ['year', 'month', 'day', 'time']) {
    const values = [...new Set(candidates.map(c => c[key]))];
    ranges[key] = values;
    common[key] = !n.timeKnown && key === 'time' ? null : values.length === 1 ? values[0] : null;
  }
  const dayStem = common.day?.[0] ?? null;
  const pillars = Object.fromEntries(Object.entries(common).map(([k, v]) => [k, pillarDTO(v, dayStem)]));
  const counts = Object.fromEntries(['木', '火', '土', '金', '水'].map(el => [el, 0]));
  for (const pillar of Object.values(pillars)) if (pillar) {
    counts[pillar.stemElement]++; counts[pillar.branchElement]++;
  }
  const facts = {};
  for (const [key, pillar] of Object.entries(pillars)) if (pillar) {
    facts[`F.${key}.ganZhi`] = pillar.ganZhi;
    facts[`F.${key}.stem`] = pillar.stemId;
    facts[`F.${key}.branch`] = pillar.branchId;
    facts[`F.${key}.element`] = pillar.stemElement;
  }
  const warnings = ['DEVELOPMENT_POLICY_UNAPPROVED'];
  if (!n.timeKnown) warnings.push('TIME_UNKNOWN');
  if (['year', 'month', 'day'].some(k => common[k] === null)) warnings.push('CROSS_BOUNDARY_UNCERTAINTY');
  if (n.yunGenderCode === null) warnings.push('YUN_METHOD_UNSPECIFIED');
  if (n.yunGenderCode !== null && n.timeKnown) warnings.push('YUN_PRECISE_BOUNDARY_UNVERIFIED');
  const lunarDate = n.timeKnown ? solarAt(n.local).getLunar() : null;
  return {
    status: warnings.includes('CROSS_BOUNDARY_UNCERTAINTY') ? 'partial' : 'ready',
    schemaVersion: '1.0', engine: { name: 'lunar-javascript', version: POLICY.engineVersion, commit: POLICY.engineCommit },
    policies: { ...POLICY, dayBoundarySect: n.sect, yunSect: n.yunSect },
    inputPrecision: n.timeKnown ? (input.time.length > 5 ? 'second' : 'minute') : 'day',
    timeContext: { zone: n.zone, historicalOffsetMinutes: n.timeKnown ? n.local.offset : null, normalizedWallTime: n.timeKnown ? n.local.toFormat('yyyy-MM-dd HH:mm:ss') : n.local.toISODate(), birthInstant: n.timeKnown ? n.local.toUTC().toISO() : null, pillarClock: 'local-civil' },
    pillars, candidates: n.timeKnown ? null : ranges,
    lunar: lunarDate ? { year: lunarDate.getYear(), month: lunarDate.getMonth(), day: lunarDate.getDay(), calendar: 'engine-chinese-calendar' } : null,
    elements: { counts, denominator: Object.values(counts).reduce((a, b) => a + b, 0), method: 'surface-stem-branch-unweighted' },
    yun: yunDTO(n), facts, warnings, errors: [], compatibilityScore: null,
  };
}

export function yearMonths(year, zone = 'Asia/Seoul') {
  // 2031 is needed to finish a six-month period beginning late in target year 2030.
  if (!Number.isInteger(year) || year < 1950 || year > 2031 || !POLICY.supportedZones.includes(zone))
    fail('UNSUPPORTED_TIME_POLICY', '기간 계산 범위는 1950~2031년, 지원 시간대만 선택할 수 있습니다.');
  const boundaries = [...jieBoundaries(year - 1), ...jieBoundaries(year), ...jieBoundaries(year + 1)];
  return Array.from({ length: 12 }, (_, index) => {
    const start = DateTime.fromObject({ year, month: index + 1, day: 1 }, { zone });
    const end = start.plus({ months: 1 });
    const splits = boundaries.filter(b => b.instant > start.toUTC().toISO() && b.instant < end.toUTC().toISO());
    const points = [start.toUTC().toISO(), ...splits.map(b => b.instant), end.toUTC().toISO()];
    return {
      month: index + 1, zone,
      segments: points.slice(0, -1).map((instant, i) => {
        const eight = eightAt(DateTime.fromISO(instant).setZone('UTC+8'), 2);
        return { start: instant, end: points[i + 1], ganZhi: eight.getMonth(), yearGanZhi: eight.getYear(), boundaryName: splits.find(s => s.instant === instant)?.name ?? null };
      }),
    };
  });
}

const combined = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
const clashed = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
export function compareCharts(a, b) {
  const aBranch = a.pillars.day?.branchId;
  const bBranch = b.pillars.day?.branchId;
  const matches = list => list.some(pair => pair.includes(aBranch) && pair.includes(bBranch) && aBranch !== bBranch);
  const relationship = !aBranch || !bBranch ? null : matches(combined) ? 'six-combination' : matches(clashed) ? 'six-clash' : 'no-six-combination-or-clash';
  return {
    score: null, scoreReason: 'NOT_IMPLEMENTED',
    dayBranchRelationship: relationship,
    branches: aBranch && bBranch ? [aBranch, bBranch].sort() : null,
    commonElements: Object.keys(a.elements.counts).filter(el => a.elements.counts[el] > 0 && b.elements.counts[el] > 0),
    warnings: ['DRAFT_RELATIONSHIP_TABLE', ...(!relationship ? ['CROSS_BOUNDARY_UNCERTAINTY'] : [])],
  };
}

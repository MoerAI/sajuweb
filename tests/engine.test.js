import { test } from 'node:test';
import assert from 'node:assert/strict';
import lunar from 'lunar-javascript';
import { DateTime } from 'luxon';
import { calculateChart, normalizeBirth, jieBoundaries, yearMonths, compareCharts } from '../server/engine.js';

const input = { date: '1990-05-15', time: '23:30:00', timeKnown: true, zone: 'Asia/Seoul' };
const solar = dt => lunar.Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second);
const at = (dt, extra = {}) => calculateChart({ ...input, date: dt.toISODate(), time: dt.toFormat('HH:mm:ss'), zone: dt.zoneName, ...extra });

test('PRD upstream smoke fixtures: day sect and independent hour stem rule', () => {
  for (const [sect, expectedDay] of [[1, '辛巳'], [2, '庚辰']]) {
    const c = calculateChart({ ...input, zone: 'Asia/Shanghai', dayBoundarySect: sect });
    assert.equal(c.pillars.day.ganZhi, expectedDay);
    assert.equal(c.pillars.time.ganZhi, '戊子');
  }
});
test('22:59:59 / 23:00 / 23:59:59 / 00:00 preserve local day and hour for both sects', () => {
  for (const zone of ['Asia/Seoul', 'Asia/Shanghai', 'America/New_York']) {
    for (const time of ['22:59:59', '23:00:00', '23:59:59', '00:00:00']) {
      for (const sect of [1, 2]) {
        const c = calculateChart({ ...input, zone, time, dayBoundarySect: sect });
        const local = DateTime.fromISO(`${input.date}T${time}`, { zone });
        const upstream = solar(local).getLunar().getEightChar(); upstream.setSect(sect);
        assert.equal(c.pillars.day.ganZhi, upstream.getDay());
        assert.equal(c.pillars.time.ganZhi, upstream.getTime());
        for (const p of Object.values(c.pillars)) {
          assert.equal(p.tenGod, lunar.LunarUtil.SHI_SHEN[c.pillars.day.stemId + p.stemId]);
          assert.deepEqual(p.hiddenTenGods, p.hiddenStemIds.map(s => lunar.LunarUtil.SHI_SHEN[c.pillars.day.stemId + s]));
        }
      }
    }
  }
});
test('all 12 Jie boundaries at -1/0/+1 second use absolute term context', () => {
  const boundaries = jieBoundaries(2024);
  assert.equal(boundaries.length, 12);
  for (const boundary of boundaries) {
    const instant = DateTime.fromISO(boundary.instant);
    const before = at(instant.minus({ seconds: 1 }).setZone('Asia/Seoul'));
    const exact = at(instant.setZone('Asia/Seoul'));
    const after = at(instant.plus({ seconds: 1 }).setZone('Asia/Seoul'));
    assert.notEqual(before.pillars.month.ganZhi, exact.pillars.month.ganZhi, boundary.name);
    assert.equal(exact.pillars.month.ganZhi, after.pillars.month.ganZhi);
    const shanghai = at(instant.setZone('Asia/Shanghai'));
    assert.equal(exact.pillars.year.ganZhi, shanghai.pillars.year.ganZhi);
    assert.equal(exact.pillars.month.ganZhi, shanghai.pillars.month.ganZhi);
    if (boundary.name === '立春') assert.notEqual(before.pillars.year.ganZhi, exact.pillars.year.ganZhi);
  }
});
test('same instant can have different civil day/hour without changing term year/month', () => {
  // Use winter: Shanghai observed DST in May 1990 and then shared Seoul's +09.
  const seoul = DateTime.fromISO('1990-01-16T00:30:00', { zone: 'Asia/Seoul' });
  const a = at(seoul), b = at(seoul.setZone('Asia/Shanghai'));
  assert.equal(a.pillars.year.ganZhi, b.pillars.year.ganZhi);
  assert.equal(a.pillars.month.ganZhi, b.pillars.month.ganZhi);
  assert.notEqual(a.pillars.day.ganZhi, b.pillars.day.ganZhi);
  assert.equal(a.timeContext.birthInstant, b.timeContext.birthInstant);
});
test('unknown time exposes common facts, not an invented noon chart', () => {
  const c = calculateChart({ ...input, timeKnown: false });
  assert.equal(c.pillars.time, null); assert.equal(c.timeContext.birthInstant, null);
  assert.equal(c.elements.denominator, 6); assert.equal(c.yun, null);
  const sect1 = calculateChart({ ...input, timeKnown: false, dayBoundarySect: 1 });
  assert.equal(sect1.pillars.day, null);
  assert.ok(sect1.warnings.includes('CROSS_BOUNDARY_UNCERTAINTY'));
  assert.equal(sect1.facts['F.day.stem'], undefined);
  assert.equal(sect1.pillars.year.tenGod, null);
  const boundary = calculateChart({ ...input, date: '2024-02-04', timeKnown: false });
  assert.equal(boundary.pillars.year, null); assert.equal(boundary.pillars.month, null);
  assert.equal(boundary.pillars.day !== null, true);
  const skippedMidnight = calculateChart({ ...input, date: '1961-08-10', timeKnown: false });
  assert.equal(skippedMidnight.pillars.time, null);
  assert.equal(skippedMidnight.candidates.day.length, 1);
});
test('invalid dates, leap dates, future and unsupported policies are distinguished', () => {
  for (const date of ['2023-02-29', '2024-02-30', '1990-13-01', 'oops']) {
    assert.throws(() => calculateChart({ ...input, date }), { code: 'INVALID_DATE' });
  }
  assert.doesNotThrow(() => calculateChart({ ...input, date: '2024-02-29' }));
  assert.throws(() => normalizeBirth({ ...input, date: '2026-12-01' }, DateTime.fromISO('2026-10-18')), { code: 'INVALID_DATE' });
  assert.throws(() => normalizeBirth({ ...input, date: '2026-10-18', time: '15:00' }, DateTime.fromISO('2026-10-18T14:00', { zone: 'Asia/Seoul' })), { code: 'INVALID_DATE' });
  assert.throws(() => calculateChart({ ...input, zone: 'Europe/London' }), { code: 'UNSUPPORTED_TIME_POLICY' });
  assert.throws(() => calculateChart({ ...input, calendar: 'lunar' }), { code: 'UNSUPPORTED_TIME_POLICY' });
  assert.throws(() => calculateChart({ ...input, pillarClock: 'true-solar' }), { code: 'UNSUPPORTED_TIME_POLICY' });
  assert.throws(() => calculateChart({ ...input, date: '1949-01-01' }), { code: 'UNSUPPORTED_TIME_POLICY' });
});
test('DST gap is rejected and fold requires an explicit valid offset', () => {
  assert.throws(() => calculateChart({ ...input, date: '2024-03-10', time: '02:30', zone: 'America/New_York' }), { code: 'NONEXISTENT_LOCAL_TIME' });
  const fold = { ...input, date: '2024-11-03', time: '01:30', zone: 'America/New_York' };
  assert.throws(() => calculateChart(fold), { code: 'AMBIGUOUS_LOCAL_TIME' });
  const a = calculateChart({ ...fold, offsetMinutes: -240 }), b = calculateChart({ ...fold, offsetMinutes: -300 });
  assert.equal(DateTime.fromISO(b.timeContext.birthInstant).diff(DateTime.fromISO(a.timeContext.birthInstant), 'hours').hours, 1);
  assert.throws(() => calculateChart({ ...fold, offsetMinutes: 540 }), { code: 'AMBIGUOUS_LOCAL_TIME' });
});
test('historical Seoul offsets and summer time use IANA tzdb', () => {
  assert.equal(calculateChart({ ...input, date: '1955-01-15', time: '12:00' }).timeContext.historicalOffsetMinutes, 510);
  assert.equal(calculateChart({ ...input, date: '1955-05-15', time: '12:00' }).timeContext.historicalOffsetMinutes, 570);
  assert.equal(calculateChart({ ...input, zone: 'Asia/Shanghai' }).timeContext.historicalOffsetMinutes, 540);
  assert.equal(calculateChart({ ...input, date: '1988-07-15', time: '12:00' }).timeContext.historicalOffsetMinutes, 600);
  assert.equal(calculateChart({ ...input, date: '1990-07-15', time: '12:00' }).timeContext.historicalOffsetMinutes, 540);
});
test('numeric gender 0/1 × yin/yang year × yun sect1/2; pre-yun is separate from ten periods', () => {
  for (const year of [1990, 1991]) for (const code of [0, 1]) for (const sect of [1, 2]) {
    const c = calculateChart({ ...input, date: `${year}-05-15`, yunGenderCode: code, yunSect: sect });
    const y = c.yun;
    assert.equal(y.periods.length, 11); assert.equal(y.periods[0].kind, 'pre-yun');
    assert.equal(y.periods[0].ganZhi, null); assert.equal(y.periods.filter(p => p.kind === 'da-yun').length, 10);
    assert.equal(y.startInstant, null); assert.equal(y.startSolarWallTime, null);
    assert.equal(y.direction, (year === 1990) === (code === 1) ? 'forward' : 'backward');
  }
  for (const invalid of ['1', '0', 2, false]) assert.throws(() => calculateChart({ ...input, yunGenderCode: invalid }), { code: 'INVALID_YUN_METHOD' });
  assert.equal(calculateChart({ ...input, yunGenderCode: null }).yun, null);
});
test('12 civil months are continuous half-open intervals split on actual term instants', () => {
  for (const zone of ['Asia/Seoul', 'Asia/Shanghai', 'America/New_York']) {
    const months = yearMonths(2026, zone); assert.equal(months.length, 12);
    const segments = months.flatMap(m => m.segments);
    for (let i = 0; i < segments.length - 1; i++) assert.equal(segments[i].end, segments[i + 1].start);
    for (const segment of segments) assert.ok(segment.start < segment.end);
    const february = months[1]; assert.equal(february.segments.length, 2);
    assert.notEqual(february.segments[0].yearGanZhi, february.segments[1].yearGanZhi);
    assert.equal(february.segments[1].boundaryName, '立春');
  }
});
test('DTO is JSON safe and repeatable; compatibility facts are symmetric', () => {
  const a = calculateChart(input), b = calculateChart({ ...input, date: '1992-08-12', timeKnown: false });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), calculateChart(input));
  assert.deepEqual(compareCharts(a, b), compareCharts(b, a));
  assert.equal(compareCharts(a, b).score, null);
});

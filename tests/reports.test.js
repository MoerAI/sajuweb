import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateChart } from '../server/engine.js';
import { DateTime } from 'luxon';
import { composeReport as compose, validateReport } from '../server/reports.js';
import { products } from '../shared/catalog.js';

const chart = calculateChart({ date: '1990-05-15', time: '12:00', timeKnown: true, zone: 'Asia/Seoul' });
const partner = calculateChart({ date: '1992-03-20', time: '09:00', timeKnown: true, zone: 'Asia/Seoul' });
const composeReport = params => compose({ ...params, now: DateTime.fromISO('2026-10-18T12:00:00Z') });
test('exactly ten distinct product definitions and four preview releases', () => {
  assert.equal(products.length, 10); assert.equal(new Set(products.map(p => p.id)).size, 10);
  assert.deepEqual(products.filter(p => p.live).map(p => p.id), ['P01', 'P02', 'P03', 'P04']);
});
test('four products connect personalized claims to existing facts and versioned draft rules', () => {
  for (const productId of ['P01', 'P02', 'P03', 'P04']) {
    const r = composeReport({ productId, chart, partner, targetYear: 2026 });
    assert.equal(r.summary.length, 3); assert.ok(r.sections.length >= 2);
    assert.doesNotThrow(() => validateReport(r, chart, partner));
    for (const c of r.sections.flatMap(s => s.claims)) assert.ok(c.factRefs.length >= 2 && c.ruleRefs.length);
    assert.equal(r.versions.narrator, 'deterministic-no-llm');
    for (const section of r.sections)
      assert.equal(new Set(section.claims.map(c => c.text)).size, section.claims.length);
  }
});
test('six-month relationship calendar crosses year end and supports the last target year', () => {
  for (const targetYear of [2026, 2030]) {
    const r = composeReport({ productId: 'P03', chart, targetYear });
    assert.equal(r.months.length, 6);
    assert.equal(r.months[0].month, 10);
    assert.equal(r.months[5].month, 3);
    const segments = r.months.flatMap(m => m.segments);
    for (let i = 0; i < segments.length - 1; i++) assert.equal(segments[i].end, segments[i + 1].start);
  }
  assert.throws(() => composeReport({ productId: 'P02', chart, targetYear: 2031 }), { code: 'UNSUPPORTED_TIME_POLICY' });
});
test('target period remains a snapshot and relationship context never changes chart facts', () => {
  const facts = structuredClone(chart.facts);
  const a = composeReport({ productId: 'P02', chart, targetYear: 2026 });
  const b = composeReport({ productId: 'P02', chart, targetYear: 2027 });
  assert.equal(a.targetYear, 2026); assert.equal(b.targetYear, 2027); assert.notDeepEqual(a.months, b.months);
  composeReport({ productId: 'P03', chart, context: { relationshipStatus: 'single' } });
  composeReport({ productId: 'P03', chart, context: { relationshipStatus: 'partnered' } });
  assert.deepEqual(chart.facts, facts);
});
test('unknown day never creates claims referring to a null fact', () => {
  const unknown = calculateChart({ date: '2024-02-04', timeKnown: false, dayBoundarySect: 1, zone: 'Asia/Seoul' });
  const r = composeReport({ productId: 'P01', chart: unknown });
  assert.equal(r.sections.flatMap(s => s.claims).length, 0);
  assert.doesNotThrow(() => validateReport(r, unknown));
});
test('partner required for P04 and swapping preserves comparison facts', () => {
  assert.throws(() => composeReport({ productId: 'P04', chart }), { code: 'PARTNER_REQUIRED' });
  const a = composeReport({ productId: 'P04', chart, partner }), b = composeReport({ productId: 'P04', chart: partner, partner: chart });
  assert.deepEqual(a.comparison, b.comparison);
});
test('P05-P10 gates closed; P07 safety stop is free and has no contact strategies', () => {
  for (const productId of ['P05', 'P06', 'P07', 'P08', 'P09', 'P10'])
    assert.throws(() => composeReport({ productId, chart }), { code: 'PRODUCT_NOT_RELEASED' });
  for (const contactStatus of ['blocked', 'refused', 'violence']) {
    const r = composeReport({ productId: 'P07', chart, context: { contactStatus } });
    assert.equal(r.safetyStop, true); assert.equal(r.sections.flatMap(s => s.claims).length, 0);
    assert.equal(r.followUpQuestions.length, 0);
  }
});
test('missing references and adversarial claims fail output validation', () => {
  const r = composeReport({ productId: 'P01', chart });
  const missing = structuredClone(r); missing.sections[0].claims[0].factRefs = ['F.fake'];
  assert.throws(() => validateReport(missing, chart), { code: 'MODEL_VALIDATION_FAILED' });
  const malicious = structuredClone(r); malicious.sections[0].claims[0].text = '외도 중';
  assert.throws(() => validateReport(malicious, chart), { code: 'MODEL_VALIDATION_FAILED' });
});

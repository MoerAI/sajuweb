import express from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { calculateChart, DomainError, POLICY } from './engine.js';
import { composeReport } from './reports.js';
import { products } from '../shared/catalog.js';

export function createApp({ now = () => Date.now() } = {}) {
  const app = express();
  const sessions = new Map(), shares = new Map();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' });
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.headers.host}`)
      return res.status(403).json({ code: 'ORIGIN_DENIED', message: '같은 사이트에서만 요청할 수 있습니다.' });
    for (const [token, session] of sessions) if (session.expiresAt <= now()) sessions.delete(token);
    for (const [token, share] of shares) if (share.expiresAt <= now()) shares.delete(token);
    const cookie = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('saju_session='))?.slice(13);
    let session = sessions.get(cookie);
    if (!session) {
      const token = randomBytes(32).toString('hex');
      session = { charts: new Map(), reports: new Map(), idempotency: new Map(), expiresAt: now() + 86400000, owner: token };
      sessions.set(token, session);
      res.cookie('saju_session', token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 86400000, path: '/' });
    }
    req.session = session;
    next();
  });
  const owned = (map, id) => {
    const value = map.get(id);
    if (!value) throw new DomainError('NOT_FOUND', '결과가 없거나 이 세션의 접근 권한이 없습니다.');
    return value;
  };
  const idempotent = (req, res, produce) => {
    const key = req.get('Idempotency-Key');
    if (!key || !/^[\w-]{8,128}$/.test(key)) throw new DomainError('IDEMPOTENCY_KEY_REQUIRED', '고유 요청 키가 필요합니다.');
    const hash = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
    const scopedKey = `${req.path}:${key}`;
    const prior = req.session.idempotency.get(scopedKey);
    if (prior) {
      if (prior.hash !== hash) throw new DomainError('IDEMPOTENCY_CONFLICT', '같은 요청 키로 다른 내용을 보낼 수 없습니다.');
      return res.json(prior.result);
    }
    if (req.session.idempotency.size >= 200) throw new DomainError('SESSION_LIMIT', '세션 요청 한도에 도달했습니다.');
    const result = produce();
    req.session.idempotency.set(scopedKey, { hash, result });
    res.status(201).json(result);
  };
  app.get('/api/v1/config', (req, res) => res.json({ products, policy: POLICY, mode: 'private-development', paymentsEnabled: false, aiEnabled: false, storage: '24h-process-memory' }));
  app.post('/api/v1/charts', (req, res) => idempotent(req, res, () => {
    if (req.session.charts.size >= 30) throw new DomainError('SESSION_LIMIT', '한 세션에 명식을 30개까지 만들 수 있습니다.');
    const chart = calculateChart(req.body);
    const record = { ...chart, id: randomUUID(), alias: String(req.body.alias ?? '나').slice(0, 30), createdAt: new Date(now()).toISOString(), saved: false };
    req.session.charts.set(record.id, record);
    return record;
  }));
  app.get('/api/v1/charts/:id', (req, res) => res.json(owned(req.session.charts, req.params.id)));
  app.post('/api/v1/report-previews', (req, res) => idempotent(req, res, () => {
    const chart = owned(req.session.charts, req.body.chartId);
    const partner = req.body.partnerChartId ? owned(req.session.charts, req.body.partnerChartId) : null;
    if (partner && req.body.partnerConsent !== true) throw new DomainError('PARTNER_CONSENT_REQUIRED', '상대 정보 사용 권한을 확인해 주세요.');
    const result = composeReport({ productId: req.body.productId, targetYear: req.body.targetYear, context: req.body.context, chart, partner });
    const report = { ...result, id: randomUUID(), chartId: chart.id, partnerChartId: partner?.id ?? null, createdAt: new Date(now()).toISOString(), saved: false };
    req.session.reports.set(report.id, report);
    return report;
  }));
  app.get('/api/v1/reports/:id', (req, res) => res.json(owned(req.session.reports, req.params.id)));
  app.post('/api/v1/reports/:id/save', (req, res) => {
    if (req.body.consent !== true) throw new DomainError('CONSENT_REQUIRED', '저장 동의가 필요합니다.');
    const report = owned(req.session.reports, req.params.id);
    report.saved = true; owned(req.session.charts, report.chartId).saved = true;
    res.json({ saved: true, expiresAt: new Date(req.session.expiresAt).toISOString() });
  });
  app.get('/api/v1/library', (req, res) => res.json({
    charts: [...req.session.charts.values()], reports: [...req.session.reports.values()].filter(r => r.saved),
    expiresAt: new Date(req.session.expiresAt).toISOString(),
  }));
  const revokeLinked = (req, reportIds) => {
    for (const [token, s] of shares) if (s.owner === req.session.owner && reportIds.includes(s.reportId)) shares.delete(token);
    // Idempotency cache must not resurrect deleted private results.
    req.session.idempotency.clear();
  };
  app.delete('/api/v1/reports/:id', (req, res) => {
    owned(req.session.reports, req.params.id); req.session.reports.delete(req.params.id);
    revokeLinked(req, [req.params.id]); res.status(204).end();
  });
  app.delete('/api/v1/profiles/:id', (req, res) => {
    owned(req.session.charts, req.params.id); req.session.charts.delete(req.params.id);
    const ids = [...req.session.reports.values()].filter(r => r.chartId === req.params.id || r.partnerChartId === req.params.id).map(r => r.id);
    ids.forEach(id => req.session.reports.delete(id)); revokeLinked(req, ids); res.status(204).end();
  });
  app.post('/api/v1/shares', (req, res) => {
    if (req.body.consent !== true) throw new DomainError('CONSENT_REQUIRED', '익명 요약 공유에 동의해 주세요.');
    const report = owned(req.session.reports, req.body.reportId);
    if (report.safetyStop) throw new DomainError('SHARE_UNAVAILABLE', '안전 안내는 공유 리포트로 만들지 않습니다.');
    const token = randomBytes(24).toString('hex'), expiresAt = now() + 7 * 86400000;
    shares.set(token, { reportId: report.id, owner: req.session.owner, expiresAt,
      public: { title: products.find(p => p.id === report.productId).title, summary: ['전통 해석을 활용한 자기이해 관점입니다.', '계산 사실과 일반적인 행동 제안을 구분해 읽습니다.', '서로의 차이를 점수가 아닌 대화의 주제로 살펴봅니다.'], expiresAt: new Date(expiresAt).toISOString() } });
    res.status(201).json({ token, path: `/share/${token}`, expiresAt: new Date(expiresAt).toISOString() });
  });
  app.get('/api/v1/shares/:token', (req, res) => {
    const share = shares.get(req.params.token);
    if (!share) throw new DomainError('NOT_FOUND', '공유가 만료되었거나 철회되었습니다.');
    res.json(share.public);
  });
  app.delete('/api/v1/shares/:token', (req, res) => {
    if (shares.get(req.params.token)?.owner !== req.session.owner) throw new DomainError('NOT_FOUND', '공유 권한이 없습니다.');
    shares.delete(req.params.token); res.status(204).end();
  });
  app.post(['/api/v1/orders', '/api/v1/payments/webhook', '/api/v1/reports'], () => {
    throw new DomainError('RELEASE_GATE_CLOSED', '결제·구매 권한·법률·콘텐츠 검수 전 유료 서비스는 비활성화되어 있습니다.');
  });
  app.post('/api/v1/reports/:id/questions', (req, res) => {
    const report = owned(req.session.reports, req.params.id);
    const index = req.body.questionIndex;
    if (!Number.isInteger(index) || index < 0 || index >= report.followUpQuestions.length)
      throw new DomainError('QUESTION_NOT_SUPPORTED', '리포트에 연결된 안내 질문만 지원합니다. 자유형 AI 상담은 아직 제공하지 않습니다.');
    const answers = [
      '연·월주는 절입 순간의 UTC+8 문맥, 일·시주는 출생지 현지 민간시계로 계산했습니다. dayBoundarySect와 yunSect는 별개이며 명식 근거에서 확인할 수 있습니다.',
      '시주는 비워두고 당일 유효 시간대와 절입 경계를 검사합니다. 연·월·일주도 후보가 다르면 확정하지 않습니다.',
      '가이드는 계산된 사건이나 보장된 효과가 아닙니다. 자신의 경험을 기록하고 작은 행동을 시도하는 일반적인 제안입니다.',
    ];
    res.json({ question: report.followUpQuestions[index], answer: answers[index], kind: 'general_guidance' });
  });
  app.use('/api', (req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' }));
  app.use((error, req, res, next) => {
    if (!req.path.startsWith('/api')) return next(error);
    const code = error.code ?? (error.type === 'entity.too.large' ? 'INPUT_TOO_LARGE' : 'INTERNAL_ERROR');
    const status = code === 'NOT_FOUND' ? 404 : code === 'RELEASE_GATE_CLOSED' || code === 'PRODUCT_NOT_RELEASED' ? 503 : code === 'INTERNAL_ERROR' ? 500 : 400;
    res.status(status).json({ code, message: error instanceof DomainError ? error.message : '요청을 처리할 수 없습니다. 입력을 확인해 주세요.', details: error.details });
  });
  return app;
}

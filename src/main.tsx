import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { products, categories } from '../shared/catalog.js';
import type { Chart, Library, Report } from './types';
import './style.css';

const todayYear = new Date().getFullYear();
type Product = (typeof products)[number];
type ApiError = Error & { code?: string; details?: { offsets?: number[] } };
async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', ...(body === undefined ? {} : { 'Idempotency-Key': crypto.randomUUID() }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message), { code: data.code, details: data.details });
  return data;
}
const localDate = (value: string, zone = 'Asia/Seoul') => new Date(value).toLocaleString('ko-KR', { timeZone: zone, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const elementLabel: Record<string, string> = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' };
const warningLabel: Record<string, string> = {
  TIME_UNKNOWN: '출생시간 미상: 시주를 제외하고 후보 공통 사실만 제공합니다.',
  CROSS_BOUNDARY_UNCERTAINTY: '당일 경계에서 원국 후보가 달라집니다. 불확실한 주는 확정하지 않았습니다.',
  DEVELOPMENT_POLICY_UNAPPROVED: '계산 정책은 독립 역서·전문가 검수 전 개발 버전입니다.',
  YUN_METHOD_UNSPECIFIED: '대운 산식 미선택: 대운을 계산하지 않았습니다.',
  YUN_PRECISE_BOUNDARY_UNVERIFIED: '대운은 기술 미리보기입니다. 정확한 현지 기운 시작일은 제공하지 않습니다.',
};
function Icon({ type = 'arrow' }: { type?: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    {type === 'book' ? <><path d="M4 4h7c2 0 3 1 3 3v14c0-2-2-3-4-3H4z" /><path d="M14 7c0-2 2-3 6-3v14c-3 0-5 1-6 3" /></> : type === 'spark' ? <path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}
  </svg>;
}
function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <svg viewBox="0 0 480 430" role="presentation">
      <defs><radialGradient id="glow"><stop stopColor="#e7e6d2" /><stop offset="1" stopColor="#f2f0e7" stopOpacity="0" /></radialGradient></defs>
      <circle cx="240" cy="222" r="208" fill="url(#glow)" />
      <g fill="none" stroke="#d2d6c5" strokeWidth="1"><circle cx="240" cy="222" r="164" /><circle cx="240" cy="222" r="115" strokeDasharray="2 7" /><ellipse cx="240" cy="222" rx="205" ry="77" transform="rotate(-28 240 222)" /></g>
      <path d="M240 351V174m0 123-55-52m55 25 54-65m-54 23-30-40m30 18 39-33" stroke="#87977b" strokeWidth="3" fill="none" />
      <g fill="#98a58b"><path d="M185 245c-46 0-49-43-49-43 40-4 55 17 49 43" /><path d="M294 205c-3-43 38-56 38-56 11 37-8 59-38 56" /><path d="M210 188c-33-5-34-36-34-36 29 0 41 16 34 36" /><path d="M279 173c-2-31 27-43 27-43 13 28-2 44-27 43" /></g>
      <g fill="#bfcaaf"><path d="M240 223c-33-30-14-65-14-65 33 18 36 43 14 65" /><path d="M240 297c38-26 67-5 67-5-25 32-48 28-67 5" /></g>
      <g fontFamily="serif" textAnchor="middle"><circle cx="118" cy="95" r="29" fill="#e2e9dd" /><text x="118" y="104" fontSize="25" fill="#567258">木</text><circle cx="371" cy="112" r="25" fill="#f0dfd4" /><text x="371" y="120" fontSize="22" fill="#b37652">火</text><circle cx="409" cy="284" r="29" fill="#ebe2cf" /><text x="409" y="293" fontSize="25" fill="#9a8555">土</text><circle cx="102" cy="322" r="24" fill="#e5e5de" /><text x="102" y="330" fontSize="22" fill="#808475">金</text><circle cx="261" cy="58" r="22" fill="#dfe7e7" /><text x="261" y="66" fontSize="21" fill="#627e86">水</text></g>
      <g fill="#89977f"><circle cx="61" cy="212" r="3" /><circle cx="324" cy="361" r="3" /><path d="m333 58 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></g>
      <path d="M185 355c33 13 75 13 110-1" fill="none" stroke="#b9c3ad" />
    </svg>
    <span className="art-caption">다섯 가지 기운, 하나뿐인 나의 이야기</span>
  </div>;
}
function App() {
  const [location, setLocation] = useState(window.location.pathname + window.location.search);
  const [category, setCategory] = useState('all');
  const [chart, setChart] = useState<Chart | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [readMode, setReadMode] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [targetYear, setTargetYear] = useState(todayYear);
  const [share, setShare] = useState<{ token: string; path: string; expiresAt: string } | null>(null);
  const [publicShare, setPublicShare] = useState<{ title: string; summary: string[]; expiresAt: string } | null>(null);
  const [partnerId, setPartnerId] = useState('');
  const [firstId, setFirstId] = useState('');
  const [partnerConsent, setPartnerConsent] = useState(false);
  const [relationshipType, setRelationshipType] = useState('');
  const [contactStatus, setContactStatus] = useState('');
  const [answer, setAnswer] = useState('');
  const [form, setForm] = useState({ alias: '', date: '', time: '', timeKnown: true, zone: 'Asia/Seoul', yunGenderCode: '', clock: '24', period: 'AM', offset: '' });
  const [offsets, setOffsets] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const path = location.split('?')[0];
  const selectedId = new URLSearchParams(location.split('?')[1]).get('product') ?? 'P01';
  const selected = products.find(p => p.id === selectedId) ?? products[0];
  const detailProduct = products.find(p => path === `/contents/${p.id}`);
  const navigate = (to: string) => {
    window.history.pushState({}, '', to); setLocation(to); window.scrollTo(0, 0);
    setError(''); setNotice(''); setAnswer(''); setShare(null); setConfirming(false);
  };
  useEffect(() => {
    const pop = () => { setLocation(window.location.pathname + window.location.search); setError(''); };
    window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    let active = true;
    setError(''); setNotice('');
    const load = async () => {
      try {
        if (path.startsWith('/charts/')) {
          setChart(null); const value = await api<Chart>(`/charts/${path.split('/')[2]}`); if (active) setChart(value);
        }
        if (path.startsWith('/reports/')) {
          setReport(null); const value = await api<Report>(`/reports/${path.split('/')[2]}`); if (active) setReport(value);
        }
        if (path === '/library' || path === '/compare') {
          const value = await api<Library>('/library'); if (active) setLibrary(value);
        }
        if (path.startsWith('/share/')) {
          setPublicShare(null); const value = await api<typeof publicShare>(`/shares/${path.split('/')[2]}`); if (active) setPublicShare(value);
        }
      } catch (e) { if (active) setError((e as Error).message); }
    };
    void load(); return () => { active = false; };
  }, [location]);
  useEffect(() => {
    if (!path.startsWith('/reports/') || !report || report.id !== path.split('/')[2]) return;
    const key = `reading-position:${report.id}`;
    const restore = requestAnimationFrame(() => window.scrollTo(0, Number(sessionStorage.getItem(key) ?? 0)));
    const savePosition = () => sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener('scroll', savePosition, { passive: true });
    return () => { cancelAnimationFrame(restore); window.removeEventListener('scroll', savePosition); };
  }, [path, report?.id]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) {
      const err = e as ApiError; setError(err.message);
      if (err.details?.offsets) { setOffsets(err.details.offsets); setConfirming(false); }
    } finally { setBusy(false); }
  }
  const refreshLibrary = async () => setLibrary(await api<Library>('/library'));
  const generate = (productId: string, chartId: string, extra = {}) => run(async () => {
    const result = await api<Report>('/report-previews', { productId, chartId, targetYear, ...extra });
    setReport(result); navigate(`/reports/${result.id}`);
  });
  const time24 = () => {
    if (form.clock === '24' || !form.time) return form.time;
    const [hour, minute] = form.time.split(':').map(Number);
    return `${String(hour % 12 + (form.period === 'PM' ? 12 : 0)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  const createChart = () => run(async () => {
    const value = await api<Chart>('/charts', {
      alias: form.alias || '나', date: form.date, time: time24(), timeKnown: form.timeKnown,
      zone: form.zone, calendar: 'solar', yunGenderCode: form.yunGenderCode === '' ? null : Number(form.yunGenderCode),
      ...(form.offset === '' ? {} : { offsetMinutes: Number(form.offset) }),
    });
    setChart(value); navigate(`/charts/${value.id}?product=${selectedId}`);
  });
  const link = (to: string, text: React.ReactNode, className = '') => <a className={className} href={to} onClick={e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(to); } }}>{text}</a>;
  const productCards = (items: Product[]) => <div className="product-grid">{items.map((p, index) =>
    <a key={p.id} className={`product-card ${p.color}`} href={`/contents/${p.id}`} onClick={e => { e.preventDefault(); navigate(`/contents/${p.id}`); }}>
      <div className="card-top"><span className="product-symbol">{p.mark}</span><span className={`badge ${p.live ? '' : 'muted'}`}>{p.live ? index === 0 ? '에디터 추천' : '무료 체험' : '준비 중'}</span></div>
      <span className="eyebrow">{p.subtitle}</span><h3>{p.title}</h3><p>{p.description}</p>
      <div className="card-bottom"><span>{p.live ? '나에게 맞는 관점 찾기' : '구성과 공개 기준 살펴보기'}</span><Icon /></div>
    </a>)}</div>;
  function Evidence({ value }: { value: Chart }) {
    return <details className="evidence"><summary>계산 근거와 정책 확인하기</summary>
      <dl><dt>엔진</dt><dd>{value.engine.name} {value.engine.version}</dd><dt>계산 시계</dt><dd>연·월주 UTC+8 절입 / 일·시주 현지 민간시계</dd><dt>시간대</dt><dd>{value.timeContext.zone} · 역사 offset {value.timeContext.historicalOffsetMinutes ?? '시간 미상'}분</dd><dt>입력 시계</dt><dd>{value.timeContext.normalizedWallTime}</dd><dt>절대 시각</dt><dd>{value.timeContext.birthInstant ?? '미확정'}</dd><dt>일주 / 대운 sect</dt><dd>{value.policies.dayBoundarySect} / {value.policies.yunSect}</dd><dt>정책 / tzdb</dt><dd>{value.policies.id} / {value.policies.tzdbVersion}</dd></dl>
      <p>23시의 시주 천간은 업스트림 규칙에 따라 다음 날 일간을 사용할 수 있습니다. 일주의 자정 경계와 동일하지 않습니다. 오행은 천간·지지 본오행의 단순 출현 수이며 강약·능력점수가 아닙니다.</p>
      {value.candidates && <div><h4>출생일 내 가능한 간지</h4>{Object.entries(value.candidates).filter(([k]) => k !== 'time').map(([k, v]) => <p key={k}>{({ year: '연주', month: '월주', day: '일주' } as Record<string, string>)[k]}: {v.join(' / ')}</p>)}</div>}
      <pre>{JSON.stringify(value.facts, null, 2)}</pre>
    </details>;
  }
  function Pillars({ value }: { value: Chart }) {
    return <div className="pillar-grid">{[['year', '연주'], ['month', '월주'], ['day', '일주 · 나'], ['time', '시주']].map(([key, title]) => {
      const p = value.pillars[key];
      return <div className={`pillar ${key === 'day' ? 'day' : ''}`} key={key}>
        <span>{title}</span><strong className={`element-${p?.stemElement}`}>{p?.stemId ?? '—'}</strong><strong className={`element-${p?.branchElement}`}>{p?.branchId ?? '—'}</strong>
        <span>{p ? `${elementLabel[p.stemElement]} · ${elementLabel[p.branchElement]}` : key === 'time' ? '시간 미상' : '후보 불일치'}</span><small>지장간 {p?.hiddenStemIds.join(' · ') ?? '미확정'}</small><small>십성 {p?.tenGod ?? '미확정'}</small>
      </div>;
    })}</div>;
  }
  function yearSelect() {
    return <label className="inline-label">대상 연도<select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))}>{Array.from({ length: 7 }, (_, i) => todayYear - 3 + i).filter(y => y <= 2030).map(y => <option key={y}>{y}</option>)}</select></label>;
  }
  const isHome = path === '/';
  return <div className={`${readMode ? 'reading' : ''} ${largeText ? 'large-text' : ''}`}>
    <a href="#main" className="skip-link">본문으로 바로가기</a>
    <header className="header"><div className="header-inner">
      {link('/', <><span className="logo-seal">결</span><span className="logo-word">결<span>나를 읽는 시간</span></span></>, 'brand')}
      <nav aria-label="주 메뉴">{link('/contents', '사주 둘러보기', path.startsWith('/contents') ? 'active' : '')}{link('/methodology', '결의 이야기', path === '/methodology' ? 'active' : '')}{link('/library', <><Icon type="book" /> 나의 서재</>, 'library-link')}</nav>
    </div></header>
    <main id="main">
      {error && <div className="alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="오류 닫기">×</button></div>}
      {notice && <div className="alert success" role="status">{notice}</div>}
      {busy && <div className="progress" role="status">계산 사실과 연결된 근거를 확인하고 있어요.</div>}
      {isHome && <>
        <section className="hero shell"><div className="hero-copy"><span className="kicker"><span /> 오롯이 나를 이해하는 시간</span>
          <h1>정해진 운명보다,<br /><em>나를 알아가는 발견.</em></h1>
          <p>타고난 나의 결을 읽고, 오늘의 선택을 더 나답게.<br />사주를 통해 나와 관계, 삶의 흐름을 차분히 살펴보세요.</p>
          <div className="hero-actions">{link('/profiles/new', <>무료로 나의 사주 보기 <Icon /></>, 'button primary')}{link('/methodology', '결은 어떻게 읽어주나요?', 'text-link')}</div>
          <div className="hero-note"><span className="tiny-circle">✓</span> 회원가입 없이 시작해요 <i /> 계산 근거를 투명하게</div>
        </div><HeroArt /></section>
        <section className="trust-strip"><div className="shell"><span><Icon type="spark" /><strong>이해를 위한 사주</strong> 미래를 단정하지 않아요</span><span><Icon type="book" /><strong>근거 있는 이야기</strong> 원국과 해석을 구분해요</span><span className="lock-symbol"><span>⌑</span><strong>내 정보는 소중하게</strong> 동의 없이 외부 전송하지 않아요</span></div></section>
        <section className="shell discovery"><div className="section-heading"><div><span className="eyebrow">A QUESTION FOR YOU</span><h2>지금, 어떤 이야기가 궁금한가요?</h2><p>마음이 머무는 질문에서 시작해 보세요.</p></div>{link('/contents', <>전체 이야기 보기 <Icon /></>, 'text-link')}</div>
          <div className="category-tabs" role="group" aria-label="관심 주제">{categories.map(c => <button className={category === c.id ? 'selected' : ''} key={c.id} onClick={() => setCategory(c.id)}>{c.label}</button>)}</div>
          {productCards(products.filter(p => category === 'all' ? p.live : p.category === category))}
        </section>
        <section className="shell philosophy"><span className="philosophy-mark">結</span><div><span className="eyebrow">OUR POINT OF VIEW</span><h2>사주는 답이 아니라,<br />나에게 건네는 좋은 질문입니다.</h2><p>당신의 삶을 몇 개의 글자로 단정하지 않습니다.<br />전통의 언어를 오늘의 이야기로 풀어, 스스로 선택할 여백을 남깁니다.</p>{link('/methodology', <>우리가 사주를 대하는 방식 <Icon /></>, 'text-link')}</div></section>
      </>}
      {path === '/contents' && <section className="shell page-section"><span className="eyebrow">EXPLORE YOUR STORY</span><h1>지금의 나를 위한 이야기</h1><p className="lead">열 가지 질문, 나를 이해하는 여러 관점. P01~P04는 무료 개발 체험으로 만나보세요.</p><div className="category-tabs">{categories.map(c => <button className={category === c.id ? 'selected' : ''} key={c.id} onClick={() => setCategory(c.id)}>{c.label}</button>)}</div>{productCards(products.filter(p => category === 'all' || p.category === category))}</section>}
      {detailProduct && <section className="shell narrow page-section"><span className={`detail-symbol ${detailProduct.color}`}>{detailProduct.mark}</span><span className="eyebrow">{detailProduct.id} · {detailProduct.subtitle}</span><h1>{detailProduct.title}</h1><p className="lead">{detailProduct.question}</p><p>{detailProduct.description}</p><div className="panel"><h2>이런 이야기를 함께 살펴봐요</h2><ol className="section-list">{detailProduct.sections.map(s => <li key={s}>{s}</li>)}</ol><dl><dt>필요 정보</dt><dd>{detailProduct.id === 'P04' ? '두 사람의 양력 출생정보 · 상대 정보 사용 권한 확인' : '본인의 양력 출생정보 · 시간 미상 가능'}</dd><dt>이용 범위</dt><dd>{detailProduct.live ? '무료 개발 체험 · 원국과 초안 요약' : '검수 후 순차 공개 · 현재 판매하지 않음'}</dd><dt>가격</dt><dd>유료 가격 미확정 · 현재 결제 불가</dd><dt>심층 리포트</dt><dd>1,800~3,000자 목표 · 콘텐츠 승인 후 공개</dd></dl></div>
        <div className="panel sample"><span className="eyebrow">읽기 방식 예시 · 개인 계산 결과 아님</span><h3>“어떤 순간에 나다운 선택을 하나요?”</h3><p>전통의 상징은 나를 돌아보는 출발점입니다. 실제 생활에서 느낀 경험을 기록하고 작은 선택을 시도해 보세요. 이 예시는 특정 출생정보의 풀이가 아닙니다.</p></div>
        {detailProduct.id === 'P07' && <div className="panel"><h3>관계의 경계를 먼저 확인해요</h3><label>상대의 연락 의사<select value={contactStatus} onChange={e => setContactStatus(e.target.value)}><option value="">선택 안 함</option><option value="open">연락 중단 의사 없음</option><option value="blocked">차단함</option><option value="refused">연락을 거절함</option><option value="violence">폭력·위협이 있음</option></select></label>{['blocked', 'refused', 'violence'].includes(contactStatus) && <div role="status" className="safety-message"><h4>지금은 경계를 존중할 시간입니다.</h4><p>재접촉 전략과 결제를 안내하지 않습니다. 상대의 의사를 존중하고 내 일상과 지지 관계를 돌봐 주세요. 위협·폭력이 있다면 안전한 장소에서 긴급지원 112에 도움을 요청하세요.</p></div>}</div>}
        <p className="muted-text">상대의 속마음, 미래 사건, 확률을 알려주는 서비스가 아닙니다. 계산과 콘텐츠는 독립 검수 전이며 유료 리포트·AI 상담·환불 거래는 아직 제공하지 않습니다.</p>
        {detailProduct.live ? link(detailProduct.id === 'P04' ? '/compare' : `/profiles/new?product=${detailProduct.id}`, <>무료 체험 시작하기 <Icon /></>, 'button primary') : <button className="button" disabled>검수 후 공개 예정</button>}
        <p>{link('/methodology', '계산 기준')} · {link('/refund', '구매·환불 정책')}</p>
      </section>}
      {path === '/profiles/new' && <section className="shell narrow page-section"><span className="eyebrow">YOUR FIRST PAGE</span><h1>나의 이야기는 여기서부터</h1><p className="lead">생년월일을 알려주세요. 출생시간을 몰라도 괜찮아요.</p><div className="dev-note">비공개 개발 체험 · 양력 1950~2026년 / 한국·중국·뉴욕 시간대 기술 검증. 독립 역서·전문가 승인 전 정확성을 보증하지 않습니다.</div>
        <form className="panel birth-form" onSubmit={e => { e.preventDefault(); if (!confirming) setConfirming(true); else void createChart(); }}>
          {!confirming ? <>
            <label>어떻게 불러드릴까요? <small>선택</small><input maxLength={30} value={form.alias} placeholder="실명 대신 별칭을 입력해 주세요" onChange={e => setForm({ ...form, alias: e.target.value })} autoComplete="off" /></label>
            <label>생년월일 <span className="field-tag">양력 · 필수</span><input type="date" min="1950-01-01" max={new Date().toLocaleDateString('en-CA')} required value={form.date} onChange={e => setForm({ ...form, date: e.target.value, offset: '' })} aria-describedby="date-help" /><small id="date-help">음력과 진태양시 입력은 검수 후 지원합니다.</small></label>
            <fieldset><legend>출생시간</legend><label className="check-label"><input type="checkbox" checked={!form.timeKnown} onChange={e => setForm({ ...form, timeKnown: !e.target.checked })} /> 태어난 시간을 몰라요</label>
              {form.timeKnown && <div className="time-row"><label>표시 방식<select value={form.clock} onChange={e => setForm({ ...form, clock: e.target.value, time: '' })}><option value="24">24시간</option><option value="12">오전·오후</option></select></label>{form.clock === '12' && <label>오전·오후<select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}><option value="AM">오전</option><option value="PM">오후</option></select></label>}<label>태어난 시각{form.clock === '24' ? <input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value, offset: '' })} /> : <input type="text" required pattern="(0?[1-9]|1[0-2]):[0-5][0-9]" placeholder="예: 09:30" value={form.time} onChange={e => setForm({ ...form, time: e.target.value, offset: '' })} />}</label></div>}
            </fieldset>
            <label>출생 도시·시간대 <span className="field-tag">필수</span><select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value, offset: '' })}><option value="Asia/Seoul">대한민국 · 서울 (Asia/Seoul)</option><option value="Asia/Shanghai">중국 · 상하이 (Asia/Shanghai)</option><option value="America/New_York">미국 · 뉴욕 (America/New_York)</option></select><small>당시의 역사적 UTC offset과 서머타임을 적용합니다.</small></label>
            {offsets.length > 0 && <label>중복 시각의 UTC offset <select required value={form.offset} onChange={e => setForm({ ...form, offset: e.target.value })}><option value="">확인 후 선택해 주세요</option>{offsets.map(o => <option key={o} value={o}>UTC {o / 60}시간 ({o}분)</option>)}</select></label>}
            <details><summary>대운 산식 선택 <small>선택 · 기술 미리보기</small></summary><p>전통 대운 산식의 분기 코드이며 성정체성·연애 지향을 뜻하지 않습니다. 선택하지 않아도 원국과 무료 요약을 볼 수 있습니다.</p><label>대운 산식 코드<select value={form.yunGenderCode} onChange={e => setForm({ ...form, yunGenderCode: e.target.value })}><option value="">선택 안 함 · 대운 미계산</option><option value="0">숫자 0 분기</option><option value="1">숫자 1 분기</option></select></label></details>
            <p className="privacy-note">정보는 현재 브라우저의 게스트 세션에서 최대 24시간 메모리 보관되며 서버 재시작 시 사라집니다. AI·분석 서비스에 전송하지 않습니다. {link('/privacy', '개인정보 안내')}</p>
          </> : <div className="confirmation"><h2>입력한 정보를 확인해 주세요</h2><dl><dt>별칭</dt><dd>{form.alias || '나'}</dd><dt>양력 생년월일</dt><dd>{form.date}</dd><dt>현지 출생시간</dt><dd>{form.timeKnown ? `${time24()} (24시간)` : '시간 미상 · 시주 미제공'}</dd><dt>시간대</dt><dd>{form.zone}</dd><dt>계산 정책</dt><dd>현지 민간시계 + 절대 절입 / sect2 / yunSect2</dd><dt>대운 분기</dt><dd>{form.yunGenderCode === '' ? '미선택' : form.yunGenderCode}</dd></dl><button className="text-link" type="button" onClick={() => setConfirming(false)}>입력 수정하기</button></div>}
          <button className="button primary full" type="submit" disabled={busy}>{confirming ? '확인했어요, 명식 계산하기' : '입력 정보 확인하기'} <Icon /></button>
        </form>
      </section>}
      {path.startsWith('/charts/') && chart && <section className="shell result-page page-section"><span className="eyebrow">YOUR SAJU CHART</span><div className="section-heading"><div><h1>{chart.alias}님의 타고난 결</h1><p className="lead">네 기둥에서 시작하는 나를 이해하는 시간.</p></div>{link(`/profiles/new?product=${selectedId}`, '출생정보 수정', 'button secondary')}</div>
        <div className="dev-note">{chart.inputPrecision === 'day' ? '출생시간 미상 · 시주는 비워두었습니다. ' : ''}전문가 검수 전 개발 계산 결과입니다. 확정된 운명으로 읽지 마세요.</div>
        <Pillars value={chart} /><div className="result-columns"><div className="panel"><h2>다섯 가지 기운의 분포</h2><p>천간 1글자 + 지지 본오행 1글자의 단순 출현 수</p><div className="elements">{Object.entries(chart.elements.counts).map(([el, count]) => <div key={el}><span className={`element-${el}`}>{el} {elementLabel[el]}</span><div className="bar"><span style={{ width: `${chart.elements.denominator ? count / chart.elements.denominator * 100 : 0}%` }} /></div><strong>{count}</strong></div>)}</div><small>분모 {chart.elements.denominator}글자 · 지장간 가중치 없음 · 능력점수 아님</small></div>
          <div className="panel"><h2>확인하고 읽어주세요</h2>{chart.warnings.map(w => <p className="warning-line" key={w}>{warningLabel[w] ?? w}</p>)}<p>해석은 자기성찰의 관점이고 미래 예측이나 진단이 아닙니다.</p></div></div>
        <Evidence value={chart} />
        {chart.yun && <details className="evidence"><summary>대운 기술 미리보기 · 연도 라벨</summary><p>기운 offset: {chart.yun.startOffset.years}년 {chart.yun.startOffset.months}개월 {chart.yun.startOffset.days}일 {chart.yun.startOffset.hours}시간 · {chart.yun.direction === 'forward' ? '순행' : '역행'}</p><p>UTC+8 엔진 시계 시작: {chart.yun.engineClockStart}. 정밀 현지 시작일은 검수 전 미제공합니다. 아래 나이는 출생연도 차이+1이며 만 나이가 아닙니다.</p><div className="cycle-grid">{chart.yun.periods.map((period, i) => <div className="panel" key={i}><strong>{period.ganZhi ?? '준비구간'}</strong><p>{period.yearLabel.start}~{period.yearLabel.end}</p><small>연도차 나이 {period.startAge}~{period.endAge}</small></div>)}</div></details>}
        <div className="panel preview-cta"><span className="eyebrow">THE NEXT CHAPTER</span><h2>{selected.title}, 더 살펴볼까요?</h2><p>계산 사실에 연결된 무료 초안 요약을 만나보세요.</p>{['P02', 'P03'].includes(selectedId) && yearSelect()}<div className="action-row">{selectedId === 'P04' ? link('/compare', '두 사람 명식 고르기', 'button primary') : <button className="button primary" disabled={busy} onClick={() => void generate(selected.live ? selectedId : 'P01', chart.id)}>무료 요약 읽기 <Icon /></button>}{link('/contents', '다른 이야기 둘러보기', 'text-link')}</div></div>
      </section>}
      {path.startsWith('/reports/') && report && <article className="shell narrow page-section report">
        <div className="report-tools"><button onClick={() => setReadMode(!readMode)}>{readMode ? '기본 모드' : '읽기 모드'}</button><button onClick={() => setLargeText(!largeText)} aria-pressed={largeText}>글자 크게</button><button onClick={() => window.print()}>인쇄 / PDF</button></div>
        <span className="eyebrow">{report.productId} · {report.safetyStop ? '무료 안전 안내' : '무료 개발 체험 · 미검수 초안'}</span><h1>{report.title}</h1>{report.targetYear && <p>대상 연도 {report.targetYear}년 · 생성 후 대상 연도를 변경하지 않습니다.</p>}
        <div className="panel summary-card"><span className="eyebrow">세 문장으로 먼저 읽기</span>{report.summary.map((s, i) => <p key={i}><span>0{i + 1}</span>{s}</p>)}</div>
        <nav className="report-toc" aria-label="리포트 목차">{report.sections.map((s, i) => <a href={`#${s.sectionId}`} key={s.sectionId}>{i + 1}. {s.title}</a>)}</nav>
        {report.sections.map((s, i) => <section className="report-section" id={s.sectionId} key={s.sectionId}><span className="section-number">0{i + 1}</span><h2>{s.title}</h2>{s.claims.map((claim, j) => <div key={j} className="interpretation"><span className="content-kind">전통 해석 · 검수 전</span><p>{claim.text}</p><details><summary>이 문장의 근거</summary><p>사실: {claim.factRefs.join(', ')}</p><p>규칙: {claim.ruleRefs.join(', ')}</p><p>{claim.limitations.join(' · ')}</p></details></div>)}{s.actions.length > 0 && <div className="guidance"><span className="content-kind">생활에 적용하는 질문 · 일반 가이드</span><ul>{s.actions.map((a, j) => <li key={j}>{a.text}</li>)}</ul></div>}</section>)}
        {report.months && <section className="report-section"><span className="eyebrow">MONTHLY PERSPECTIVE</span><h2>{report.productId === 'P03' ? '6개월 성찰 캘린더' : '열두 달의 실제 절입 경계'}</h2><p>절월은 양력 월과 같지 않습니다. 각 구간은 시작 포함·끝 제외이며 {report.months[0]?.zone} 현지 시각으로 표시합니다.</p><div className="month-grid">{report.months.map(m => <details className="month-card" key={m.month}><summary><strong>{m.month}월</strong><span>{m.segments.map(s => s.ganZhi).join(' → ')}</span></summary>{m.segments.map((s, i) => <div key={i}><p><strong>{s.ganZhi}</strong> · 명리 연간지 {s.yearGanZhi}</p><small>{localDate(s.start, m.zone)}부터<br />{localDate(s.end, m.zone)} 전까지</small>{s.boundaryName && <p>절입: {s.boundaryName}</p>}</div>)}<p className="muted-text">이번 달, 이어갈 습관과 점검할 선택을 하나씩 적어보세요. 사건을 예측하는 달력이 아닙니다.</p></details>)}</div></section>}
        {!report.safetyStop && <div className="panel"><h2>계산 사실을 다시 확인해요</h2>{link(`/charts/${report.chartId}?product=${report.productId}`, '원국과 시간 정책 보기', 'text-link')}<p className="muted-text">버전: {Object.entries(report.versions).map(([k, v]) => `${k} ${v}`).join(' · ')}</p><p>심층 상품과 자유형 AI 후속질문은 검수 전 제공하지 않습니다.</p></div>}
        <div className="action-row"><button className="button primary" disabled={busy || report.saved} onClick={() => void run(async () => { const result = await api<{ expiresAt: string }>(`/reports/${report.id}/save`, { consent: true }); setReport({ ...report, saved: true }); setNotice(`저장했습니다. 이 기기 세션에서 ${localDate(result.expiresAt)}까지 보관되며 서버 재시작 시 삭제됩니다.`); })}>{report.saved ? '서재에 저장됨' : '24시간 보관에 동의하고 저장'}</button>{!report.safetyStop && <button className="button secondary" disabled={busy} onClick={() => void run(async () => setShare(await api('/shares', { reportId: report.id, consent: true })))}>익명 요약 공유</button>}</div>
        {share && <div className="panel" role="status"><h3>개인정보 없는 소개 요약 링크</h3><p>출생정보와 개인 해석은 제외했습니다. 최대 7일, 서버 재시작 또는 원본 삭제 시 만료됩니다.</p><label>공유 주소<input readOnly value={`${window.location.origin}${share.path}`} onFocus={e => e.target.select()} /></label><div className="action-row"><button onClick={() => void run(async () => { await navigator.clipboard.writeText(`${window.location.origin}${share.path}`); setNotice('링크를 복사했습니다.'); })}>주소 복사</button><button onClick={() => void run(async () => { await api(`/shares/${share.token}`, undefined, 'DELETE'); setShare(null); setNotice('공유를 철회했습니다.'); })}>즉시 철회</button></div></div>}
        {report.followUpQuestions.length > 0 && <section className="panel"><h2>이 결과가 궁금하다면</h2><p>자유형 AI 상담 대신 근거에 연결된 안내를 제공합니다.</p>{report.followUpQuestions.map((q, i) => <button className="question-button" key={q} onClick={() => void run(async () => { const result = await api<{ answer: string }>(`/reports/${report.id}/questions`, { questionIndex: i }); setAnswer(result.answer); })}>{q} <span>+</span></button>)}{answer && <p className="answer" role="status">{answer}</p>}</section>}
        <p className="muted-text">이 해석을 어떻게 읽나요? 전통 해석과 일반 가이드를 구분하고, 실제 선택은 자신의 경험과 상황에 따라 결정하세요. {link('/methodology', '방법론 확인')}</p>
      </article>}
      {path === '/compare' && <section className="shell narrow page-section"><span className="eyebrow">BETWEEN TWO PEOPLE</span><h1>서로 다른 두 결이 만나면</h1><p className="lead">궁합점수 대신, 함께 이야기할 접점을 살펴봐요.</p><div className="panel"><label>첫 번째 사람<select value={firstId} onChange={e => setFirstId(e.target.value)}><option value="">명식을 골라주세요</option>{library?.charts.map(c => <option key={c.id} value={c.id}>{c.alias} · {c.inputPrecision === 'day' ? '시간 미상' : c.pillars.day?.ganZhi}</option>)}</select></label><label>두 번째 사람<select value={partnerId} onChange={e => setPartnerId(e.target.value)}><option value="">명식을 골라주세요</option>{library?.charts.filter(c => c.id !== firstId).map(c => <option key={c.id} value={c.id}>{c.alias} · {c.inputPrecision === 'day' ? '시간 미상' : c.pillars.day?.ganZhi}</option>)}</select></label><label>관계 유형 <small>선택 · 계산 사실에 영향 없음</small><select value={relationshipType} onChange={e => setRelationshipType(e.target.value)}><option value="">응답 안 함</option><option value="romantic">연애</option><option value="friend">친구</option><option value="family">가족</option><option value="work">협업</option></select></label><label className="check-label"><input type="checkbox" checked={partnerConsent} onChange={e => setPartnerConsent(e.target.checked)} /> 상대 출생정보를 사용할 권한을 확인했습니다.</label><p className="muted-text">시간 미상은 후보 공통 사실만 사용합니다. 관계의 질, 상대의 마음이나 미래를 판단하지 않습니다.</p><button className="button primary full" disabled={!firstId || !partnerId || firstId === partnerId || !partnerConsent || busy} onClick={() => void generate('P04', firstId, { partnerChartId: partnerId, partnerConsent, context: { relationshipType } })}>함께 지내는 방법 살펴보기 <Icon /></button></div>{link('/profiles/new?product=P04', '새로운 사람의 명식 만들기', 'text-link')}</section>}
      {path === '/library' && <section className="shell page-section"><span className="eyebrow">YOUR LIBRARY</span><h1>나를 알아온 페이지들</h1><p className="lead">현재 기기의 게스트 세션에 보관된 이야기입니다.</p><div className="dev-note">계정·구매 복원은 아직 제공하지 않습니다. 세션 만료 {library ? localDate(library.expiresAt) : '확인 중'} · 서버 재시작 시 삭제.</div><h2>저장한 리포트</h2>{library?.reports.length === 0 && <div className="empty-state"><Icon type="book" /><h3>아직 저장한 이야기가 없어요</h3><p>무료 요약을 읽고 서재에 한 페이지를 남겨보세요.</p>{link('/profiles/new', '나의 첫 명식 만들기', 'button primary')}</div>}<div className="library-grid">{library?.reports.map(r => <div className="panel" key={r.id}><span className="eyebrow">{r.productId} · {r.targetYear ? `${r.targetYear}년` : '원국'} · {localDate(r.createdAt)}</span><h3>{r.title}</h3><p>엔진 {r.versions.engine ?? '—'} · 규칙 {r.versions.rule ?? '—'}</p><div className="action-row">{link(`/reports/${r.id}`, '이어 읽기', 'text-link')}<button onClick={() => void run(async () => { await api(`/reports/${r.id}`, undefined, 'DELETE'); await refreshLibrary(); setNotice('리포트와 연결된 공유를 삭제했습니다.'); })}>리포트 삭제</button></div></div>)}</div><h2>이 세션의 명식</h2><p>명식 삭제 시 연결된 리포트와 공유도 함께 삭제됩니다.</p><div className="library-grid">{library?.charts.map(c => <div className="panel" key={c.id}><h3>{c.alias}</h3><p>{c.pillars.day?.ganZhi ?? '일주 미확정'} · {c.inputPrecision === 'day' ? '시간 미상' : c.timeContext.zone}</p><div className="action-row">{link(`/charts/${c.id}`, '명식 보기', 'text-link')}<button onClick={() => void run(async () => { await api(`/profiles/${c.id}`, undefined, 'DELETE'); await refreshLibrary(); setNotice('명식과 연결된 결과·공유를 삭제했습니다.'); })}>명식과 연결 결과 삭제</button></div></div>)}</div>{link('/profiles/new', '새 명식 만들기', 'button secondary')}</section>}
      {path === '/methodology' && <section className="shell narrow page-section prose"><span className="eyebrow">OUR METHODOLOGY</span><h1>근거는 투명하게,<br />선택은 나답게.</h1><p className="lead">결은 전통 해석을 활용한 자기이해·관계 성찰·계획 보조 서비스입니다.</p><h2>계산과 해석을 나눕니다</h2><p>원국 계산은 lunar-javascript 1.7.7 고정 버전으로 수행합니다. 연·월주는 절대 시각을 UTC+8로 변환해 절입을 비교하고, 일·시주는 출생지의 현지 민간시계로 계산합니다. 십성은 합성 원국의 일간으로 다시 계산합니다.</p><h2>지원 범위와 검수 상태</h2><p>양력 1950~2026년, Asia/Seoul·Asia/Shanghai·America/New_York를 개발 검증 대상으로 삼습니다. 이 범위도 독립 역서와 전문가의 전체 gold fixture 승인을 받은 상용 지원 범위는 아닙니다. 한국 음력, 진태양시, 다른 시간대는 차단합니다.</p><h2>모른다는 사실도 함께 보여줍니다</h2><p>출생시간을 모르면 시주를 비웁니다. 절입과 일자 경계에서 원국이 달라질 수 있으면 후보 공통 사실만 제공합니다. 일주 sect2와 대운 yunSect2는 별개입니다. 대운은 명시적인 0/1 분기 선택 시 기술 미리보기만 제공합니다.</p><h2>미래를 단정하지 않습니다</h2><p>궁합점수, 재회 확률, 투자 추천, 질병·결혼일 예측, 자동 신강신약·용신은 제공하지 않습니다. 규칙과 콘텐츠는 아직 미검수 초안이며 무료 개발 체험으로만 표시합니다. 외부 AI로 출생정보를 보내지 않습니다.</p><h2>업데이트 이력</h2><p>2026-10-18 · 0.1.0 개발 버전. dual-context adapter와 한국어 무료 체험 구현. 유료 출시 게이트는 닫혀 있습니다.</p><h2>오픈소스 고지</h2><p>lunar-javascript · MIT License · Copyright (c) 2018 6tail. 고정 commit: <code>4c45a59f79b856125516f31aefa8295035c16afd</code>. 배포물의 전체 라이선스는 <code>THIRD_PARTY_NOTICES.md</code>에 보존합니다.</p>{link('/profiles/new', '무료 체험 시작하기', 'button primary')}</section>}
      {['/privacy', '/terms', '/refund', '/help'].includes(path) && <section className="shell narrow page-section prose"><span className="eyebrow">SERVICE INFORMATION</span><h1>{({ '/privacy': '개인정보 안내', '/terms': '이용 안내', '/refund': '구매와 환불 안내', '/help': '도움말' } as Record<string, string>)[path]}</h1><div className="dev-note">상용 운영 약관이 아닌 비공개 개발 체험의 현재 동작 안내입니다.</div>{path === '/privacy' ? <><h2>최소한의 정보만 사용합니다</h2><p>별칭, 양력 출생일시, 시간대와 선택한 산식으로 계산합니다. 실명·연락처·주소는 필요하지 않습니다. 게스트 HttpOnly 쿠키가 같은 기기의 접근 권한을 확인합니다.</p><h2>저장과 삭제</h2><p>서버 메모리에 세션 생성 시점부터 최대 24시간 보관하며 재시작 시 사라집니다. 공유는 개인정보 없는 소개 요약만 최대 7일 제공합니다. 서재에서 명식을 삭제하면 연결 리포트와 공유가 즉시 삭제됩니다. 계정 저장, 장기 암호화 DB, 백업은 아직 제공하지 않습니다.</p><h2>외부 전송</h2><p>AI나 외부 분석 도구로 출생정보·상담 원문을 보내지 않습니다. 관계 프로필은 정보 사용 권한을 확인한 경우에만 사용하세요.</p></> : path === '/refund' ? <><h2>현재 결제는 받지 않습니다</h2><p>가격, 결제사업자, 이용권, 디지털 콘텐츠 철회·환불 정책 승인 전 모든 유료 주문과 결제 웹훅을 차단합니다. 결제된 것으로 표시하거나 가상의 구매 권한을 발급하지 않습니다.</p><p>현재 제공되는 무료 개발 체험에는 청구나 환불 거래가 없습니다.</p></> : path === '/terms' ? <><h2>나를 이해하기 위한 관점</h2><p>계산 결과와 전통 해석은 과학적으로 검증된 진단·예언이 아닙니다. 실제 결정에는 자신의 경험과 현실 조건을 함께 고려하세요.</p><p>만 18세 미만 유료 리포트는 제공하지 않습니다. 현재는 나이에 관계없이 모든 유료 기능이 비활성 상태입니다.</p></> : <><h2>출생시간을 모르면?</h2><p>시간 미상을 선택하세요. 시주는 비우고 당일 경계의 후보를 비교합니다. 오류가 생겨도 입력값은 유지됩니다.</p><h2>계산 정보를 바꾸고 싶다면?</h2><p>명식의 출생정보 수정에서 새 명식을 만드세요. 기존 결과는 조용히 덮어쓰지 않습니다. 서재에서 이전 결과를 삭제할 수 있습니다.</p><h2>문제를 전달할 때</h2><p>명식·리포트 ID와 정책 버전, 오류 코드만 개발 담당자에게 전달하세요. 출생정보를 공개 게시판에 남기지 마세요. 고객지원 접수 시스템은 아직 운영하지 않습니다.</p></>}</section>}
      {path.startsWith('/share/') && publicShare && <section className="shell narrow page-section"><span className="eyebrow">A SHARED PERSPECTIVE</span><h1>{publicShare.title}</h1><div className="panel">{publicShare.summary.map(s => <p key={s}>{s}</p>)}</div><p>개인 출생정보와 개인화 해석이 없는 소개 요약입니다. 만료: {localDate(publicShare.expiresAt)}</p>{link('/', '나의 이야기 시작하기', 'button primary')}</section>}
      {!isHome && !['/contents', '/profiles/new', '/library', '/compare', '/methodology', '/privacy', '/terms', '/refund', '/help'].includes(path) && !detailProduct && !/^\/(charts|reports|share)\//.test(path) && <section className="shell narrow page-section"><h1>페이지를 찾을 수 없어요</h1>{link('/', '처음으로 돌아가기', 'button primary')}</section>}
    </main>
    <footer><div className="shell footer-inner"><div>{link('/', <><span className="logo-seal">결</span><strong>나를 읽는 시간</strong></>, 'brand')}<p>정해진 답이 아닌, 나를 위한 새로운 관점.</p><small>© {todayYear} 결 · 비공개 개발 체험</small></div><div className="footer-links">{link('/methodology', '계산 기준 · 오픈소스')}{link('/privacy', '개인정보 안내')}{link('/terms', '이용 안내')}{link('/refund', '구매 · 환불')}{link('/help', '도움말')}</div><p className="footer-disclaimer">전통 해석을 활용한 자기이해 서비스입니다.<br />미래를 보장하거나 전문적인 진단을 대신하지 않습니다.</p></div></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App />);

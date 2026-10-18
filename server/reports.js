import { DateTime } from 'luxon';
import { products } from '../shared/catalog.js';
import { compareCharts, DomainError, yearMonths } from './engine.js';

const elementNotes = {
  木: { name: '목 · 자라나는 힘', text: '성장과 시작에 의미를 두는 관점입니다. 새 시도를 제안할 때 편안한지, 충분한 준비 없이 방향을 늘리지는 않는지 살펴보세요.', action: '이번 주 시작하고 싶은 일 하나와 끝낼 일 하나를 함께 적어보세요.' },
  火: { name: '화 · 드러내는 온기', text: '표현과 연결에 의미를 두는 관점입니다. 생각을 나눌 때 에너지를 얻는지, 내 속도가 다른 사람에게도 편안한지 돌아보세요.', action: '의견을 말한 뒤 상대가 생각할 시간을 남겨보세요.' },
  土: { name: '토 · 이어주는 바탕', text: '안정과 조율에 의미를 두는 관점입니다. 맡은 일을 끝까지 챙기는지, 다른 사람의 기대를 모두 떠안지는 않는지 점검해 보세요.', action: '내가 책임질 일과 함께 나눌 일을 구분해 적어보세요.' },
  金: { name: '금 · 선명하게 고르는 기준', text: '기준과 정리에 의미를 두는 관점입니다. 선택할 때 어떤 원칙을 쓰는지, 기준이 지나치게 좁아지는 순간은 없는지 관찰해 보세요.', action: '지키고 싶은 기준 하나와 유연하게 바꿀 기준 하나를 정해보세요.' },
  水: { name: '수 · 깊이 살피는 유연함', text: '관찰과 유연성에 의미를 두는 관점입니다. 충분히 듣고 판단하는지, 생각이 길어져 행동을 미루는 때는 없는지 돌아보세요.', action: '고민 한 가지에 필요한 정보와 작은 다음 행동을 적어보세요.' },
};
export const rules = Object.entries(elementNotes).map(([element, note]) => ({
  ruleId: `DRAFT.ELEMENT.${element}`, version: '0.1.0', tradition: '오행 상징의 자기성찰 초안',
  sourceNote: 'PRD 4절·9절 기반 편집 초안. 명리 전문가 출처 검수 대기.',
  inputFactIds: ['F.day.element', 'F.month.element'], condition: { element },
  outputTags: ['reflection'], approvedText: null, draftText: note.text,
  contraindications: ['prediction', 'diagnosis'], priority: 10, reviewer: null, approvedAt: null,
}));
const claimFor = (chart, key) => {
  const factId = `F.${key}.element`;
  const element = chart.facts[factId];
  if (!element) return null;
  return {
    text: elementNotes[element].text, kind: 'traditional_interpretation',
    factRefs: [factId, `F.${key}.stem`], ruleRefs: [`DRAFT.ELEMENT.${element}`],
    limitations: ['미검수 초안이며 성격·미래를 입증하지 않습니다.'],
  };
};
const advice = text => ({ text, kind: 'general_guidance' });

export function validateReport(report, chart, partner) {
  const knownFacts = new Set([...Object.keys(chart.facts), ...Object.keys(partner?.facts ?? {}).map(f => f.replace('F.', 'F.partner.'))]);
  const knownRules = new Set([...rules.map(r => r.ruleId), 'DRAFT.RELATIONSHIP.v1']);
  for (const section of report.sections) for (const claim of section.claims) {
    if (claim.kind === 'traditional_interpretation' && (!claim.factRefs.length || !claim.ruleRefs.length))
      throw new DomainError('MODEL_VALIDATION_FAILED', '개인화 문장에 근거가 없습니다.');
    if (claim.factRefs.some(f => !knownFacts.has(f)) || claim.ruleRefs.some(r => !knownRules.has(r)))
      throw new DomainError('MODEL_VALIDATION_FAILED', '존재하지 않는 사실 또는 규칙입니다.');
    if (/반드시 재회|외도 중|암에 걸|주식 매수|결혼 확정|정확도 99/.test(claim.text))
      throw new DomainError('MODEL_VALIDATION_FAILED', '출력 제한에 맞지 않는 문장입니다.');
  }
  return report;
}

export function composeReport({ productId, chart, partner, targetYear, context = {}, now = DateTime.now() }) {
  if (!context || typeof context !== 'object' || Array.isArray(context))
    throw new DomainError('INVALID_CONTEXT', '선택 맥락은 구조화된 항목으로 입력해 주세요.');
  const product = products.find(p => p.id === productId);
  if (!product) throw new DomainError('INVALID_PRODUCT', '존재하지 않는 상품입니다.');
  if (productId === 'P07' && ['blocked', 'refused', 'violence'].includes(context.contactStatus)) {
    return {
      productId, title: '지금은 경계를 존중할 시간입니다', safetyStop: true,
      summary: ['상대가 밝힌 연락 중단과 차단 의사를 존중해 주세요.', '재접촉 방법과 유료 구매를 안내하지 않습니다.', '위협이나 폭력이 있다면 안전한 곳에서 신뢰하는 사람 또는 긴급지원 112에 도움을 요청하세요.'],
      sections: [{ sectionId: 'safety', title: '나를 위한 정리 루틴', claims: [], actions: [advice('연락 대신 지금 감정을 개인 메모에 적고 잠시 휴식하세요.'), advice('상대의 위치나 계정을 추적하지 말고 내 일상과 지지 관계를 회복하세요.')] }],
      warnings: ['SAFETY_STOP'], versions: { template: '0.1.0' }, followUpQuestions: [],
    };
  }
  if (!product.live) throw new DomainError('PRODUCT_NOT_RELEASED', '상품별 검수와 승인 후 공개할 예정입니다.');
  if (productId === 'P04' && !partner) throw new DomainError('PARTNER_REQUIRED', '상대 정보 사용 권한을 확인한 뒤 두 번째 명식을 선택해 주세요.');
  const year = targetYear ?? now.setZone(chart.timeContext.zone).year;
  if (['P02', 'P03'].includes(productId) && (!Number.isInteger(year) || year < 1950 || year > 2030))
    throw new DomainError('UNSUPPORTED_TIME_POLICY', '대상 연도는 1950~2030년으로 선택해 주세요.');
  const stem = chart.pillars.day?.stemId;
  const note = elementNotes[chart.pillars.day?.stemElement];
  const primary = claimFor(chart, 'day');
  const month = claimFor(chart, 'month');
  const sections = [];
  const add = (sectionId, title, claims, actions) => {
    const unique = [];
    for (const claim of claims.filter(Boolean)) {
      const existing = unique.find(c => c.text === claim.text);
      if (existing) {
        existing.factRefs = [...new Set([...existing.factRefs, ...claim.factRefs])];
        existing.ruleRefs = [...new Set([...existing.ruleRefs, ...claim.ruleRefs])];
      } else unique.push({ ...claim });
    }
    sections.push({ sectionId, title, claims: unique, actions: actions.map(advice) });
  };
  if (productId === 'P01') {
    add('nature', '나를 읽는 첫 번째 기준', [primary, month], [note?.action ?? '출생시간을 확인하기 전에는 후보 공통 사실만 읽어주세요.', '최근 나답다고 느낀 장면과 불편했던 장면을 각각 하나 적어보세요.']);
    add('patterns', '일과 관계에서 관찰할 장면', [], ['회의에서 새로운 제안을 할 때, 시작과 마무리 중 어디에 더 힘을 쓰는지 관찰하세요.', '약속을 정할 때 내 선호를 먼저 말하는지, 상대의 반응부터 살피는지 기록하세요.', '이 두 사례는 계산된 사건이 아니라 자신을 살펴보는 일반적인 예시입니다.']);
    add('practice', '이번 주, 작은 실천 세 가지', [], ['하루가 끝날 때 편안했던 선택을 한 줄 기록하세요.', '함께하는 사람에게 나와 일할 때 편했던 순간을 물어보세요.', '바꾸고 싶은 반복 패턴은 한 번에 하나만 정해보세요.']);
  }
  if (productId === 'P02') {
    add('year', `${year}년을 읽는 관점`, [primary, month], ['양력 한 해와 입춘 기준 명리 연도는 다릅니다. 아래 월별 경계를 확인하세요.', '일에서는 준비할 기술, 돈에서는 기록할 습관, 관계에서는 필요한 대화 한 가지를 골라보세요.']);
    add('quarter', '분기별로 작게 준비하기', [], ['1분기에는 지금의 시간과 자원을 기록하세요.', '2분기에는 작은 실험을, 3분기에는 결과 점검을 계획하세요.', '4분기에는 계속할 것과 멈출 것을 나눠 다음 해를 준비하세요.']);
  }
  if (productId === 'P03') {
    add('expression', '마음이 가까워지는 나의 방식', [primary, month], ['내가 관심을 표현한 말과 상대에게 실제로 들은 말을 구분해 적어보세요.', '현재 관계 상태는 생활 맥락일 뿐, 원국이나 상대의 감정을 바꾸는 계산 사실이 아닙니다.']);
    add('conversation', '부담을 낮추는 대화 실험', [], ['편안했던 대화 주제를 하나 떠올리고 그 이유를 물어보세요.', '“나는 이런 속도가 편한데, 너는 어때?”라고 서로의 속도를 확인하세요.', '대답이 없으면 승낙으로 해석하지 말고 상대의 경계를 존중하세요.']);
  }
  let comparison = null;
  if (productId === 'P04') {
    comparison = compareCharts(chart, partner);
    const relationText = {
      'six-combination': '두 일지는 초안 관계표의 육합에 해당합니다. 이것만으로 관계가 좋다고 결론 내릴 수 없으며, 편안하게 협의했던 실제 장면을 함께 떠올려 보세요.',
      'six-clash': '두 일지는 초안 관계표의 육충에 해당합니다. 이별이나 갈등을 예언하는 값이 아닙니다. 생활 리듬과 의사결정의 차이를 대화로 확인해 보세요.',
      'no-six-combination-or-clash': '두 일지는 초안 관계표의 육합·육충 조합에 해당하지 않습니다. 관계의 질과 상대의 감정은 이 사실만으로 알 수 없습니다.',
    }[comparison.dayBranchRelationship];
    add('connection', '두 사람이 만나는 접점', relationText ? [{
      text: relationText, kind: 'traditional_interpretation',
      factRefs: ['F.day.branch', 'F.partner.day.branch'], ruleRefs: ['DRAFT.RELATIONSHIP.v1'],
      limitations: ['관계표 검수 대기', '상대의 감정·성실성·미래를 판단하지 않습니다.'],
    }] : [], ['시간 미상으로 일지가 달라질 수 있으면 관계 판단을 제공하지 않습니다.', '공통 오행은 단순 출현 사실이며 성격 일치나 궁합점수가 아닙니다.']);
    const relationship = { romantic: '연애', friend: '친구', family: '가족', work: '협업' }[context.relationshipType] ?? '이 관계';
    add('axes', '함께 맞춰볼 네 가지 리듬', [], [`대화: ${relationship}에서 생각을 바로 나누는 편인가요, 정리할 시간이 필요한가요?`, '거리: 혼자 쉬는 시간은 어느 정도가 편한가요?', '생활: 연락과 만남의 속도를 어떻게 정할까요?', '공동결정: 의견이 다를 때 무엇을 먼저 확인할까요?']);
    add('questions', '서로에게 묻는 다섯 질문', [], ['최근 함께해서 편안했던 순간은 언제였나요?', '내가 알아주었으면 하는 생활 습관이 있나요?', '갈등이 있을 때 어떤 대화가 도움이 되나요?', '지금 각자 지키고 싶은 경계는 무엇인가요?', '이번 주 함께 해볼 작은 약속은 무엇인가요?']);
    add('agreements', '오늘 정할 세 가지 약속', [], ['대화할 시간과 쉬어갈 신호를 함께 정하세요.', '함께 결정할 일과 각자 결정할 일을 나누세요.', '일주일 뒤 약속이 편안했는지 다시 확인하세요.']);
  }
  const currentMonth = now.setZone(chart.timeContext.zone).month;
  const relationshipMonths = productId === 'P03'
    ? [...yearMonths(year, chart.timeContext.zone), ...yearMonths(year + 1, chart.timeContext.zone)].slice(currentMonth - 1, currentMonth + 5)
    : null;
  const report = {
    productId, title: product.question, access: 'free-development-preview',
    summary: [
      stem ? `일간 ${stem}은 사주에서 나를 나타내는 기준 글자입니다. ${note.name}라는 전통 상징으로 읽어봅니다.` : '출생시간에 따라 일주가 달라질 수 있어 나를 나타내는 기준 글자를 확정하지 않았습니다.',
      '원국은 계산 사실이고, 성향 설명은 검수 전 전통 해석 초안입니다. 자신의 경험과 비교하며 읽어주세요.',
      note?.action ?? '확실한 출생정보를 확인하거나 공통 사실만 살펴보세요.',
    ],
    sections, comparison,
    months: productId === 'P02' ? yearMonths(year, chart.timeContext.zone) : relationshipMonths,
    targetYear: ['P02', 'P03'].includes(productId) ? year : null,
    warnings: [...chart.warnings, 'DRAFT_RULES_UNAPPROVED', 'NO_PREDICTION'],
    versions: { engine: chart.engine.version, adapter: chart.policies.adapterVersion, rule: '0.1.0-draft', template: '0.1.0', narrator: 'deterministic-no-llm' },
    followUpQuestions: ['어떤 계산 기준을 사용했나요?', '시간을 모르면 무엇이 달라지나요?', '실천 가이드를 어떻게 활용하나요?'],
  };
  return validateReport(report, chart, partner);
}

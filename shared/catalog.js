export const products = [
  { id: 'P01', title: '나의 타고난 결', subtitle: '종합사주 · 나의 매력', category: 'self', mark: '木', color: 'green', question: '나는 어떤 순간에 나다워질까요?', description: '타고난 성향부터 반복되는 선택까지. 익숙했던 나를 새로운 관점으로 만나보세요.', sections: ['핵심 성향과 드러나는 매력', '과해질 때의 반복 패턴', '일과 관계 속 생활 예시', '나를 위한 세 가지 실천'], live: true },
  { id: 'P02', title: '한 해를 여는 지도', subtitle: '올해 · 신년운세', category: 'year', mark: '火', color: 'orange', question: '올해, 어디에 마음을 둘까요?', description: '좋고 나쁨 대신 준비와 점검의 관점으로. 열두 달의 흐름을 차분히 살펴봐요.', sections: ['올해의 핵심 관점', '일 · 돈 · 관계의 점검 질문', '절입 기준 열두 달 달력', '분기별 준비 계획'], live: true },
  { id: 'P03', title: '사랑에 가까워지는 법', subtitle: '연애운 · 새로운 인연', category: 'relationship', mark: '花', color: 'pink', question: '나는 어떻게 마음을 나눌까요?', description: '누군가를 만나기 전, 내 마음이 움직이는 방식부터 이해하는 시간.', sections: ['끌리는 상호작용', '나의 표현과 초반의 오해', '6개월 성찰 캘린더', '만남과 대화 실험'], live: true },
  { id: 'P04', title: '우리 사이의 온도', subtitle: '두 사람 궁합', category: 'relationship', mark: '合', color: 'purple', question: '우리는 어떻게 함께할까요?', description: '점수로 정할 수 없는 우리 사이. 서로 다른 두 사람이 만나는 접점을 찾아요.', sections: ['두 원국의 공통점과 차이', '대화 · 거리 · 생활 리듬 · 공동결정', '서로에게 묻는 다섯 질문', '함께 정하는 세 가지 약속'], live: true },
  { id: 'P05', title: '오래 함께하는 연습', subtitle: '결혼 · 장기 관계', category: 'relationship', mark: '伴', color: 'purple', question: '함께 사는 일, 무엇부터 이야기할까요?', description: '돈, 가사, 가족, 시간과 경계. 오래 함께하기 위한 생활의 합의.', sections: ['장기 관계의 욕구', '생활의 다섯 가지 합의', '갈등 시나리오', '실천 대화문'], live: false },
  { id: 'P06', title: '한 걸음 더 가까이', subtitle: '썸 · 관계 진전', category: 'relationship', mark: '心', color: 'pink', question: '지금 관계에서 무엇을 관찰할까요?', description: '상대의 속마음 대신 실제로 나눈 말과 행동에서 대화의 실마리를 찾아요.', sections: ['나의 기대 패턴', '사실과 해석 구별하기', '부담을 낮추는 질문', '기다림과 확인의 기준'], live: false },
  { id: 'P07', title: '다시, 내 마음의 자리', subtitle: '재회 · 관계 회복과 정리', category: 'relationship', mark: '休', color: 'green', question: '회복과 정리 사이, 나에게 필요한 것은?', description: '상대의 경계를 존중하며 지나온 관계와 나의 선택을 돌아보는 시간.', sections: ['반복된 관계 패턴', '회복의 현실 조건', '동의와 경계 점검', '정리와 회복 루틴'], live: false },
  { id: 'P08', title: '돈을 대하는 나의 태도', subtitle: '재물운 · 재정 습관', category: 'work', mark: '土', color: 'orange', question: '나는 돈을 어떻게 다루고 있나요?', description: '수익 예측이 아닌 소비, 저축, 수입구조를 돌아보는 재정 습관 안내서.', sections: ['돈에 대한 행동 패턴', '소비와 회피 점검', '수입구조 탐색', '예산 기록 체크리스트'], live: false },
  { id: 'P09', title: '일하는 나의 방향', subtitle: '직업 · 이직 · 커리어', category: 'work', mark: '金', color: 'green', question: '어떤 환경에서 내 강점이 드러날까요?', description: '천직을 단정하지 않고, 내게 맞는 업무 방식과 다음 선택을 준비해요.', sections: ['선호하는 업무 방식', '협업과 자율의 환경', '직무군의 현실 검증', '30일 실행 계획'], live: false },
  { id: 'P10', title: '인생의 큰 물결', subtitle: '대운 · 인생 전환기', category: 'cycle', mark: '水', color: 'blue', question: '지금 나는 어떤 주기를 지나고 있나요?', description: '인생의 큰 주기를 전통적인 관점으로 읽고 지금을 점검하는 지도.', sections: ['산식과 계산 기준', '기운 전 준비구간', '현재와 다음의 큰 주기', '올해와 연결하는 질문'], live: false },
];

export const categories = [
  { id: 'all', label: '전체 보기' },
  { id: 'self', label: '나 알아보기' },
  { id: 'year', label: '올해 계획' },
  { id: 'relationship', label: '연애 · 관계' },
  { id: 'work', label: '일과 돈' },
  { id: 'cycle', label: '큰 흐름' },
];

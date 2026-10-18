import { test, expect } from '@playwright/test';

test('home, accessible birth confirmation, chart, report, save and cascading deletion', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /정해진 운명보다/ })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/home-${info.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: '무료로 나의 사주 보기' }).click();
  await page.getByLabel(/어떻게 불러드릴까요/).fill('여울');
  await page.getByLabel(/생년월일/).fill('1990-05-15');
  await page.getByLabel('태어난 시각').fill('23:30');
  await page.getByRole('button', { name: '입력 정보 확인하기' }).click();
  await expect(page.getByText('23:30 (24시간)')).toBeVisible();
  const chartResponse = page.waitForResponse(r => r.url().endsWith('/api/v1/charts') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '확인했어요, 명식 계산하기' }).click();
  expect((await chartResponse).status()).toBe(201);
  await expect(page.getByRole('heading', { name: '여울님의 타고난 결' })).toBeVisible();
  await expect(page.locator('.pillar')).toHaveCount(4);
  await page.screenshot({ path: `test-results/chart-${info.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '무료 요약 읽기' }).click();
  await expect(page.getByRole('heading', { name: '나는 어떤 순간에 나다워질까요?' })).toBeVisible();
  await expect(page.getByText('전통 해석 · 검수 전', { exact: true })).toHaveCount(1);
  await page.screenshot({ path: `test-results/report-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: '24시간 보관에 동의하고 저장' }).click();
  await expect(page.getByRole('button', { name: '서재에 저장됨' })).toBeDisabled();
  await page.getByRole('button', { name: '익명 요약 공유' }).click();
  await expect(page.getByLabel('공유 주소')).toHaveValue(/\/share\/[a-f0-9]+$/);
  const shareUrl = await page.getByLabel('공유 주소').inputValue();
  await page.getByRole('button', { name: '즉시 철회' }).click();
  await expect(page.getByText('공유를 철회했습니다.')).toBeVisible();
  await page.getByRole('button', { name: '어떤 계산 기준을 사용했나요?' }).click();
  await expect(page.locator('.answer')).toBeVisible();
  await page.getByRole('link', { name: '나의 서재' }).click();
  await expect(page.getByRole('link', { name: '이어 읽기' })).toHaveCount(1);
  await page.getByRole('button', { name: '명식과 연결 결과 삭제' }).click();
  await expect(page.getByRole('heading', { name: '아직 저장한 이야기가 없어요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '명식 보기' })).toHaveCount(0);
  await page.goto(shareUrl);
  await expect(page.getByRole('alert')).toContainText('공유가 만료되었거나 철회되었습니다.');
  expect(errors).toEqual([]);
});

test('unknown time is explicit; year report contains twelve actual month splits', async ({ page }) => {
  await page.goto('/profiles/new?product=P02');
  await page.getByLabel(/생년월일/).fill('2024-02-04');
  await page.getByLabel('태어난 시간을 몰라요').check();
  await page.getByRole('button', { name: '입력 정보 확인하기' }).click();
  await page.getByRole('button', { name: '확인했어요, 명식 계산하기' }).click();
  await expect(page.locator('.pillar').last()).toContainText('시간 미상');
  await expect(page.getByText(/당일 경계에서 원국 후보가 달라집니다/)).toBeVisible();
  await page.getByRole('button', { name: '무료 요약 읽기' }).click();
  await expect(page.locator('.month-card')).toHaveCount(12);
  await page.locator('.month-card').nth(1).locator('summary').click();
  await expect(page.locator('.month-card').nth(1)).toContainText('立春');
});

test('catalog gates and P07 blocked contact safety branch', async ({ page }) => {
  await page.goto('/contents');
  await expect(page.locator('.product-card')).toHaveCount(10);
  await page.goto('/contents/P07');
  await page.getByLabel('상대의 연락 의사').selectOption('blocked');
  await expect(page.getByRole('heading', { name: '지금은 경계를 존중할 시간입니다.' })).toBeVisible();
  await expect(page.getByRole('button', { name: '검수 후 공개 예정' })).toBeDisabled();
  await page.goto('/compare');
  await expect(page.getByRole('button', { name: /함께 지내는 방법/ })).toBeDisabled();
});

test('two profiles require consent and produce an actual relationship preview', async ({ page }) => {
  for (const [alias, date] of [['나', '1990-05-15'], ['상대', '1992-03-20']]) {
    await page.goto('/profiles/new?product=P04');
    await page.getByLabel(/어떻게 불러드릴까요/).fill(alias);
    await page.getByLabel(/생년월일/).fill(date);
    await page.getByLabel('태어난 시각').fill('12:00');
    await page.getByRole('button', { name: '입력 정보 확인하기' }).click();
    await page.getByRole('button', { name: '확인했어요, 명식 계산하기' }).click();
    await expect(page.getByRole('heading', { name: `${alias}님의 타고난 결` })).toBeVisible();
  }
  await page.getByRole('link', { name: '두 사람 명식 고르기' }).click();
  await page.getByLabel('첫 번째 사람').selectOption({ index: 1 });
  await page.getByLabel('두 번째 사람').selectOption({ index: 1 });
  await expect(page.getByRole('button', { name: /함께 지내는 방법/ })).toBeDisabled();
  await page.getByLabel('상대 출생정보를 사용할 권한을 확인했습니다.').check();
  await page.getByRole('button', { name: /함께 지내는 방법/ }).click();
  await expect(page.getByRole('heading', { name: '우리는 어떻게 함께할까요?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '함께 맞춰볼 네 가지 리듬' })).toBeVisible();
});

test('DST errors retain input and fold accepts an explicit offset', async ({ page }) => {
  await page.goto('/profiles/new');
  await page.getByLabel(/생년월일/).fill('2024-03-10');
  await page.getByLabel('태어난 시각').fill('02:30');
  await page.getByLabel(/출생 도시·시간대/).selectOption('America/New_York');
  await page.getByRole('button', { name: '입력 정보 확인하기' }).click();
  await page.getByRole('button', { name: '확인했어요, 명식 계산하기' }).click();
  await expect(page.getByRole('alert')).toContainText('존재하지 않는 현지 시각');
  await page.getByRole('button', { name: '입력 수정하기' }).click();
  await expect(page.getByLabel(/생년월일/)).toHaveValue('2024-03-10');
  await page.getByLabel(/생년월일/).fill('2024-11-03');
  await page.getByLabel('태어난 시각').fill('01:30');
  await page.getByRole('button', { name: '입력 정보 확인하기' }).click();
  await page.getByRole('button', { name: '확인했어요, 명식 계산하기' }).click();
  await expect(page.getByRole('alert')).toContainText('두 번 존재하는 현지 시각');
  await page.getByLabel('중복 시각의 UTC offset').selectOption('-300');
  await page.getByRole('button', { name: '입력 정보 확인하기' }).click();
  await page.getByRole('button', { name: '확인했어요, 명식 계산하기' }).click();
  await expect(page.getByRole('heading', { name: '나님의 타고난 결' })).toBeVisible();
});

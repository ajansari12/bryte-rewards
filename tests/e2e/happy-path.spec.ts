import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { checkA11y, injectAxe } from '@axe-core/playwright';
import { TEST_USERS } from './global-setup';

// ─── Helpers ────────────────────────────────────────────
async function signIn(context: BrowserContext, email: string, password: string) {
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/app\/feed|\/onboarding/, { timeout: 15_000 });
  return page;
}

// ─── Test ────────────────────────────────────────────────
test.describe('Happy path', () => {
  test('sign-up → onboarding → give recognition → recipient sees it → redeem reward → admin approves', async ({ browser }) => {

    // ── 1. Sign up as a new user ──────────────────────────
    const senderCtx = await browser.newContext();
    const signupPage = await senderCtx.newPage();
    await signupPage.goto('/signup');

    await signupPage.getByLabel(/your name|full name/i).fill(TEST_USERS.sender.displayName);
    await signupPage.getByLabel(/organisation|company/i).fill('E2E Test Org');
    await signupPage.getByLabel(/email/i).fill(TEST_USERS.sender.email);
    await signupPage.getByLabel(/password/i).fill(TEST_USERS.sender.password);
    await signupPage.getByRole('button', { name: /create account|sign up|get started/i }).click();

    // Should land on /onboarding
    await signupPage.waitForURL('/onboarding', { timeout: 15_000 });
    await expect(signupPage).toHaveURL('/onboarding');

    // ── 2. Complete onboarding — pick industry ─────────────
    // Pick an industry card
    const industryCard = signupPage.getByText(/healthcare|technology|retail/i).first();
    await industryCard.click();
    // Advance wizard to the end
    for (let i = 0; i < 4; i++) {
      const nextBtn = signupPage.getByRole('button', { name: /next|continue|finish|get started/i });
      if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nextBtn.click();
        await signupPage.waitForTimeout(400);
      }
    }
    await signupPage.waitForURL('/app/feed', { timeout: 15_000 });

    // ── 3. Accessibility check on /feed ───────────────────
    await injectAxe(signupPage);
    await checkA11y(signupPage, undefined, {
      axeOptions: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      },
      detailedReport: true,
    });

    // ── 4. Give a recognition ─────────────────────────────
    const feedPage = signupPage;

    // Open Give modal
    const giveBtn = feedPage.getByRole('button', { name: /give recognition|recognise|recognize/i }).first();
    await giveBtn.click();

    // Select recipient — look for E2E Recipient
    const recipientInput = feedPage.getByRole('combobox', { name: /recipient|who/i })
      .or(feedPage.getByPlaceholder(/search teammate|who|recipient/i)).first();
    await recipientInput.fill('E2E Recipient');
    await feedPage.getByRole('option', { name: /E2E Recipient/i }).first().click();

    // Select a value if the UI shows value chips
    const valueChip = feedPage.getByRole('button', { name: /innovation/i }).first();
    if (await valueChip.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await valueChip.click();
    }

    // Write a message
    const messageBox = feedPage.getByRole('textbox', { name: /message|write/i })
      .or(feedPage.locator('textarea')).first();
    await messageBox.fill('Amazing work on the E2E test suite — truly innovative!');

    // Submit
    await feedPage.getByRole('button', { name: /send|post|give/i }).last().click();

    // Recognition card should appear in the feed
    await expect(feedPage.getByText(/Amazing work on the E2E test suite/i)).toBeVisible({ timeout: 10_000 });

    // ── 5. Recipient sees the recognition ────────────────
    const recipientCtx = await browser.newContext();
    const recipientPage = await signIn(recipientCtx, TEST_USERS.recipient.email, TEST_USERS.recipient.password);

    await expect(recipientPage.getByText(/Amazing work on the E2E test suite/i)).toBeVisible({ timeout: 10_000 });

    // ── 6. Recipient accessibility check ─────────────────
    await injectAxe(recipientPage);
    await checkA11y(recipientPage, undefined, {
      axeOptions: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } },
      detailedReport: true,
    });

    // ── 7. Redeem a reward ───────────────────────────────
    await recipientPage.getByRole('link', { name: /rewards/i }).click();
    await recipientPage.waitForURL(/\/rewards/, { timeout: 10_000 });

    // Accessibility on /rewards
    await injectAxe(recipientPage);
    await checkA11y(recipientPage, undefined, {
      axeOptions: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } },
      detailedReport: true,
    });

    const redeemBtn = recipientPage.getByRole('button', { name: /redeem/i }).first();
    await redeemBtn.click();

    // Confirm redemption dialog if present
    const confirmBtn = recipientPage.getByRole('button', { name: /confirm|yes|redeem now/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Expect success indicator
    await expect(
      recipientPage.getByText(/redeemed|pending|success/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // ── 8. Admin approves the redemption ─────────────────
    const adminCtx = await browser.newContext();
    const adminPage = await signIn(adminCtx, TEST_USERS.admin.email, TEST_USERS.admin.password);

    await adminPage.getByRole('link', { name: /admin/i }).click();
    await adminPage.waitForURL(/\/admin/, { timeout: 10_000 });

    // Navigate to approvals tab
    const approvalsTab = adminPage.getByRole('button', { name: /approval|redemption/i }).first();
    if (await approvalsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await approvalsTab.click();
    }

    // Should see the pending redemption
    await expect(adminPage.getByText(/E2E Recipient/i)).toBeVisible({ timeout: 10_000 });

    // Approve it
    const approveBtn = adminPage.getByRole('button', { name: /approve/i }).first();
    await approveBtn.click();

    // Should move out of pending
    await expect(adminPage.getByText(/fulfilled|approved|email sent/i).first()).toBeVisible({ timeout: 15_000 });

    // Cleanup contexts
    await senderCtx.close();
    await recipientCtx.close();
    await adminCtx.close();
  });
});

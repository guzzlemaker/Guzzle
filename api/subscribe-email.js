import { normalizeEmail, isEmailSyntaxValid } from '../src/lib/email.js';
import { getOfficialDate } from './_lib/content.js';
import { jsonResponse, readJson } from './_lib/http.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';

const CONSENT_TEXT_VERSION = '2026-07-30-post-game-v1';
const ALLOWED_SOURCES = new Set(['post_daily_leaderboard', 'physical_game_interest']);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return jsonResponse(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const payload = await readJson(request);
  const normalizedEmail = normalizeEmail(payload?.email);

  if (!isEmailSyntaxValid(normalizedEmail)) {
    return jsonResponse(response, 400, { error: 'INVALID_EMAIL', message: 'Enter a valid email address.' });
  }

  const source = ALLOWED_SOURCES.has(payload?.source) ? payload.source : 'post_daily_leaderboard';

  if (!isDatabaseConfigured()) {
    return jsonResponse(response, 202, {
      accepted: false,
      configured: false,
      message: 'Email validated. Subscription database is not configured yet.',
    });
  }

  try {
    const existing = await supabaseRequest(
      `email_subscriptions?normalized_email=eq.${encodeURIComponent(normalizedEmail)}&unsubscribed_at=is.null&select=id`,
      { headers: { prefer: 'return=representation' } },
    );

    if (existing?.length) {
      return jsonResponse(response, 200, {
        accepted: true,
        alreadySubscribed: true,
        message: "You're on the starting line.",
      });
    }

    await supabaseRequest('email_subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        email: normalizedEmail,
        normalized_email: normalizedEmail,
        anonymous_player_id: payload?.anonymousId ?? null,
        source,
        official_date: payload?.officialDate || getOfficialDate(),
        consent_text_version: CONSENT_TEXT_VERSION,
        consent_timestamp: new Date().toISOString(),
      }),
    });

    return jsonResponse(response, 200, {
      accepted: true,
      alreadySubscribed: false,
      message: "You're on the starting line.",
    });
  } catch {
    return jsonResponse(response, 500, {
      error: 'SUBSCRIPTION_FAILED',
      message: 'Subscription failed. Please try again.',
    });
  }
}

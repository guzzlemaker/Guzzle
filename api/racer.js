import { jsonResponse, readJson, sanitizeDisplayName } from './_lib/http.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';
import {
  createPrivateToken,
  createPublicRacerId,
  getBearerToken,
  hashPrivateToken,
  selectRacingColor,
} from './_lib/race-security.js';

const MAX_RACER_ID_ATTEMPTS = 8;

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    return jsonResponse(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isDatabaseConfigured()) {
    return jsonResponse(response, 200, {
      configured: false,
      message: 'Race Car IDs need the Supabase backend to be configured.',
    });
  }

  try {
    const payload = request.method === 'POST' ? await readJson(request) : null;
    const displayName = sanitizeDisplayName(payload?.displayName);
    const token = getBearerToken(request);
    if (token) {
      const existing = await findPlayerByToken(token);
      if (existing) {
        const updateBody = { last_seen_at: new Date().toISOString() };
        if (displayName) {
          updateBody.display_name = displayName;
        }

        await supabaseRequest(`players?id=eq.${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateBody),
        });

        return jsonResponse(response, 200, {
          configured: true,
          token,
          publicRacerId: existing.public_racer_id,
          displayName: displayName || existing.display_name || null,
          racingColor: existing.racing_color,
        });
      }
    }

    const created = await createPlayer(displayName);
    return jsonResponse(response, 201, {
      configured: true,
      token: created.token,
      publicRacerId: created.player.public_racer_id,
      displayName: created.player.display_name ?? null,
      racingColor: created.player.racing_color,
    });
  } catch {
    return jsonResponse(response, 500, {
      error: 'RACER_ID_UNAVAILABLE',
      message: 'Race Car ID could not be created. You can still play locally.',
    });
  }
}

export async function findPlayerByToken(token) {
  const tokenHash = hashPrivateToken(token);
  const players = await supabaseRequest(
    `players?private_token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,public_racer_id,display_name,racing_color`,
  );

  return players?.[0] ?? null;
}

async function createPlayer(displayName) {
  for (let attempt = 0; attempt < MAX_RACER_ID_ATTEMPTS; attempt += 1) {
    const token = createPrivateToken();
    const publicRacerId = createPublicRacerId();

    try {
      const players = await supabaseRequest('players', {
        method: 'POST',
        body: JSON.stringify({
          anonymous_id: publicRacerId,
          public_racer_id: publicRacerId,
          display_name: displayName || null,
          racing_color: selectRacingColor(attempt + publicRacerId.charCodeAt(publicRacerId.length - 1)),
          private_token_hash: hashPrivateToken(token),
          last_seen_at: new Date().toISOString(),
        }),
      });

      return { token, player: players[0] };
    } catch (error) {
      if (error.status !== 409 && error.details?.code !== '23505') {
        throw error;
      }
    }
  }

  throw new Error('Could not create a unique Race Car ID');
}

import { jsonResponse } from './_lib/http.js';
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
    const token = getBearerToken(request);
    if (token) {
      const existing = await findPlayerByToken(token);
      if (existing) {
        await supabaseRequest(`players?id=eq.${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
        });

        return jsonResponse(response, 200, {
          configured: true,
          token,
          publicRacerId: existing.public_racer_id,
          racingColor: existing.racing_color,
        });
      }
    }

    const created = await createPlayer();
    return jsonResponse(response, 201, {
      configured: true,
      token: created.token,
      publicRacerId: created.player.public_racer_id,
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
    `players?private_token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,public_racer_id,racing_color`,
  );

  return players?.[0] ?? null;
}

async function createPlayer() {
  for (let attempt = 0; attempt < MAX_RACER_ID_ATTEMPTS; attempt += 1) {
    const token = createPrivateToken();
    const publicRacerId = createPublicRacerId();

    try {
      const players = await supabaseRequest('players', {
        method: 'POST',
        body: JSON.stringify({
          anonymous_id: publicRacerId,
          public_racer_id: publicRacerId,
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

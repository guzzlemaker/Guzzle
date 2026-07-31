import { getOfficialDate, getPublicTrack, getTracksForOfficialDate } from './_lib/content.js';
import { jsonResponse } from './_lib/http.js';

export default async function handler(request, response) {
  const url = new URL(request.url, 'https://playguzzle.com');
  const officialDate = url.searchParams.get('officialDate') || getOfficialDate();
  const trackType = url.searchParams.get('trackType') || 'daily';
  const tracks = getTracksForOfficialDate(officialDate);
  const track = trackType === 'bonus' ? tracks.bonus : tracks.daily;

  if (!track) {
    return jsonResponse(response, 404, {
      error: 'TRACK_NOT_READY',
      message:
        process.env.NODE_ENV === 'production'
          ? "Today's track is being prepared."
          : `No ${trackType} track is scheduled for ${officialDate}.`,
    });
  }

  return jsonResponse(response, 200, {
    officialDate,
    track: getPublicTrack(track),
  });
}

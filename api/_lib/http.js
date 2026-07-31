export function jsonResponse(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(body));
}

export async function readJson(request) {
  try {
    if (request.body && typeof request.body === 'object') {
      return request.body;
    }

    if (typeof request.body === 'string') {
      return JSON.parse(request.body);
    }

    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString('utf8');
    return rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return null;
  }
}

export function sanitizeDisplayName(value) {
  const cleaned = String(value ?? '')
    .replace(/[^\w .'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned ? cleaned.slice(0, 24) : null;
}

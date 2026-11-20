// Proxies API calls to the Fastify backend so the browser and SSR share one origin
// and the HttpOnly session cookie is forwarded in both directions.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const path = getRouterParam(event, 'path') ?? '';
  const query = getRequestURL(event).search;
  const target = `${config.apiBase.replace(/\/$/, '')}/${path}${query}`;

  const headers: Record<string, string> = {};
  const cookie = getHeader(event, 'cookie');
  const contentType = getHeader(event, 'content-type');
  if (cookie) headers.cookie = cookie;
  if (contentType) headers['content-type'] = contentType;

  const body = event.method === 'GET' || event.method === 'HEAD'
    ? undefined
    : await readRawBody(event, 'utf8');

  let response: Response;
  try {
    response = await fetch(target, {method: event.method, headers, body});
  } catch {
    throw createError({statusCode: 502, statusMessage: 'Backend is unavailable'});
  }

  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter((value): value is string => Boolean(value));
  for (const value of cookies) appendHeader(event, 'set-cookie', value);

  setResponseStatus(event, response.status);
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    setHeader(event, 'content-type', 'text/plain; charset=utf-8');
    return text;
  }
});

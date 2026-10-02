/** Common JSON HTTP client with timeout handling. */
export async function fetchJson(url, options = {}) {
  const { timeoutMs = 3500, headers = {}, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal
    });
    const body = await response.text();
    let data = null;
    if (body) {
      try { data = JSON.parse(body); }
      catch { throw new Error('JSON 응답을 해석할 수 없습니다.'); }
    }
    if (!response.ok) throw new Error('Dictionary API HTTP ' + response.status);
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Dictionary API timeout (' + timeoutMs + 'ms)');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function withQuery(url, params = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    target.searchParams.set(key, String(value));
  }
  return target.toString();
}

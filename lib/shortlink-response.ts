// Proxies and hosting errors can return HTML, plain text, or an empty body.
// Keep those responses from hiding the HTTP failure behind a JSON parse error.
export async function readShortlinkResponse(response: Response) {
  if (response.status === 401) {
    throw new Error('Your admin session has expired. Sign in again to manage shortlinks.')
  }
  const fallback = `The shortlink request failed (HTTP ${response.status}). Refresh the page and try again. If it continues, check the server logs.`
  let data
  try { data = await response.json() }
  catch { throw new Error(fallback) }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(fallback)
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : fallback)
  return data
}

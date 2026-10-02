// Server configuration; clients receive names through authenticated APIs.
export function getGroupMeConfig() {
  const topicId = process.env.GROUPME_TOPIC_ID?.trim() || ''
  const accessToken = process.env.GROUPME_ACCESS_TOKEN?.trim() || ''
  return { topicId, accessToken, configured: !!accessToken && /^\d+$/.test(topicId) }
}

export const GROUPME_CONFIG_ERROR = 'Set GROUPME_ACCESS_TOKEN and a numeric GROUPME_TOPIC_ID on the server before sending.'

type Group = { id: string | number; name: string; children_count?: number }
type Topic = { id: string | number; topic: string }

export async function getGroupMeDestination(config = getGroupMeConfig()): Promise<string> {
  if (!config.configured) return 'GroupMe (not configured)'
  const signal = AbortSignal.timeout(15000)
  async function read(path: string) {
    const response = await fetch(`https://api.groupme.com/v3/${path}`, {
      headers: { 'X-Access-Token': config.accessToken },
      cache: 'no-store', redirect: 'error', signal,
    })
    if (!response.ok) throw new Error('Unable to look up the GroupMe destination. Check the topic ID and account access.')
    return (await response.json()).response
  }
  for (let page = 1; ; page++) {
    const groups: Group[] = await read(`groups?per_page=100&page=${page}&omit=memberships`)
    if (!Array.isArray(groups)) throw new Error('Invalid GroupMe group response.')
    for (const group of groups) {
      if (String(group.id) === config.topicId) return group.name
      if (!group.children_count) continue
      const topics: Topic[] = await read(`groups/${encodeURIComponent(String(group.id))}/subgroups`)
      if (!Array.isArray(topics)) throw new Error('Invalid GroupMe topic response.')
      const topic = topics.find(topic => String(topic.id) === config.topicId)
      if (topic) return `${topic.topic} · ${group.name}`
    }
    if (groups.length < 100) break
  }
  throw new Error('The configured GroupMe topic was not found in this account’s groups.')
}

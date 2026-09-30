const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise server boundaries without connecting to or modifying the live database.
function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(source, {
    exports, require: name => name in mocks ? mocks[name] : require(name),
  }, { filename: file })
  return exports
}
const event = {
  slug: 'preview-trip', title: 'Preview trip', hidden: true,
  startDate: '2026-10-01', endDate: null, startTime: null, endTime: null,
  location: 'UVA', bodyMarkdown: 'Private details', imagePublicIds: [],
}
function mocks(token, record = event) {
  return {
    'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    '@/lib/auth': { verifyAdminToken: value => value === 'valid' ? { sub: 'admin' } : null },
    'next/navigation': {
      notFound: () => { throw new Error('404') },
    },
    '@/lib/pages-db': { getSitePage: async () => ({}) },
    '@/lib/events-db': {
      getEvent: async () => record,
      listEvents: async () => [{ ...event, slug: 'public-trip', hidden: false }],
      listAllEvents: async () => [event, { ...event, slug: 'public-trip', hidden: false }],
    },
    '../EventTemplate': { default: () => null, __esModule: true },
    '../date-utils': { formatDisplayDate: () => '', formatTimeForDisplay: () => '' },
    './events-client': { EventsClient: () => null },
  }
}
for (const token of [undefined, 'expired', 'valid']) {
  test(`preview detail access with ${token || 'no'} session`, async () => {
    const page = load('app/events/[slug]/page.tsx', mocks(token)).default
    const result = () => page({ params: Promise.resolve({ slug: event.slug }) })
    if (token === 'valid') assert.equal((await result()).props.preview, true)
    else await assert.rejects(result, /404/)
  })
  test(`event search data with ${token || 'no'} session`, async () => {
    const page = load('app/events/page.tsx', mocks(token)).default
    const result = await page()
    assert.equal(result.props.events.some(e => e.hidden), token === 'valid')
  })
}
test('public detail remains accessible without authentication', async () => {
  const page = load('app/events/[slug]/page.tsx', mocks(undefined, { ...event, hidden: false })).default
  assert.equal((await page({ params: Promise.resolve({ slug: event.slug }) })).props.preview, false)
})
test('unknown event stays a 404', async () => {
  const page = load('app/events/[slug]/page.tsx', mocks(undefined, null)).default
  await assert.rejects(() => page({ params: Promise.resolve({ slug: 'missing' }) }), /404/)
})
test('database helper hides previews by default and public query excludes them', async () => {
  let query = ''
  const db = load('lib/events-db.ts', {
    '@vercel/postgres': { sql: async parts => {
      query = parts.join('?')
      return { rows: [{ slug: event.slug, hidden: true, start_date: '2026-10-01' }] }
    } },
  })
  assert.equal(await db.getEvent(event.slug), null)
  assert.equal((await db.getEvent(event.slug, true)).hidden, true)
  await db.listEvents()
  assert.match(query, /WHERE hidden IS NOT TRUE/)
})

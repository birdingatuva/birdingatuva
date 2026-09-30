const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(source, { exports, require: name => name in mocks ? mocks[name] : require(name) }, { filename: file })
  return exports
}
const model = load('lib/banner.ts')
const content = { markdown: '**Interest meeting** [Details](/events)', backgroundColor: '#abcdef', textColor: '#123456' }
function setup(initial = {}) {
  const stored = { ...initial }
  const writes = []
  const route = load('app/api/banner/route.ts', {
    '@/lib/banner': model,
    '@/lib/auth': { verifyAdminToken: token => token === 'valid' },
    '@/lib/pages-db': {
      getSitePageSetting: async (slug, key) => { assert.equal(slug, 'home'); return stored[key] ?? null },
      updateSitePageSetting: async (slug, key, value) => {
        assert.equal(slug, 'home')
        writes.push(key)
        stored[key] = value
        return value
      },
    },
  })
  const put = (body, token = 'valid') => route.PUT({
    cookies: { get: () => token ? { value: token } : undefined }, json: async () => body,
  })
  return { route, put, stored, writes }
}
test('new installations default to a hidden banner and safe colors', async () => {
  const { route } = setup()
  const response = await route.GET()
  const data = await response.json()
  assert.equal(data.enabled, false)
  assert.equal(data.content.markdown, '')
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})
test('visibility writes leave saved text and colors intact', async () => {
  const { put, stored, writes } = setup({ banner: content })
  assert.equal((await put({ enabled: true })).status, 200)
  assert.equal((await put({ enabled: false })).status, 200)
  assert.deepEqual(stored.banner, content)
  assert.deepEqual(writes, ['bannerEnabled', 'bannerEnabled'])
})
test('saving content does not alter visibility', async () => {
  const { put, stored, writes } = setup({ bannerEnabled: true })
  assert.equal((await put({ content })).status, 200)
  assert.equal(stored.bannerEnabled, true)
  assert.deepEqual(writes, ['banner'])
  assert.equal(stored.banner.markdown, content.markdown)
})
test('anonymous and expired sessions cannot change the banner', async () => {
  const { put, writes } = setup()
  for (const token of [undefined, 'expired']) {
    assert.equal((await put({ enabled: true }, token || '')).status, 401)
    assert.equal((await put({ content }, token || '')).status, 401)
  }
  assert.equal(writes.length, 0)
})
test('invalid colors, oversized text, and combined writes are rejected', async () => {
  const { put, writes } = setup()
  for (const body of [null, {}, { enabled: 'true' }, { content, enabled: true },
    { content: { ...content, textColor: 'red;display:none' } },
    { content: { ...content, markdown: 'x'.repeat(10001) } }]) {
    assert.equal((await put(body)).status, 400)
  }
  assert.equal(writes.length, 0)
})

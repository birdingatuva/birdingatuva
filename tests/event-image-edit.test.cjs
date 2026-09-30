const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function setup({ fail = false, authorized = true } = {}) {
  const calls = { uploads: [], deletes: [], updates: [] }
  const mocks = {
    '@/lib/constants': { MAX_IMAGE_SIZE: 10_000 },
    '@/lib/auth': { verifyAdminToken: () => authorized },
    '@/lib/revalidate': { revalidateEvents: () => {} },
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
    '@vercel/postgres': { sql: { query: async (query, values) => {
      calls.updates.push({ query, values })
      if (fail) throw new Error('Database unavailable')
      return { rows: [{ slug: 'trip' }] }
    } } },
    cloudinary: { v2: { config() {}, uploader: {
      upload: async (data, options) => { calls.uploads.push(options); return { public_id: 'replacement' } },
      destroy: async id => calls.deletes.push(id),
    } } },
  }
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync('app/api/events/[slug]/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(source, { exports, Buffer, console: { error() {} },
    process: { env: { CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_API_KEY: 'test', CLOUDINARY_API_SECRET: 'test' } },
    require: name => mocks[name] || require(name),
  })
  const save = (image) => exports.PUT({
    cookies: { get: () => ({ value: 'session' }) },
    headers: new Headers(image ? { 'content-type': 'multipart/form-data' } : {}),
    json: async () => ({ title: 'Updated title' }),
    formData: async () => new Map([['data', JSON.stringify({ title: 'Updated title' })], ['image', image]]),
  }, { params: Promise.resolve({ slug: 'trip' }) })
  return { calls, save }
}
const image = new File(['image'], 'bird.png', { type: 'image/png' })
test('saving without a replacement preserves the existing image', async () => {
  const { calls, save } = setup()
  assert.equal((await save()).status, 200)
  assert.equal(calls.uploads.length, 0)
  assert.doesNotMatch(calls.updates[0].query, /image_urls/)
})
test('saving a replacement uploads a new asset and updates the event', async () => {
  const { calls, save } = setup()
  assert.equal((await save(image)).status, 200)
  assert.equal(calls.uploads[0].overwrite, false)
  assert.match(calls.uploads[0].public_id, /^trip-img-.+/)
  assert.ok(calls.updates[0].values.includes('["replacement"]'))
  assert.deepEqual(calls.deletes, [])
})
test('failed save removes only the new asset', async () => {
  const { calls, save } = setup({ fail: true })
  assert.equal((await save(image)).status, 500)
  assert.deepEqual(calls.deletes, ['replacement'])
})
test('unauthorized and oversized uploads do not alter images or events', async () => {
  const denied = setup({ authorized: false })
  assert.equal((await denied.save(image)).status, 401)
  assert.equal(denied.calls.uploads.length, 0)
  const oversized = setup()
  assert.equal((await oversized.save(new File(['x'.repeat(10_001)], 'big.png', { type: 'image/png' }))).status, 400)
  assert.equal(oversized.calls.uploads.length, 0)
  assert.equal(oversized.calls.updates.length, 0)
})

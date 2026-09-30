const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function setup(fail = false) {
  const calls = { uploads: [], deletes: [], settings: [] }
  const mocks = {
    '@/lib/constants': { MAX_IMAGE_SIZE: 10000 },
    '@/lib/auth': { verifyAdminToken: () => true },
    '@/lib/pages-db': { updateSitePageSetting: async (_, __, setting) => {
      if (fail) throw new Error('Database unavailable')
      calls.settings.push(setting)
      return setting
    } },
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
    cloudinary: { v2: { config() {}, uploader: {
      upload: async (_, options) => { calls.uploads.push(options); return { public_id: 'new-photo', secure_url: 'https://example.com/new.jpg' } },
      destroy: async id => calls.deletes.push(id),
    } } },
  }
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/pages/[slug]/settings/[key]/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Buffer, console: { error() {} }, process: { env: {
    CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_API_KEY: 'test', CLOUDINARY_API_SECRET: 'test',
  } }, require: name => mocks[name] || require(name) })
  return { calls, save: async image => exports.PUT({
    cookies: { get: () => ({ value: 'session' }) },
    headers: new Headers({ 'content-type': 'multipart/form-data' }),
    formData: async () => new Map([
      ['setting', JSON.stringify([{ name: 'A', image: '/old.jpg' }, { name: 'B', image: '/other.jpg' }])],
      ...(image ? [['image-0', image]] : []),
    ]),
  }, { params: Promise.resolve({ slug: 'leadership', key: 'leadership' }) }) }
}
const image = new File(['photo'], 'bird.png', { type: 'image/png' })
test('leadership save preserves existing photos when no image is selected', async () => {
  const { save, calls } = setup()
  const result = await save()
  assert.equal(result.status, 200)
  assert.equal(result.data.setting[0].image, '/old.jpg')
  assert.equal(calls.uploads.length, 0)
})
test('leadership replacement updates only the selected profile with a new asset', async () => {
  const { save, calls } = setup()
  const result = await save(image)
  assert.equal(result.status, 200)
  assert.equal(result.data.setting[0].image, 'https://example.com/new.jpg')
  assert.equal(result.data.setting[1].image, '/other.jpg')
  assert.equal(calls.uploads[0].overwrite, false)
})
test('failed leadership save cleans up the replacement without deleting the old photo', async () => {
  const { save, calls } = setup(true)
  assert.equal((await save(image)).status, 500)
  assert.deepEqual(calls.deletes, ['new-photo'])
  assert.equal(calls.settings.length, 0)
})

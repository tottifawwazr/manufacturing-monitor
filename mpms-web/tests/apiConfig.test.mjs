import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiUrl } from '../src/lib/apiConfig.ts'

test('API URLs support the same-origin proxy and a configured API prefix without doubled slashes', () => {
  assert.equal(createApiUrl('', 'dashboard/summary'), '/api/dashboard/summary')
  assert.equal(createApiUrl('/api/', '/productionlogs/1'), '/api/productionlogs/1')
  assert.equal(createApiUrl('https://api.example/api/', 'dashboard/lines?productionLine=Line%20B'), 'https://api.example/api/dashboard/lines?productionLine=Line%20B')
})

test('API URL configuration rejects credentials, ambiguous hosts and invalid protocols', () => {
  for (const base of ['//api.example/api', 'javascript:alert(1)', 'https://user:password@api.example/api', 'https://api.example/api?token=secret', '/api#fragment']) assert.throws(() => createApiUrl(base, 'productionlogs'))
})

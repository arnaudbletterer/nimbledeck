import assert from 'node:assert/strict'
import test from 'node:test'
import { chromeCandidates, findChrome } from '../src/chrome.mjs'

const fs = (...present) => (p) => present.includes(p)

test('macOS: finds the system install, then the per-user one', () => {
  const sys = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  assert.equal(findChrome({ platform: 'darwin', env: {}, home: '/Users/me', exists: fs(sys) }), sys)
  const user = '/Users/me/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  assert.equal(findChrome({ platform: 'darwin', env: {}, home: '/Users/me', exists: fs(user) }), user)
})

test('Linux: finds chromium when Chrome is absent', () => {
  assert.equal(findChrome({ platform: 'linux', env: {}, exists: fs('/usr/bin/chromium') }), '/usr/bin/chromium')
  assert.equal(findChrome({ platform: 'linux', env: {}, exists: fs('/usr/bin/google-chrome', '/usr/bin/chromium') }), '/usr/bin/google-chrome')
})

test('Windows: Program Files, x86 and the per-user install under LOCALAPPDATA', () => {
  const env = { PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' }
  const perUser = 'C:\\Users\\me\\AppData\\Local/Google/Chrome/Application/chrome.exe'
  assert.equal(findChrome({ platform: 'win32', env, exists: fs(perUser) }), perUser)
  const x86 = 'C:\\Program Files (x86)/Google/Chrome/Application/chrome.exe'
  assert.equal(findChrome({ platform: 'win32', env, exists: fs(x86) }), x86)
})

test('Windows without env variables still tries the default locations', () => {
  assert.ok(chromeCandidates({ platform: 'win32', env: {} }).includes('C:/Program Files/Google/Chrome/Application/chrome.exe'))
})

test('NIMBLEDECK_CHROME wins when it exists, and is ignored when it does not', () => {
  const sys = '/usr/bin/google-chrome'
  assert.equal(findChrome({ platform: 'linux', env: { NIMBLEDECK_CHROME: '/x/chrome' }, exists: fs('/x/chrome', sys) }), '/x/chrome')
  assert.equal(findChrome({ platform: 'linux', env: { NIMBLEDECK_CHROME: '/x/chrome' }, exists: fs(sys) }), sys)
})

test('returns null when nothing is installed', () => {
  assert.equal(findChrome({ platform: 'linux', env: {}, exists: () => false }), null)
})

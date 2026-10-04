import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

// Where Chrome (or a Chromium build) usually lives, most likely first. Windows paths are joined with '/', which Windows accepts.
export function chromeCandidates({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
  }
  if (platform === 'win32') {
    const roots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA, 'C:/Program Files', 'C:/Program Files (x86)'].filter(Boolean)
    return [...new Set(roots)].flatMap((r) => [`${r}/Google/Chrome/Application/chrome.exe`, `${r}/Chromium/Application/chrome.exe`])
  }
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/opt/google/chrome/chrome']
}

// Path of the Chrome to use, or null. NIMBLEDECK_CHROME wins when it points to a file; `exists` is injectable for tests.
export function findChrome({ platform = process.platform, env = process.env, home = homedir(), exists = existsSync } = {}) {
  if (env.NIMBLEDECK_CHROME && exists(env.NIMBLEDECK_CHROME)) return env.NIMBLEDECK_CHROME
  return chromeCandidates({ platform, env, home }).find((p) => exists(p)) ?? null
}

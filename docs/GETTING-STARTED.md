# Getting started: your first deck in 10 minutes

You will install the tools, create a deck with `nimbledeck new`, check it, run it, verify it and export a PDF.

Nimbledeck is not published to the npm registry. A deck project links to a checkout (a clone) of this repository, so the
first step is always to clone it and run `npm install` in it once.

## 1. Install the tools

You need Node 20 or newer, [uv](https://docs.astral.sh/uv/) (it fetches Python 3.12 for live demos by itself), Git and
Google Chrome (for `verify` and PDF export).

### macOS (Homebrew)

```sh
brew install node uv git
brew install --cask google-chrome
```

### Windows (winget or scoop)

**Windows is not yet tested end to end.** The CLI has code paths for it (process cleanup, Chrome locations) and the
Chrome detection is unit tested with fake file systems, but nobody has run a full deck on a Windows machine yet. Expect
rough edges and please report them.

With winget (package IDs from memory, not verified on this machine; `winget search nodejs` shows the right ones):

```powershell
winget install OpenJS.NodeJS.LTS
winget install astral-sh.uv
winget install Git.Git
winget install Google.Chrome
```

With scoop:

```powershell
scoop install nodejs-lts uv git
```

Open a new terminal afterwards so the new tools are on the PATH. Check them:

```sh
node --version   # v20 or newer
uv --version
```

## 2. Get Nimbledeck

```sh
git clone <the Nimbledeck repository URL> nimbledeck
cd nimbledeck
npm install
```

To use an exact release, check out its tag first (`git checkout v0.1.0`, see [RELEASING.md](RELEASING.md)). The
`npm install` prints a `npm warn install-scripts` message; it is harmless (see Troubleshooting).

## 3. Create a deck

From any folder (the target must be empty or not exist yet):

```sh
node path/to/nimbledeck/packages/cli/bin/nimbledeck.mjs new my-deck
cd my-deck
npm install
```

This creates `slides.md` (a cover, an agenda, a content slide and a closing slide), `nimbledeck.config.json`,
`package.json` with pinned dependencies and the scripts below, `demos/requirements.txt`, `public/`, `.gitignore` and
`.gitattributes`. The `package.json` links to the checkout you ran the command from, so keep that folder where it is.

## 4. Check, run, verify, export

```sh
npm run check    # lint the deck against the slide rules; fix every ERROR
npm run dev      # starts the deck and its demos; open http://localhost:3030
npm run verify   # with the deck running: renders every slide in Chrome and reports clipped content
npm run export   # writes slides.pdf next to slides.md, one page per build step
```

In the browser: arrows move, `?` lists every shortcut, `/` searches slides, `o` is the overview, and the presenter view
is `http://localhost:3030/presenter/1`.

Edit `slides.md` and the page reloads. To change the look of the whole deck, set `ndVariant` in the header to `plain`,
`paper` or `night`. The slide syntax is in [WRITING.md](WRITING.md).

## Troubleshooting

**Port already in use.** `nimbledeck run` stops with `port 2719 is already in use (demo compute)` when something else holds
a port. Stop the other process, change the port in `nimbledeck.config.json`, or shift every port at once, for example
`NIMBLEDECK_PORT_OFFSET=300 npm run dev` serves the deck on http://localhost:3330 (PowerShell:
`$env:NIMBLEDECK_PORT_OFFSET=300; npm run dev`).

**`npm warn install-scripts`.** Recent npm versions block install scripts and warn about `fsevents` and
`playwright-chromium`. It is harmless: Nimbledeck uses your installed Chrome, not the browser Playwright would download.
If you want Playwright's own browser anyway: `npm install-scripts approve playwright-chromium`.

**Chrome not found.** `nimbledeck export` looks in the usual places on macOS, Linux and Windows (including the per-user
install under `%LOCALAPPDATA%`). If yours is elsewhere, set `NIMBLEDECK_CHROME` to the full path of the executable:

```sh
NIMBLEDECK_CHROME="/path/to/chrome" npm run export                 # macOS, Linux
```
```powershell
$env:NIMBLEDECK_CHROME="C:\path\to\chrome.exe"; npm run export     # Windows
```

**A demo does not start.** Demos run through `uv`; check `uv --version` works in the same terminal. The first start
downloads Python and the packages listed in `demos/requirements.txt`, which takes a while.

**Line endings on Windows.** The scaffold ships a `.gitattributes` (`* text=auto eol=lf`) so files keep LF line endings.

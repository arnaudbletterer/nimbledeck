#!/usr/bin/env node
import { basename, dirname, resolve } from 'node:path'
import { checkDeck } from '../src/check.mjs'
import { exportDeck } from '../src/export.mjs'
import { scaffoldDeck } from '../src/new.mjs'
import { runDeck } from '../src/run.mjs'
import { verifyDeck } from '../src/verify.mjs'

const [cmd, deck, ...rest] = process.argv.slice(2)
const usage = () => { console.error('usage: nimbledeck new <dir> | run <deck.md> | check <deck.md> | verify <deck.md> [--url http://localhost:3030] | export <deck.md> [slidev export options]'); process.exit(2) }

try {
  // Slidev takes public/, layouts/ and components/ from the folder that contains the deck file, so the
  // config, demos and assets are resolved relative to that folder too.
  if (cmd === 'check' && deck) {
    const { errors, warnings, slides } = checkDeck(resolve(deck), dirname(resolve(deck)))
    warnings.forEach((w) => console.log('warn ', w))
    errors.forEach((e) => console.log('ERROR', e))
    console.log(`${slides} slides, ${errors.length} errors, ${warnings.length} warnings`)
    process.exit(errors.length ? 1 : 0)
  } else if (cmd === 'run' && deck) {
    await runDeck(basename(deck), dirname(resolve(deck)))
  } else if (cmd === 'verify' && deck) {
    const u = rest.indexOf('--url')
    process.exit(await verifyDeck(resolve(deck), dirname(resolve(deck)), u >= 0 ? rest[u + 1] : undefined))
  } else if (cmd === 'export' && deck) {
    process.exit(exportDeck(resolve(deck), dirname(resolve(deck)), rest))
  } else if (cmd === 'new' && deck) {
    scaffoldDeck(deck)
    console.log(`created ${deck}\nnext: cd ${deck} && npm install && npm run dev (run npm install in the Nimbledeck checkout first)`)
  } else usage()
} catch (e) { console.error(`error: ${e.message}`); process.exit(2) }

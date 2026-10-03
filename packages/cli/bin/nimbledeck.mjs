#!/usr/bin/env node
import { basename, dirname, resolve } from 'node:path'
import { checkDeck } from '../src/check.mjs'
import { runDeck } from '../src/run.mjs'

const [cmd, deck] = process.argv.slice(2)
const usage = () => { console.error('usage: nimbledeck run <deck.md> | nimbledeck check <deck.md>'); process.exit(2) }

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
} else usage()

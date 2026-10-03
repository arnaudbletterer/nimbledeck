#!/usr/bin/env node
import { resolve } from 'node:path'
import { checkDeck } from '../src/check.mjs'
import { runDeck } from '../src/run.mjs'

const [cmd, deck] = process.argv.slice(2)
const usage = () => { console.error('usage: nimbledeck run <deck.md> | nimbledeck check <deck.md>'); process.exit(2) }

if (cmd === 'check' && deck) {
  const { errors, warnings, slides } = checkDeck(resolve(deck), process.cwd())
  warnings.forEach((w) => console.log('warn ', w))
  errors.forEach((e) => console.log('ERROR', e))
  console.log(`${slides} slides, ${errors.length} errors, ${warnings.length} warnings`)
  process.exit(errors.length ? 1 : 0)
} else if (cmd === 'run' && deck) {
  await runDeck(deck, process.cwd())
} else usage()

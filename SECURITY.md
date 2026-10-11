# Security

## Reporting a vulnerability

Please report it privately, not in a public issue: use GitHub's
[private vulnerability reporting](https://github.com/arnaudbletterer/nimbledeck/security/advisories/new) for this repository.
Include the version or commit, what you did, and what you saw. You will get an answer as soon as it can be read; there is no
fixed schedule, this is a small project.

## What is in scope

Nimbledeck decks are static pages, but `nimbledeck run` starts local processes: marimo demos, Python streams and the
live-code runner, which executes Python on your machine. The runner is meant to be reachable only from the deck that started
it (a random token, an origin check, memory and time limits, bound to `127.0.0.1`). Anything that lets another web page, another
user or the network run code through it is in scope, as is a way around its limits.

## Supported versions

Only the latest release and `main`.

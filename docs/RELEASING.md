# Releasing

## License

**No license has been chosen yet.** There is no `LICENSE` file, so by default nobody but the owner may copy, use or
change this code. Choosing one (and adding the file) is the owner's decision and should happen before the repository is
shared outside the owner's organisation. [THIRD_PARTY.md](../THIRD_PARTY.md) lists the licenses of what Nimbledeck builds on.

## Versions

Nimbledeck uses [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- PATCH: fixes that change no documented behaviour.
- MINOR: new components, layouts, commands or options that keep existing decks working.
- MAJOR: anything that can break an existing deck (a renamed component or layout, a changed config key). While the
  version is 0.x, a MINOR bump may break things; say so in the changelog.

The three packages (`slidev-addon-nimbledeck`, `slidev-theme-nimbledeck`, `nimbledeck`) always share one version, and
one git tag covers all of them: `v0.2.0`. Dependencies between them and in the example use that exact version.

## Cutting a release

1. Make sure the work is merged and `npm test` passes. The runner tests need `uv`.
2. Move the entries under "Unreleased" in [CHANGELOG.md](../CHANGELOG.md) to a new `## 0.2.0 - YYYY-MM-DD` heading.
3. Set the new version in the three `packages/*/package.json` files and in the exact-version dependencies that name
   them (`packages/theme/package.json` depends on the addon; `examples/how-it-works/package.json` depends on the CLI
   and the theme).
4. Run `npm install` so the lockfile follows, then `npm test`.
5. Commit (`chore(release): v0.2.0`), then tag: `git tag -a v0.2.0 -m "v0.2.0"`.
6. Push the commit and the tag. Pushing to the default branch needs the owner's approval.

## Pinning Nimbledeck from a brand repository

A brand repository (its own theme plus its decks) should depend on one exact release, so a deck renders the same next
year as today.

### Recommended: a checkout at a tag, linked with `file:`

Keep a clone of Nimbledeck at a tag next to the brand repository, or inside it as a git submodule:

```sh
git submodule add <Nimbledeck URL> vendor/nimbledeck
git -C vendor/nimbledeck checkout v0.1.0
npm --prefix vendor/nimbledeck install
```

```json
{
  "dependencies": {
    "nimbledeck": "file:vendor/nimbledeck/packages/cli",
    "slidev-addon-nimbledeck": "file:vendor/nimbledeck/packages/addon",
    "slidev-theme-nimbledeck": "file:vendor/nimbledeck/packages/theme"
  },
  "overrides": {
    "slidev-addon-nimbledeck": "file:vendor/nimbledeck/packages/addon"
  }
}
```

This is what `nimbledeck new` generates (with a relative path to the checkout it ran from). The submodule commit records
the exact tag in the brand repository's history. Trade-offs: teammates must clone with `--recurse-submodules`, and
`npm install` has to be run in the checkout as well, because the linked packages find their own dependencies (three.js,
chart.js and so on) there. The `overrides` entry is needed because the theme depends on the addon by version, and that
version does not exist on the npm registry.

### Not recommended: an npm git dependency

```json
{ "dependencies": { "nimbledeck-workspace": "git+<Nimbledeck URL>#v0.1.0" } }
```

The tag is pinned and nothing needs to be cloned by hand, but this does not give you the packages. The repository root
is the workspace (`nimbledeck-workspace`), and npm installs it as one package; `slidev-theme-nimbledeck`,
`slidev-addon-nimbledeck` and the `nimbledeck` command are not made available under their own names. This was tried
with a local git URL: only `node_modules/nimbledeck-workspace` appeared, containing `packages/`. To use it you would link
into `node_modules/nimbledeck-workspace/packages/...` with `file:` paths, which needs the package to be installed before
the dependency that points into it. Publishing the three packages to a registry would make plain version pins
possible; that is not done.

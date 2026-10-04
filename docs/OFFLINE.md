# Working offline

A deck should open and run on a train, in a tunnel, or on a connection that hangs instead of failing. Nimbledeck makes
no network request of its own when it runs. Only content that lives on the internet needs it.

## What works with no internet

- Opening and walking a deck: slides, builds, animations, canvas, 3D, charts, quizzes, the command palette.
- Fonts and the favicon: the theme uses system fonts and an inline icon, so nothing is fetched.
- Images and video that sit in the deck's `public/` folder.
- Python demos, streams and live code, from uv's cache (see below).
- `nimbledeck check`, `export` and `verify`: they only talk to your own machine.

## What needs the internet

- A `<Site url="...">` slide. Offline, or when the page does not answer within 8 seconds, it shows a panel with the
  address and a Retry button. It tries again by itself when the browser goes back online.
- A `<Photo>`, `<Clip>` or `<Compare>` whose `src` is an `https://` address. It shows a short note instead of a broken
  image. Keep media in `public/` and it never needs the network.
- Diagrams that use a PlantUML server, and embedded tweets or videos (Slidev features Nimbledeck does not change).
- The first run on a new machine: uv has to download Python and the demo packages once.

## Before a trip

Run this once, with a connection, in the deck's folder:

    nimbledeck prepare slides.md

It starts uv the way `nimbledeck run` does, so Python and the packages in `demos/requirements.txt` (plus the live-code
runner's) land in uv's cache. Running `nimbledeck run` once does the same. Do it again after you change the
requirements or the Python version.

## What `nimbledeck run` does without a network

1. It asks uv to start from its cache (`uv run --offline`). If everything is cached, demos start in a fraction of a
   second and nothing touches the network.
2. If something is not cached, it checks for a connection for at most one second. If the connection answers, uv fetches
   what is missing, with a 10 second timeout (set `UV_HTTP_TIMEOUT` to change it).
3. If there is no connection and something is missing, it prints one message naming what is missing, does not start the
   Python processes, and starts the deck anyway. The demo, stream and live-code components show their offline panels.

`UV_OFFLINE=1` forces the offline path. The Slidev server itself starts from the copy installed in the deck's
`node_modules`, with no lookup.

## Checking it yourself

`examples/how-it-works/offline-e2e.mjs` builds the example deck and opens it in Chrome twice: once with every external
request left hanging, once with the browser offline and every request aborted. It checks that the first slide shows in
under 3 seconds, that the keyboard walks the whole deck, that the website slide shows its offline panel and recovers, and
that the only external address requested is the deck's own `<Site>` URL.

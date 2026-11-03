# Elections page

`elections.html` shows the live 2026 midterm results board in read-only mode. Vote counts and
race calls come from the `oc-election-wire` Cloudflare Worker, the same service the IntelHQ board
uses, so calls made at the IntelHQ desk appear here within about a minute.

`board.js`, `board.css` and `data/us-states.json` are copies of the files in the IntelHQ repo's
`elections/` folder. If those change in IntelHQ, copy them here again. The site's colors and fonts
for the board are set in the `<style>` block at the top of `elections.html`.

## Election night player

The top of `elections.html` has a stream-style player. Before 3:00 p.m. Pacific on Nov 3 it shows a
countdown; after that it plays `elections/broadcast.html` (the same screen OC Scanner streams on X)
inside the frame, with a Live badge, a full-screen button and a link to the X stream. It isn't video:
the board draws itself in each visitor's browser, so it uses none of the stream's upload, but it has no
music.

The board and the player share one results check: `board.js` (mounted with `shared: true`) asks the
Worker's `/v1/live` once a minute and the player in the frame reuses that answer, so each visitor costs
about one Worker request a minute. Hidden tabs don't check at all. To preview it early, open `elections.html?player=live`.

`broadcast.html` and `broadcast-logo.png` are copies from the IntelHQ repo's `elections/` folder, like
`board.js`. Copy them again if they change there.

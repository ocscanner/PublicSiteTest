# Elections page

`elections.html` shows the live 2026 midterm results board in read-only mode. Vote counts and
race calls come from the `oc-election-wire` Cloudflare Worker, the same service the IntelHQ board
uses, so calls made at the IntelHQ desk appear here within about a minute.

`board.js`, `board.css` and `data/us-states.json` are copies of the files in the IntelHQ repo's
`elections/` folder. If those change in IntelHQ, copy them here again. The site's colors and fonts
for the board are set in the `<style>` block at the top of `elections.html`.

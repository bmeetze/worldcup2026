# World Cup 2026 Tracker

A personal dashboard for the 2026 FIFA World Cup. One self-contained `worldcup.html` (schedule, my teams, standings, bracket, calendar export), hosted on GitHub Pages.

## Open it
- Hosted: https://bmeetze.github.io/worldcup2026/worldcup.html (works on desktop and phone)
- Local: double-click `worldcup.html` (works offline; scores update only when you refresh)
- On your phone: open the hosted URL, then Share > Add to Home Screen.

## Refresh the data
Refresh scores and resolved knockout teams anytime:

`node refresh-scores.mjs`

To commit and push the refreshed `worldcup.html` in the same run:

`node refresh-scores.mjs --commit`

The refresh uses ESPN's public scoreboard feed and does not require a token. `build-seed.mjs` is kept as a football-data.org fallback for rebuilding the original fixture seed, but normal score updates should use `refresh-scores.mjs`.

## Add games to Google Calendar
Click the calendar button on a match (or "Export all my teams' games") to download an `.ics`. In Google Calendar: Settings > Import & Export > Import, choose the file. (Tapping an `.ics` on a Mac/iPhone opens Apple Calendar by default; use the Import flow for Google.)

## Manual score fallback
If the API lacks coverage, edit the `<script type="application/json" id="wc-data">` block in `worldcup.html` directly: set a match's `homeScore`, `awayScore`, and `status` to `"finished"`, then commit and push.

## Run the self-tests
Open `worldcup.html?selftest=1`.

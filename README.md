# World Cup 2026 Tracker

A personal dashboard for the 2026 FIFA World Cup. One self-contained `worldcup.html` (schedule, my teams, standings, bracket, calendar export), hosted on GitHub Pages.

## Open it
- Hosted: https://bmeetze.github.io/worldcup2026/worldcup.html (works on desktop and phone)
- Local: double-click `worldcup.html` (works offline; scores update only when you refresh)
- On your phone: open the hosted URL, then Share > Add to Home Screen.

## Set up the data API (football-data.org)
1. Get a free token at https://www.football-data.org/client/register
2. Seed fixtures once: `FOOTBALL_DATA_TOKEN=xxxx node build-seed.mjs`
3. Refresh scores anytime: `FOOTBALL_DATA_TOKEN=xxxx node refresh-scores.mjs` (commits + pushes; Pages redeploys in ~1 min)

Keep your token out of git. Either prefix the command as above, or put it in a local `.env` you do not commit and `export FOOTBALL_DATA_TOKEN=$(grep TOKEN .env | cut -d= -f2)`.

Venues: football-data.org does not return stadiums, so `build-seed.mjs` enriches each match with stadium/city/state from the public-domain openfootball dataset (joined on kickoff time), via a 16-venue lookup in `wc-lib.mjs`. No key needed for that.

## Add games to Google Calendar
Click the calendar button on a match (or "Export all my teams' games") to download an `.ics`. In Google Calendar: Settings > Import & Export > Import, choose the file. (Tapping an `.ics` on a Mac/iPhone opens Apple Calendar by default; use the Import flow for Google.)

## Manual score fallback
If the API lacks coverage, edit the `<script type="application/json" id="wc-data">` block in `worldcup.html` directly: set a match's `homeScore`, `awayScore`, and `status` to `"finished"`, then commit and push.

## Run the self-tests
Open `worldcup.html?selftest=1`.

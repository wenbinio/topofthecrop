# AI log: Field Shift, NASA Space Apps 2026

How AI tools were used during the competition (14–15 November 2026): what we asked them to do, and how they helped. Work done before the competition started is left out. Work is still going on, so more will be added. Written with AI assistance (Claude, Anthropic).

**AI tools**
- Claude (Anthropic): claude.ai chats with web search and code execution, and Claude Code for the app
- Gemini (Google): code reviews, and the wording farmers read
- Codex (OpenAI): code audits
- ChatGPT image generation (OpenAI): the crop pictures
- Fleet: a multi-agent tool used to coordinate the coding tools

**In short.** We decided what to build, ran every data notebook ourselves, tried each version of the app and reviewed every change. AI wrote most of the code, the checks and the documents, gathered crop and money figures with their sources, edited the wording and painted the crop pictures. No satellite, weather, climate or soil value was written by AI: they come from the cited datasets, through Earth Engine runs we did ourselves. The one exception is the trial's published station rain, temperature and soil description, which were typed in from its paper and are labelled as such.

## The data

- **Six data notebooks** (area grid, greenness, weather, water, future climate and soil, checks and sources)
  - **We:** asked AI to write notebooks for the Bradano basin's 1 km grid; ran every one ourselves in Google Earth Engine and pasted the results back
  - **AI:** wrote the notebook code and an offline test setup with a stand-in for Earth Engine. It fixed errors as the results came in: a reprojection error in MODIS water use (SMAP and the climate projections had also been worked out at 1° by mistake), a soil water-holding error, and soil nitrogen 10 times too high, caught by checking ISRIC's own service
- **A check against real measurements**
  - **We:** asked for the satellite figures to be checked against what was measured at the demo field
  - **AI:** found the trial field's own weather station in the trial's published paper, and typed its season rain and temperature into the checks notebook, labelled as copied from the paper
- **An in-depth check of every output file**
  - **We:** uploaded every output for checking, and reran the notebooks after the fixes
  - **AI:** checked every file by script and fixed 8 problems, such as 53 coastal squares with no weather values and a coverage check that rounded up to 100%. It also added season dates found between images, the field compared with neighbouring fields, and a 2001–2020 baseline for the future
- **A temperature correction we dropped**
  - **We:** tried to download Basilicata's hydrological records for the correction; the PDFs wouldn't load, so we kept the temperature caveat instead
  - **AI:** prepared the correction from those records
- **Making sure no data was cherry-picked**
  - **We:** asked how we could be sure no data had been selectively changed or left out
  - **AI:** explained the checks that guard against it
- **Background reading**
  - **We:** found a 2003 paper on the Agri basin, and asked why hot days at flowering matter for durum
  - **AI:** read and summarised the paper, and logged it as related work; explained the effect of hot days at flowering, with sources
- **A final check of the data**
  - **We:** asked for one last check of every value, and reran the checks notebook
  - **AI:** checked every value by script; fixed the wording about the station values, and a hot-days chart that drew two kinds of range the same way; packed the files under their exact names and tested them offline
- **Uploading to GitHub**
  - **We:** uploaded the data, the notebooks and the list of data sources
  - **AI:** walked us through it: uploading folders, moving files in github.dev, committing
- **Handing the data to the app**
  - **We:** asked how the app would use each data file, and for a handover
  - **AI:** summarised how each screen uses the data; wrote the handover guide (`HANDOVER.md`, removed before submission; its caveats are now in `docs/scoring.md`) and a tested helper for reading the files ([`src/data/fieldshift-data.js`](../src/data/fieldshift-data.js))

## The app

- **Building the app**
  - **We:** set out what the app should do; tried each version and decided what to change (for example, putting priorities in order instead of picking two, and what "drier" means); reviewed every change before it went live
  - **AI:** Claude Code wrote most of the code:
    - finding or drawing a field, including edges found from the aerial photo, and search by land-registry parcel numbers
    - results for any field in the basin, and voice
    - maps (NASA, Sentinel-2, aerial photos), this season's rain and a seven-day forecast
    - Settings, where the farmer can change every figure behind the income
    - priorities in order, three kinds of year, strip intercrops, "Your soil", "Your field today" and "Check and share"
    - each figure's source one tap away, the decision-tree layout, the fit on narrow phones, and English and Italian
- **Code reviews**
  - **We:** had the code reviewed by two more AI tools
  - **AI:** Gemini reviewed it and Codex audited it; Claude Code fixed the defects they found
- **The wording farmers read**
  - **We:** asked for plain, short wording a farmer can read on a phone, in English and Italian
  - **AI:** Gemini rewrote the text in three passes, the last a rewrite of the Italian; Claude checked and applied it. No native Italian speaker has read it yet
- **Crop pictures**
  - **We:** had a picture of each crop made with AI, from a written brief
  - **AI:** ChatGPT's image generation painted each crop with its seed or pod (paintings, not photographs); Claude helped write the code that shows them
- **Our data on screen**
  - **We:** decided what reaches the app; our notebook checks found NASA POWER's impossible rain months
  - **AI:** carried our data into the app: the evidence on the Why screen, NASA SMAP soil water, NASA MODIS crop water use, a card comparing 2024 and 2026 with a usual season, and flags for seasons much less green than nearby fields. It left the impossible rain months out of the live rain, and the app says so
- **"Your field from space"**
  - **We:** tested a trial video and caught a cloudy frame
  - **AI:** built a timelapse of the farmer's own field from Sentinel-2 pictures, and made it skip cloudy ones
- **Printout graphs**
  - **We:** found the first graphs (dots) hard to read; asked for line graphs, and for our three data pictures
  - **AI:** redrew them as line graphs, and redrew the three pictures from each field's own data
- **The redesign**
  - **We:** decided each change (a simpler flow, saved plans, an intercrop map, letting farmers correct their soil, "left fallow" as a last crop), tried it and reviewed it
  - **AI:** Claude Code wrote the code and Gemini the new wording:
    - three setup steps, then tabs (My field, Advice, My plans), with the rest in a menu
    - "My plans": every plan kept on the phone, to reopen or remove
    - where to intercrop on the farmer's own field: the field split between the two crops from three satellite signals over several springs (Sentinel-2 greenness and leaf moisture, and high and low ground from the Copernicus DEM), showing where they agree
    - changing the soil type, and the pH from a soil analysis
    - "Nothing, left fallow" as a last crop
- **Back after changing prices**
  - **We:** found on a phone that Back after changing a price threw the change away and stayed on the same screen; a teammate added a "Save changes" button
  - **AI:** made every way back out of Settings (its own Back, the top bar's and the phone's) keep the new figures and return to the screen before, so a further Back moves on
- **AI badge on the crop pictures**
  - **We:** asked for a visible AI mark on every AI-made picture, as the competition's rules require
  - **AI:** added a see-through "AI" badge to each crop picture, and named ChatGPT in the AI statement and the app's AI note

## Sources and checks

- **Crop and money figures**
  - **We:** asked for starting figures the farmer can change (crop prices, costs and yields, and support payments), and chose which to use
  - **AI:** research agents (Claude and Gemini) gathered them, with their sources
- **A source for every figure**
  - **We:** noticed 89 figures labelled only "Crop research", and asked for every figure to name its actual source
  - **AI:** traced each figure to its source and relabelled it. Along the way it wrongly called the Basilicata regional payments site unofficial, then corrected itself
- **Crop costs and nitrogen**
  - **We:** asked AI to check every crop's costs and nitrogen, and to find a source wherever one was missing
  - **AI:** found published sources: durum's costs now follow a 2025 ISMEA survey (675 €/ha); chickpea's were too low and went from 540 to 600 €/ha; each legume's nitrogen figure cites a study. It found no published costs for the other seven crops, which stay marked as our own notes
- **Support payments checked against official pages**
  - **We:** supplied a research compilation on the payments, and audited the funds and the regional payments
  - **AI:** checked each payment against AGEA's 2024 and 2025 circulars and the decrees, corrected the figures, and linked each payment to its own official page
- **Saying how sure the advice is**
  - **AI:** the confidence line now counts each figure's own source and names the figures that are still unchecked
- **The Italian, screen by screen**
  - **We:** asked AI to make sure the language works on every screen
  - **AI:** read every string in both languages and opened every screen in Italian and English on two phone widths. It fixed English source labels on Italian screens, a printout too wide for small phones, a graph unit and about a dozen Italian wordings
- **Testing what AI told us**
  - **We:** tested an AI research agent's claims about a licence and a web service address before relying on them, and made it a rule that such claims are leads to test, not facts
- **Checks**
  - **We:** set the rule that every change passes the tests and a full build before it goes live
  - **AI:** wrote and ran the tests; matched the demo field's 182 on-screen figures to its data file, and 400 figures from 40 random fields to the 1 km files; checked 110 screens and 48 screen widths; wrote a screen-by-screen checklist for checking the live app by hand

## The submission

- **A final check of every document**
  - **We:** asked AI to flag anything false, risky, unneeded or missing in the repo before the deadline, and chose what to fix
  - **AI:** checked every document and fixed what we chose: removed four figures copied from papers (none was CC BY) and pointed to the papers instead, added the missing Copernicus DEM credit, brought the screen names up to date after the redesign, rewrote the screen-by-screen checklist for the new screens, pointed the SRA03 payment to the region's own documents, and removed files we no longer needed (day-one plans, mockups and screenshots, and an unchecked comparison of durum with a faba bean rotation)
- **AI statement, submission text and this log**
  - **We:** asked for the NASA data list, the references, the AI statement and this log, and reviewed them
  - **AI:** drafted them from our chat records and the repository's history, and kept them up to date as the app changed (new payment sources, the new flow); added the AI note to the app and the printout, and to the header of every file it helped write; kept our chat records and data notes up to date
- **Adversarial reviews before submission (15 November, evening)**
  - **We:** asked for adversarial reviews of the main branch before submission, and chose what to fix before the deadline
  - **AI:** three AI reviewers (Claude Opus, OpenAI Codex Sol, Google Gemini Argon) read the main branch separately; Claude checked their findings against the code. Fixed: the ranking scale, wrong lines (the faba strips' nitrogen, a forage reason, an Italian headline), the intercrop map's year two and its fallback pair, the OpenStreetMap credit, the Copernicus DEM notice now shown under the intercrop map, overclaims in the documents, and a personal cloud project ID in the notebooks. Left for later: a cloud check for the intercrop zones, payments that exclude each other, rain gaps this season, and the saved-plan wording after a price change

# Top of the Crop: AI log, from the start of the project to 15 November 2026

Written Sun 15 Nov 2026, 16:40 UK, with about five hours to the deadline (21:59 UK). It covers how AI tools were used from the first preparation in early November until now.

It is built from:
- the data lead's chats with Claude: three chat records kept in the team's Claude Project (13, 14 and 15 November) and the summaries of the earlier chats;
- this repository's history (about 130 commits by the afternoon of 15 November: 88 by the team leader, about 20 by Claude, about 20 from the data lead's account, mostly data uploads and merges, and 1 by another teammate) and its pull requests;
- the README's "Use of AI".

The team leader's own AI sessions are summarised from the repository, not from his chats. Written with AI assistance (Claude, Anthropic).

## Summary

| | |
|---|---|
| Team | Top of the Crop, a Singapore team. The team leader, Wen Bin, is in Finland and owns the repository; the data lead, Edison, is in the UK |
| Challenge | NASA Space Apps 2026, Field Shift: Adapting Farms with NASA Data |
| What was built | A phone web app for rain-fed durum farmers in the Bradano basin (Basilicata, Italy): https://wenbinio.github.io/topofthecrop/ |
| AI tools | Claude (Anthropic): claude.ai chats for research, planning, the data notebooks and their checks; Claude Code for the app. Gemini (Google, "Hydrogen"): code reviews and the app's wording in English and Italian. Codex (OpenAI, "Sol"): code audits. Fleet: a multi-agent tool the team leader used to coordinate them |
| What the team did | The idea and the six steps; the choice of Southern Italy, the Bradano basin and the demo field; ran every data notebook in Google Earth Engine; checked the results against the trial's own weather station; decided what reaches the app; tried each version and reviewed every change |
| What AI did | Wrote most of the code (app and notebooks), the checks and the documentation; researched crop figures, prices and payments (the team chose the figures); edited the wording; audited the code |
| Where it is acknowledged | The README's "Use of AI"; the app's "Data and credits" page and the printout; `DATA_SOURCES.md`; the data files' metadata; each file's header; `docs/space-apps-submission.md` |

## 1. Before the competition, about 3 to 13 November

No project code, designs or assets were made before the start. That was a rule in the team's notes; research, accounts, planning and practice runs on other places were allowed.

| When | Asked by the data lead | What Claude did | What the team decided or did |
|---|---|---|---|
| Early November | Which challenge, and how to work with a team 8 hours ahead | Researched Field Shift and the SPHEREx sky-change challenge, worked out the timeline, and explained image differencing | The team chose Field Shift on 9 November |
| 10 November | Which region | Built tables of needs and data sources, and wrote the team brief and a region-choice analysis | The team's own Earth Engine run compared clear satellite views of cropland in 17 areas. Southern Italy was chosen on 10 November and locked on 11 November |
| 10 to 13 November | Practice runs | Wrote practice notebooks for Cambridgeshire and for clear views across regions | The data lead ran them in Colab with Earth Engine |
| 11 to 13 November | Area, field and data | Proposed the Bradano basin (2,765 km² on a 1 km grid), checked the Earth Engine dataset IDs, and researched the rules, the AI rules and the Universal Event | The team picked the demo field: the site of Denora et al.'s (2025) durum and vetch trial at Genzano di Lucania |
| 13 to 14 November | Gaps before the start | Covered crop seasons and fallbacks if Claude were unavailable, wrote a second practice run (the 2018–19 drought in New South Wales, giving 10 changes to the plan), and built a Basilicata drought-and-flood timeline and chickpea rotation rules | The data lead ran the practice notebook. Chat records were saved on 13 and 14 November |

## 2. Day 1, Saturday 14 November: the data

| When (UK) | What happened | AI's part | Team's part |
|---|---|---|---|
| 06:57 | Repository created | | The team leader |
| Morning | Six notebooks: 01 area grid, 02 greenness, 03 weather, 04 water, 05 future climate and soil, 06 checks and sources | Claude wrote the notebook code | The data lead ran them in Google Colab with Earth Engine |
| From 12:22 | The app | The team leader's Claude Code sessions scaffolded the app, its data contract, ranking, eight screens and two languages; Gemini and Codex reviewed it (the commits "Fix defects from the Hydrogen review" and "from the Sol review") | The team leader directed it and merged pull requests #1 to #10 between 13:19 and 20:01: the first working app, publishing to GitHub Pages, field drawing, editable prices, the real demo field and its data (17:36, after the upload), what to plant and why, nine crops on researched figures, and results for any field in the basin with voice |
| Afternoon | In-depth check of every file | Claude checked every output by script. It found and fixed 8 problems, such as 53 coastal squares with no ERA5-Land values and a misleading coverage check, and added season dates found between images, the field compared with nearby fields, and a 2001–2020 baseline for the future | The data lead reran 02 to 06 (15:59–16:22) |
| Afternoon | Station temperature correction | Prepared a correction from Basilicata's records | The PDFs would not load, so it was skipped and the cool-temperature caveat kept |
| 16:30–16:51 | Final data check | Checked every value; fixed two wording problems in 06 | The data lead reran 06 |
| 16:56–18:05 | Data upload | Step-by-step help | The data lead uploaded the data, notebooks and `DATA_SOURCES.md` |
| 18:10–18:30 | Handover | Wrote `HANDOVER.md` and a tested data helper (`src/data/fieldshift-data.js`) | Handed over to the team leader for the app |
| 20:07 | Files uploaded | | Another teammate |

## 3. Day 2, Sunday 15 November: the app and the data together

The team leader merged 13 more pull requests of his own (#11 to #16, #18, #20, #23, #29, #33, #35, #40), built with Claude Code and with the farmer-facing wording by Gemini:
- map imagery, parcel lookup, live rain and a seven-day forecast;
- Settings with every income figure editable;
- priorities put in order, and Check and share;
- strip intercrops;
- three kinds of year, Your soil and Your field today;
- the decision-tree layout.

The data lead's chat with Claude Code on the web (Claude Opus) worked from his account. The team leader installed the Claude GitHub App, and Claude then worked on branches and merged its own pull requests under the data lead's rule: merge unless another pull request is pending or the team leader is editing. 19 pull requests were merged:

| Pull requests | What changed |
|---|---|
| #17, #19, #21, #22 | The rest of the data team's figures carried into the app; the Why screen's steps worked out from the data; NASA SMAP soil water and NASA MODIS crop water use as evidence; the 2024 vs 2026 card; flags for seasons much less green than nearby fields |
| #24 | NASA POWER's three impossible rain months left out of the live rain, found by the data team's checks |
| #25, #26, #27, #28, #37 | Data credits and the AI note in the app; a docs sweep; fewer words on screen (sources in tap-to-open bubbles, credits on a page of their own); a screen-by-screen checklist |
| #30, #31, #32 | "Your field from space": a timelapse of the farmer's own field from Sentinel-2. The data lead tested a trial video first, found a cloudy frame, and confirmed it |
| #34, #36 | Fits narrow phones (320 and 360 px) without sideways scrolling |
| #38, #39 | Printout graphs. The data lead found the first version (dots) hard to read; they became line graphs, plus the data team's three pictures in `DataPics/` redrawn from each field's own data |
| #41, #42 | Every figure cites its actual source. Durum's costs follow ISMEA's 2025 survey (675 €/ha). Chickpea's are worked out from Lago-Olveira et al. (2023) and ISMEA (600 €/ha, up from 540). Each legume's nitrogen figure cites published studies. `docs/space-apps-submission.md` holds the text for the project page |

Checks run by Claude:
- The demo field's 182 figures on screen match `data/field.json`.
- 400 figures from 40 random drawn fields match the 1 km files.
- A 110-screen sweep is clean.
- 48 width checks pass.
- Typecheck, tests and the build pass before every merge.

The video and written description are made by other team members.

## 4. Mistakes caught, and how

| What | Caught by | Outcome |
|---|---|---|
| NASA POWER's rain for October 2025, February and March 2026 more than three times the other sources | The data team's checks in notebook 03 | Left out of the app's live rain, which says so on screen |
| 53 coastal squares with no weather values; a coverage check that rounded to 100% | Claude's script checks on 14 November | Fixed in the notebooks |
| An AI researcher's claims about a licence and a service endpoint | The team, testing them | Recorded in `AGENTS.md` as a rule: an AI's claim about a licence is a lead to test |
| The 2050 rain looked wrong | Claude's full-app check | A false alarm: the data stores the change as a percentage |
| "Crop research, Nov 2026" on 89 figures with no document named | The data lead | Every figure now names its source (#41) |
| Claude called the CSR Basilicata site unofficial in #41 | Claude, while researching costs | The region's own slides use www.basilicatacsr.it, so the link went back (#42) |
| Chickpea's costs (540 €/ha) below both published sources | Claude, at the data lead's request | Raised to 600 €/ha with its sources (#42) |

## 5. Still not checked

- The app on a real phone: touch drawing, voice, the Settings inputs.
- Direct costs for faba bean, lentil, pea, barley, rapeseed, coriander and vetch–oat hay: no published southern budget was found.
- Each rotation's risk rule and the weights for the farmer's priorities, which are the team's judgement.
- The Italian wording, which no native speaker has read.

## Sources

- The team's chat records in its Claude Project: `chat-record-2026-11-13.md`, `claude/chat-record-2026-11-14.md`, `claude/chat-record-2026-11-15.md` (not public)
- This repository's history: https://github.com/wenbinio/topofthecrop/commits/main
- README, "Use of AI": https://github.com/wenbinio/topofthecrop#use-of-ai

# Checking the app works

A walk through every screen with what you should see, for the app as it is after the redesign (three setup steps, then tabs). The figures are the demo field's, from the data of 14 November 2026 and the money figures of 15 November 2026; if either is replaced, they change. Written with AI assistance (Claude, Anthropic).

Open https://wenbinio.github.io/topofthecrop/ and press **Ctrl+F5** first (on a phone, pull down to reload), so the browser fetches the newest version. Shortcut to the demo field's plan: https://wenbinio.github.io/topofthecrop/#/options?f=genzano-demo&p=income,water

## Signs something is broken, on any screen

- A blank page, or "Loading…" for more than 10 seconds.
- A 0, "NaN" or "undefined" where a figure should be, or a code such as `year.rainHead` instead of words.
- English words on an Italian screen. Known and fine: dataset names, and the elevation credit on *Data and credits*, which its licence asks for word for word.
- Text or a table cut off at the right edge of a phone, or a page that scrolls sideways.
- Each figure's dataset, date and confidence open in a small bubble on a tap (on its *Source*, or on the figure itself); a tap anywhere else closes it.
- **Not a bug:** "not available" under *This season so far* or *Next 7 days* means NASA POWER or MET Norway did not answer. Tap *Try again*.

## 1. Find the field (step 1 of 3)

- [ ] The map opens on the Bradano basin; the white line is its edge. Under it: *My location*, *Tap your field*, *Draw your field* and *Parcel number*.
- [ ] Tap the field near Genzano di Lucania: "Is this your field?" with its size. Tap **Yes**.
- [ ] *Parcel number*: sheet **75**, parcel **523** finds the demo field's plot (about 3.8 ha) in Genzano di Lucania.
- [ ] *Draw your field*: tap the corners, drag a dot to adjust, *Undo* takes back the last corner.

## 2. Questions (step 2 of 3)

- [ ] One question at a time: "Question 1 of 3" (last crop, already **Durum** from the EU crop map 2022), "Question 2 of 3" (things that apply to your farm, all optional), "Question 3 of 3" (what matters most).
- [ ] Tap **Income**, then **Water**: they get the numbers 1 and 2. *Next* waits until two are picked.

## 3. Your plan (step 3 of 3, then the *Advice* tab)

- [ ] Heading "Genzano di Lucania · 6.5 ha", then *Our advice*: **Plant chickpea next**, with Chickpea 2027, Durum 2028 and 2029.
- [ ] "About **158** €/ha/yr more than durum on durum" and "Needs little water".
- [ ] *How sure we are:* **low**, naming what is not yet checked against a local source (the chickpea yield, the chickpea costs, the extra durum after chickpea).
- [ ] Buttons: *Why this plan?*, *Other choices (8)*, *Keep this plan*, *Share it*; *Your priorities: 1 Income, 2 Water*; *Change my answers*.
- [ ] *Other choices*, yearly income: Lentil **603**, Coriander **554**, Vetch-oat **476**, Barley **453**, Rapeseed **595**, Now (durum on durum) **557**, Pea **529**, Faba bean **469** €/ha/yr.
- [ ] *What we see*: bare after harvest **2 months** (1–6), hot flowering **4 days** (0–8), autumn rain **156 mm** (97–200).
- [ ] *Your soil*: **Heavy ground (clay loam)**, **Alkaline soil · pH 7.7 · measured in the trial here: 8.2**, then that it is an estimate and that the order does not use it. *Change* lets you set the soil and a pH from a soil test.
- [ ] *Where to intercrop on your field*: the **Intercropping** switch. Switched on, *Other choices* becomes 10, and the map shows the field split between chickpea and durum: *Strips* (24 m wide), *Two halves* or *From space* (needs a signal).

## 4. Why (from *Why this plan?*)

- [ ] *Why this option*, then *What the data found*: less green than usual over the last 5 seasons; more hot flowering days than usual; crop falling off with heat; across the area, so it is the weather and not just your field.
- [ ] *If the year turns dry*: usual, dry and driest year, and "Chickpea fits best in all three." *The weather in detail* opens the year screen.
- [ ] *Over three harvests*: **715 €/ha/yr** (range 360–1,120). The table: chickpea 980 − 600 + 343 = 723; durum "+16% grain after chickpea" 1,009 − 675 + 402 = 736; durum "+10%" 957 − 675 + 402 = 684; per year **715**. *What the columns mean* opens on a tap.

## 5. Usual, dry and driest years

- [ ] **Usual year:** Oct–May rain **542 mm** now and **520** by 2050; hot flowering days **4** now and **5.4** by 2050.
- [ ] **Dry year:** **418** and **393 mm**, **8** and **10** days. **Driest year:** **390** and **367 mm**. Each card ends with its best fit (chickpea).
- [ ] *2024 and 2026 compared with a usual season*: 2024 **413 mm ↓, 27.3% ↓, 0.60, 258 mm ↓**; 2026 **651 mm ↑, 32.8% ↑, 0.72, 326 mm**; then "Much less green than nearby fields in 2018 and 2023…".

## 6. Share your plan (from *Share it*)

- [ ] "Show it to someone who knows your land before you sow", the plan, five kinds of people to ask (cooperative or seed dealer, CAA office, regional advisory service, a neighbour, an agronomist), then *Print page*, *WhatsApp* and *Copy link*.
- [ ] *Print page*: the plan, then *What the data shows* with bars for 2024 and 2026 against a usual season (rain **542, 413, 651 mm**; soil water **30.1, 27.3, 32.8%**; greenness **0.71, 0.60, 0.72**; water used **319, 258, 326 mm**), hot flowering days **4** today and **5.4** and **6** by 2041–2060, the rain check (station **674** and **315 mm**, satellites **498** and **308 mm**), and *How the seasons went* (four line graphs). It ends with the sources and the credits. Nothing scrolls sideways on a phone.

## 7. The tabs

- [ ] **My field**: "Your field in November" (the current month), the plan, "This plan is now kept on this phone." *To do before sowing* has two checks: tick one, reload, and the tick is still there. *What to watch* shows the month's usual cover and risks; the rain so far and the forecast load below. Links to *Your field from space* and *Usual, dry and driest years*; *Forget this plan* at the end.
- [ ] *Your field from space*: dated pictures of the field with its yellow outline, play, pause and a slider; cloudy pictures are skipped.
- [ ] **Advice**: back to your plan.
- [ ] **My plans**: every plan kept, newest first, with *Open* and *Remove*.

## 8. The More menu

- [ ] **Prices and support**: crop prices (9 crops), costs, yields, more durum after a legume (3 figures), support payments (5 on), your own payments.
- [ ] Change the durum price and tap **Save changes**: you are back on the plan, the figures change and show **Yours**. Copy the link and open it in a new tab: the change is still there.
- [ ] Change a price again and tap *Back* instead (the top bar's or the phone's): you are back on the plan with the change kept. Tap Back once more: you go on to the questions, not to the plan with the old price.
- [ ] **Bigger text** makes everything larger; tap again to undo.
- [ ] **Data and credits**: the credit lines (NASA, Copernicus, CHIRPS, FAO, soil, crop map, land cover, basin, forecast, Sentinel-2, the Copernicus DEM heights, the trial) and the AI note, which also says the crop pictures were made with AI.

## 9. Your own field

- [ ] Draw a field **inside** the white line: figures say **Area** (the 1 km around your field) and differ from the demo's.
- [ ] Draw one **outside**: *Area weather* shows hot days, autumn rain and late frost from NASA POWER, with "We left out NASA POWER rain for October 2025…".

## 10. Italian

- [ ] Tap **it**: every screen in Italian, including each figure's source bubble (apart from dataset names).
- [ ] The crop pictures each carry a small "AI" mark.

## Reporting a problem

Send a screenshot, the section number above, and the page's link (copy it from the address bar: it holds every choice made).

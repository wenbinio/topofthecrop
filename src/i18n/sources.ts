// Italian for the source labels the data carries in English: each figure's dataset and resolution, shown in its
// source bubble, on the printout and under the charts. The data files keep English; only what an Italian screen
// shows changes. Exact matches first, then a few patterns for distances ("about 11 km"). A label not listed here
// (a dataset's own name, or one added later) is shown as written. Written with AI assistance (Claude, Anthropic).
import type { Lang } from "../data/types";

const IT: Record<string, string> = {
  // Datasets and studies
  "Denora et al. 2025, durum trial at Genzano di Lucania": "Denora et al. 2025, prova su grano duro a Genzano di Lucania",
  "National durum price list and Foggia exchange": "Listino nazionale del grano duro e Borsa merci di Foggia",
  "ISMEA cost survey 2025: durum in Puglia, Sicily and Basilicata": "Indagine ISMEA sui costi 2025: grano duro in Puglia, Sicilia e Basilicata",
  "Our crop research notes, 14 Nov 2026": "I nostri appunti di ricerca sulle colture, 14 nov 2026",
  "Foggia and Bari exchange price lists, 2025-26": "Listini delle Borse merci di Foggia e Bari, 2025-26",
  "Worked out from Lago-Olveira et al. 2023 (Puglia) and ISMEA 2025": "Calcolato da Lago-Olveira et al. 2023 (Puglia) e ISMEA 2025",
  "Lago-Olveira et al. 2023, Sci. Total Environ. 896, 165124: wheat after chickpea, Puglia":
    "Lago-Olveira et al. 2023, Sci. Total Environ. 896, 165124: grano dopo cece, Puglia",
  "Garofalo et al. 2009, Crop Pasture Sci. 60, 240-250: wheat after faba bean, 53-year simulation":
    "Garofalo et al. 2009, Crop Pasture Sci. 60, 240-250: grano dopo favino, simulazione su 53 anni",
  "Hay quotes from northern exchanges (no southern quote found)": "Quotazioni del fieno delle Borse merci del Nord (nessuna quotazione al Sud)",
  "Bari exchange price list, Italian green lentils": "Listino della Borsa merci di Bari, lenticchie verdi italiane",
  "Bologna exchange price list, field pea": "Listino della Borsa merci di Bologna, pisello proteico",
  "AGEA payment circulars, CAP 2023-2027": "Circolari AGEA sui pagamenti, PAC 2023-2027",
  "MASAF decrees and AGEA instructions": "Decreti MASAF e istruzioni AGEA",
  "CSR Basilicata 2023-2027 (regional rural development plan)": "CSR Basilicata 2023-2027 (piano regionale di sviluppo rurale)",
  "EU crop map 2022 (JRC)": "Mappa delle colture UE 2022 (JRC)",
  "ERA5-Land (NASA POWER check)": "ERA5-Land (controllo con NASA POWER)",
  "Worked out from the crop figures and payments": "Calcolato dalle cifre delle colture e dagli aiuti",
  "Giambalvo et al. 2004 (Sicily) and Preissel et al. 2015 (Europe)": "Giambalvo et al. 2004 (Sicilia) e Preissel et al. 2015 (Europa)",
  "Our own rule, no source yet": "Regola nostra, ancora senza fonte",
  "FAO-56 crop water need from ERA5-Land": "Fabbisogno idrico FAO-56 da ERA5-Land",
  "NASA SMAP L4 soil moisture": "NASA SMAP L4, umidità del suolo",
  "Tedone et al. 2023: faba bean before durum, southern Italy": "Tedone et al. 2023: favino prima del grano duro, Sud Italia",
  "GRDC 2018: soil nitrogen after legumes in 16 dryland trials": "GRDC 2018: azoto nel suolo dopo leguminose in 16 prove in asciutto",
  "GRDC 2018: no extra nitrogen after wheat, barley or canola": "GRDC 2018: nessun azoto in più dopo grano, orzo o colza",
  "Preissel et al. 2015: legumes before cereals in Europe": "Preissel et al. 2015: leguminose prima dei cereali in Europa",
  "CHIRPS + ERA5-Land (daily rain)": "CHIRPS + ERA5-Land (pioggia giornaliera)",
  "FAO-56 reference evapotranspiration from ERA5-Land": "Evapotraspirazione di riferimento FAO-56 da ERA5-Land",
  "SoilGrids 2.0 water retention (ISRIC)": "SoilGrids 2.0, acqua trattenuta dal suolo (ISRIC)",
  "Trial weather station (Denora et al. 2025)": "Stazione meteo della prova (Denora et al. 2025)",
  "Trial soil analysis (Denora et al. 2025)": "Analisi del terreno della prova (Denora et al. 2025)",
  "MET Norway forecast": "Previsioni MET Norway",
  "Your own figures": "Le tue cifre",
  // Resolutions: how far a figure reaches
  "one trial, two seasons": "una prova, due annate",
  "one trial, one review": "una prova, una rassegna",
  "one long-term trial": "una prova di lungo periodo",
  "review of 29 trials": "rassegna di 29 prove",
  "one study": "uno studio",
  "regional market": "mercato regionale",
  "northern market": "mercato del Nord",
  "southern Italy": "Sud Italia",
  "eastern Australia": "Australia orientale",
  "other regions": "altre regioni",
  "national": "nazionale",
  "regional": "regionale",
  "this rotation": "questa rotazione",
  "this farm": "questa azienda",
  "at the field": "al campo",
  "weather model": "modello meteo",
};

/** A source label (dataset or resolution) as an Italian or English screen should show it. */
export function sourceText(text: string, lang: Lang): string {
  if (lang !== "it" || !text) return text;
  const exact = IT[text];
  if (exact) return exact;
  return text
    .replace(/^about (\d+(?:[.,]\d+)?) km$/, "circa $1 km")
    .replace(/^(\d+) to (\d+) km$/, "da $1 a $2 km")
    .replace(/, 1 km mean$/, ", media su 1 km");
}

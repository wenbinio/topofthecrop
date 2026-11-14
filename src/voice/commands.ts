// Spoken words to app commands. Pure: no speech, no React. Whole words only, and nothing it does not know.
import type { CropId, Lang, Limit, Priority, Scenario, View } from "../data/types";

export type Step = "field" | "questions" | "options" | "why" | "year" | "adviser" | "settings" | "print";

export type VoiceCommand =
  | { kind: "next" }
  | { kind: "back" }
  | { kind: "go"; step: Step }
  | { kind: "lastCrop"; crop: CropId }
  | { kind: "limit"; limit: Limit; on: boolean }
  | { kind: "priority"; priority: Priority; on: boolean }
  | { kind: "scenario"; scenario: Scenario }
  | { kind: "view"; view: View }
  | { kind: "lang"; lang: Lang }
  | { kind: "read" }
  | { kind: "stop" };

export type CommandContext = { route: string; crops: readonly CropId[] };

type Toggle = { kind: "limit"; limit: Limit } | { kind: "priority"; priority: Priority };
type Plain = Exclude<VoiceCommand, { kind: "limit" } | { kind: "priority" }>;

/**
 * neg: switches off the toggles that follow, until the next other command or `pos`.
 * negOne: switches off the next toggle only ("niente foraggio", "without forage").
 * pos: back to switching on. off: switches off the toggle just said ("water off").
 */
type Marker = "neg" | "negOne" | "pos" | "off";

type Rule =
  | { lang: Lang | "any"; re: string; cmd: Plain; whole?: boolean }
  | { lang: Lang | "any"; re: string; toggle: Toggle; onlyOff?: boolean }
  | { lang: Lang | "any"; re: string; marker: Marker };

// Patterns run on normalised text: lower case, no accents, no punctuation, single spaces.
const RULES: Rule[] = [
  // navigation
  { lang: "en", re: "next|go on|carry on|continue|forward|go ahead|ok next", cmd: { kind: "next" } },
  { lang: "it", re: "avanti|vai avanti|andiamo avanti|continua|prosegui|vai oltre", cmd: { kind: "next" } },
  { lang: "en", re: "back|go back|previous|step back", cmd: { kind: "back" } },
  { lang: "it", re: "indietro|torna indietro|vai indietro|torna", cmd: { kind: "back" } },
  // "field", "campo" and "year" turn up in passing ("no irrigation on my field"), so alone they must be all that is said.
  { lang: "en", re: "(go to|open|show|back to) (the |my )?(field|map)|map", cmd: { kind: "go", step: "field" } },
  { lang: "en", re: "(the |my )?field", cmd: { kind: "go", step: "field" }, whole: true },
  { lang: "it", re: "(vai al|apri il|mostra il|torna al) campo|(vai alla|apri la|mostra la) (mappa|cartina)|mappa|cartina", cmd: { kind: "go", step: "field" } },
  { lang: "it", re: "(il )?campo", cmd: { kind: "go", step: "field" }, whole: true },
  { lang: "en", re: "(go to |open )?(the )?questions?", cmd: { kind: "go", step: "questions" } },
  { lang: "it", re: "(vai alle |apri le )?domande|domanda", cmd: { kind: "go", step: "questions" } },
  { lang: "en", re: "(go to |open |show )?(the |my )?(options?|choices)", cmd: { kind: "go", step: "options" } },
  { lang: "it", re: "(vai alle |apri le |mostra le )?(scelte|opzioni)|scelta", cmd: { kind: "go", step: "options" } },
  { lang: "en", re: "why|why this|reasons?", cmd: { kind: "go", step: "why" } },
  { lang: "it", re: "perche( questa)?|motivi?", cmd: { kind: "go", step: "why" } },
  { lang: "en", re: "(go to|open|show) (the )?(field )?year|field year", cmd: { kind: "go", step: "year" } },
  { lang: "en", re: "(the )?year", cmd: { kind: "go", step: "year" }, whole: true },
  { lang: "it", re: "(vai all |apri l |mostra l )?annata( del campo)?", cmd: { kind: "go", step: "year" } },
  { lang: "en", re: "(go to |open |show )?(the |my )?(adviser|advisor|agronomist)", cmd: { kind: "go", step: "adviser" } },
  { lang: "it", re: "(vai al |apri il |per il )?(tecnico|agronomo|consulente)", cmd: { kind: "go", step: "adviser" } },
  { lang: "en", re: "settings|prices|prices and support", cmd: { kind: "go", step: "settings" } },
  { lang: "it", re: "impostazioni|prezzi|prezzi e sostegni", cmd: { kind: "go", step: "settings" } },
  { lang: "en", re: "print|print it|printout", cmd: { kind: "go", step: "print" } },
  { lang: "it", re: "stampa|stampare|stampala", cmd: { kind: "go", step: "print" } },

  // last crop (only the crops the bundle offers count; see parseCommand)
  { lang: "any", re: "durum( wheat)?|hard wheat|wheat|grano( duro)?|gran duro|grano duto|frumento( duro)?|ringrano", cmd: { kind: "lastCrop", crop: "durum" } },
  { lang: "any", re: "chick ?peas?|chickpeace|ceci|cece|cieci|ciceri|cicero", cmd: { kind: "lastCrop", crop: "chickpea" } },
  { lang: "any", re: "faba( beans?)?|fava( beans?)?|broad beans?|favin[oi]|fave|favette?", cmd: { kind: "lastCrop", crop: "faba" } },
  { lang: "any", re: "vetch( and)? oats?|vetch|veccia( e)? avena|veccia|vecce|erbaio", cmd: { kind: "lastCrop", crop: "vetch-oat" } },
  { lang: "any", re: "lentils?|lenticchi[ae]", cmd: { kind: "lastCrop", crop: "lentil" } },
  { lang: "any", re: "peas?|field peas?|pisell[oi]", cmd: { kind: "lastCrop", crop: "pea" } },
  { lang: "any", re: "barley|orzo", cmd: { kind: "lastCrop", crop: "barley" } },
  { lang: "any", re: "rape ?seed|oilseed rape|canola|colza", cmd: { kind: "lastCrop", crop: "rapeseed" } },
  { lang: "any", re: "coriander|cilantro|coriandol[oi]", cmd: { kind: "lastCrop", crop: "coriander" } },

  // limits
  {
    lang: "en",
    re: "no irrigation|without irrigation|(i )?(can t|cannot|can not|don t|do not) irrigate|no watering|dry land|dryland",
    toggle: { kind: "limit", limit: "no-irrigation" },
  },
  {
    lang: "it",
    re: "(niente|senza|nessuna|no) irrigazione|non (si )?(irrigo|irrighiamo|irriga|posso irrigare)|in asciutto",
    toggle: { kind: "limit", limit: "no-irrigation" },
  },
  { lang: "en", re: "irrigation", toggle: { kind: "limit", limit: "no-irrigation" }, onlyOff: true },
  { lang: "it", re: "irrigazione", toggle: { kind: "limit", limit: "no-irrigation" }, onlyOff: true },
  {
    lang: "en",
    re: "(only )?cereal (machinery|machines|kit|equipment)( only)?",
    toggle: { kind: "limit", limit: "cereal-machinery" },
  },
  {
    lang: "it",
    re: "(solo )?(macchine|macchinari|attrezzi|mezzi) (da |per i |per |dei )?cereali",
    toggle: { kind: "limit", limit: "cereal-machinery" },
  },
  {
    lang: "en",
    re: "no buyers?( nearby| near| close by| around)?|(nobody|no one|no one s) (buys|buying)|nowhere to sell",
    toggle: { kind: "limit", limit: "no-buyer" },
  },
  {
    lang: "it",
    re: "(nessun|senza|niente|no) (acquirente|compratore)( vicino)?|nessuno (compra|lo compra|ritira)|non (c e|ce) (nessun |un )?(acquirente|compratore)|non so a chi (venderlo|vendere)",
    toggle: { kind: "limit", limit: "no-buyer" },
  },
  { lang: "en", re: "buyers?", toggle: { kind: "limit", limit: "no-buyer" }, onlyOff: true },
  { lang: "it", re: "acquirente|compratore", toggle: { kind: "limit", limit: "no-buyer" }, onlyOff: true },
  { lang: "en", re: "broom ?rape", toggle: { kind: "limit", limit: "broomrape" } },
  { lang: "it", re: "orobanche|orobanca|succiamele", toggle: { kind: "limit", limit: "broomrape" } },

  // priorities
  { lang: "en", re: "income|money|profit|profits|earnings|earn more", toggle: { kind: "priority", priority: "income" } },
  { lang: "it", re: "reddito|redditi|guadagn[oi]|guadagnare|soldi|rendita", toggle: { kind: "priority", priority: "income" } },
  { lang: "en", re: "water|less water|saving water", toggle: { kind: "priority", priority: "water" } },
  { lang: "it", re: "acqua|acque|meno acqua", toggle: { kind: "priority", priority: "water" } },
  { lang: "en", re: "soil( and nitrogen)?|nitrogen|fertility", toggle: { kind: "priority", priority: "soil" } },
  { lang: "it", re: "suolo( e azoto)?|terreno( e azoto)?|azoto|fertilita", toggle: { kind: "priority", priority: "soil" } },
  { lang: "en", re: "forage|fodder|hay", toggle: { kind: "priority", priority: "forage" } },
  { lang: "it", re: "foragg(io|i)|fieno", toggle: { kind: "priority", priority: "forage" } },

  // scenario
  { lang: "en", re: "(a )?normal( year)?", cmd: { kind: "scenario", scenario: "normal" } },
  { lang: "it", re: "(annata |anno )?normale", cmd: { kind: "scenario", scenario: "normal" } },
  { lang: "en", re: "(a )?(drier|dryer|more dry)( year)?|(a )?dry year", cmd: { kind: "scenario", scenario: "drier" } },
  { lang: "it", re: "(annata |anno )?piu (secc[ao]|asciutt[ao])", cmd: { kind: "scenario", scenario: "drier" } },
  {
    lang: "en",
    re: "(a )?(much|very|far) (drier|dryer)( year)?|(a )?very dry( year)?|drought",
    cmd: { kind: "scenario", scenario: "much-drier" },
  },
  {
    lang: "it",
    re: "(annata |anno )?molto (piu )?(secc[ao]|asciutt[ao])|siccita",
    cmd: { kind: "scenario", scenario: "much-drier" },
  },

  // view and language
  { lang: "en", re: "simple( view)?|big (text|letters|writing)|bigger (text|letters)", cmd: { kind: "view", view: "simple" } },
  { lang: "it", re: "(vista )?semplice|scritt[ae] grand[ei]|testo grande|lettere grandi", cmd: { kind: "view", view: "simple" } },
  { lang: "en", re: "standard( view)?|normal view|full view", cmd: { kind: "view", view: "standard" } },
  { lang: "it", re: "(vista )?standard|vista normale|vista completa", cmd: { kind: "view", view: "standard" } },
  { lang: "any", re: "(in )?(italiano|italian)", cmd: { kind: "lang", lang: "it" } },
  { lang: "any", re: "(in )?(english|inglese)", cmd: { kind: "lang", lang: "en" } },

  // reading aloud
  {
    lang: "en",
    re: "read( it| this| that)?( out| aloud| to me)?|read out|tell me|what should i (plant|sow|grow)( next)?|what do i (plant|sow|grow)( next)?|what to (plant|sow)",
    cmd: { kind: "read" },
  },
  {
    lang: "it",
    re: "leggi( tu)?( ad alta voce)?|leggimi|leggilo|dimmi|(cosa|che) (devo|dovrei|posso) seminare|(cosa|che) semino|che si semina",
    cmd: { kind: "read" },
  },
  { lang: "any", re: "stop", cmd: { kind: "stop" } },
  { lang: "en", re: "be quiet|quiet|shut up|silence|enough|stop reading|stop talking", cmd: { kind: "stop" } },
  { lang: "it", re: "basta|zitto|stai zitto|silenzio|fermati|smetti", cmd: { kind: "stop" } },

  // markers
  {
    lang: "en",
    re: "remove|take off|take away|take out|untick|uncheck|unselect|deselect|turn off|switch off|drop|cancel|delete|forget|clear",
    marker: "neg",
  },
  {
    lang: "it",
    re: "togli|toglimi|togliere|toglila|toglilo|leva|levami|levare|rimuovi|elimina|cancella|deseleziona|spegni|non voglio|non mi interessa",
    marker: "neg",
  },
  { lang: "en", re: "without|no more|not", marker: "negOne" },
  { lang: "it", re: "niente|senza|non", marker: "negOne" },
  { lang: "en", re: "add|put|choose|pick|select|tick|turn on|switch on|i want|and also", marker: "pos" },
  { lang: "it", re: "metti|mettimi|aggiungi|scegli|seleziona|voglio|anche", marker: "pos" },
  { lang: "en", re: "off", marker: "off" },
  { lang: "it", re: "spento|spenta|via", marker: "off" },
];

type Compiled = { rule: Rule; re: RegExp };

const COMPILED: Compiled[] = RULES.map((rule) => ({ rule, re: new RegExp(`\\b(?:${rule.re})\\b`, "g") }));

/** Lower case, accents gone, apostrophes and punctuation turned to spaces, single spaces. */
export function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Hit = { start: number; end: number; rule: Rule };

/**
 * The commands in a transcript, in the order said: "reddito e acqua, avanti" gives Income on, Water on, Next.
 * Empty when nothing is understood. Words of the app's language count, plus the names of the two languages,
 * "stop" and the crop names (often said in either language).
 */
export function parseCommand(transcript: string, lang: Lang, context: CommandContext): VoiceCommand[] {
  const text = normalise(transcript);
  if (!text) return [];
  const hits: Hit[] = [];
  for (const { rule, re } of COMPILED) {
    if (rule.lang !== "any" && rule.lang !== lang) continue;
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if ("cmd" in rule && rule.whole && (m.index !== 0 || m[0].length !== text.length)) continue;
      hits.push({ start: m.index, end: m.index + m[0].length, rule });
    }
  }
  // Longest first: "molto più secco" beats "più secco", "chick pea" beats "pea", "grano duro" beats "grano".
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept: Hit[] = [];
  for (const hit of hits) {
    if (kept.every((k) => hit.end <= k.start || hit.start >= k.end)) kept.push(hit);
  }
  kept.sort((a, b) => a.start - b.start);

  type Out = { cmd: VoiceCommand; onlyOff: boolean };
  const out: Out[] = [];
  let mode: "on" | "off" = "on";
  let once = false;
  for (const { rule } of kept) {
    if ("marker" in rule) {
      if (rule.marker === "neg") mode = "off";
      else if (rule.marker === "pos") mode = "on";
      else if (rule.marker === "negOne") once = true;
      else {
        const last = out[out.length - 1];
        if (last && (last.cmd.kind === "limit" || last.cmd.kind === "priority")) last.cmd.on = false;
      }
      continue;
    }
    if ("toggle" in rule) {
      const on = mode === "on" && !once;
      once = false;
      const cmd: VoiceCommand =
        rule.toggle.kind === "limit"
          ? { kind: "limit", limit: rule.toggle.limit, on }
          : { kind: "priority", priority: rule.toggle.priority, on };
      out.push({ cmd, onlyOff: rule.onlyOff ?? false });
      continue;
    }
    mode = "on";
    once = false;
    if (rule.cmd.kind === "lastCrop" && !context.crops.includes(rule.cmd.crop)) continue;
    out.push({ cmd: { ...rule.cmd }, onlyOff: false });
  }
  // "irrigation" alone means nothing unless it is being taken off.
  return out.filter((o) => !(o.onlyOff && (o.cmd as { on: boolean }).on)).map((o) => o.cmd);
}

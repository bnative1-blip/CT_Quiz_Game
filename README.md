# Cooling Tower Chemistry Challenge

A gamified training game on **refinery cooling water treatment**. Each of 25 modules
presents a three-to-four paragraph briefing, then tests it with a five-question quiz
under a draining "free residual" clock.

**125 questions. 25 topics. No build step, no dependencies.**

## Run it

Open `index.html` in a browser. That's it — everything is static.

```
python3 -m http.server 8000   # optional, if you prefer serving it
```

## What's in it

| | |
|---|---|
| Modules | 25, tagged `CW-101` … `CW-125` |
| Questions | 125 (5 per module, 4 options each) |
| Categories | Fundamentals, Scale Control, Corrosion Control, Deposit Control, Microbiological Control, Monitoring, Refinery Operations |
| Difficulty | Intro / Working / Advanced |

Topics span the water balance and cycles of concentration; calcium carbonate scale and
the saturation indices (LSI, RSI, PSI, Stiff-Davis); phosphonate and polymer treatment;
alkaline phosphate, all-organic and phosphorus-free programs; mild steel and yellow metal
corrosion; corrosion monitoring; chlorine, bromine, chlorine dioxide and non-oxidizing
biocides; biofilm and MIC; Legionella control; hydrocarbon and ammonia process leaks;
suspended solids and sidestream filtration; silica and magnesium silicate; makeup
pretreatment; heat exchanger fouling; tower structure and fill; and layup, startup
and discharge compliance.

## Game mechanics

- **Residual clock** — 20 s per question, drawn as a draining free-halogen residual bar. Answer faster, score more (up to +60 bonus on a 100-point base).
- **Streak multiplier** — consecutive correct answers build a multiplier up to ×2.0.
- **Ranks** — XP carries you from Trainee through Water Tech, Field Chemist, Treatment Specialist and Systems Engineer to Principal.
- **Commendations** — eight badges: Zero Blowdown (a perfect module), Breakpoint (a 10-answer streak), Free Residual (a module with no timeouts), Full Turnaround (all 25), and the three category sweeps.
- **Shuffled options** — answer positions are re-randomized on every play, so nothing can be memorized by position and modules are worth replaying.
- Progress, XP and badges persist in `localStorage`. Nothing leaves the browser.

## Layout

```
index.html                     app shell
css/styles.css                 theme tokens + all styling (light and dark)
js/topics.js                   the 25-topic question database
js/app.js                      game engine
tools/build-artifact.js        inlines everything into one file
dist/cooling-tower-quiz.html   single-file build
```

### Adding or editing a topic

`js/topics.js` is a plain array. Each record:

```js
{
  id: 26,
  title: "…",
  category: "Scale Control",
  difficulty: 2,                 // 1 Intro · 2 Working · 3 Advanced
  blurb: "One line for the index card.",
  paragraphs: ["…", "…", "…"],   // 3–4 paragraphs
  keyTerms: ["…"],               // sidebar nomenclature
  questions: [
    { q: "…", options: ["…","…","…","…"], answer: 0, why: "Shown after answering." }
  ]
}
```

`answer` is the zero-based index into `options` **as written** — the app shuffles them at
runtime and remaps the index, so you never need to vary the correct answer's position.
Five questions per module keeps the scoring and copy consistent.

## Sources

Briefings were compiled from publicly available industry literature: the Nalco Water
Handbook, the Betz Handbook of Industrial Water Conditioning, Cooling Technology Institute
and ASHRAE guidance (including ANSI/ASHRAE Standard 188 and Guideline 12), NACE/AMPP
corrosion practice, and CDC Legionella control guidance.

Training material only. It does not replace site procedures, discharge permits, or your
water treatment supplier's program recommendations.

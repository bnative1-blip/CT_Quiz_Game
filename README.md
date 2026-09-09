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
- Progress, XP and badges persist in `localStorage`, so you can play without any account at all.

## Profiles and the leaderboard

These two features need the artifact runtime's `db` capability, so they light up only in
the **published** version. Opened as a local file the page detects their absence, hides
the sign-in chip and the leaderboard, and plays exactly as before.

- **Profile** — a handle plus a passphrase. Signing in on a second browser merges progress
  rather than overwriting it: for each module the higher-scoring run wins, and badges union.
- **Leaderboard** — top 10 by total score, live via `onSnapshot`. Score is the sum of your
  **best** run of each module, so it is deterministic and replays can only help. A player
  needs **5 completed modules** to qualify; below that the board shows how many are left.
  If you qualify but sit outside the top ten, your own standing is appended below the cut.

### Security, stated plainly

There is no `user` capability on this runtime contract, so the page cannot learn who the
viewer is and has to manage identity itself. That has real limits, and the UI says so:

- Passphrases are **never stored**. Each profile keeps a random 16-byte salt and a
  PBKDF2-SHA256 hash at 150,000 iterations.
- The store is readable by anyone who can open the page, so those salts and hashes are
  visible to other players. PBKDF2 makes guessing expensive, not impossible. **Treat the
  passphrase as throwaway and never reuse a real one.**
- The board is **editors-only**. Access rules declared with the capability give the
  leaderboard collection `write: "admin"`, so a viewer shared in at view/use level can
  read the board and keep a profile but cannot post a score. Profiles stay writable by
  any viewer so cross-device progress still works for everyone.
- Among editors, writes are still last-writer-wins with no per-player enforcement.

Data layout:

```
players/<pid>       handle, salt, hash, iter, results, badges, xp, bestStreak
leaderboard/<pid>   handle, score, modules, accuracy      (eligible players only)
```

Access rules declared at publish:

```js
capabilities: { db: { rules: [
  { path: "",            read: "view", write: "interact" },  // profiles: any viewer
  { path: "leaderboard", read: "view", write: "admin"    }   // board: editors post
] } }
```

This contract has no `user` capability, so the page cannot read the viewer's sharing
level and cannot pre-emptively hide the post. Instead it attempts the write and treats an
`invalid_argument` rejection as information: it marks the viewer a non-editor, explains
the policy, and still shows their own standing below the cut. Nothing is reported as an
error, because for a viewer this is the expected outcome, not a failure.

Keeping the board in its own collection means the top-10 read needs no filter beside its
`orderBy`, and never touches the records holding auth material. Profile writes use
`update()`, never `set()`, so a progress sync cannot clobber the salt and hash.

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

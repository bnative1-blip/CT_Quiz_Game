/* ============================================================
   Cooling Tower Chemistry Challenge — game engine
   ============================================================ */
(function () {
  "use strict";

  var READ_MS       = 5000;    // question alone, no answers, no clock
  var PREVIEW_MS    = 3000;    // answers shown, clock still held
  var QUESTION_TIME = 20000;   // ms of "free residual" per question
  var BASE_POINTS   = 100;
  var TIME_BONUS    = 60;
  var STORE_KEY     = "ctq.v1";

  var RANKS = [
    { xp: 0,    name: "Trainee" },
    { xp: 200,  name: "Water Tech" },
    { xp: 600,  name: "Field Chemist" },
    { xp: 1200, name: "Treatment Spec." },
    { xp: 2000, name: "Systems Engineer" },
    { xp: 3000, name: "Principal" }
  ];

  var BADGES = [
    { id: "first",   icon: "▶", name: "First Pass",     desc: "Complete any module",
      test: function (s) { return Object.keys(s.results).length >= 1; } },
    { id: "perfect", icon: "✦", name: "Zero Blowdown",  desc: "Score 5 of 5 on a module",
      test: function (s) { return anyResult(s, function (r) { return r.correct === 5; }); } },
    { id: "streak",  icon: "⚡", name: "Breakpoint",     desc: "Answer 10 in a row correctly",
      test: function (s) { return s.bestStreak >= 10; } },
    { id: "notime",  icon: "⏱", name: "Free Residual",  desc: "Clear a module without the clock expiring",
      test: function (s) { return anyResult(s, function (r) { return r.noTimeouts; }); } },
    { id: "cat_ref", icon: "⚙", name: "Root Cause",     desc: "Finish all Refinery Operations modules",
      test: function (s) { return catDone(s, "Refinery Operations"); } },
    { id: "cat_sca", icon: "◆", name: "Scale Watch",    desc: "Finish all Scale Control modules",
      test: function (s) { return catDone(s, "Scale Control"); } },
    { id: "cat_bio", icon: "☸", name: "Sessile Hunter", desc: "Finish all Microbiological Control modules",
      test: function (s) { return catDone(s, "Microbiological Control"); } },
    { id: "all",     icon: "★", name: "Full Turnaround", desc: "Complete all 25 modules",
      test: function (s) { return Object.keys(s.results).length >= TOPICS.length; } }
  ];

  /* ---------------- state ---------------- */

  var state = load();
  var run = null;           // active quiz run
  var heroFx = null, rigFx = null, scFx = null;
  var phaseTimer = null, phaseTick = null, sceneTimers = [];
  var timer = null;

  function blank() {
    return { xp: 0, bestStreak: 0, results: {}, badges: [], theme: null, profile: null };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      var b = blank();
      for (var k in b) if (!(k in s)) s[k] = b[k];
      return s;
    } catch (e) { return blank(); }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function anyResult(s, fn) {
    for (var k in s.results) if (fn(s.results[k])) return true;
    return false;
  }

  function catDone(s, cat) {
    return TOPICS.filter(function (t) { return t.category === cat; })
                 .every(function (t) { return s.results[t.id]; });
  }

  function rankFor(xp) {
    var r = RANKS[0], i;
    for (i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = RANKS[i];
    return r;
  }

  function rankProgress(xp) {
    var i, cur = 0, next = null;
    for (i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].xp) { cur = RANKS[i].xp; next = RANKS[i + 1] || null; }
    }
    if (!next) return 1;
    return (xp - cur) / (next.xp - cur);
  }

  function tagOf(t) { return "CW-" + (100 + t.id); }

  /* ---------------- dom ---------------- */

  var $ = function (id) { return document.getElementById(id); };
  var views = {
    console:  $("view-console"),
    brief:    $("view-brief"),
    ready:    $("view-ready"),
    quiz:     $("view-quiz"),
    collapse: $("view-collapse"),
    debrief:  $("view-debrief")
  };

  function show(name) {
    for (var k in views) views[k].hidden = (k !== name);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- theme ---------------- */

  function applyTheme() {
    if (state.theme) document.documentElement.setAttribute("data-theme", state.theme);
    else document.documentElement.removeAttribute("data-theme");
  }

  $("themeBtn").addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.hasAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    state.theme = dark ? "light" : "dark";
    applyTheme(); save();
  });

  /* ---------------- rail ---------------- */

  function renderRail() {
    var done = Object.keys(state.results).length;
    $("gRank").textContent = rankFor(state.xp).name;
    $("gXp").textContent = state.xp.toLocaleString();
    $("gStreak").textContent = run ? run.streak : state.bestStreak;
    $("gDone").textContent = done + "/" + TOPICS.length;
    $("levelFill").style.width = (rankProgress(state.xp) * 100).toFixed(1) + "%";
  }

  /* ---------------- topic index ---------------- */

  var activeFilter = "All";

  function renderFilters() {
    var cats = ["All"];
    TOPICS.forEach(function (t) { if (cats.indexOf(t.category) < 0) cats.push(t.category); });
    var host = $("filters");
    host.textContent = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip";
      b.textContent = c === "All" ? "All 25" : c;
      b.setAttribute("aria-pressed", String(c === activeFilter));
      b.addEventListener("click", function () { activeFilter = c; renderFilters(); renderIndex(); });
      host.appendChild(b);
    });
  }

  function renderIndex() {
    var grid = $("indexGrid");
    grid.textContent = "";
    var list = TOPICS.filter(function (t) {
      return activeFilter === "All" || t.category === activeFilter;
    });

    list.forEach(function (t, i) {
      var res = state.results[t.id];
      var card = document.createElement("button");
      card.className = "unit" + (res ? " done" : "") + (res && res.correct === 5 ? " perfect" : "");
      card.style.animationDelay = Math.min(i * 22, 400) + "ms";
      card.addEventListener("click", function () { openBrief(t.id); });

      var top = el("div", "unit-top");
      top.appendChild(el("span", "unit-id mono", tagOf(t)));
      top.appendChild(el("span", "unit-cat", t.category));
      card.appendChild(top);

      card.appendChild(el("h3", "", t.title));
      card.appendChild(el("p", "", t.blurb));

      var foot = el("div", "unit-foot");
      var dots = el("div", "dots");
      for (var d = 0; d < 3; d++) {
        dots.appendChild(el("span", "dot" + (d < t.difficulty ? " on" : "")));
      }
      foot.appendChild(dots);
      foot.appendChild(el("span", "tag", ["Intro", "Working", "Advanced"][t.difficulty - 1]));

      if (res) {
        var pill = el("span", "score-pill " + (res.correct === 5 ? "best" : "good"),
          res.correct + "/5");
        foot.appendChild(pill);
      } else {
        foot.appendChild(el("span", "score-pill", "New"));
      }
      card.appendChild(foot);
      grid.appendChild(card);
    });

    var done = Object.keys(state.results).length;
    $("progressTag").textContent = done + " of " + TOPICS.length + " complete";

    var nextT = firstUndone();
    $("startLabel").textContent = nextT
      ? (done ? "Continue: " + nextT.title : "Start first module")
      : "Replay a module";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function firstUndone() {
    for (var i = 0; i < TOPICS.length; i++) if (!state.results[TOPICS[i].id]) return TOPICS[i];
    return null;
  }

  function byId(id) {
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].id === id) return TOPICS[i];
    return null;
  }

  /* ---------------- badges ---------------- */

  function renderBadges() {
    var host = $("badgeGrid");
    host.textContent = "";
    BADGES.forEach(function (b) {
      var earned = state.badges.indexOf(b.id) >= 0;
      var n = el("div", "badge" + (earned ? " earned" : ""));
      n.appendChild(el("span", "badge-icon", b.icon));
      var body = el("div");
      body.appendChild(el("div", "badge-name", b.name));
      body.appendChild(el("div", "badge-desc", earned ? "Earned" : b.desc));
      n.appendChild(body);
      host.appendChild(n);
    });
    $("badgeTag").textContent = state.badges.length + " of " + BADGES.length + " earned";
  }

  function checkBadges() {
    BADGES.forEach(function (b) {
      if (state.badges.indexOf(b.id) < 0 && b.test(state)) {
        state.badges.push(b.id);
        toast(b.icon + "  " + b.name, b.desc);
      }
    });
  }

  /* ---------------- toasts ---------------- */

  function toast(title, detail) {
    var host = $("toasts");
    var n = el("div", "toast");
    n.appendChild(el("span", "toast-t", title));
    if (detail) n.appendChild(el("span", "toast-d", detail));
    host.appendChild(n);
    setTimeout(function () {
      n.style.transition = "opacity .4s, transform .4s";
      n.style.opacity = "0";
      n.style.transform = "translateX(12px)";
      setTimeout(function () { n.remove(); }, 420);
    }, 3400);
  }

  /* ---------------- briefing ---------------- */

  var currentTopic = null;

  function openBrief(id) {
    var t = byId(id);
    if (!t) return;
    currentTopic = t;

    $("bTag").textContent = tagOf(t);
    $("bCat").textContent = t.category;
    $("bDiff").textContent = ["Intro", "Working level", "Advanced"][t.difficulty - 1];

    var words = t.paragraphs.join(" ").split(/\s+/).length;
    $("bRead").textContent = Math.max(2, Math.round(words / 200)) + " min read";
    $("bTitle").textContent = t.title;

    var body = $("bBody");
    body.textContent = "";
    t.paragraphs.forEach(function (p) { body.appendChild(el("p", "", p)); });

    var terms = $("bTerms");
    terms.textContent = "";
    t.keyTerms.forEach(function (k) { terms.appendChild(el("li", "", k)); });

    show("brief");
  }

  $("bBack").addEventListener("click", goHome);
  $("bStart").addEventListener("click", function () { openReady(currentTopic); });

  function openReady(t) {
    currentTopic = t;
    $("rTag").textContent = tagOf(t) + " · " + t.title;
    $("rLede").textContent = "Five questions on " + t.title.toLowerCase()
      + ". Here is exactly how the round runs.";
    show("ready");
  }
  $("rBack").addEventListener("click", function () { openBrief(currentTopic.id); });
  $("rGo").addEventListener("click", function () { startRun(currentTopic); });

  /* ---------------- quiz run ---------------- */

  function shuffled(n) {
    var a = [], i, j, tmp;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function startRun(t) {
    // Options are shuffled every play so the correct answer never sits
    // in a predictable position and the module is worth replaying.
    var order = shuffled(t.questions.length);
    run = {
      topic: t,
      queue: order.map(function (qi) {
        var q = t.questions[qi];
        var map = shuffled(4);                 // map[newIndex] = originalIndex
        return {
          text: q.q,
          why: q.why,
          options: map.map(function (o) { return q.options[o]; }),
          answer: map.indexOf(q.answer)
        };
      }),
      i: 0,
      score: 0,
      correct: 0,
      streak: 0,
      runBest: 0,
      xp: 0,
      timeouts: 0,
      log: []
    };
    run.wrong = 0;
    buildRig();
    show("quiz");
    renderQuestion();
  }

  /* ---------------- damage rig ---------------- */

  function buildRig() {
    $("rigSvg").innerHTML = towerMarkup("rig", { labels: false });
    $("rigSvg").classList.remove("fell");
    $("rigStage").className = "rig-stage";
    $("rigLog").textContent = "";
    setRigStatus("nominal", "ok");
    if (!rigFx) rigFx = new Fx($("rigFx"));
    rigFx.clear();
    rigFx.vapor = true;
    rigFx.size();
    rigFx.start();
  }

  function setRigStatus(text, level) {
    $("rigText").textContent = "Unit CT-1 · " + text;
    $("rigStatus").dataset.level = level === "ok" ? "" : level;
  }

  // Shear one component off for each wrong answer, in a fixed order so the
  // tower degrades legibly rather than at random.
  function damageRig(n) {
    var part = TOWER_PARTS[n - 1];
    if (!part) return;
    var node = $("rig-" + part.id);
    if (node) {
      node.classList.add("shed");
      setTimeout(function () { node.classList.add("gone"); }, 1150);
    }
    if (rigFx) rigFx.burst(part.at[0], part.at[1], 16, "dust");
    if (n >= 1) rigFx.vapor = false;          // fan is gone, so is the plume

    var li = el("li", "", part.label + " lost");
    $("rigLog").appendChild(li);

    var label = n >= 4 ? "critical" : (n >= 2 ? "degraded" : "damaged");
    setRigStatus(label, n >= 4 ? "bad" : "warn");
  }

  function stopRig() {
    if (rigFx) rigFx.stop();
    $("rigStage").className = "rig-stage";
  }

  function renderQuestion() {
    var q = run.queue[run.i];
    $("qCount").textContent = "Question " + (run.i + 1) + " of " + run.queue.length;
    $("qTopic").textContent = tagOf(run.topic);
    $("qText").textContent = q.text;
    $("qVerdict").textContent = "";

    var combo = $("qCombo");
    if (run.streak >= 2) {
      combo.textContent = "STREAK ×" + multiplier().toFixed(1);
      combo.classList.add("show");
    } else {
      combo.classList.remove("show");
    }

    var host = $("qOpts");
    host.textContent = "";
    q.options.forEach(function (text, idx) {
      var b = el("button", "opt");
      b.appendChild(el("span", "opt-key", "ABCD"[idx]));
      b.appendChild(el("span", "", text));
      b.addEventListener("click", function () { answer(idx); });
      host.appendChild(b);
    });

    // Phase 1 read the question, phase 2 read the answers, phase 3 clock runs.
    host.hidden = true;
    run.qStart = null;
    holdResidual();
    countdown("Answers appear in", Math.round(READ_MS / 1000), function () {
      host.hidden = false;
      countdown("Clock starts in", Math.round(PREVIEW_MS / 1000), function () {
        setPhase("");
        startTimer();
      });
    });

    renderRail();
  }

  function setPhase(label, secs) {
    var n = $("qPhase");
    n.textContent = "";
    if (!label) return;
    n.appendChild(document.createTextNode(label + " "));
    n.appendChild(el("b", "", secs + "s"));
  }

  function clearPhase() {
    if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
    if (phaseTick) { clearInterval(phaseTick); phaseTick = null; }
  }

  function countdown(label, secs, done) {
    clearPhase();
    var left = secs;
    setPhase(label, left);
    phaseTick = setInterval(function () {
      left--;
      if (left <= 0) { clearInterval(phaseTick); phaseTick = null; return; }
      setPhase(label, left);
    }, 1000);
    phaseTimer = setTimeout(function () {
      clearPhase();
      done();
    }, secs * 1000);
  }

  function holdResidual() {
    var fill = $("residualFill"), bar = $("residual");
    bar.classList.remove("low");
    bar.classList.add("held");
    fill.style.transition = "none";
    fill.style.transform = "scaleX(1)";
  }

  function multiplier() {
    return Math.min(2, 1 + 0.1 * Math.min(run.streak, 10));
  }

  function startTimer() {
    stopTimer();
    var fill = $("residualFill");
    var bar = $("residual");
    bar.classList.remove("low");
    fill.style.transition = "none";
    fill.style.transform = "scaleX(1)";

    bar.classList.remove("held");
    var t0 = performance.now();
    run.qStart = t0;
    var stage = $("rigStage");

    timer = requestAnimationFrame(function step(now) {
      var frac = 1 - (now - t0) / QUESTION_TIME;
      if (frac <= 0) { fill.style.transform = "scaleX(0)"; answer(-1); return; }
      fill.style.transform = "scaleX(" + frac.toFixed(4) + ")";
      bar.classList.toggle("low", frac < 0.25);
      // past the halfway mark the tower starts to rumble, harder near the end
      stage.classList.toggle("shake", frac < 0.5);
      stage.classList.toggle("shake-hard", frac < 0.2);
      timer = requestAnimationFrame(step);
    });
  }

  function stopTimer() {
    if (timer) { cancelAnimationFrame(timer); timer = null; }
  }

  function answer(picked) {
    stopTimer();
    clearPhase();
    $("qOpts").hidden = false;
    $("rigStage").classList.remove("shake", "shake-hard");
    setPhase("");
    var q = run.queue[run.i];
    var timedOut = picked < 0;
    var hit = !timedOut && picked === q.answer;
    // Answering before the clock starts keeps the full speed bonus.
    var remain = run.qStart
      ? Math.max(0, 1 - (performance.now() - run.qStart) / QUESTION_TIME)
      : 1;

    var pts = 0;
    if (hit) {
      pts = Math.round((BASE_POINTS + Math.round(TIME_BONUS * remain)) * multiplier());
      run.correct++;
      run.streak++;
      run.runBest = Math.max(run.runBest, run.streak);
      if (run.streak > state.bestStreak) state.bestStreak = run.streak;
    } else {
      run.streak = 0;
      if (timedOut) run.timeouts++;
      run.wrong++;
      damageRig(run.wrong);
    }
    run.score += pts;
    run.xp += Math.round(pts / 10);
    run.log.push({ text: q.text, hit: hit, timedOut: timedOut, correctText: q.options[q.answer] });

    // lock the options and mark them
    var btns = $("qOpts").children;
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === q.answer) btns[i].classList.add("correct");
      else if (i === picked) btns[i].classList.add("wrong");
      else btns[i].classList.add("muted");
    }

    // verdict panel
    var v = el("div", "verdict " + (hit ? "hit" : "miss"));
    var head = el("div", "verdict-head");
    head.appendChild(el("span", "", hit ? "Correct" : (timedOut ? "Residual exhausted" : "Not quite")));
    if (pts) head.appendChild(el("span", "verdict-pts mono", "+" + pts + " pts"));
    v.appendChild(head);
    v.appendChild(el("p", "", q.why));
    var nx = el("div", "verdict-next");
    var btn = el("button", "btn btn-primary",
      run.i + 1 < run.queue.length ? "Next question" : "See results");
    btn.addEventListener("click", next);
    nx.appendChild(btn);
    v.appendChild(nx);

    var host = $("qVerdict");
    host.textContent = "";
    host.appendChild(v);
    btn.focus();
    renderRail();

    if (run.wrong === 4) setTimeout(function () { $("pipDlg").showModal(); }, 700);
    else if (run.wrong === 5) setTimeout(function () { $("hrDlg").showModal(); }, 700);
  }

  $("pipOk").addEventListener("click", function () { $("pipDlg").close(); });
  $("hrOk").addEventListener("click", function () { $("hrDlg").close(); });

  function next() {
    run.i++;
    if (run.i < run.queue.length) return renderQuestion();
    stopRig();
    if (run.wrong >= run.queue.length) return playCollapse();
    finish();
  }

  /* ---------------- catastrophic failure ---------------- */

  function playCollapse() {
    var svg = $("scSvg"), scene = $("scene");
    svg.innerHTML = towerMarkup("sc", { labels: false });
    svg.classList.remove("fell");
    scene.classList.remove("quake");
    $("scEnd").hidden = true;
    $("scCap").className = "scene-cap";
    show("collapse");

    if (!scFx) scFx = new Fx($("scFx"));
    scFx.clear();
    scFx.vapor = false;
    scFx.size();
    scFx.start();

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { collapseEnd(true); return; }

    var at = function (ms, fn) { sceneTimers.push(setTimeout(fn, ms)); };
    var cap = function (text) {
      $("scCap").textContent = text;
      $("scCap").classList.add("on");
    };

    cap("Structural failure detected");
    at(300,  function () { svg.classList.add("fell"); });          // the slow lean
    at(900,  function () { scFx.burst(0.32, 0.72, 14, "dust"); });
    at(1900, function () { cap("Fill pack collapse"); scFx.burst(0.5, 0.58, 20, "dust"); });
    at(3100, function () { scFx.burst(0.62, 0.70, 18, "dust"); });
    at(4600, function () {                                          // impact
      cap("Impact");
      scene.classList.add("quake");
      scFx.ground(0.52, 0.80, 46);
    });
    at(5100, function () { scFx.ground(0.70, 0.82, 30); });
    at(5700, function () { scFx.ground(0.38, 0.82, 24); });
    at(6200, function () { cap("Hydrocarbon ignition"); scFx.ignite(0.60, 0.765, 0.18); });
    at(7000, function () { scFx.stoke(0.22); });
    at(7900, function () { scFx.stoke(0.24); scFx.ignite(0.46, 0.775, 0.16); });
    at(8800, function () { scFx.stoke(0.30); cap("Unit CT-1 · total loss"); });
    at(9500, function () { scFx.stoke(0.25); });
    at(10200, function () { collapseEnd(false); });
  }

  function collapseEnd(instant) {
    var svg = $("scSvg");
    if (instant) {
      svg.classList.add("fell");
      scFx.ignite(0.60, 0.765, 0.8);
      scFx.ignite(0.46, 0.775, 0.5);
      for (var i = 0; i < 60; i++) scFx.step();     // settle a static scene
    }
    $("scCap").classList.remove("on");
    $("scEnd").hidden = false;
    $("scNext").focus();
  }

  function clearScene() {
    sceneTimers.forEach(clearTimeout);
    sceneTimers = [];
    if (scFx) { scFx.stop(); scFx.clear(); }
  }

  $("scSkip").addEventListener("click", function () { clearScene(); scFx.start(); collapseEnd(true); });
  $("scNext").addEventListener("click", function () { clearScene(); finish(); });

  function finish() {
    var t = run.topic;
    var prev = state.results[t.id];
    var improved = !prev || run.score > prev.score;

    state.xp += run.xp;
    state.results[t.id] = {
      correct: improved ? run.correct : prev.correct,
      score: improved ? run.score : prev.score,
      noTimeouts: (prev && prev.noTimeouts) || run.timeouts === 0
    };

    checkBadges();
    save();
    syncUp();

    $("dTag").textContent = tagOf(t) + " · " + t.title;
    $("dGrade").textContent = run.correct + "/" + run.queue.length;

    var msg = [
      ["Back to the briefing.", "Nothing sticks on the first pass. Re-read and run it again."],
      ["Rough run.", "The fundamentals are close. Another pass will lock them in."],
      ["Getting there.", "Solid partial grasp — the detail questions are where the points are."],
      ["Good pass.", "You have the mechanism. Chase the last couple of details."],
      ["Strong.", "Near-complete command of this module."],
      ["Textbook run.", "Full marks. Nothing left on the table."]
    ][run.correct];
    $("dHead").textContent = msg[0];
    $("dSub").textContent = msg[1];

    $("dScore").textContent = run.score.toLocaleString();
    $("dAcc").textContent = Math.round(run.correct / run.queue.length * 100) + "%";
    $("dBest").textContent = run.runBest;
    $("dXp").textContent = "+" + run.xp;

    var rev = $("dReview");
    rev.textContent = "";
    run.log.forEach(function (l, i) {
      var row = el("div", "rev " + (l.hit ? "hit" : "miss"));
      row.appendChild(el("span", "rev-mark", l.hit ? "✓" : "✗"));
      var body = el("div");
      body.appendChild(el("div", "rev-q", (i + 1) + ". " + l.text));
      if (!l.hit) {
        var a = el("div", "rev-a");
        a.appendChild(document.createTextNode(l.timedOut ? "Ran out of residual. Answer: " : "Answer: "));
        a.appendChild(el("b", "", l.correctText));
        body.appendChild(a);
      }
      row.appendChild(body);
      rev.appendChild(row);
    });

    var nxt = nextTopicAfter(t.id);
    $("dNext").textContent = nxt ? "Next: " + nxt.title : "Back to index";

    run = null;
    renderRail(); renderIndex(); renderBadges();
    if (db) renderBoard(lastBoardDocs);
    show("debrief");
  }

  function nextTopicAfter(id) {
    var i = TOPICS.findIndex(function (t) { return t.id === id; });
    return firstUndone() || TOPICS[(i + 1) % TOPICS.length];
  }

  /* ---------------- navigation ---------------- */

  function goHome() {
    stopTimer(); clearPhase(); clearScene(); stopRig(); run = null;
    renderRail(); renderIndex(); renderBadges();
    show("console");
  }

  $("homeBtn").addEventListener("click", goHome);
  $("dIndex").addEventListener("click", goHome);
  $("dRetry").addEventListener("click", function () { openReady(currentTopic); });
  $("dNext").addEventListener("click", function () {
    var t = nextTopicAfter(currentTopic.id);
    openBrief(t.id);
  });
  $("startBtn").addEventListener("click", function () {
    var t = firstUndone() || TOPICS[0];
    openBrief(t.id);
  });
  $("randomBtn").addEventListener("click", function () {
    openBrief(TOPICS[Math.floor(Math.random() * TOPICS.length)].id);
  });
  $("resetBtn").addEventListener("click", function () {
    if (!confirm("Clear all progress, XP and commendations stored in this browser?")) return;
    state = blank();
    save(); applyTheme();
    renderRail(); renderIndex(); renderBadges(); renderPlayer();
    if (db) { renderBoard(lastBoardDocs); }
    toast("Progress cleared", "Starting from the top");
  });

  /* keyboard: A–D or 1–4 to answer, Enter to advance */
  document.addEventListener("keydown", function (e) {
    if (views.quiz.hidden) return;
    var nextBtn = document.querySelector("#qVerdict .btn");
    if (e.key === "Enter" && nextBtn) { e.preventDefault(); nextBtn.click(); return; }
    var k = e.key.toUpperCase();
    var idx = "ABCD".indexOf(k);
    if (idx < 0 && k >= "1" && k <= "4") idx = +k - 1;
    if (idx >= 0) {
      var b = $("qOpts").children[idx];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    }
  });

  /* ---------------- tower plume ---------------- */

  (function heroTower() {
    $("heroSvg").innerHTML = towerMarkup("hero", { labels: true });
    heroFx = new Fx($("plume"));
    heroFx.start();
  })();

  /* ---------------- schematic readout drift ---------------- */
  /* Illustrative values for the example unit CT-1, not measured data. */
  (function readout() {
    var seeds = { rdCyc: [5.2, 0.25, 1], rdPh: [8.4, 0.09, 1], rdOrp: [612, 14, 0], rdLsi: [1.8, 0.12, 1] };
    setInterval(function () {
      if (views.console.hidden) return;
      for (var id in seeds) {
        var s = seeds[id];
        var v = s[0] + (Math.random() - 0.5) * s[1] * 2;
        var node = $(id);
        if (node) node.textContent = (id === "rdLsi" ? "+" : "") + v.toFixed(s[2]);
      }
    }, 2600);
  })();

  /* ============================================================
     Profile + leaderboard (published Artifact only)

     Identity: this contract exposes no `user` capability, so the page
     cannot learn who the viewer is. A profile is therefore a handle plus
     a passphrase, verified against a PBKDF2-SHA256 hash. The store is
     readable by anyone who can open the page, so the passphrase itself is
     never stored and the UI says plainly that this is a game profile, not
     a secure account.

     Two collections:
       players/<pid>     profile + full progress (auth material lives here)
       leaderboard/<pid> handle, score, modules, accuracy — eligible players
                         only, so the top-10 read needs no filter and never
                         touches the auth records.
     ============================================================ */

  var ELIGIBLE_MODULES = 5;
  var BOARD_SIZE = 10;
  var PBKDF2_ITER = 150000;

  var db = null;             // resolved capability, or null
  var boardStop = null;      // onSnapshot unsubscribe
  var lastBoardDocs = null;  // last delivered rows, so the note can re-render alone
  var postDenied = false;    // this viewer is not an editor, so cannot post a score

  /* ---- derived, mergeable totals ---- */

  function totals(s) {
    var score = 0, mods = 0, correct = 0;
    for (var k in s.results) {
      mods++;
      score += s.results[k].score || 0;
      correct += s.results[k].correct || 0;
    }
    return {
      score: score,
      modules: mods,
      accuracy: mods ? Math.round(correct / (mods * 5) * 100) : 0
    };
  }

  function eligible(s) { return totals(s).modules >= ELIGIBLE_MODULES; }

  /* ---- crypto ---- */

  function hasCrypto() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }

  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  function fromHex(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function newSalt() { return toHex(crypto.getRandomValues(new Uint8Array(16))); }

  function derive(pass, saltHex, iter) {
    return crypto.subtle.importKey(
      "raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]
    ).then(function (key) {
      return crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: fromHex(saltHex), iterations: iter, hash: "SHA-256" },
        key, 256);
    }).then(toHex);
  }

  /* ---- handles ---- */

  function pidFor(handle) {
    var p = handle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return p.slice(0, 40);
  }

  /* ---- sync ---- */

  function syncUp() {
    if (!db || !state.profile) return Promise.resolve();
    var t = totals(state);
    var pid = state.profile.pid;

    // The profile is writable by any viewer; the leaderboard is editors-only.
    var saved = db.doc("players/" + pid).update({
      results: state.results,
      badges: state.badges,
      xp: state.xp,
      bestStreak: state.bestStreak,
      updated: Date.now()
    }).catch(function (e) {
      toast("Could not save your progress", (e && e.code) || "offline");
    });

    if (t.modules < ELIGIBLE_MODULES) return saved;

    return saved.then(function () {
      return db.doc("leaderboard/" + pid).set({
        handle: state.profile.handle,
        score: t.score,
        modules: t.modules,
        accuracy: t.accuracy,
        updated: Date.now()
      });
    }).then(function () {
      if (postDenied) { postDenied = false; renderBoard(lastBoardDocs); }
    }).catch(function (e) {
      // There is no `user` capability on this contract, so the page cannot
      // read the viewer's sharing level. A rejected write is how a
      // non-editor finds out, so treat it as information, not an error.
      if (e && e.code === "invalid_argument") {
        if (!postDenied) { postDenied = true; renderBoard(lastBoardDocs); }
      } else {
        toast("Could not post your score", (e && e.code) || "offline");
      }
    });
  }

  // Take the better of each module, so signing in on a second device
  // merges rather than clobbers.
  function mergeDown(remote) {
    var r = remote.results || {};
    for (var k in r) {
      var mine = state.results[k];
      if (!mine || (r[k].score || 0) > (mine.score || 0)) state.results[k] = r[k];
      else if (mine && r[k].noTimeouts) state.results[k].noTimeouts = true;
    }
    (remote.badges || []).forEach(function (b) {
      if (state.badges.indexOf(b) < 0) state.badges.push(b);
    });
    state.xp = Math.max(state.xp || 0, remote.xp || 0);
    state.bestStreak = Math.max(state.bestStreak || 0, remote.bestStreak || 0);
  }

  /* ---- auth ---- */

  var dlg = $("authDlg");

  function openAuth() {
    if (state.profile) { signOut(); return; }
    $("authErr").hidden = true;
    $("authPass").value = "";
    dlg.showModal();
    $("authHandle").focus();
  }

  function authError(msg) {
    var n = $("authErr");
    n.textContent = msg;
    n.hidden = false;
  }

  function busy(on) {
    $("authCreate").disabled = on;
    $("authSignin").disabled = on;
    $("authSignin").textContent = on ? "Working…" : "Sign in";
  }

  var mode = "signin";
  $("authCreate").addEventListener("click", function () { mode = "create"; });
  $("authSignin").addEventListener("click", function () { mode = "signin"; });
  $("authCancel").addEventListener("click", function () { dlg.close(); });

  $("authForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!db) { authError("The leaderboard is not available in this copy of the page."); return; }
    if (!hasCrypto()) { authError("This browser cannot hash passphrases securely."); return; }

    var handle = $("authHandle").value.trim();
    var pass = $("authPass").value;
    var pid = pidFor(handle);

    if (pid.length < 2) { authError("Pick a handle with at least two letters or digits."); return; }
    if (pass.length < 6) { authError("Passphrase must be at least 6 characters."); return; }

    $("authErr").hidden = true;
    busy(true);

    var ref = db.doc("players/" + pid);
    ref.get().then(function (snap) {
      var exists = snap.exists;
      var doc = exists ? snap.data() : null;

      if (mode === "create") {
        if (exists) throw { soft: "That handle is taken. Sign in instead, or pick another." };
        var salt = newSalt();
        return derive(pass, salt, PBKDF2_ITER).then(function (hash) {
          return ref.set({
            handle: handle, salt: salt, hash: hash, iter: PBKDF2_ITER,
            results: state.results, badges: state.badges,
            xp: state.xp, bestStreak: state.bestStreak,
            created: Date.now(), updated: Date.now()
          });
        }).then(function () { return { handle: handle, fresh: true }; });
      }

      if (!exists) throw { soft: "No profile with that handle. Use “Create profile”." };
      return derive(pass, doc.salt, doc.iter || PBKDF2_ITER).then(function (hash) {
        if (hash !== doc.hash) throw { soft: "Handle and passphrase do not match." };
        mergeDown(doc);
        return { handle: doc.handle || handle, fresh: false };
      });
    }).then(function (res) {
      state.profile = { pid: pid, handle: res.handle };
      checkBadges();
      save();
      dlg.close();
      renderRail(); renderIndex(); renderBadges(); renderPlayer();
      toast("Signed in as " + res.handle,
        res.fresh ? "Progress will save to this profile" : "Progress merged");
      return syncUp().then(watchBoard);
    }).catch(function (err) {
      authError(err && err.soft ? err.soft
        : "Could not reach the profile store" + (err && err.code ? " (" + err.code + ")" : "") + ".");
    }).then(function () { busy(false); });
  });

  function signOut() {
    if (!confirm("Sign out? Progress stays in this browser and in your profile.")) return;
    state.profile = null;
    save();
    renderPlayer(); renderBoard(null);
    toast("Signed out", "Playing locally");
  }

  function renderPlayer() {
    var btn = $("playerBtn");
    if (!db) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.textContent = "";
    if (state.profile) {
      btn.dataset.on = "1";
      btn.appendChild(el("span", "", state.profile.handle));
      btn.title = "Signed in as " + state.profile.handle + " — click to sign out";
    } else {
      delete btn.dataset.on;
      btn.appendChild(el("span", "", "Sign in"));
      btn.title = "Create a profile or sign in";
    }
  }

  /* ---- leaderboard ---- */

  function watchBoard() {
    if (!db) return;
    if (boardStop) { boardStop(); boardStop = null; }
    boardStop = db.collection("leaderboard")
      .orderBy("score", "desc")
      .limit(BOARD_SIZE)
      .onSnapshot(
        function (snap) { lastBoardDocs = snap.docs; renderBoard(snap.docs); },
        function (e) { renderBoard(null, (e && e.code) || "unavailable"); }
      );
  }

  function renderBoard(docs, errCode) {
    var sec = $("boardSection");
    if (!db) { sec.hidden = true; return; }
    sec.hidden = false;

    var t = totals(state);
    var mine = state.profile ? state.profile.pid : null;
    var note = $("boardNote");
    var inTop = false;

    var table = $("board");
    table.textContent = "";

    if (errCode) {
      table.appendChild(rowSpan("Leaderboard unavailable (" + errCode + ")"));
    } else if (!docs || !docs.length) {
      table.appendChild(rowSpan("No qualifying players yet. Finish "
        + ELIGIBLE_MODULES + " modules to open the board."));
    } else {
      var head = document.createElement("tr");
      ["", "Player", "Score", "Modules", "Accuracy"].forEach(function (h) {
        head.appendChild(el("th", "", h));
      });
      table.appendChild(head);

      docs.forEach(function (d, i) {
        var v = d.data() || {};
        var tr = document.createElement("tr");
        if (i === 0) tr.className = "lead";
        if (mine && d.id === mine) { tr.className += " me"; inTop = true; }
        tr.appendChild(el("td", "", String(i + 1)));
        tr.appendChild(el("td", "who", v.handle || d.id));
        tr.appendChild(el("td", "", (v.score || 0).toLocaleString()));
        tr.appendChild(el("td", "", (v.modules || 0) + "/" + TOPICS.length));
        tr.appendChild(el("td", "", (v.accuracy || 0) + "%"));
        table.appendChild(tr);
      });

      // your own standing, when you qualify but sit outside the top ten
      if (mine && !inTop && t.modules >= ELIGIBLE_MODULES) {
        var tr2 = document.createElement("tr");
        tr2.className = "me pending";
        tr2.appendChild(el("td", "", "—"));
        tr2.appendChild(el("td", "who", state.profile.handle));
        tr2.appendChild(el("td", "", t.score.toLocaleString()));
        tr2.appendChild(el("td", "", t.modules + "/" + TOPICS.length));
        tr2.appendChild(el("td", "", t.accuracy + "%"));
        table.appendChild(tr2);
      }
    }

    // eligibility / next-step line
    note.textContent = "";
    if (postDenied) {
      note.appendChild(document.createTextNode(
        "Your standing is shown below for reference, but this board only accepts scores from "));
      note.appendChild(el("b", "", "editors"));
      note.appendChild(document.createTextNode(
        ". Ask whoever shared this page for edit access if you want a permanent spot. "
        + "Your progress still saves to your profile."));
    } else if (!state.profile) {
      note.appendChild(document.createTextNode(
        "You are playing locally. Create a profile to carry progress between browsers and post a score. "));
      note.appendChild(el("b", "", t.modules + " of " + ELIGIBLE_MODULES + " qualifying modules done."));
    } else if (t.modules < ELIGIBLE_MODULES) {
      note.appendChild(document.createTextNode("Finish "));
      note.appendChild(el("b", "", (ELIGIBLE_MODULES - t.modules) + " more module"
        + (ELIGIBLE_MODULES - t.modules === 1 ? "" : "s")));
      note.appendChild(document.createTextNode(
        " to qualify. Your score counts your best run of each module, so replays can only help."));
    }
    $("boardTag").textContent = "Top " + BOARD_SIZE + " · " + ELIGIBLE_MODULES
      + " modules to qualify · editors post";
  }

  function rowSpan(text) {
    var tr = document.createElement("tr");
    var td = el("td", "board-empty", text);
    td.colSpan = 5;
    tr.appendChild(td);
    return tr;
  }

  /* ---- bring the capability up ---- */

  (function connect() {
    renderBoard(null);                       // renders nothing until db resolves
    if (!(window.claude && typeof window.claude.use === "function")) return;
    window.claude.use("db").then(function (ns) {
      if (!ns) return;
      db = ns;
      renderPlayer();
      watchBoard();
      if (state.profile) syncUp();
    }).catch(function () { /* stays local-only */ });
  })();

  $("playerBtn").addEventListener("click", openAuth);

  /* ---------------- boot ---------------- */

  applyTheme();
  renderRail();
  renderFilters();
  renderIndex();
  renderBadges();
  renderPlayer();
  show("console");
})();

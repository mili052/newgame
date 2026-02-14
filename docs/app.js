/* global marked */

const DATA_PATH = "./kanban.json";
const REPORT_PATH = "./report.md";

function $(sel) {
  return document.querySelector(sel);
}

function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function toLines(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k}：${v}`);
}

function createTag(text, kind) {
  const el = document.createElement("span");
  el.className = `tag${kind ? ` ${kind}` : ""}`;
  el.textContent = text;
  return el;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function normalizeGameName(s) {
  return String(s || "")
    .replace(/[《》]/g, "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_");
}

function guessImageCandidates(alt, kind) {
  const name = normalizeGameName(alt);
  if (!name) return [];
  const dirs = ["./资产", "./assets"];
  const exts = ["png", "jpg", "jpeg", "webp"];
  const bases =
    kind === "screenshot"
      ? [`${name}游戏截图`, `${name}_截图`, `${name}-截图`, `${name}截图`, `${name}-shot`, `${name}_shot`, name]
      : [name];
  const out = [];
  for (const d of dirs) {
    for (const b of bases) {
      for (const e of exts) out.push(`${d}/${b}.${e}`);
    }
  }
  return out;
}

function createImgWithFallback({ src, alt, className, kind }) {
  const candidates = [];
  if (src) candidates.push(src);
  candidates.push(...guessImageCandidates(alt, kind));

  const img = document.createElement("img");
  img.className = className;
  img.alt = alt || "";
  img.loading = "lazy";

  let idx = 0;
  const tryNext = () => {
    if (idx >= candidates.length) {
      // 替换为占位
      const ph = document.createElement("div");
      ph.className = `${className} is-ph`;
      const txt = (alt || "").trim();
      const first = txt ? txt.replace(/[《》]/g, "").slice(0, 1).toUpperCase() : "G";
      ph.textContent = first;
      ph.setAttribute("aria-hidden", "true");
      img.replaceWith(ph);
      return;
    }
    img.src = candidates[idx++];
  };
  img.onerror = tryNext;
  tryNext();
  return img;
}

function iconOrPlaceholder({ src, alt, className }) {
  return createImgWithFallback({ src, alt, className, kind: "icon" });
}

function createPill(label, value) {
  const p = el("div", "pill");
  p.innerHTML = `<strong>${value}</strong> ${label}`;
  return p;
}

function createFocusCard(r) {
  const card = el("div", "focusCard");
  card.appendChild(iconOrPlaceholder({ src: r.image, alt: r.name, className: "focusIcon" }));

  const body = el("div", "focusBody");
  body.appendChild(el("div", "focusTitle", `《${r.name}》`));
  body.appendChild(el("div", "focusMeta", `${r.genre || "—"}${r.subgenre ? ` · ${r.subgenre}` : ""}${r.currentRank ? ` · 当前${r.currentRank}` : ""}`));
  body.appendChild(el("div", "focusReason", r.takeaway || r.note || ""));

  const tags = el("div", "focusTags");
  const tagEls = [
    r.genre ? createTag(r.genre, "is-accent") : null,
    r.subgenre ? createTag(r.subgenre) : null,
    r.currentRank ? createTag(`当前${r.currentRank}`, "is-red") : null,
  ].filter(Boolean);
  for (const t of tagEls) tags.appendChild(t);
  body.appendChild(tags);

  card.appendChild(body);
  return card;
}

function createMiniItem(title, detail) {
  const it = el("div", "miniItem");
  it.appendChild(el("div", "miniItem__t", title));
  if (detail) it.appendChild(el("div", "miniItem__d", detail));
  return it;
}

function statusFromTest(t) {
  if (t.status) return t.status;
  const tt = String(t.testType || "");
  if (tt.includes("上架")) return "上线";
  if (tt.includes("观察")) return "观察";
  if (tt.includes("测试")) return "测试";
  if (tt.includes("信息流")) return "测试";
  return "测试";
}

function badgeForStatus(status) {
  const s = String(status || "").trim();
  const span = el("span", "badge", s || "—");
  if (s === "上线") span.classList.add("badge--green");
  else if (s === "测试") span.classList.add("badge--blue");
  else if (s === "观察") span.classList.add("badge--gray");
  else if (s === "进榜") span.classList.add("badge--amber");
  else span.classList.add("badge--gray");
  return span;
}

function ratingBox(rating) {
  return el("div", "rating", rating || "—");
}

function collectCompanies(data) {
  const bag = [];
  const pushMaybe = (v) => {
    if (!v) return;
    if (Array.isArray(v)) bag.push(...v);
    else bag.push(v);
  };

  for (const r of data.rankChanges || []) {
    pushMaybe(r.developer);
    pushMaybe(r.publisher);
    pushMaybe(r.distribution);
    pushMaybe(r.acquisition);
  }
  for (const t of data.tests || []) {
    pushMaybe(t.developer);
    pushMaybe(t.publisher);
    pushMaybe(t.distribution);
    pushMaybe(t.acquisition);
  }
  return uniq(
    bag
      .flatMap((x) => String(x).split(/[，、/]/g))
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function countBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

function wireTabs() {
  const tabs = $all(".navItem");
  const panels = $all(".panel");
  const setTab = (tabId) => {
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tabId));
    panels.forEach((p) => p.classList.toggle("is-active", p.id === tabId));
  };
  tabs.forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  setTab("home");

  $("#goReport")?.addEventListener("click", () => setTab("report"));
}

function wireViewToggle() {
  const btnTable = $("#viewTable");
  const btnCards = $("#viewCards");
  const wrapTable = $("#testsTableWrap");
  const wrapCards = $("#testsCardsWrap");

  const setView = (v) => {
    const isTable = v === "table";
    btnTable.classList.toggle("is-active", isTable);
    btnCards.classList.toggle("is-active", !isTable);
    wrapTable.classList.toggle("is-hidden", !isTable);
    wrapCards.classList.toggle("is-hidden", isTable);
  };

  btnTable?.addEventListener("click", () => setView("table"));
  btnCards?.addEventListener("click", () => setView("cards"));
  setView("table");
}

function wireWindTabs(onChange) {
  const t1 = $("#windTabRank");
  const t2 = $("#windTabTrend");
  const set = (key) => {
    t1.classList.toggle("is-active", key === "rank");
    t2.classList.toggle("is-active", key === "trend");
    t1.setAttribute("aria-selected", key === "rank" ? "true" : "false");
    t2.setAttribute("aria-selected", key === "trend" ? "true" : "false");
    onChange(key);
  };
  t1?.addEventListener("click", () => set("rank"));
  t2?.addEventListener("click", () => set("trend"));
  set("rank");
}

function render(data) {
  const meta = data.meta || {};

  $("#brandTitle").textContent = meta.title || "新游测试周报";
  $("#brandSub").textContent = `${meta.weekRange || ""} · 数据生成：${meta.generatedAt || "未知"} · ${meta.scopeNote || ""}`.trim();

  const tests = data.tests || [];
  const inWeekTests = tests.filter((t) => t.inWeek);
  const rankChanges = data.rankChanges || [];
  const watchPoints = data.watchPoints || [];
  const companies = collectCompanies(data);

  $("#kpiTestCount").textContent = String(inWeekTests.length);
  $("#kpiRankCount").textContent = String(rankChanges.length);
  $("#kpiWatchCount").textContent = String(watchPoints.length);
  $("#kpiCompanyCount").textContent = String(companies.length);

  // footer meta
  $("#footerMeta").textContent =
    `信息源：${meta.sourcePath || "-"}（原文） · 备注：${meta.sourceNote || "原始记录覆盖 2/10～2/14；2/9 无具体条目"}`;

  // Hero: 使用榜单第一条（没有则用测试第一条）
  const heroItem = rankChanges[0] || inWeekTests[0] || tests[0] || null;
  if (heroItem) {
    const heroImg = (heroItem.screenshots && heroItem.screenshots[0]) || heroItem.screenshot || heroItem.image || "";
    if (heroImg) {
      $("#heroMedia").innerHTML = `<img src="${heroImg}" alt="${heroItem.name || "推荐"}">`;
      $("#heroMedia").classList.remove("is-empty");
    } else {
      const t = heroItem.name ? `《${heroItem.name}》` : "本周推荐";
      $("#heroMedia").innerHTML = `<div class="heroPh"><div class="heroPh__badge">本周推荐</div><div class="heroPh__title">${t}</div><div class="heroPh__sub">暂无截图，先用占位封面展示</div></div>`;
      $("#heroMedia").classList.add("is-empty");
    }
    $("#heroTitle").textContent = heroItem.name ? `《${heroItem.name}》` : "本周推荐";
    $("#heroMeta").textContent = rankChanges[0]
      ? `榜单焦点：${heroItem.genre || ""}${heroItem.currentRank ? ` · 当前${heroItem.currentRank}` : ""}`
      : `测试流：${heroItem.testType || ""}${heroItem.testDate ? ` · ${heroItem.testDate}` : ""}`;
  } else {
    $("#heroTitle").textContent = "本周推荐";
    $("#heroMeta").textContent = "暂无数据";
  }

  // 榜单焦点页
  const focusWrap = $("#focusCards");
  focusWrap.innerHTML = "";
  for (const r of rankChanges) focusWrap.appendChild(createFocusCard(r));

  // 右侧：热门关注（榜单 + 测试混合）
  const hotWrap = $("#hotList");
  hotWrap.innerHTML = "";
  const hotSource = [
    ...rankChanges.map((r) => ({ kind: "rank", ...r })),
    ...inWeekTests.map((t) => ({ kind: "test", ...t })),
  ].slice(0, 8);
  for (const it of hotSource) {
    const row = el("div", "hotItem");
    row.appendChild(iconOrPlaceholder({ src: it.image, alt: it.name, className: "hotIcon" }));
    const b = el("div");
    b.appendChild(el("div", "hotName", it.name ? `《${it.name}》` : "—"));
    b.appendChild(el("div", "hotSub", it.kind === "rank" ? (it.currentRank ? `当前${it.currentRank}` : it.genre || "") : it.testType || ""));
    row.appendChild(b);
    hotWrap.appendChild(row);
  }

  // 右侧：风向标（watchPoints）
  const windWrap = $("#windList");
  windWrap.innerHTML = "";
  for (const w of watchPoints) {
    windWrap.appendChild(createMiniItem(w.title, w.implication || w.detail || ""));
  }

  // tests + filter
  const filterType = $("#filterType");
  const filterText = $("#filterText");

  const typeOptions = uniq(tests.map((t) => t.testType));
  filterType.innerHTML = `<option value="">全部类型</option>`;
  for (const opt of typeOptions) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    filterType.appendChild(o);
  }

  // 全局搜索：同步到 filterText
  const globalSearch = $("#globalSearch");
  const globalSearchBtn = $("#globalSearchBtn");
  const doGlobalSearch = () => {
    if (!globalSearch) return;
    const q = globalSearch.value.trim();
    if (filterText) filterText.value = q;
    renderTests();
  };
  globalSearchBtn?.addEventListener("click", doGlobalSearch);
  globalSearch?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doGlobalSearch();
  });

  function matchText(t, q) {
    if (!q) return true;
    const blob = [
      t.name,
      t.genre,
      t.subgenre,
      (t.tags || []).join(" "),
      t.developer,
      t.publisher,
      t.testType,
      t.testDate,
      t.notes,
      t.watch,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes(q.toLowerCase());
  }

  // 首页 feed（TapTap 信息流）
  const feedWrap = $("#feedList");
  function renderFeed(items) {
    if (!feedWrap) return;
    feedWrap.innerHTML = "";
    if (!items.length) {
      feedWrap.appendChild(createMiniItem("没有匹配的条目", "尝试更换筛选或关键词。"));
      return;
    }
    for (const t of items.slice(0, 30)) {
      const card = el("div", "feedCard");
      card.appendChild(iconOrPlaceholder({ src: t.image, alt: t.name, className: "feedIcon" }));
      const body = el("div", "feedBody");
      body.appendChild(el("div", "feedTitle", `《${t.name}》`));
      const metaRow = el("div", "feedMeta");
      metaRow.appendChild(createTag(t.inWeek ? "本周" : "样本池"));
      if (t.testType) metaRow.appendChild(createTag(t.testType, "is-green"));
      if (t.genre) metaRow.appendChild(createTag(t.genre, "is-accent"));
      if (t.subgenre) metaRow.appendChild(createTag(t.subgenre));
      if (t.testDate) metaRow.appendChild(el("span", "", `· ${t.testDate}`));
      body.appendChild(metaRow);
      body.appendChild(el("div", "feedReason", t.watch || t.reason || t.notes || "—"));
      const tags = el("div", "feedTags");
      (t.tags || []).slice(0, 4).forEach((x) => tags.appendChild(createTag(x)));
      body.appendChild(tags);
      card.appendChild(body);

      const act = el("div", "feedAction");
      const btn = el("button", "feedBtn", "查看详情");
      btn.type = "button";
      btn.addEventListener("click", () => {
        // 切到 tests 面板并滚动到顶部
        $all(".navItem").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === "tests"));
        $all(".panel").forEach((p) => p.classList.toggle("is-active", p.id === "tests"));
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (filterText) filterText.value = t.name;
        renderTests();
      });
      act.appendChild(btn);
      card.appendChild(act);
      feedWrap.appendChild(card);
    }
  }

  function renderTests() {
    const q = (filterText?.value || globalSearch?.value || "").trim();
    const type = filterType?.value || "";
    const items = tests
      .filter((t) => (type ? t.testType === type : true))
      .filter((t) => matchText(t, q))
      .sort((a, b) => String(b.testDate || "").localeCompare(String(a.testDate || "")));

    // 首页 feed 也跟着筛选
    renderFeed(items);

    // table
    const tb = $("#testsTableBody");
    tb.innerHTML = "";

    const cardsWrap = $("#testsCardsWrap");
    cardsWrap.innerHTML = "";

    if (!items.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.style.color = "rgba(17,24,39,.65)";
      td.textContent = "没有匹配的条目，尝试清空筛选或更换关键词。";
      tr.appendChild(td);
      tb.appendChild(tr);
      return;
    }

    for (const t of items) {
      const company = [t.developer ? `研：${t.developer}` : "", t.publisher ? `发：${t.publisher}` : ""].filter(Boolean).join(" / ");
      const genre = `${t.genre || "—"}${t.subgenre ? ` · ${t.subgenre}` : ""}`;
      const dateText = t.testDate ? t.testDate.slice(5) : "";
      const status = statusFromTest(t);
      const reason = t.watch || t.reason || t.notes || "—";
      const shot = (t.screenshots && t.screenshots[0]) || t.screenshot || t.image || "";

      const tr = document.createElement("tr");
      // rating
      const tdRating = document.createElement("td");
      tdRating.appendChild(ratingBox(t.rating));
      tr.appendChild(tdRating);

      const tdGame = document.createElement("td");
      const cell = el("div", "gameCell");
      cell.appendChild(iconOrPlaceholder({ src: t.image, alt: t.name, className: "gameIcon" }));
      const wrap = el("div");
      wrap.appendChild(el("div", "gameName", t.name));
      wrap.appendChild(el("div", "gameSub", [t.inWeek ? "本周" : "样本池", dateText ? ` · ${dateText}` : ""].filter(Boolean).join("")));
      cell.appendChild(wrap);
      tdGame.appendChild(cell);
      tr.appendChild(tdGame);

      // status
      const tdStatus = document.createElement("td");
      tdStatus.appendChild(badgeForStatus(status));
      tr.appendChild(tdStatus);

      tr.appendChild(el("td", "", genre));

      tr.appendChild(el("td", "", company || "—"));
      tr.appendChild(el("td", "", reason));

      const tdBtn = document.createElement("td");
      const btn = el("button", "btnIcon", "展开");
      btn.type = "button";
      tdBtn.appendChild(btn);
      tr.appendChild(tdBtn);

      // detail row
      const detailTr = document.createElement("tr");
      detailTr.className = "rowDetail is-hidden";
      const detailTd = document.createElement("td");
      detailTd.colSpan = 7;

      const panel = el("div", "detailPanel");
      const grid = el("div", "detailGrid");

      const shotBox = el("div", "shot");
      const shotHead = el("div", "shot__head", "游戏截图");
      shotBox.appendChild(shotHead);
      const shotImg = createImgWithFallback({
        src: shot,
        alt: `${t.name} 截图`,
        className: "shot__img",
        kind: "screenshot",
      });
      shotBox.appendChild(shotImg);

      const boxes = el("div", "boxes");
      const boxIntro = el("div", "box");
      boxIntro.appendChild(el("div", "box__head", "产品介绍"));
      boxIntro.appendChild(el("div", "box__body", t.notes || "—"));

      const boxJudge = el("div", "box");
      boxJudge.appendChild(el("div", "box__head", "初步体验判断"));
      boxJudge.appendChild(el("div", "box__body", t.watch || t.reason || "—"));

      const boxMeta = el("div", "box");
      boxMeta.appendChild(el("div", "box__head", "基础信息"));
      boxMeta.appendChild(
        el(
          "div",
          "box__body",
          [
            `测试类型：${t.testType || "—"}`,
            `类型/题材：${genre}`,
            company ? `厂商：${company}` : "",
            t.channels ? `渠道：${t.channels}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );

      boxes.appendChild(boxIntro);
      boxes.appendChild(boxJudge);
      boxes.appendChild(boxMeta);

      grid.appendChild(shotBox);
      grid.appendChild(boxes);
      panel.appendChild(grid);
      detailTd.appendChild(panel);
      detailTr.appendChild(detailTd);

      btn.addEventListener("click", () => {
        const open = !detailTr.classList.contains("is-hidden");
        detailTr.classList.toggle("is-hidden", open);
        btn.textContent = open ? "展开" : "收起";
      });

      tb.appendChild(tr);
      tb.appendChild(detailTr);

      // cards view (compact)
      const tags = [
        createTag(t.inWeek ? "本周" : "样本池"),
        t.testType ? createTag(t.testType, "is-green") : null,
        t.genre ? createTag(t.genre, "is-accent") : null,
        t.subgenre ? createTag(t.subgenre) : null,
      ].filter(Boolean);

      const item = document.createElement("div");
      item.className = "item";
      const row = document.createElement("div");
      row.className = "item__row";
      row.appendChild(iconOrPlaceholder({ src: t.image, alt: t.name, className: "item__img" }));
      const top = document.createElement("div");
      top.className = "item__top";
      top.appendChild(el("div", "item__title", `《${t.name}》`));
      row.appendChild(top);
      item.appendChild(row);

      const tagWrap = el("div", "item__tags");
      for (const tg of tags) tagWrap.appendChild(tg);
      item.appendChild(tagWrap);
      item.appendChild(el("div", "item__meta", `日期：${t.testDate || "—"}\n${company || ""}`.trim()));
      item.appendChild(el("div", "item__note", [t.notes, t.watch ? `关注：${t.watch}` : ""].filter(Boolean).join("\n")));
      cardsWrap.appendChild(item);
    }
  }

  filterText.addEventListener("input", renderTests);
  filterType.addEventListener("change", renderTests);
  renderTests();
}

async function load() {
  wireTabs();
  wireViewToggle();

  try {
    const [dataRes, reportRes] = await Promise.all([fetch(DATA_PATH), fetch(REPORT_PATH)]);
    if (!dataRes.ok) throw new Error(`加载数据失败：${dataRes.status} ${dataRes.statusText}`);
    if (!reportRes.ok) throw new Error(`加载周报失败：${reportRes.status} ${reportRes.statusText}`);
    const data = await dataRes.json();
    const reportMd = await reportRes.text();

    render(data);

    $("#reportMeta").textContent = `信息源：${data?.meta?.sourcePath || "-"} · 周区间：${data?.meta?.weekRange || "-"}`;
    $("#reportContent").innerHTML = marked.parse(reportMd, { mangle: false, headerIds: false });
  } catch (err) {
    $("#brandSub").textContent = `加载失败：${err?.message || String(err)}`;
    $("#dashboard").innerHTML =
      `<div class="card" style="padding:16px;line-height:1.6">` +
      `<div style="font-weight:800;margin-bottom:6px">页面初始化失败</div>` +
      `<div style="color:rgba(255,255,255,.72)">请确认 <code>docs/kanban.json</code> 与 <code>docs/report.md</code> 已提交到仓库，并通过 GitHub Pages 访问。</div>` +
      `</div>`;
  }
}

load();

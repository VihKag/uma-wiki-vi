(() => {
  "use strict";
  const D = window.UMA;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  if (!D) {
    $("#meta").textContent = "Không tìm thấy data/data.js — hãy chạy: node scripts/update.mjs";
    return;
  }

  const L = D.meta.labels;
  const LEVELS = D.meta.levels;
  const cardById = new Map(D.cards.map((c) => [c.id, c]));
  const skillById = new Map(D.skills.map((s) => [s.id, s]));
  const effById = new Map(D.effects.map((e) => [e.id, e]));
  const RARITY = { 1: "R", 2: "SR", 3: "SSR" };
  const isUnique = (s) => s.rarity >= 3;

  $("#meta").textContent = `Bản Global · ${D.cards.length} support card · ${D.skills.length} kỹ năng · cập nhật ${new Date(D.meta.builtAt).toLocaleDateString("vi-VN")}`;

  /* ---------- Theme ---------- */
  const themeKey = "uma-theme";
  const applyTheme = (t) => (t ? document.documentElement.setAttribute("data-theme", t) : document.documentElement.removeAttribute("data-theme"));
  try { applyTheme(localStorage.getItem(themeKey)); } catch {}
  $("#theme").onclick = () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(themeKey, next); } catch {}
  };

  /* ---------- Helpers ---------- */
  const effName = (id) => effById.get(id)?.vi || effById.get(id)?.en || `Hiệu ứng #${id}`;
  // Tên VI kèm tên EN trong ngoặc để đối chiếu (dùng trong mô tả Hiệu ứng Độc nhất)
  const effNameBoth = (id) => {
    const e = effById.get(id);
    return e?.vi && e.en && e.vi !== e.en ? `${esc(e.vi)} <small class="en">(${esc(e.en)})</small>` : esc(effName(id));
  };
  const fmt = (id, v) => {
    const sym = effById.get(id)?.symbol;
    if (sym === "percent") return `${v}%`;
    if (sym === "level") return `Lv ${v}`;
    return `+${v}`;
  };
  const skillName = (s) => s.vi || s.en;
  const skillIcon = (s) => `img/skills/${s.icon}.png`;
  const cardImg = (c) => `img/cards/${c.id}.png`;
  const typeBadge = (t) => `<span class="badge type-badge type-${t}">${esc(L.cardTypes[t] || t)}</span>`;
  const rarBadge = (r) => `<span class="badge r-${r}">${RARITY[r]}</span>`;

  // Giá trị effect tại một level: nội suy tuyến tính giữa các mốc đã biết (-1 = không có dữ liệu ở mốc đó)
  function valueAt(row, lv) {
    const pts = [];
    row.slice(1).forEach((v, i) => { if (v !== -1) pts.push([LEVELS[i], v]); });
    if (!pts.length || lv < pts[0][0]) return 0;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (lv >= pts[i][0]) {
        const [l0, v0] = pts[i], nx = pts[i + 1];
        if (!nx || lv === l0) return v0;
        return Math.floor(v0 + ((nx[1] - v0) * (lv - l0)) / (nx[0] - l0));
      }
    }
    return 0;
  }

  // Mô tả tiếng Việt cho Hiệu ứng Độc nhất
  function uniqueText(e) {
    const v = e.value, a = e.value_1, b = e.value_2, c = e.value_3, d = e.value_4;
    switch (e.type) {
      case 101: return `Khi thanh Tình bạn ≥ ${v}: nhận <b>${effNameBoth(a)}</b> ${fmt(a, b)}` + (c ? ` và <b>${effNameBoth(c)}</b> ${fmt(c, d)}` : "");
      case 102: return `Khi thanh Tình bạn ≥ ${v} và card ở khu tập <i>khác</i> loại của nó: nhận <b>Hiệu quả Luyện tập</b> +${a}%`;
      case 103: return `Nếu đội hình có ít nhất ${v} loại support card khác nhau: nhận <b>Hiệu quả Luyện tập</b> +${a}%`;
      case 104: return `Nhận <b>Hiệu quả Luyện tập</b> +1% cho mỗi ${v.toLocaleString("vi-VN")} fan, tối đa +${a}% (tại ${(v * a).toLocaleString("vi-VN")} fan)`;
      case 105: return `Nhận +${v} <b>chỉ số khởi đầu</b> (theo loại của card) cho mỗi support card trong đội hình; card Friend/Group cho +${a} mọi chỉ số`;
      case 106: return `Nhận <b>${effNameBoth(a)}</b> ${fmt(a, b)} mỗi lần Luyện tập Tình bạn với card này, tối đa ${v} lần (tổng ${fmt(a, v * b)})`;
      case 107: return `Năng lượng càng thấp thì <b>${effNameBoth(v)}</b> nhận được càng cao`;
      case 108: return `Nhận <b>${effNameBoth(v)}</b> +${c}%, tăng thêm theo Năng lượng tối đa vượt ${a}, tối đa +${d}%`;
      case 109: return `Nhận <b>${effNameBoth(v)}</b> +1% cho mỗi ${a} điểm tổng thanh Tình bạn của các support card, tối đa +20%`;
      case 110: return `Nhận <b>${effNameBoth(v)}</b> +${a}% cho mỗi support card ở cùng khu luyện tập`;
      case 111: return `Nhận <b>${effNameBoth(v)}</b> +${a}% cho mỗi cấp của khu luyện tập hiện tại`;
      case 112: return `${v}% cơ hội đưa tỷ lệ thất bại của buổi tập về 0%`;
      case 113: return `Nhận <b>${effNameBoth(v)}</b> ${fmt(v, a)} khi tham gia Luyện tập Tình bạn`;
      case 114: return `Nhận <b>${effNameBoth(v)}</b> theo Năng lượng hiện tại: từ +${a}% (0 Năng lượng) đến +${b}% (từ 100 Năng lượng)`;
      case 115: return `<b>Tất cả</b> support card trong đội nhận <b>${effNameBoth(v)}</b> ${fmt(v, a)}`;
      default:
        if (effById.has(e.type)) return effById.get(e.type).symbol === "none" && !v ? `<b>${effNameBoth(e.type)}</b>` : `<b>${effNameBoth(e.type)}</b> ${fmt(e.type, v)}`;
        return `Hiệu ứng đặc biệt (mã ${e.type})`;
    }
  }

  function chips(el, items, state, key, multi = false) {
    el.innerHTML = items.map(([v, label]) => `<button class="chip" data-v="${esc(v)}">${esc(label)}</button>`).join("");
    const sync = () => el.querySelectorAll(".chip").forEach((b) => b.classList.toggle("on", multi ? state[key].has(b.dataset.v) : state[key] === b.dataset.v));
    el.onclick = (ev) => {
      const b = ev.target.closest(".chip"); if (!b) return;
      const v = b.dataset.v;
      if (multi) state[key].has(v) ? state[key].delete(v) : state[key].add(v);
      else state[key] = state[key] === v ? "" : v;
      sync(); state.render();
    };
    sync();
  }

  // Nút "Bộ lọc" (chỉ hiện trên điện thoại): mở/đóng khung lọc, hiển thị số bộ lọc đang bật
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.onclick = () => btn.classList.toggle("open", $("#" + btn.dataset.for).classList.toggle("open"));
  });
  function setFilterCount(id, n) {
    const el = $(`.filter-btn[data-for="${id}"] .fcount`);
    if (el) el.textContent = n ? n : "";
  }

  /* ---------- Support cards tab ---------- */
  const cs = { q: "", type: "", rarity: "", render: renderCards };
  chips($("#card-type"), Object.entries(L.cardTypes), cs, "type");
  chips($("#card-rarity"), [["3", "SSR"], ["2", "SR"], ["1", "R"]], cs, "rarity");
  $("#card-q").oninput = (e) => { cs.q = e.target.value.trim().toLowerCase(); renderCards(); };

  function renderCards() {
    const list = D.cards.filter((c) =>
      (!cs.type || c.type === cs.type) &&
      (!cs.rarity || String(c.rarity) === cs.rarity) &&
      (!cs.q || `${c.name} ${c.title}`.toLowerCase().includes(cs.q)));
    $("#card-count").textContent = `${list.length} card`;
    setFilterCount("card-filters", (cs.type ? 1 : 0) + (cs.rarity ? 1 : 0));
    $("#card-grid").innerHTML = list.map((c) => `
      <div class="card-tile" data-card="${c.id}" data-type="${c.type}" title="${esc(c.name + " " + c.title)}">
        <img src="${cardImg(c)}" alt="" loading="lazy" width="132" height="176">
        <div class="nm">${esc(c.name)}</div>
        <div class="tl">${esc(c.title)}</div>
        <div class="bd">${rarBadge(c.rarity)} ${typeBadge(c.type)}</div>
      </div>`).join("");
  }

  function cardDetail(c) {
    const step = { 1: 20, 2: 25, 3: 30 }[c.rarity];
    const lbs = [0, 1, 2, 3, 4].map((i) => step + i * 5);
    const html = `
      <div class="cd-head">
        <img src="${cardImg(c)}" alt="">
        <div>
          <h2>${esc(c.name)}</h2>
          <div class="tl">${esc(c.title)}</div>
          <div class="meta">${rarBadge(c.rarity)} ${typeBadge(c.type)}
            <span class="badge">${esc(L.obtained[c.obtained] || c.obtained)}</span>
            <span class="badge">Ra mắt Global: ${esc(c.release || "?")}</span></div>
        </div>
      </div>
      <div class="lv-bar">
        <span class="lv">Lv <span id="lv-num">${c.maxLv}</span></span>
        <input type="range" id="lv" min="1" max="${c.maxLv}" value="${c.maxLv}">
        <div class="lb">${lbs.map((l, i) => `<button data-lv="${l}">${i === 4 ? "MLB" : "LB" + i}</button>`).join("")}</div>
      </div>
      <h4 class="sec">Hiệu ứng hỗ trợ</h4>
      <div class="eff-list" id="eff-list"></div>
      ${c.unique?.effects?.length ? `
        <h4 class="sec">Hiệu ứng Độc nhất <span class="badge">mở khóa ở Lv ${c.unique.level}</span></h4>
        <div class="unique-box"><ul>${c.unique.effects.map((e) => `<li>${uniqueText(e)}</li>`).join("")}</ul>
        <small>Các hiệu ứng thường được cộng thẳng vào bảng trên (đánh dấu ★) khi card đạt level mở khóa.</small></div>` : ""}
      ${c.hintOthers.length ? `<h4 class="sec">Gợi ý chỉ số (sự kiện "!")</h4>
        <div class="hint-stats">${c.hintOthers.map((h) => `<span class="badge">${esc(L.hintStats[h.hint_type] || "#" + h.hint_type)} +${h.hint_value}</span>`).join(" ")}</div>` : ""}
      <h4 class="sec">Kỹ năng gợi ý (Hint) · ${c.hintSkills.length}</h4>
      ${miniSkills(c.hintSkills)}
      <h4 class="sec">Kỹ năng từ sự kiện · ${c.eventSkills.length}</h4>
      ${miniSkills(c.eventSkills)}`;
    openModal(html, `${c.name} ${c.title}`);

    const lvInput = $("#lv");
    const update = () => {
      const lv = +lvInput.value;
      $("#lv-num").textContent = lv;
      document.querySelectorAll(".lb button").forEach((b) => b.classList.toggle("on", +b.dataset.lv === lv));
      const vals = new Map(c.effects.map((r) => [r[0], valueAt(r, lv)]));
      const boosted = new Set();
      if (c.unique && lv >= c.unique.level) for (const e of c.unique.effects) {
        if (e.type < 100 && effById.has(e.type) && e.value) { vals.set(e.type, (vals.get(e.type) || 0) + e.value); boosted.add(e.type); }
      }
      $("#eff-list").innerHTML = [...vals].map(([id, v]) => {
        const ef = effById.get(id);
        return `<div class="eff ${v ? "" : "zero"} ${boosted.has(id) ? "boost" : ""}">
          <span>${esc(effName(id))} <span class="q" title="${esc(ef?.viDesc || ef?.enDesc || "")}">?</span>
            ${ef?.en && ef.en !== ef.vi ? `<small class="en">${esc(ef.en)}</small>` : ""}</span>
          <span class="v">${v ? fmt(id, v) : "—"}</span></div>`;
      }).join("");
    };
    lvInput.oninput = update;
    $(".lb").onclick = (e) => { const b = e.target.closest("button"); if (b) { lvInput.value = b.dataset.lv; update(); } };
    update();
  }

  function miniSkills(ids) {
    if (!ids.length) return `<p class="count">Không có.</p>`;
    return `<div class="mini-skills">${ids.map((id) => skillById.get(id)).filter(Boolean).map((s) => `
      <div class="mini-skill" data-skill="${s.id}">
        <img src="${skillIcon(s)}" alt="" loading="lazy">
        <div>${esc(skillName(s))}<small>${esc(s.en)}</small></div>
      </div>`).join("")}</div>`;
  }

  /* ---------- Skills tab ---------- */
  const ss = { q: "", rarity: "", eff: "", sort: "default", tags: new Set(), render: renderSkills };
  const TAG_ORDER = ["run", "ldr", "btw", "cha", "sho", "mil", "med", "lng", "tur", "dir", "l_0", "l_1", "l_2", "l_3", "cor", "str", "slo", "f_c", "f_s"];
  chips($("#skill-tags"), TAG_ORDER.map((t) => [t, L.skillTags[t]]), ss, "tags", true);
  $("#skill-q").oninput = (e) => { ss.q = e.target.value.trim().toLowerCase(); renderSkills(); };
  $("#skill-rarity").onchange = (e) => { ss.rarity = e.target.value; renderSkills(); };
  $("#skill-eff").onchange = (e) => { ss.eff = e.target.value; renderSkills(); };
  $("#skill-sort").onchange = (e) => { ss.sort = e.target.value; renderSkills(); };
  const showEn = $("#show-en");
  // Mặc định: máy tính hiện mô tả EN, điện thoại ẩn cho gọn (tên EN luôn hiện)
  let savedEn = null;
  try { savedEn = localStorage.getItem("uma-show-en"); } catch {}
  showEn.checked = savedEn ? savedEn === "1" : !matchMedia("(max-width: 640px)").matches;
  const syncEn = () => document.body.classList.toggle("hide-en", !showEn.checked);
  showEn.onchange = () => { syncEn(); try { localStorage.setItem("uma-show-en", showEn.checked ? "1" : "0"); } catch {} };
  syncEn();

  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const searchIdx = new Map(D.skills.map((s) => [s.id, norm([s.vi, s.viDesc, s.en, s.enDesc, s.jp].join(" "))]));

  function matchEff(s) {
    if (!ss.eff) return true;
    if (ss.eff === "debuff") return s.debuff;
    if (ss.eff === "stat") return s.eff.some((t) => t >= 1 && t <= 5);
    if (ss.eff === "27") return !s.debuff && s.eff.some((t) => t === 27 || t === 21 || t === 22);
    return !s.debuff && s.eff.includes(+ss.eff);
  }

  function renderSkills() {
    const q = norm(ss.q);
    let list = D.skills.filter((s) =>
      (!ss.rarity || (ss.rarity === "u" ? isUnique(s) : String(s.rarity) === ss.rarity)) &&
      matchEff(s) &&
      [...ss.tags].every((t) => s.tags.includes(t)) &&
      (!q || searchIdx.get(s.id).includes(q)));
    if (ss.sort === "name") list = [...list].sort((a, b) => skillName(a).localeCompare(skillName(b), "vi"));
    if (ss.sort === "cost") list = [...list].sort((a, b) => (a.cost ?? 1e9) - (b.cost ?? 1e9));
    $("#skill-count").textContent = `${list.length} kỹ năng`;
    setFilterCount("skill-filters", (ss.rarity ? 1 : 0) + (ss.eff ? 1 : 0) + ss.tags.size);
    $("#skill-list").innerHTML = list.map(skillCard).join("");
  }

  function sources(ids, label) {
    if (!ids.length) return "";
    const shown = ids.slice(0, 10).map((id) => cardById.get(id)).filter(Boolean);
    return `<div class="src">${label}: ${shown.map((c) => `<img src="${cardImg(c)}" data-card="${c.id}" title="${esc(c.name + " " + c.title)}" loading="lazy" alt="">`).join("")}${ids.length > 10 ? ` +${ids.length - 10}` : ""}</div>`;
  }

  function skillCard(s) {
    const rc = isUnique(s) ? "rar-u" : `rar-${s.rarity}`;
    return `<article class="skill ${rc}">
      <img class="ic" src="${skillIcon(s)}" alt="" loading="lazy" width="48" height="48">
      <div>
        <h3>${esc(skillName(s))}</h3>
        <div class="en">${esc(s.en)}${s.jp ? " · " + esc(s.jp) : ""}</div>
        <p class="desc">${esc(s.viDesc || s.enDesc)}</p>
        ${s.viDesc ? `<p class="desc-en">${esc(s.enDesc)}</p>` : ""}
        <div class="meta">
          <span class="badge ${isUnique(s) ? "" : "r-" + s.rarity}">${esc(L.skillRarity[s.rarity] || "")}</span>
          ${s.cost != null ? `<span class="badge">${s.cost} SP</span>` : ""}
          ${s.debuff ? `<span class="badge">Gây bất lợi</span>` : ""}
          ${s.tags.filter((t) => L.skillTags[t] && t !== "dbf" && t !== "nac").map((t) => `<span class="badge">${esc(L.skillTags[t])}</span>`).join("")}
          ${s.vi ? "" : `<span class="badge untr">Chưa dịch</span>`}
        </div>
        ${sources(s.hint, "Gợi ý từ")}
        ${sources(s.event, "Sự kiện")}
      </div>
    </article>`;
  }

  /* ---------- Effects tab ---------- */
  function renderEffects() {
    $("#effect-table").innerHTML = D.effects.filter((e) => e.vi || e.en).map((e) => `
      <div class="effect-row">
        <h3>${esc(e.vi || e.en)}</h3>
        <div class="en">${esc(e.en || "")}</div>
        <p>${esc(e.viDesc || e.enDesc || "")}</p>
      </div>`).join("");
  }

  /* ---------- Modal & routing ---------- */
  const modal = $("#modal");
  function openModal(html, title = "") {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }
  $("#modal .close").onclick = () => modal.close();
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  modal.addEventListener("close", () => { if (/^#(card|skill)\//.test(location.hash)) history.replaceState(null, "", "#" + currentTab); });

  function skillDetail(s) {
    openModal(`
      <div class="sk-head"><img src="${skillIcon(s)}" alt="">
        <div><h2>${esc(skillName(s))}</h2><div class="count" style="margin:0">${esc(s.en)} · ${esc(s.jp || "")}</div></div></div>
      ${skillCard(s).replace('class="skill', 'style="margin-top:14px" class="skill')}
      <h4 class="sec">Card cho gợi ý (Hint) · ${s.hint.length}</h4>${cardRow(s.hint)}
      <h4 class="sec">Card cho qua sự kiện · ${s.event.length}</h4>${cardRow(s.event)}`, skillName(s));
  }
  const cardRow = (ids) => ids.length
    ? `<div class="card-grid">${ids.map((id) => cardById.get(id)).filter(Boolean).map((c) => `
        <div class="card-tile" data-card="${c.id}" data-type="${c.type}"><img src="${cardImg(c)}" alt="" loading="lazy">
          <div class="nm">${esc(c.name)}</div><div class="bd">${rarBadge(c.rarity)} ${typeBadge(c.type)}</div></div>`).join("")}</div>`
    : `<p class="count">Không có.</p>`;

  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-card]"), s = e.target.closest("[data-skill]");
    if (c) location.hash = `card/${c.dataset.card}`;
    else if (s) location.hash = `skill/${s.dataset.skill}`;
  });

  let currentTab = "cards";
  const rendered = {};
  function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + tab));
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
    if (!rendered[tab]) { rendered[tab] = true; ({ cards: renderCards, skills: renderSkills, effects: renderEffects })[tab](); }
  }
  function route() {
    const [kind, id] = location.hash.slice(1).split("/");
    // Mở chi tiết dạng popup, giữ nguyên tab đang xem phía sau
    if (kind === "card" && cardById.has(+id)) { if (!rendered[currentTab]) showTab(currentTab); cardDetail(cardById.get(+id)); return; }
    if (kind === "skill" && skillById.has(+id)) { if (!rendered[currentTab]) showTab(currentTab); skillDetail(skillById.get(+id)); return; }
    if (modal.open) modal.close();
    showTab(["cards", "skills", "effects"].includes(kind) ? kind : "cards");
  }
  addEventListener("hashchange", route);
  route();
})();

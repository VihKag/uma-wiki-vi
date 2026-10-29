// Cập nhật dữ liệu Umamusume Global từ GameTora và build ra site/data/data.js
// Chạy: node scripts/update.mjs            (tải dữ liệu mới + ảnh còn thiếu)
//       node scripts/update.mjs --offline  (chỉ build lại từ raw/ và i18n/, không tải)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "raw");
const I18N = path.join(ROOT, "i18n");
const SITE = path.join(ROOT, "site");
const BASE = "https://gametora.com";
const UA = { "User-Agent": "Mozilla/5.0 (UmaWiki-VI static builder)" };
const OFFLINE = process.argv.includes("--offline");
const REGION = "en"; // Global

const SOURCES = ["skills", "support-cards", "support_effects"];
// Mốc level tương ứng với 11 giá trị trong mảng effects của card
const LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const MAX_LEVEL = { 1: 40, 2: 45, 3: 50 };

async function getJSON(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (e) { if (fallback !== undefined) return fallback; throw e; }
}

async function fetchRaw() {
  const manifest = await getJSON(`${BASE}/data/manifests/umamusume.json`);
  await fs.mkdir(RAW, { recursive: true });
  for (const name of SOURCES) {
    const hash = manifest[name];
    if (!hash) throw new Error(`Manifest không còn mục "${name}" — cấu trúc GameTora có thể đã đổi`);
    const data = await getJSON(`${BASE}/data/umamusume/${name}.${hash}.json`);
    await fs.writeFile(path.join(RAW, `${name}.json`), JSON.stringify(data));
    console.log(`  ✓ ${name} (${hash}) — ${data.length} mục`);
  }
}

async function exists(f) { try { await fs.access(f); return true; } catch { return false; } }

// Tải ảnh còn thiếu, giới hạn số request song song
async function downloadAll(jobs, concurrency = 8) {
  const todo = [];
  for (const j of jobs) if (!(await exists(j.file))) todo.push(j);
  let done = 0, failed = [];
  const worker = async () => {
    while (todo.length) {
      const j = todo.shift();
      try {
        const res = await fetch(j.url, { headers: UA });
        if (!res.ok) throw new Error(res.status);
        await fs.mkdir(path.dirname(j.file), { recursive: true });
        await fs.writeFile(j.file, Buffer.from(await res.arrayBuffer()));
        done++;
      } catch (e) { failed.push(`${j.url} (${e.message})`); }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { done, failed };
}

const released = (x) => !(x.unreleased || []).includes(REGION);
const regional = (s, key) => s.loc?.[REGION]?.[key] ?? s[key] ?? [];

function build(skillsRaw, cardsRaw, effectsRaw, vi, viSkills) {
  const cards = cardsRaw.filter((c) => c[`release_${REGION}`]);
  const cardIds = new Set(cards.map((c) => c.support_id));
  const skills = skillsRaw.filter(released);

  // Danh sách hint/event theo dữ liệu riêng của Global (loc.en), đảo ngược thành card → skills
  const hintBy = {}, eventBy = {};
  for (const s of skills) {
    for (const id of regional(s, "sup_hint").flat()) if (cardIds.has(id)) (hintBy[id] ||= []).push(s.id);
    for (const id of regional(s, "sup_e").flat()) if (cardIds.has(id)) (eventBy[id] ||= []).push(s.id);
  }

  const missing = [];
  const outSkills = skills.map((s) => {
    const t = viSkills[s.id];
    if (!t) missing.push({ id: s.id, name: s.name_en, desc: s.desc_en });
    const effTypes = [...new Set((s.condition_groups || []).flatMap((g) => g.effects.map((e) => e.type)))];
    const negative = (s.condition_groups || []).some((g) => g.effects.some((e) => e.value < 0));
    return {
      id: s.id,
      icon: s.iconid,
      rarity: s.rarity,
      cost: s.cost ?? null,
      tags: s.type || [],
      eff: effTypes,
      debuff: negative || (s.type || []).includes("dbf"),
      en: s.name_en, enDesc: s.desc_en,
      jp: s.jpname,
      vi: t?.name ?? null, viDesc: t?.desc ?? null,
      hint: regional(s, "sup_hint").flat().filter((id) => cardIds.has(id)),
      event: regional(s, "sup_e").flat().filter((id) => cardIds.has(id)),
    };
  });

  const outCards = cards.map((c) => ({
    id: c.support_id,
    name: c.char_name,
    title: c[`title_${REGION}`] || c.title_ja,
    type: c.type,
    rarity: c.rarity,
    maxLv: MAX_LEVEL[c.rarity] || 50,
    obtained: c.obtained,
    release: c[`release_${REGION}`],
    effects: c.effects,
    unique: c.unique || null,
    hintOthers: (c.hints?.hint_others || []).filter((h) => h.hint_type != null),
    hintSkills: hintBy[c.support_id] || [],
    eventSkills: eventBy[c.support_id] || [],
  })).sort((a, b) => (b.release || "").localeCompare(a.release || "") || b.id - a.id);

  const outEffects = effectsRaw.map((e) => ({
    id: e.id,
    en: e.name_en_eon || e.name_en || null,
    enDesc: e.desc_en_eon || e.desc_en || null,
    symbol: e.symbol || "none",
    vi: vi.effects[e.id]?.name ?? null,
    viDesc: vi.effects[e.id]?.desc ?? null,
  }));

  return { skills: outSkills, cards: outCards, effects: outEffects, missing };
}

async function main() {
  console.log(`== Umamusume VI wiki — build dữ liệu ${REGION.toUpperCase()} ==`);
  if (!OFFLINE) {
    console.log("Tải dữ liệu từ GameTora…");
    await fetchRaw();
  }
  const [skillsRaw, cardsRaw, effectsRaw] = await Promise.all(
    SOURCES.map((n) => readJSON(path.join(RAW, `${n}.json`)))
  );
  const vi = await readJSON(path.join(I18N, "vi-base.json"));
  const viSkills = await readJSON(path.join(I18N, "vi-skills.json"), {});

  const data = build(skillsRaw, cardsRaw, effectsRaw, vi, viSkills);

  if (!OFFLINE) {
    console.log("Tải ảnh còn thiếu…");
    const jobs = [
      ...[...new Set(data.skills.map((s) => s.icon))].map((icon) => ({
        url: `${BASE}/images/umamusume/skill_icons/utx_ico_skill_${icon}.png`,
        file: path.join(SITE, "img", "skills", `${icon}.png`),
      })),
      ...data.cards.map((c) => ({
        url: `${BASE}/images/umamusume/supports/support_card_s_${c.id}.png`,
        file: path.join(SITE, "img", "cards", `${c.id}.png`),
      })),
    ];
    const { done, failed } = await downloadAll(jobs);
    console.log(`  ✓ tải mới ${done} ảnh${failed.length ? `, lỗi ${failed.length}:\n    ` + failed.join("\n    ") : ""}`);
  }

  const { missing, ...payload } = data;
  payload.meta = {
    region: REGION,
    builtAt: new Date().toISOString(),
    labels: { cardTypes: vi.cardTypes, obtained: vi.obtained, hintStats: vi.hintStats,
      skillRarity: vi.skillRarity, skillTags: vi.skillTags, skillEffects: vi.skillEffects },
    levels: LEVELS,
  };
  await fs.mkdir(path.join(SITE, "data"), { recursive: true });
  await fs.writeFile(path.join(SITE, "data", "data.js"),
    "// Tự động sinh bởi scripts/update.mjs — đừng sửa tay\nwindow.UMA = " + JSON.stringify(payload) + ";\n");

  await fs.writeFile(path.join(I18N, "missing-skills.json"), JSON.stringify(missing, null, 1));
  console.log(`Xong: ${payload.cards.length} card, ${payload.skills.length} kỹ năng.`);
  if (missing.length) {
    console.log(`⚠ ${missing.length} kỹ năng chưa có bản dịch → i18n/missing-skills.json (web sẽ hiển thị tiếng Anh).`);
    console.log("  Dịch xong thì thêm vào i18n/vi-skills.json rồi chạy lại: node scripts/update.mjs --offline");
  }
}

main().catch((e) => { console.error("LỖI:", e.message); process.exit(1); });

/* ometeo — données Open-Meteo, zéro dépendance */

const API = 'https://api.open-meteo.com/v1/forecast';
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const REV = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const DEFAULT_PLACE = {
  name: 'Bruxelles', admin: 'Bruxelles-Capitale', country: 'BE',
  lat: 50.85045, lon: 4.34878, tz: 'Europe/Brussels'
};

const $ = (s, r = document) => r.querySelector(s);

const app      = $('#app');
const placeEl  = $('#placeName');
const clockEl  = $('#clock');
const unitBtn  = $('#unitBtn');
const refresh  = $('#refreshBtn');
const notice   = $('#notice');
const noticeTx = $('#noticeText');
const noticeBt = $('#noticeBtn');
const hero     = $('#hero');
const hoursEl  = $('#hours');
const daysEl   = $('#days');
const details  = $('#details');
const footMeta = $('#footMeta');
const sheet    = $('#sheet');
const searchEl = $('#search');
const results  = $('#results');
const themeBtn   = $('#themeBtn');
const themeSheet = $('#themeSheet');
const themeList  = $('#themeList');

const state = {
  place: read('place') || null,
  unit: read('unit') || 'C',
  theme: read('theme') || 'aether',
  kind: 'clear',
  data: null,
  at: 0,
  busy: false
};

/* ── stockage ─────────────────────────────────────────────── */

function read(k) {
  try { const v = localStorage.getItem('ometeo.' + k); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function write(k, v) {
  try { localStorage.setItem('ometeo.' + k, JSON.stringify(v)); } catch {}
}
const samePlace = (a, b) => a && b && Math.abs(a.lat - b.lat) < 0.001 && Math.abs(a.lon - b.lon) < 0.001;

/* ── météo : codes WMO ────────────────────────────────────── */

const WMO = {
  0:  ['Ciel dégagé', 'clear'],
  1:  ['Peu nuageux', 'partly'],
  2:  ['Nuageux', 'partly'],
  3:  ['Couvert', 'cloud'],
  45: ['Brouillard', 'fog'],
  48: ['Brouillard givrant', 'fog'],
  51: ['Bruine légère', 'drizzle'],
  53: ['Bruine', 'drizzle'],
  55: ['Bruine dense', 'drizzle'],
  56: ['Bruine verglaçante', 'drizzle'],
  57: ['Bruine verglaçante', 'drizzle'],
  61: ['Pluie faible', 'rain'],
  63: ['Pluie', 'rain'],
  65: ['Forte pluie', 'rain'],
  66: ['Pluie verglaçante', 'rain'],
  67: ['Pluie verglaçante', 'rain'],
  71: ['Neige faible', 'snow'],
  73: ['Neige', 'snow'],
  75: ['Forte neige', 'snow'],
  77: ['Grains de neige', 'snow'],
  80: ['Averses', 'rain'],
  81: ['Averses', 'rain'],
  82: ['Fortes averses', 'rain'],
  85: ['Averses de neige', 'snow'],
  86: ['Averses de neige', 'snow'],
  95: ['Orage', 'thunder'],
  96: ['Orage grêleux', 'thunder'],
  99: ['Orage grêleux', 'thunder']
};
const NIGHT = { 0: 'Ciel clair', 1: 'Peu nuageux', 2: 'Nuageux' };

function weather(code, isDay = 1) {
  const hit = WMO[code] || ['—', 'cloud'];
  let kind = hit[1];
  let label = hit[0];
  if (!isDay && NIGHT[code]) label = NIGHT[code];
  if (!isDay && kind === 'clear') kind = 'moon';
  if (!isDay && kind === 'partly') kind = 'partlyNight';
  return { label, kind };
}

/* ── icônes ───────────────────────────────────────────────── */

const CLOUD = 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z';

const ICONS = {
  clear: `<circle cx="12" cy="12" r="4.1"/><path d="M12 2.9v2.2M12 18.9v2.2M2.9 12h2.2M18.9 12h2.2M5.6 5.6L7.2 7.2M16.8 16.8l1.6 1.6M18.4 5.6L16.8 7.2M7.2 16.8l-1.6 1.6"/>`,
  moon: `<path d="M20.4 14.4A8.6 8.6 0 0 1 9.6 3.6a8.6 8.6 0 1 0 10.8 10.8z"/>`,
  partly: `<g><circle cx="7.8" cy="6.8" r="3.2"/><path d="M7.8 1.4v1.7M2.4 6.8h1.7M3.9 2.9l1.2 1.2"/></g><g transform="translate(6.6 8) scale(.6)"><path d="${CLOUD}"/></g>`,
  partlyNight: `<g transform="translate(2.2 1.2) scale(.55)"><path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5 8.6 8.6 0 1 0 20.5 14.3z"/></g><g transform="translate(6.6 8) scale(.6)"><path d="${CLOUD}"/></g>`,
  cloud: `<g transform="translate(1.6 -.6) scale(.85)"><path d="${CLOUD}"/></g>`,
  fog: `<g transform="translate(2.4 -5.4) scale(.7)"><path d="${CLOUD}"/></g><path d="M4.6 17.6h14.8M6.8 21.2h10.4"/>`,
  drizzle: `<g transform="translate(2.4 -5.4) scale(.7)"><path d="${CLOUD}"/></g><path d="M8.4 18.8v2M12 18.8v2.6M15.6 18.8v2"/>`,
  rain: `<g transform="translate(2.4 -5.4) scale(.7)"><path d="${CLOUD}"/></g><path d="M8.6 18.3l-1 3.4M12.4 18.3l-1 3.4M16.2 18.3l-1 3.4"/>`,
  snow: `<g transform="translate(2.4 -5.4) scale(.7)"><path d="${CLOUD}"/></g><g><path d="M8 18.4v3.2M6.6 19.2l2.8 1.6M9.4 19.2l-2.8 1.6"/><path d="M12.4 18.4v3.2M11 19.2l2.8 1.6M13.8 19.2l-2.8 1.6"/><path d="M16.8 18.4v3.2M15.4 19.2l2.8 1.6M18.2 19.2l-2.8 1.6"/></g>`,
  thunder: `<g transform="translate(2.4 -5.4) scale(.7)"><path d="${CLOUD}"/></g><path d="M13.4 15.4l-3.2 4.9h2.6l-.7 3.2 3.6-5.2h-2.7l.4-2.9z"/>`
};

const svg = (kind) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind] || ICONS.cloud}</svg>`;

/* ── unités & formats ─────────────────────────────────────── */

const MINUS = '\u2212';

function conv(c) { return state.unit === 'F' ? c * 9 / 5 + 32 : c; }

function deg(c, plus = false) {
  if (c == null || Number.isNaN(c)) return '—';
  const v = Math.round(conv(c));
  const s = v < 0 ? MINUS + Math.abs(v) : (plus && v > 0 ? '+' + v : '' + v);
  return s + '°';
}

const num = (v) => (v == null || Number.isNaN(v)) ? '—' : Math.round(v).toString();

// "2026-11-26T17:00" -> repère UTC (affiché tel quel avec timeZone: 'UTC')
function stamp(s) {
  if (!s) return 0;
  const [d, t] = s.split('T');
  const [Y, M, D] = d.split('-').map(Number);
  const [h, m] = t.split(':').map(Number);
  return Date.UTC(Y, M - 1, D, h, m);
}

function fmt(s, opts) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts }).format(new Date(stamp(s)));
}

const hhmm = (s) => fmt(s, { hour: '2-digit', minute: '2-digit' });

/* ── réseau ───────────────────────────────────────────────── */

function forecastURL(p) {
  const u = new URL(API);
  u.searchParams.set('latitude', p.lat);
  u.searchParams.set('longitude', p.lon);
  u.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m');
  u.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,is_day,visibility');
  u.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max');
  u.searchParams.set('timezone', 'auto');
  u.searchParams.set('forecast_days', '7');
  u.searchParams.set('wind_speed_unit', 'kmh');
  return u.toString();
}

let seq = 0;

async function load({ first = false } = {}) {
  if (!state.place) return;
  const mine = ++seq;
  state.busy = true;
  refresh.classList.add('loading');
  if (first && !state.data) skeleton();

  try {
    const r = await fetch(forecastURL(state.place), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (mine !== seq) return;

    state.data = data;
    state.at = Date.now();
    state.place.tz = data.timezone || state.place.tz;
    write('place', state.place);
    write('cache', { place: state.place, data, at: state.at });

    notice.hidden = true;
    paint();
  } catch (e) {
    if (mine !== seq) return;
    if (state.data) {
      noticeTx.textContent = 'Hors ligne · ' + clockOf(state.at);
      notice.hidden = false;
    } else {
      fail();
    }
  } finally {
    if (mine === seq) {
      state.busy = false;
      refresh.classList.remove('loading');
    }
  }
}

/* ── position ─────────────────────────────────────────────── */

function geolocate() {
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error('no geo'));
    navigator.geolocation.getCurrentPosition(ok, ko, {
      enableHighAccuracy: false, timeout: 9000, maximumAge: 600000
    });
  });
}

async function locate() {
  const pos = await geolocate();
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const p = { name: 'Ma position', admin: '', country: '', lat, lon, tz: null };
  try {
    const j = await fetch(`${REV}?latitude=${lat}&longitude=${lon}&localityLanguage=fr`).then(r => r.json());
    p.name = j.city || j.locality || j.principalSubdivision || 'Ma position';
    p.admin = j.principalSubdivision || '';
    p.country = j.countryCode || '';
  } catch {}
  return p;
}

/* ── rendu ────────────────────────────────────────────────── */

function skeleton() {
  const cell = '<div class="sk" style="height:24px"></div>';
  hero.innerHTML = `
    <div class="sk" style="width:38%;height:8px;margin-bottom:20px"></div>
    <div class="sk" style="width:54%;height:64px"></div>
    <div class="sk" style="width:44%;height:9px;margin-top:18px"></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px 0;border-top:1px solid var(--line);margin-top:24px">${cell.repeat(4)}</div>`;

  hoursEl.innerHTML = `<div class="sec-head"><h3>24 heures</h3><span class="rule"></span></div>
    <div style="display:flex;gap:14px;padding:16px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:8px">
      ${'<div class="sk" style="flex:0 0 34px;height:74px"></div>'.repeat(9)}
    </div>`;

  daysEl.innerHTML = `<div class="sec-head"><h3>7 jours</h3><span class="rule"></span></div>
    <div class="days">${'<div class="sk" style="height:20px;margin:10px 0"></div>'.repeat(6)}</div>`;

  details.innerHTML = `<div class="sec-head"><h3>Détails</h3><span class="rule"></span></div>
    <div class="kv">${'<div><div class="sk" style="height:12px;width:100%"></div></div>'.repeat(5)}</div>`;

  footMeta.textContent = 'Synchronisation';
}

function fail() {
  hero.innerHTML = `
    <div class="date">Ometeo</div>
    <div style="padding:16px 0 6px;font-size:13px;color:var(--fg-2);line-height:1.7">
      La météo n’a pas pu être chargée.<br>
      <span style="color:var(--dim)">Vérifiez la connexion, puis réessayez.</span>
    </div>
    <button class="retry" type="button" onclick="location.reload()">Réessayer</button>`;
  hoursEl.innerHTML = '';
  daysEl.innerHTML = '';
  details.innerHTML = '';
  footMeta.textContent = 'Hors ligne';
}

function paint() {
  if (!state.data || !state.place) return;
  paintPlace();
  paintHero();
  paintHours();
  paintDays();
  paintDetails();
  paintFoot();
  tick();
}

function paintPlace() {
  placeEl.textContent = state.place.name;
}

function paintHero() {
  const d = state.data;
  const cur = d.current;
  const day = d.daily;
  const w = weather(cur.weather_code, cur.is_day);

  state.kind = w.kind;
  paintTint(w.kind);

  const dt = new Date(stamp(cur.time));
  const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }).format(dt).replace('.', '');
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(dt).replace('.', '');

  const windCard = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((cur.wind_direction_10m % 360) / 45)) % 8];

  hero.innerHTML = `
    <div class="hero-top">
      <div>
        <div class="date">${weekday} ${date} · ${hhmm(cur.time)}</div>
        <div class="temp"><span class="num">${deg(cur.temperature_2m).replace('°', '').replace('−', '<span class="minus">−</span>')}</span><span class="deg">°</span></div>
        <div class="cond"><b>${w.label}</b><span class="feels"><span class="sep">·</span>ressenti ${deg(cur.apparent_temperature)}</span></div>
      </div>
      <div class="hero-icon">${svg(w.kind)}</div>
    </div>
    <div class="hero-foot">
      <div class="hf"><span>MIN</span><b>${deg(day.temperature_2m_min[0])}</b></div>
      <div class="hf"><span>MAX</span><b>${deg(day.temperature_2m_max[0])}</b></div>
      <div class="hf"><span>PLUIE</span><b>${num(day.precipitation_probability_max[0])}<small>%</small></b></div>
      <div class="hf"><span>VENT</span><b>${num(cur.wind_speed_10m)}<small>km/h</small></b></div>
    </div>`;
}

/* halo du haut : froid pour l'eau, accent pour le ciel */
const COOL = ['rain', 'drizzle', 'snow', 'fog', 'thunder', 'cloud'];

function paintTint(kind) {
  const v = COOL.includes(kind) ? 'cold' : 'accent-2';
  app.style.setProperty('--tint', `color-mix(in srgb, var(--${v}) 20%, transparent)`);
}

function paintHours() {
  const d = state.data;
  const off = (d.utc_offset_seconds || 0) * 1000;
  const nowLocal = Date.now() + off;
  const times = d.hourly.time;
  let i = times.findIndex(t => stamp(t) + 3600e3 > nowLocal);
  if (i < 0) i = 0;

  const cells = [];
  for (let k = i; k < Math.min(i + 24, times.length); k++) {
    const t = times[k];
    const hour = +t.slice(11, 13);
    const w = weather(d.hourly.weather_code[k], d.hourly.is_day[k]);
    const p = Math.round(d.hourly.precipitation_probability[k] || 0);
    cells.push(`
      <div class="hour${k === i ? ' now' : ''}">
        <span class="h">${k === i ? 'MNT' : hour + 'h'}</span>
        <span class="ico">${svg(w.kind)}</span>
        <span class="t">${deg(d.hourly.temperature_2m[k])}</span>
        <span class="gauge"><i style="height:${p}%"></i></span>
        <span class="p">${p ? p + '%' : '·'}</span>
      </div>`);
  }

  hoursEl.innerHTML = `
    <div class="sec-head"><h3>24 heures</h3><span class="rule"></span><span class="tag">PRÉCIP.</span></div>
    <div class="hours">${cells.join('')}</div>`;
}

function paintDays() {
  const d = state.data;
  const day = d.daily;
  const n = day.time.length;

  const lo = Math.min(...day.temperature_2m_min);
  const hi = Math.max(...day.temperature_2m_max);
  const span = Math.max(hi - lo, 1);

  const rows = [];
  for (let k = 0; k < n; k++) {
    const dt = new Date(stamp(day.time[k] + 'T12:00'));
    let label = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' })
      .format(dt).replace('.', '');
    if (k === 0) label = 'AUJ';
    else if (k === 1) label = 'DEM';

    const w = weather(day.weather_code[k], 1);
    const pop = Math.round(day.precipitation_probability_max[k] || 0);
    const a = (day.temperature_2m_min[k] - lo) / span * 100;
    const b = (day.temperature_2m_max[k] - lo) / span * 100;
    const now = k === 0
      ? Math.min(Math.max((d.current.temperature_2m - lo) / span * 100, 1), 99) : null;

    rows.push(`
      <div class="day${k === 0 ? ' today' : ''}">
        <span class="d">${label}</span>
        <span class="ico">${svg(w.kind)}</span>
        <span class="pop${pop >= 30 ? ' has' : ''}">${pop ? pop + '%' : ''}</span>
        <span class="lo">${deg(day.temperature_2m_min[k])}</span>
        <span class="range"><i style="left:${a}%;width:${Math.max(b - a, 2)}%"></i>${now != null ? `<u style="left:${now}%"></u>` : ''}</span>
        <span class="hi">${deg(day.temperature_2m_max[k])}</span>
      </div>`);
  }

  daysEl.innerHTML = `
    <div class="sec-head"><h3>7 jours</h3><span class="rule"></span><span class="tag">MIN / MAX</span></div>
    <div class="days">${rows.join('')}</div>`;
}

function paintDetails() {
  const d = state.data;
  const cur = d.current;
  const day = d.daily;

  const off = (d.utc_offset_seconds || 0) * 1000;
  const nowLocal = Date.now() + off;
  const times = d.hourly.time;
  let hi = times.findIndex(t => stamp(t) + 3600e3 > nowLocal);
  if (hi < 0) hi = 0;
  const vis = d.hourly.visibility?.[hi];
  const uv = day.uv_index_max?.[0];
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const dir = dirs[Math.round(((cur.wind_direction_10m % 360) / 45)) % 8];

  const uvTxt = uv == null ? '—'
    : `${uv.toFixed(1).replace('.', ',')} <em>${uv < 3 ? 'faible' : uv < 6 ? 'modéré' : uv < 8 ? 'fort' : 'très fort'}</em>`;

  const rows = [
    ['Ressenti', deg(cur.apparent_temperature)],
    ['Vent', `<span class="arrow" style="transform:rotate(${(cur.wind_direction_10m + 180) % 360}deg)">↑</span>${num(cur.wind_speed_10m)} km/h <em>${dir}</em>`],
    ['Rafales', `${num(cur.wind_gusts_10m)} km/h`],
    ['Humidité', `${num(cur.relative_humidity_2m)} %`],
    ['Pression', `${num(cur.pressure_msl)} hPa`],
    ['Visibilité', vis == null ? '—' : `${(vis / 1000).toFixed(1).replace('.', ',')} km`],
    ['Nuages', `${num(cur.cloud_cover)} %`],
    ['UV', uvTxt],
    ['Soleil', `<em>lever</em> ${hhmm(day.sunrise[0])} <em style="margin:0 7px">·</em> <em>coucher</em> ${hhmm(day.sunset[0])}`]
  ];

  details.innerHTML = `
    <div class="sec-head"><h3>Détails</h3><span class="rule"></span><span class="tag">${state.place.name.toUpperCase()}</span></div>
    <dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

function paintFoot() {
  footMeta.textContent = `Open-Meteo · mis à jour ${clockOf(state.at)}`;
}

/* ── horloge du lieu ──────────────────────────────────────── */

function clockOf(ts) {
  const tz = state.place?.tz || undefined;
  try {
    return new Date(ts).toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}

function tick() {
  clockEl.textContent = clockOf(Date.now());
}

/* ── unité ────────────────────────────────────────────────── */

function setUnit() {
  unitBtn.textContent = '°' + state.unit;
  write('unit', state.unit);
}

unitBtn.addEventListener('click', () => {
  state.unit = state.unit === 'C' ? 'F' : 'C';
  setUnit();
  if (state.data) { paintHero(); paintHours(); paintDays(); paintDetails(); }
});

refresh.addEventListener('click', () => load());

noticeBt.addEventListener('click', () => load());

/* ── thèmes ───────────────────────────────────────────────── */

const THEMES = [
  { id: 'aether',     name: 'Aether',       tone: 'violet',  bg: '#00040C', accent: '#7774B6', fg: '#F1DDFF' },
  { id: 'lumon',      name: 'Lumon',        tone: 'glacé',   bg: '#16242D', accent: '#6FB8E3', fg: '#D6E2EE' },
  { id: 'black-sand', name: 'Black Sand',   tone: 'acier',   bg: '#14181E', accent: '#8EA7C2', fg: '#CED6E0' },
  { id: 'tokyorain',  name: 'Tokyo Rain',   tone: 'cyan',    bg: '#0C0B0D', accent: '#A4E5FF', fg: '#F2F1EC' },
  { id: 'forest',     name: 'Forest Night', tone: 'vert',    bg: '#1A2125', accent: '#4ECDC4', fg: '#C9D1D9' },
  { id: 'dusk',       name: 'Dusk',         tone: 'sable',   bg: '#0E1720', accent: '#C8CD94', fg: '#D5CEB1' }
];

function applyTheme(id, save = true) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  state.theme = t.id;
  document.documentElement.dataset.theme = t.id;
  if (save) write('theme', t.id);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.bg);

  paintTint(state.kind);
  renderThemes();
}

function renderThemes() {
  themeList.innerHTML = THEMES.map((t) => `
    <li>
      <button type="button" data-theme-id="${t.id}"${t.id === state.theme ? ' aria-current="true"' : ''}>
        <span class="swatch" aria-hidden="true">
          <i style="background:${t.bg}"></i>
          <i style="background:${t.accent}"></i>
          <i style="background:${t.fg}"></i>
        </span>
        <span class="tn">${t.name}</span>
        <span class="td">${t.tone}</span>
        <svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
      </button>
    </li>`).join('');
}

themeList.addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme-id]');
  if (b) applyTheme(b.dataset.themeId);
});

function openThemes() {
  themeSheet.classList.add('open');
  themeSheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeThemes() {
  themeSheet.classList.remove('open');
  themeSheet.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

themeBtn.addEventListener('click', openThemes);
themeSheet.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-theme]')) closeThemes();
});

/* ── feuille « lieu » ─────────────────────────────────────── */

function openSheet() {
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => searchEl.focus(), 80);
}

function closeSheet() {
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  searchEl.blur();
}

$('#locBtn').addEventListener('click', openSheet);
sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeSheet(); closeThemes(); }
});

results.innerHTML = '<li class="empty">Tapez le nom d’une ville</li>';

let searchTimer, searchCtl;

searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchEl.value.trim();
  if (q.length < 2) {
    results.innerHTML = '<li class="empty">Deux lettres minimum</li>';
    return;
  }
  searchTimer = setTimeout(() => runSearch(q), 260);
});

searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = searchEl.value.trim();
    if (q.length >= 2) { clearTimeout(searchTimer); runSearch(q); }
  }
});

async function runSearch(q) {
  searchCtl?.abort();
  searchCtl = new AbortController();
  results.innerHTML = '<li class="empty">Recherche…</li>';

  try {
    const r = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=8&language=fr&format=json`, { signal: searchCtl.signal });
    const j = await r.json();
    const list = j.results || [];
    if (!list.length) {
      results.innerHTML = '<li class="empty">Aucun résultat</li>';
      return;
    }
    results.innerHTML = list.map((c, i) => `
      <li><button type="button" data-i="${i}">
        <span class="rn">${esc(c.name)}</span>
        <span class="rm">${esc([c.admin1, c.country_code].filter(Boolean).join(' · '))}</span>
      </button></li>`).join('');

    results.querySelectorAll('button[data-i]').forEach(b => {
      b.addEventListener('click', () => {
        const c = list[+b.dataset.i];
        pick({
          name: c.name,
          admin: c.admin1 || '',
          country: c.country_code || '',
          lat: c.latitude,
          lon: c.longitude,
          tz: c.timezone || null
        });
      });
    });
  } catch (e) {
    if (e.name !== 'AbortError') results.innerHTML = '<li class="empty">Recherche indisponible</li>';
  }
}

function pick(place) {
  closeSheet();
  searchEl.value = '';
  results.innerHTML = '<li class="empty">Tapez le nom d’une ville</li>';
  state.place = place;
  state.data = null;
  state.at = 0;
  write('place', place);
  paintPlace();
  skeleton();
  load({ first: true });
}

$('#geoBtn').addEventListener('click', async () => {
  closeSheet();
  try {
    const p = await locate();
    pick(p);
  } catch {
    noticeTx.textContent = 'Position indisponible · autorisez la géolocalisation';
    notice.hidden = false;
  }
});

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

/* ── démarrage ────────────────────────────────────────────── */

async function init() {
  applyTheme(state.theme, false);

  const cache = read('cache');
  const hasCache = cache?.data && state.place && samePlace(cache.place, state.place);

  if (hasCache) {
    state.data = cache.data;
    state.at = cache.at || 0;
    paint();
  } else {
    skeleton();
  }

  if (!state.place) {
    // On laisse 4 s à la géoloc, sinon on part sur Bruxelles : l'app s'affiche vite.
    const p = await Promise.race([
      locate().catch(() => null),
      new Promise((ok) => setTimeout(() => ok(null), 4000))
    ]);
    state.place = p || DEFAULT_PLACE;
    write('place', state.place);
  }

  setUnit();
  paintPlace();
  await load({ first: !hasCache });
  tick();

  setInterval(tick, 20000);
  setInterval(() => load({ quiet: true }), 600000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { tick(); load({ quiet: true }); }
  });
}

init();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

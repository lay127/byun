'use strict';
/* ==========================================================
   Byun: o gatinho que cuida (e julga) os seus gastos
   Tudo fica salvo no próprio aparelho (localStorage).
   ========================================================== */

const KEY = 'byun.v1';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MES3 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const BANKS = [
  // [chave, nome, cor, rendimento sugerido da conta/caixinha]
  ['nubank', 'Nubank', '#820ad1', { rateType: 'cdi', rate: '100', info: 'Caixinhas do Nubank rendem em torno de 100% do CDI' }],
  ['mercadopago', 'Mercado Pago', '#00a6e0', { rateType: 'cdi', rate: '100', info: 'Conta remunerada do Mercado Pago rende em torno de 100% do CDI' }],
  ['inter', 'Inter', '#ff7a00', { rateType: 'cdi', rate: '100', info: 'Porquinho/CDB liquidez diária do Inter, em torno de 100% do CDI' }],
  ['c6', 'C6 Bank', '#242424', { rateType: 'cdi', rate: '100', info: 'CDB do C6, em torno de 100% do CDI' }],
  ['picpay', 'PicPay', '#11c76f', { rateType: 'cdi', rate: '102', info: 'Cofrinhos do PicPay, em torno de 102% do CDI' }],
  ['pagbank', 'PagBank', '#1bb99a', { rateType: 'cdi', rate: '100', info: 'Conta do PagBank, em torno de 100% do CDI' }],
  ['santander', 'Santander', '#e30613', { rateType: 'ano', rate: '6.17', info: 'Poupança: 0,5% ao mês + TR (cerca de 6,17% ao ano)' }],
  ['itau', 'Itaú', '#ec7000', { rateType: 'ano', rate: '6.17', info: 'Poupança: 0,5% ao mês + TR (cerca de 6,17% ao ano)' }],
  ['bradesco', 'Bradesco', '#cc092f', { rateType: 'ano', rate: '6.17', info: 'Poupança: 0,5% ao mês + TR (cerca de 6,17% ao ano)' }],
  ['bb', 'Banco do Brasil', '#2a5bd7', { rateType: 'ano', rate: '6.17', info: 'Poupança: 0,5% ao mês + TR (cerca de 6,17% ao ano)' }],
  ['caixa', 'Caixa', '#005ca9', { rateType: 'ano', rate: '6.17', info: 'Poupança: 0,5% ao mês + TR (cerca de 6,17% ao ano)' }],
  ['btg', 'BTG Pactual', '#0b2341', { rateType: 'cdi', rate: '100', info: 'CDB liquidez diária, em torno de 100% do CDI' }],
  ['xp', 'XP', '#111111', { rateType: 'cdi', rate: '100', info: 'CDB liquidez diária, em torno de 100% do CDI' }],
  ['neon', 'Neon', '#0bb5c4', { rateType: 'cdi', rate: '100', info: 'Em torno de 100% do CDI' }],
  ['sicoob', 'Sicoob', '#00ae9d', { rateType: 'cdi', rate: '100', info: 'Em torno de 100% do CDI' }],
  ['sicredi', 'Sicredi', '#3fa110', { rateType: 'cdi', rate: '100', info: 'Em torno de 100% do CDI' }],
  ['outro', 'Outro banco', '#6b6b6b', { rateType: 'cdi', rate: '100', info: 'Sem sugestão: confira no app do banco' }]
];
const bankOf = k => BANKS.find(b => b[0] === k) || BANKS[BANKS.length - 1];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function guessBank(name) { const n = norm(name).replace(/\s/g, ''); const b = BANKS.find(([k, nm]) => k !== 'outro' && (n.includes(k) || n.includes(norm(nm).replace(/\s/g, '')))); return b ? b[0] : 'outro'; }
function sortAccounts() {
  const idx = k => BANKS.findIndex(b => b[0] === k);
  S.accounts.forEach(a => { if (!a.bank) a.bank = guessBank(a.name); });
  S.accounts.sort((a, b) => idx(a.bank) - idx(b.bank) || (a.type === 'credito') - (b.type === 'credito') || a.name.localeCompare(b.name));
}
const ACC_COLORS = ['#0b0b0b','#1f5a3a','#00a6e0','#820ad1','#5b0896','#e30613','#ff7a00','#2a78d6','#c9a227','#6b6b6b'];

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const curKey = () => todayISO().slice(0, 7);
const addMonths = (key, n) => { let [y, m] = key.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
const dim = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const monthName = key => MESES[+key.slice(5) - 1];
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let HIDE = false; try { HIDE = localStorage.getItem('byun.hide') === '1'; } catch (e) { }
const MASK = 'R$ ••••';
let HIDE_CARDS = new Set(); try { HIDE_CARDS = new Set(JSON.parse(localStorage.getItem('byun.hideCards') || '[]')); } catch (e) { }
// desenha um card com os valores escondidos se o olhinho dele estiver fechado (ou o global)
function withHide(key, fn) {
  const prev = HIDE; if (HIDE_CARDS.has(key)) HIDE = true;
  try {
    const html = fn();
    const eye = `<button class="eye-btn" data-a="hideCard" data-v="${key}" aria-label="${HIDE ? 'Mostrar valores deste card' : 'Esconder valores deste card'}">${ic(HIDE ? 'eyeOff' : 'eye')}</button>`;
    return html.includes('<div class="card-h">') ? html.replace('<div class="card-h">', '<div class="card-h">' + eye) : html.replace('<!--eye-->', eye);
  } finally { HIDE = prev; }
}
const fmt = v => HIDE ? MASK : brl.format(v || 0).replace(/\u00a0/g, ' ');
const fmt0 = v => HIDE ? MASK : 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
const short = v => { if (HIDE) return '•••'; const a = Math.abs(v); if (a >= 1000) return (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'; return Math.round(v).toString(); };
const sum = (arr, f = x => x.amount) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
function money(v, cls = '') {
  if (HIDE) return `<span class="money masked ${cls}">R$ ••••</span>`;
  const s = fmt(Math.abs(v)); const i = s.lastIndexOf(',');
  return `<span class="money ${cls}">${v < 0 ? '-' : ''}${s.slice(0, i)}<small>${s.slice(i)}</small></span>`;
}
function parseMoney(s) {
  s = String(s ?? '').trim().replace(/[^\d,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
const moneyInput = v => v ? (+v).toFixed(2).replace('.', ',') : '';
function dayLabel(iso) {
  const t = todayISO(); const y = new Date(); y.setDate(y.getDate() - 1);
  const yi = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  if (iso === t) return 'Hoje'; if (iso === yi) return 'Ontem';
  const [a, b, c] = iso.split('-').map(Number);
  return new Date(a, b - 1, c).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}

/* ---------- ícones ---------- */
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pie: '<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  house: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  arrowUp: '<path d="M7 17 17 7M8 7h9v9"/>', arrowDown: '<path d="M17 7 7 17M16 17H7V8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  piggy: '<path d="M19 9c1 0 2 1 2 2v2h-2l-1 2v3h-3v-2h-4v2H8v-3a6 6 0 0 1 3-11h4a6 6 0 0 1 4 1z"/><circle cx="15" cy="10" r=".6"/>'
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

/* ---------- estado ---------- */
function defaultState() {
  const cats = [
    ['Mercado e alimentação', '🛒', 400], ['Restaurantes e delivery', '🍔', 200], ['Transporte', '🚌', 200],
    ['Lazer e compras', '🛍️', 100], ['Saúde e imprevistos', '💊', 84], ['Moradia', '🏠', 0], ['Contas e celular', '📱', 0]
  ].map((c, i) => ({ id: uid(), name: c[0], icon: c[1], limit: c[2], color: i % 8 }));
  const accs = [
    ['Mercado Pago', 'conta', '#00a6e0'], ['Nubank', 'conta', '#820ad1'],
    ['Cartão Nubank', 'credito', '#5b0896'], ['Santander', 'conta', '#e30613']
  ].map(a => ({ id: uid(), name: a[0], type: a[1], color: a[2], bank: guessBank(a[0]), limit: a[1] === 'credito' ? 1500 : 0, closing: a[1] === 'credito' ? 3 : 0, due: a[1] === 'credito' ? 10 : 0 }));
  return {
    v: 1, onboarded: false, name: '', theme: 'light', follow: true, sass: true, housingRef: 30,
    categories: cats, accounts: accs, housingCat: cats[5].id, defaultAcc: accs[0].id,
    tx: [], fixed: [], fixedPaid: {}, extras: [], lastAdded: null, boxes: [], moves: [], cdi: 13.65
  };
}
/* ---------- nuvem (Supabase) ---------- */
const CFG = window.BYUN_CONFIG || {};
const CLOUD = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);
let sb = null, user = null, isAdmin = false;
const sync = { state: 'local', timer: null, dirty: false, busy: false };
if (CLOUD) {
  try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }); }
  catch (e) { console.error(e); }
}
const localKey = () => (CLOUD && user) ? `${KEY}.${user.id}` : KEY;
function readKey(k) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function migrate(s) {
  if (!s.motion) s.motion = s.follow === false ? 'still' : 'follow';
  (s.accounts || []).forEach(a => { if (!a.bank) a.bank = guessBank(a.name); a.closing = Math.min(31, Math.max(0, +a.closing || 0)); a.due = Math.min(31, Math.max(0, +a.due || 0)); });
  s.boxes = s.boxes || []; s.moves = s.moves || []; if (!s.cdi) s.cdi = 13.65;
  return s;
}
function load() { const d = defaultState(); const r = readKey(localKey()); return migrate(r ? Object.assign(d, r) : d); }
let S = CLOUD ? defaultState() : load();
function writeLocal() { try { localStorage.setItem(localKey(), JSON.stringify(S)); } catch (e) { toast('Não consegui salvar neste navegador'); } }
function save() {
  S._savedAt = Date.now(); writeLocal();
  if (CLOUD && user) { sync.dirty = true; setSync('saving'); clearTimeout(sync.timer); sync.timer = setTimeout(push, 1200); }
}
function setSync(s) { sync.state = s; const el = $('#syncState'); if (el) el.innerHTML = syncLabel(); }
function syncLabel() {
  return { local: 'Salvo só neste aparelho', saving: 'Salvando...', ok: '✓ Sincronizado na sua conta', offline: 'Sem internet: salvo no aparelho, sobe quando voltar', error: 'Não consegui sincronizar. Tento de novo sozinho.' }[sync.state] || '';
}
async function push() {
  if (!CLOUD || !user || sync.busy) return;
  sync.busy = true; clearTimeout(sync.timer);
  try {
    const { error } = await sb.from('wallets').upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() });
    if (error) throw error;
    sync.dirty = false; setSync('ok');
  } catch (e) { setSync(navigator.onLine ? 'error' : 'offline'); clearTimeout(sync.timer); sync.timer = setTimeout(push, 15000); }
  finally { sync.busy = false; }
}
async function pull() {
  if (!CLOUD || !user) return;
  const { data, error } = await sb.from('wallets').select('data').eq('user_id', user.id).maybeSingle();
  if (error) { setSync(navigator.onLine ? 'error' : 'offline'); return; }
  const remote = (data && data.data) || {};
  const rAt = remote._savedAt || 0, lAt = S._savedAt || 0;
  if (!remote.v) {
    // conta nova: se tinha dados usados sem login neste aparelho, leva pra conta
    if (!S.onboarded) { const legacy = readKey(KEY); if (legacy && legacy.onboarded) { S = Object.assign(defaultState(), legacy); S._savedAt = Date.now(); writeLocal(); toast('Trouxe seus dados deste aparelho pra conta'); } }
    if (S.onboarded) await push(); else setSync('ok');
  } else if (rAt > lAt) { S = migrate(Object.assign(defaultState(), remote)); sortedOnce = false; writeLocal(); setSync('ok'); }
  else if (lAt > rAt) await push();
  else setSync('ok');
  if (!$('.sheet')) render();
}
function cacheProf() { try { localStorage.setItem(`byun.prof.${user.id}`, JSON.stringify(prof)); localStorage.setItem('byun.lastpet', JSON.stringify(prof.pet || {})); } catch (e) { } }
async function enter(u) {
  user = u; ui.auth = null;
  const { data, error } = await sb.from('profiles').select('username,display_name,pet,must_change').eq('user_id', u.id).maybeSingle();
  prof = data || readKey(`byun.prof.${u.id}`) || { username: (u.email || '').split('@')[0], display_name: '', pet: {}, must_change: false };
  if (data) cacheProf();
  try { const r = await sb.rpc('is_admin'); isAdmin = !!r.data; } catch (e) { isAdmin = false; }
  if (prof.must_change) { ui.auth = 'newpass'; ui.forced = true; render(); return; }
  if (isAdmin) { loadUsers(); render(); return; }
  S = load(); sortedOnce = false; if (prof.display_name) S.name = prof.display_name;   // um nome só: o da conta
  render(); await pull();
}
async function boot() {
  if (!CLOUD) { render(); return; }
  ui.auth = 'loading'; render();
  sb.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT') { sortedOnce = false; user = null; prof = null; isAdmin = false; S = defaultState(); ui.auth = 'login'; ui.view = 'home'; ui.ob = 0; ui.users = ui.pending = null; ui.month = curKey(); render(); }
  });
  let session = null;
  try { session = (await sb.auth.getSession()).data.session; } catch (e) { }
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  if (session) enter(session.user); else { ui.auth = 'login'; render(); }
}

const VIEWS = ['home', 'tx', 'charts', 'plan', 'settings', 'install', 'cardsFull', 'boxesFull'];
const saved = (() => { try { return JSON.parse(sessionStorage.getItem('byun.ui') || '{}'); } catch (e) { return {}; } })();
const ui = { greet: true, view: VIEWS.includes(saved.view) ? saved.view : 'home', month: /^\d{4}-\d{2}$/.test(saved.month || '') ? saved.month : curKey(), txType: 'all', q: '', accF: null, catF: null, msgI: 0, ob: 0, payDay: null, card: 0 };
let draft = null, deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

const cat = id => S.categories.find(c => c.id === id);
const acc = id => S.accounts.find(a => a.id === id);
const catColor = c => c ? `var(--s${(c.color % 8) + 1})` : 'var(--muted)';
const isCredit = a => a && a.type === 'credito';

/* ---------- dias úteis (feriados nacionais) ---------- */
const isoD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da); }
const HOL = {};
function holidays(y) {
  if (HOL[y]) return HOL[y];
  const s = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(x => `${y}-${x}`));
  const e = easter(y); [-48, -47, -2, 60].forEach(o => { const d = new Date(e); d.setDate(d.getDate() + o); s.add(isoD(d)); }); // carnaval, sexta santa, corpus christi
  return HOL[y] = s;
}
function isBizDay(d, sat) { const w = d.getDay(); if (w === 0 || (w === 6 && !sat)) return false; return !holidays(d.getFullYear()).has(isoD(d)); }
const RULES = [['util5', '5º dia útil'], ['utilUltimo', 'Último dia útil'], ['dia', 'Dia fixo'], ['livre', 'Sem data']];
const noDate = f => f.rule === 'livre' || !!f.nodate;
function payDate(f, m) {
  const [y, mo] = m.split('-').map(Number), D = dim(m);
  if (f.rule === 'util5') { let n = 0; for (let d = 1; d <= D; d++) { const dt = new Date(y, mo - 1, d); if (isBizDay(dt, f.sat !== false) && ++n === 5) return dt; } }
  if (f.rule === 'utilUltimo') { for (let d = D; d >= 1; d--) { const dt = new Date(y, mo - 1, d); if (isBizDay(dt, false)) return dt; } }
  return new Date(y, mo - 1, Math.min(+f.day || 1, D));
}
const ruleLabel = f => noDate(f) ? 'sem data' : f.rule === 'util5' ? '5º dia útil' : f.rule === 'utilUltimo' ? 'último dia útil' : `todo dia ${pad(f.day || 1)}`;
const shortDate = d => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');

/* ---------- cofrinho ---------- */
const box = id => (S.boxes || []).find(b => b.id === id);
const moveVal = m => m.type === 'ret' ? -m.amount : m.amount;
function boxBal(b, upTo = '9999-12-31') { return sum((S.moves || []).filter(m => m.boxId === b.id && m.date <= upTo), moveVal); }
function monthlyRate(b) {
  const r = parseFloat(String(b.rate ?? '').replace(',', '.')) || 0;
  if (b.rateType === 'cdi') return Math.pow(1 + (+S.cdi || 0) * r / 10000, 1 / 12) - 1;
  if (b.rateType === 'ano') return Math.pow(1 + r / 100, 1 / 12) - 1;
  if (b.rateType === 'mes') return r / 100;
  return 0;
}
const rateLabel = b => b.rateType === 'cdi' ? `${b.rate || 100}% do CDI` : b.rateType === 'ano' ? `${b.rate}% ao ano` : b.rateType === 'mes' ? `${b.rate}% ao mês` : 'não rende';
function boxesInfo(m = ui.month) {
  const end = `${m}-31`, before = `${addMonths(m, -1)}-31`;
  const mv = (S.moves || []).filter(x => x.date.slice(0, 7) === m);
  const dep = sum(mv.filter(x => x.type === 'dep')), ret = sum(mv.filter(x => x.type === 'ret')), rend = sum(mv.filter(x => x.type === 'rend'));
  const list = (S.boxes || []).map(b => ({ b, bal: boxBal(b, end), est: Math.max(0, boxBal(b, before) || boxBal(b, end)) * monthlyRate(b) }));
  return { list, total: sum(list, x => x.bal), est: sum(list, x => x.est), dep, ret, rend };
}

/* ---------- cálculos do mês ---------- */
function extrasFor(m) { return S.extras.filter(e => e.recurring ? (!e.since || e.since <= m) : e.month === m); }
// Fatura = mês em que VENCE (ex.: fecha 25, vence 2: compras de 26/10 a 25/11 = fatura de dezembro, vence 02/12).
// 1) compra depois do dia de fechamento vai pro ciclo seguinte
// 2) se o vencimento é num dia menor ou igual ao fechamento, ele cai no mês seguinte ao fechamento
function invMonth(t, a) {
  const d = +t.date.slice(8), C = +a.closing || 0, V = +a.due || 0;
  let k = t.date.slice(0, 7);
  if (C && d > C) k = addMonths(k, 1);
  if (C && V && V <= C) k = addMonths(k, 1);
  return k;
}
const dueDate = (a, k) => `${pad(Math.min(+a.due || 10, dim(k)))}/${k.slice(5)}`;
const invoiceDueIn = (a, m) => m;   // a fatura de um mês é a que vence nele
// gasto no crédito conta no mês da fatura; débito/pix no mês da compra
function txMonth(t) { const a = acc(t.accId); return t.type === 'gasto' && isCredit(a) ? invMonth(t, a) : t.date.slice(0, 7); }
function invoice(a, m) { return sum(S.tx.filter(t => t.accId === a.id && t.type === 'gasto' && invMonth(t, a) === m)); }
function cardOpenMonth(a) { return invMonth({ date: todayISO() }, a); }
function cardFree(a) {
  const open = cardOpenMonth(a);
  const used = sum(S.tx.filter(t => t.accId === a.id && t.type === 'gasto' && invMonth(t, a) >= open && !(S.fixedPaid[invMonth(t, a)] || []).includes('card:' + a.id)));
  return (+a.limit || 0) - used;
}

function info(m = ui.month) {
  const tx = S.tx.filter(t => t.date.slice(0, 7) === m);   // transações seguem a data da compra; só a fatura segue o ciclo do cartão
  const gastos = tx.filter(t => t.type === 'gasto' && !t.fixedId), receitas = tx.filter(t => t.type === 'receita');   // contas fixas lançadas não entram no dia a dia
  const gasto = sum(gastos), receita = sum(receitas);
  const limit = sum(S.categories, c => c.limit);
  const fixIn = sum(S.fixed.filter(f => f.kind === 'entra' && (!f.since || f.since <= m)));
  const fixOutList = S.fixed.filter(f => f.kind === 'sai' && (!f.since || f.since <= m));
  const fixOut = sum(fixOutList);
  const paid = S.fixedPaid[m] || [];
  const ex = extrasFor(m).filter(e => e.affects !== false);
  const exIn = sum(ex.filter(e => e.kind === 'entra')), exOut = sum(ex.filter(e => e.kind === 'sai')), exSave = sum(ex.filter(e => e.kind === 'guardado'));
  const D = dim(m), cur = curKey(), isCur = m === cur, isPast = m < cur;
  const day = isCur ? new Date().getDate() : isPast ? D : 0;
  const daysLeft = isCur ? D - day + 1 : isPast ? 0 : D;
  const pode = limit - gasto;
  const expected = limit * (day / D);
  const byCat = S.categories.map(c => ({ c, v: sum(gastos.filter(t => t.catId === c.id)) }));
  const other = sum(gastos.filter(t => !cat(t.catId)));
  if (other) byCat.push({ c: { id: '_o', name: 'Outros', icon: '📦', limit: 0, color: 7 }, v: other });
  const overCats = byCat.filter(x => x.c.limit > 0 && x.v > x.c.limit);
  const entra = fixIn + receita + exIn;
  const BX = boxesInfo(m), guard = BX.dep - BX.ret;
  const incomes = S.fixed.filter(f => f.kind === 'entra' && (!f.since || f.since <= m)).map(f => ({ f, date: payDate(f, m) })).sort((a, b) => a.date - b.date);
  const sobra = entra - fixOut - gasto - exOut - exSave - guard;
  const diario = daysLeft > 0 ? Math.max(0, pode) / daysLeft : 0;
  const projecao = day > 0 ? gasto / day * D : 0;
  return { m, tx, gastos, receitas, gasto, receita, limit, fixIn, fixOut, fixOutList, paid, exIn, exOut, exSave, D, isCur, isPast, day, daysLeft, pode, expected, byCat, overCats, entra, sobra, diario, projecao, BX, guard, incomes };
}

/* ---------- Byun: humor e falas ---------- */
function mood(N) {
  if (!N.isCur && !N.isPast) return 'happy';
  if (N.limit > 0 && N.gasto > N.limit) return 'sad';
  if (N.overCats.length) return 'angry';
  const la = S.lastAdded;
  if (N.isCur && la && Date.now() - la.at < 15 * 60e3 && la.amount >= Math.max(300, N.limit * .3)) return 'surprised';
  const h = new Date().getHours();
  if (N.isCur && (h >= 23 || h < 6)) return 'sleepy';
  if (N.gasto === 0) return 'happy';
  if (N.isCur && N.gasto > N.expected * 1.05) return 'worried';
  if (N.gasto < N.expected * .75) return 'happy';
  return 'normal';
}
const FALAS = {
  start: ['Mês novo, limite cheio: {limite}. Respira antes de abrir o iFood.', 'Página em branco. Bora não estragar logo de cara?', '{diario} por dia. Isso é um limite, não uma meta.'],
  happy: ['Guardou {guardou} este mês. Tô orgulhoso. Não acostuma.', 'Tô orgulhoso. Não acostuma.', 'Sobrou {pode}. Eu tô de olho, viu?', '{diario} por dia. Isso é um limite, não uma meta.', 'Gastando abaixo do ritmo. Quem é você e o que fez com a {nome}?'],
  normal: ['No ritmo. Continua assim que eu continuo calmo.', '{pode} pra {dias} dias. Faz a conta comigo.', 'Dá pra gastar {diario} por dia sem eu reclamar.'],
  worried: ['Opa, acima do ritmo. Hoje é dia de comer em casa.', 'Já foram {gasto}. O mês ainda não acabou, sabia?', 'Nesse ritmo o mês fecha em {projecao}. Só comentando.'],
  surprised: ['{ultimo}?! De uma vez só?', 'Eita. {ultimo}. Foi necessário mesmo?', 'Ainda tô processando esse {ultimo}.'],
  angry: ['{categoria} ESTOUROU. Eu avisei. Tá, não avisei, mas pensei.', '{categoria} passou do limite. Tô respirando fundo.'],
  sad: ['Estourou {excesso}. Vou fingir que não vi. Mentira, vi sim.', 'Passamos do limite em {excesso}. Mês que vem a gente tenta de novo.'],
  sleepy: ['Zzz... compra de madrugada não conta? Conta sim. Vai dormir.', 'Tá tarde. O carrinho do site espera até amanhã.'],
  future: ['Mês que vem ainda tá limpinho. Vamos manter assim?'],
  past: ['Esse mês já foi. Fechou com sobra de {sobra}.']
};
const CALMO = {
  start: ['Seu limite do mês é {limite}.'], happy: ['Você pode gastar {diario} por dia.'], normal: ['Você está no ritmo. {diario} por dia.'],
  worried: ['Acima do ritmo. O ideal agora é {diario} por dia.'], surprised: ['Gasto alto registrado: {ultimo}.'],
  angry: ['{categoria} passou do limite.'], sad: ['O mês passou do limite em {excesso}.'], sleepy: ['Você pode gastar {diario} por dia.'],
  future: ['Mês futuro, nada lançado ainda.'], past: ['Mês encerrado com sobra de {sobra}.']
};
const OI = {
  manha: ['Bom dia, {nome}! ☀️ Já tomou café?', 'Bom diaaa! Bora começar o dia no controle 🐾', 'Acordei e vim correndo te ver, {nome}! 💚'],
  tarde: ['Boa tarde, {nome}! Senti sua falta 💚', 'Oii! Cheguei pra cuidar das contas com você 🐾', 'Boa tarde! Vamos ver como tá o mês? ✨'],
  noite: ['Boa noite, {nome}! 🌙 Dia corrido?', 'Oi de novo! Vim te fazer companhia 🐾', 'Boa noite! Antes de dormir, uma olhadinha nas contas? 💚'],
  madru: ['Acordada ainda, {nome}? 🌙 Eu tô aqui', 'Shhh… madrugada é hora de dormir, mas oi! 💤']
};
function saudacao() {
  const h = new Date().getHours(), k = h < 5 ? 'madru' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
  const l = OI[k]; return l[ui.msgI % l.length].replace('{nome}', S.name || 'dona');
}
function fala(N, md) {
  if (ui.greet) return saudacao();
  const bank = S.sass ? FALAS : CALMO;
  let key = md;
  if (N.isPast) key = 'past'; else if (!N.isCur) key = 'future'; else if (N.gasto === 0) key = 'start';
  const list = bank[key] || bank.normal;
  const over = N.overCats[0];
  const vars = {
    limite: fmt0(N.limit), pode: fmt(N.pode), dias: N.daysLeft, diario: fmt(N.diario), gasto: fmt(N.gasto),
    projecao: fmt0(N.projecao), ultimo: fmt0(S.lastAdded?.amount || 0), categoria: over ? over.c.name.split(' ')[0] : '',
    excesso: fmt0(N.gasto - N.limit), sobra: fmt(N.sobra), nome: S.name || 'dona', guardou: fmt0(N.BX.dep)
  };
  const usable = list.filter(x => !x.includes('{guardou}') || N.BX.dep > 0);
  return usable[ui.msgI % usable.length].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
const DEFAULT_PET = { name: 'Byun', species: 'gato', body: '#0b0b0b', eyes: '#ffffff', accent: '#1f5a3a', blush: false };
const SPECIES = [['gato', 'Gato'], ['onca', 'Onça'], ['coelho', 'Coelho'], ['urso', 'Urso']];
const BODY_COLORS = ['#0b0b0b', '#4a4a4a', '#ffffff', '#f2c6d8', '#e8a33d', '#8b5e3c', '#7c4dcc', '#2f6fdb', '#1f5a3a', '#c0392b'];
const EYE_COLORS = ['#ffffff', '#ff3b3b', '#3ddc84', '#ffd166', '#5ec8ff', '#ff8fab', '#b388ff', '#0b0b0b', '#6b3e1f'];
const ACCENTS = ['#1f5a3a', '#0b0b0b', '#6d3fc0', '#2a5bd7', '#c2457a', '#b5651d', '#0f766e', '#b91c1c'];
let prof = null;
function curPet() {
  const p = (CLOUD && prof && prof.pet && prof.pet.species) ? prof.pet : (S.pet && S.pet.species ? S.pet : (CLOUD && !user ? readKey('byun.lastpet') : null));
  return Object.assign({}, DEFAULT_PET, p || {});
}
function mixHex(a, b, t) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const c = s => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}
const lum = h => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function byunSVG(md = 'normal', pet = curPet()) {
  const p = Object.assign({}, DEFAULT_PET, pet);
  const body = /^#[0-9a-f]{6}$/i.test(p.body) ? p.body : '#0b0b0b', eye = /^#[0-9a-f]{6}$/i.test(p.eyes) ? p.eyes : '#ffffff', acc = /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : '#1f5a3a';
  const dark = mixHex(body, '#000000', .3), light = mixHex(body, '#ffffff', .4);
  let ears = '', extra = '';
  if (p.species === 'onca') {
    ears = '<circle cx="50" cy="66" r="24"/><circle cx="150" cy="66" r="24"/>';
    extra = `<circle cx="50" cy="66" r="11" fill="${dark}"/><circle cx="150" cy="66" r="11" fill="${dark}"/>` +
      [[74, 72], [126, 72], [100, 62]].map(([x, y]) => `<g fill="${dark}"><circle cx="${x - 5}" cy="${y}" r="3.6"/><circle cx="${x + 4}" cy="${y - 4}" r="3.6"/><circle cx="${x + 3}" cy="${y + 5}" r="3.6"/></g>`).join('');
  } else if (p.species === 'coelho') {
    ears = '<rect x="58" y="-8" width="28" height="86" rx="14" transform="rotate(-8 72 60)"/><rect x="114" y="-8" width="28" height="86" rx="14" transform="rotate(8 128 60)"/>';
    extra = `<rect x="66" y="6" width="12" height="54" rx="6" fill="${light}" opacity=".6" transform="rotate(-8 72 60)"/><rect x="122" y="6" width="12" height="54" rx="6" fill="${light}" opacity=".6" transform="rotate(8 128 60)"/>`;
  } else if (p.species === 'urso') {
    ears = '<circle cx="48" cy="68" r="22"/><circle cx="152" cy="68" r="22"/>';
    extra = `<circle cx="48" cy="68" r="10" fill="${light}" opacity=".5"/><circle cx="152" cy="68" r="10" fill="${light}" opacity=".5"/><ellipse cx="100" cy="136" rx="22" ry="14" fill="${light}" opacity=".45"/>`;
  } else ears = '<path d="M38 100 C29 62 36 32 56 30 C72 29 86 46 96 66 L104 66 C114 46 128 29 144 30 C164 32 171 62 162 100 Z"/>';
  const S_ = `stroke="${eye}"`, F = `fill="${eye}"`;
  let e;
  switch (md) {
    case 'happy': e = `<path class="eyel" ${S_} d="M74 112 Q84 96 94 112"/><path class="eyel" ${S_} d="M106 112 Q116 96 126 112"/>`; break;
    case 'surprised': e = `<circle ${F} cx="84" cy="104" r="13"/><circle ${F} cx="116" cy="104" r="13"/><g class="pupils"><circle fill="${lum(eye) < .25 ? '#ffffff' : '#0b0b0b'}" cx="84" cy="104" r="5.5"/><circle fill="${lum(eye) < .25 ? '#ffffff' : '#0b0b0b'}" cx="116" cy="104" r="5.5"/></g>`; break;
    case 'angry': e = `<path class="eyel" ${S_} d="M72 97 L94 109"/><path class="eyel" ${S_} d="M128 97 L106 109"/>`; break;
    case 'sad': e = `<path ${F} d="M70 104 Q84 97 97 106 Q86 115 72 109Z"/><path ${F} d="M130 104 Q116 97 103 106 Q114 115 128 109Z"/><path class="tear" d="M108 120 q-6 9 0 11 q6 -2 0 -11z"/>`; break;
    case 'sleepy': e = `<path class="eyel" ${S_} d="M74 106 Q84 114 94 106"/><path class="eyel" ${S_} d="M106 106 Q116 114 126 106"/>`; break;
    case 'worried': e = `<rect class="blink" ${F} x="78" y="96" width="12" height="20" rx="6"/><rect class="blink" ${F} x="110" y="96" width="12" height="20" rx="6"/><path class="sweat" d="M152 74 q-7 11 0 13 q7 -2 0 -13z"/>`; break;
    default: e = `<rect class="blink" ${F} x="77" y="92" width="12" height="26" rx="6"/><rect class="blink" ${F} x="111" y="92" width="12" height="26" rx="6"/>`;
  }
  const blush = p.blush ? '<ellipse cx="62" cy="127" rx="9" ry="5" fill="#ff8fab" opacity=".55"/><ellipse cx="138" cy="127" rx="9" ry="5" fill="#ff8fab" opacity=".55"/>' : '';
  const zz = md === 'sleepy' ? `<text class="zz" fill="${acc}" x="160" y="44">z</text><text class="zz b" fill="${acc}" x="172" y="28">z</text>` : '';
  return `<svg class="byun" viewBox="0 -12 200 184" role="img" aria-label="${esc(p.name || 'Byun')}"><g class="body" fill="${body}">${ears}<ellipse cx="100" cy="112" rx="75" ry="58"/></g>${extra}${blush}<g class="eyes">${e}</g>${zz}</svg>`;
}
const petCls = (p = curPet()) => (S.theme === 'dark' && lum(Object.assign({}, DEFAULT_PET, p).body) < .35) ? 'pet-light' : '';
function applyAccent() {
  const a = curPet().accent, r = document.documentElement.style, dark = S.theme === 'dark';
  const ok = /^#[0-9a-f]{6}$/i.test(a) ? a : '#1f5a3a';
  const vivid = lum(ok) < .12 ? '#1f5a3a' : ok;   // preto vira verde escuro nos destaques
  r.setProperty('--green', dark ? mixHex(vivid, '#ffffff', .18) : vivid);
  r.setProperty('--green2', mixHex(vivid, '#ffffff', dark ? .32 : .2));
  r.setProperty('--green-soft', dark ? mixHex(vivid, '#0a0b0a', .78) : mixHex(vivid, '#ffffff', .88));
  r.setProperty('--btn', dark ? vivid : '#0b0b0b'); r.setProperty('--bubble', dark ? vivid : '#0b0b0b');
  r.setProperty('--cat-rim', dark ? mixHex(vivid, '#ffffff', .2) : 'transparent');
}
async function savePet(p) {
  if (CLOUD && user && prof) {
    prof.pet = p; cacheProf(); render();
    const { error } = await sb.from('profiles').update({ pet: p }).eq('user_id', user.id);
    toast(error ? 'Não consegui salvar o mascote' : `${p.name || 'Byun'} atualizado`);
  } else { S.pet = p; save(); render(); toast(`${p.name || 'Byun'} atualizado`); }
}
/* editor de mascote */
let petEdit = null;
function openPetEditor(pet, onSave, title = 'Seu mascote') {
  petEdit = { p: Object.assign({}, DEFAULT_PET, pet), onSave, title, mood: 0 };
  openSheet('<div id="petEd"></div>'); renderPetEditor();
}
function renderPetEditor() {
  const { p, title } = petEdit, moods = ['normal', 'happy', 'surprised', 'angry', 'sad', 'sleepy'];
  const sw = (key, list) => `<div class="swatches">${[...new Set([...list, p[key]])].map(c => `<label><input type="radio" name="pe_${key}" data-a="peColor" data-k="${key}" data-v="${c}" ${p[key] === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}<label class="custom-c" title="Outra cor"><input type="color" data-pk="${key}" value="${p[key]}" aria-label="Outra cor"></label></div>`;
  $('#petEd').innerHTML = sheetHead(title) + `
    <div class="pet-prev ${petCls(p)}" data-a="peMood">${byunSVG(moods[petEdit.mood % moods.length], p)}<span>toque pra ver outro humor</span></div>
    <label class="fld"><span>Nome do mascote</span><input id="peName" value="${esc(p.name)}" maxlength="16" placeholder="Byun"></label>
    <div class="flabel">Bichinho</div>
    <div class="species">${SPECIES.map(([k, l]) => `<button class="${p.species === k ? 'on' : ''}" data-a="peSpecies" data-v="${k}"><i class="${petCls(p)}">${byunSVG('normal', Object.assign({}, p, { species: k }))}</i>${l}</button>`).join('')}</div>
    <div class="flabel">Cor do corpo</div>${sw('body', BODY_COLORS)}
    <div class="flabel">Cor dos olhos</div>${sw('eyes', EYE_COLORS)}
    <div class="flabel">Cor do app</div>${sw('accent', ACCENTS)}
    <label class="switch"><div><div class="n">Bochechas rosadas</div></div><span class="tgl"><input type="checkbox" data-pt="blush" ${p.blush ? 'checked' : ''}><i></i></span></label>
    <button class="btn" data-a="peSave">Salvar</button>`;
}

/* ---------- ícone do app com o mascote de cada pessoa ---------- */
const STATIC_ICON = 'icons/apple-touch-icon.png', STATIC_MANIFEST = 'manifest.webmanifest';
function iconBg(p) { return lum(p.body) > .85 ? mixHex(p.accent || '#1f5a3a', '#ffffff', .82) : '#f6f6f3'; }
function iconPNG(pet, size = 512, pad = .1) {
  return new Promise(res => {
    const p = Object.assign({}, DEFAULT_PET, pet);
    const svg = byunSVG('normal', p).replace('<svg class="byun"', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="368"');
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
      x.fillStyle = iconBg(p); x.fillRect(0, 0, size, size);
      // recorta só o bichinho (sem margem) e centraliza
      const top = { gato: 28, onca: 42, coelho: -10, urso: 46 }[p.species] ?? 28;
      const bx = 24, by = top, bw = 152, bh = 171 - top, k = 2;                 // caixa do desenho em unidades do viewBox
      const box = size * (1 - 2 * pad), s = Math.min(box / bw, box / bh);
      const dw = bw * s, dh = bh * s;
      x.drawImage(img, bx * k, (by + 12) * k, bw * k, bh * k, (size - dw) / 2, (size - dh) / 2, dw, dh);
      try { res(c.toDataURL('image/png')); } catch (e) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
let iconKey = '';
async function updateAppIcon(pet) {
  try {
    const touch = document.querySelector('link[rel=apple-touch-icon]'), man = document.querySelector('link[rel=manifest]');
    if (!pet) { iconKey = ''; if (touch) touch.href = STATIC_ICON; if (man) man.href = STATIC_MANIFEST; return; }
    const key = JSON.stringify(pet); if (key === iconKey) return; iconKey = key;
    const [i180, i192, i512, m512] = await Promise.all([iconPNG(pet, 180), iconPNG(pet, 192), iconPNG(pet, 512), iconPNG(pet, 512, .2)]);
    if (!i180) return;
    if (touch) touch.href = i180;
    const base = location.href.split('#')[0].split('?')[0];
    const mf = { name: 'Byun', short_name: pet.name || 'Byun', lang: 'pt-BR', start_url: base, scope: base.replace(/[^/]*$/, ''), display: 'standalone', orientation: 'portrait', background_color: iconBg(pet), theme_color: '#ffffff',
      icons: [{ src: i192, sizes: '192x192', type: 'image/png' }, { src: i512, sizes: '512x512', type: 'image/png' }, { src: m512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
    if (man) man.href = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: 'application/manifest+json' }));
  } catch (e) { }
}

/* ---------- moldura ---------- */
function topbar(title) {
  if (title) return `<div class="top"><button class="icon-btn" data-a="go" data-v="home" aria-label="Voltar">${ic('left')}</button><b>${title}</b><span style="width:40px"></span></div>`;
  return `<div class="top main"><div class="tl"><button class="icon-btn flat" data-a="theme" aria-label="Tema">${ic(S.theme === 'dark' ? 'sun' : 'moon')}</button></div>
    <div class="month"><button class="icon-btn flat" data-a="month" data-v="-1" aria-label="Mês anterior">${ic('left')}</button><span>${monthName(ui.month)}${ui.month.slice(0, 4) !== curKey().slice(0, 4) ? ' ' + ui.month.slice(0, 4) : ''}</span><button class="icon-btn flat" data-a="month" data-v="1" aria-label="Próximo mês">${ic('right')}</button></div>
    <div class="tr"><button class="icon-btn flat" data-a="hide" aria-label="${HIDE ? 'Mostrar valores' : 'Esconder valores'}">${ic(HIDE ? 'eyeOff' : 'eye')}</button><button class="icon-btn" data-a="go" data-v="settings" aria-label="Ajustes">${ic('gear')}</button></div></div>`;
}
function nav() {
  const on = v => ui.view === v;
  const b = (v, i, l, x = '') => `<button class="${on(v) ? 'on' : ''} ${x}" data-a="go" data-v="${v}" aria-label="${l}">${ic(i)}<span>${l}</span></button>`;
  const monthBox = `<div class="nav-month"><button data-a="month" data-v="-1" aria-label="Mês anterior">${ic('left')}</button><b>${monthName(ui.month)}${ui.month.slice(0, 4) !== curKey().slice(0, 4) ? ' ' + ui.month.slice(0, 4) : ''}</b><button data-a="month" data-v="1" aria-label="Próximo mês">${ic('right')}</button></div>`;
  const tools = `<div class="nav-tools"><button data-a="theme" aria-label="Tema">${ic(S.theme === 'dark' ? 'sun' : 'moon')}<span>${S.theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span></button><button data-a="hide" aria-label="${HIDE ? 'Mostrar valores' : 'Esconder valores'}">${ic(HIDE ? 'eyeOff' : 'eye')}<span>${HIDE ? 'Mostrar valores' : 'Esconder valores'}</span></button></div>`;
  return `<nav class="nav"><div class="brand"><i class="${petCls()}">${byunSVG('happy')}</i><b>Byun</b></div>${monthBox}${b('home', 'home', 'Início')}${b('tx', 'list', 'Transações')}<button class="plus" data-a="add" data-v="gasto" aria-label="Novo lançamento">${ic('plus')}<span>Novo lançamento</span></button>${b('cardsFull', 'card', 'Cartões', 'only-desk')}${b('boxesFull', 'piggy', 'Cofrinho', 'only-desk')}${b('charts', 'pie', 'Análises')}${b('plan', 'sliders', 'Planejar')}${b('settings', 'gear', 'Ajustes', 'only-desk')}${tools}</nav>`;
}

let sortedOnce = false;
function render() {
  if (!sortedOnce && S.accounts) { sortAccounts(); sortedOnce = true; }
  if ((!CLOUD || (user && !isAdmin)) && S.onboarded) { const c1 = ensureFixed(curKey()), c2 = ui.month <= addMonths(curKey(), 1) && ensureFixed(ui.month); if (c1 || c2) save(); }
  document.documentElement.dataset.theme = S.theme; applyAccent();
  if (!CLOUD || (user && !isAdmin)) updateAppIcon(curPet()); else updateAppIcon(null);
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = S.theme === 'dark' ? '#0a0b0a' : '#ffffff';
  const app = $('#app');
  if (CLOUD && (!user || ui.auth)) { app.innerHTML = authView(); return; }
  if (CLOUD && isAdmin) { app.innerHTML = adminView(); return; }
  if (!S.onboarded) { app.innerHTML = onboarding(); return; }
  try { sessionStorage.setItem('byun.ui', JSON.stringify({ view: ui.view, month: ui.month })); } catch (e) { }
  const views = { cardsFull: cardsFullView, boxesFull: boxesFullView, home: homeView, tx: txView, charts: chartsView, plan: planView, settings: settingsView, install: installView };
  app.innerHTML = (views[ui.view] || homeView)() + nav();
  requestAnimationFrame(drawCharts);
}

/* ---------- Início ---------- */
// quanto menos gasto em relação ao ritmo ideal, mais alto e mais rápido o Byun pula
function hopStyle(N, md) {
  let e;
  if (N.limit > 0 && N.gasto > N.limit) e = .05;                  // estourou: quase não sai do chão
  else if (!N.isCur || N.expected <= 0) e = N.gasto === 0 ? 1 : .6;
  else e = Math.max(.08, Math.min(1, 1.5 - N.gasto / N.expected)); // 50% do ritmo = pula muito, acima do ritmo = pulinho
  if (md === 'sleepy') e = Math.min(e, .2);
  const hop = Math.round(3 + 30 * e), dur = (2.8 - 1.4 * e).toFixed(2);
  return `--hop:${hop}px;--dur:${dur}s`;
}
function homeView() {
  const N = info(), md = mood(N);
  const frac = N.limit > 0 ? Math.max(0, Math.min(1, N.pode / N.limit)) : 0;
  let pill = () => '';
  if (N.limit > 0 && N.gasto > N.limit) pill = () => `<span class="pill bad">Passou ${fmt0(N.gasto - N.limit)} do limite</span>`;
  else if (N.isCur && N.gasto > N.expected * 1.05) pill = () => `<span class="pill bad">Acima do ritmo</span>`;
  else pill = () => `<span class="pill ok">${ic('check')} No ritmo</span>`;
  const sub = () => N.isCur ? `de ${fmt0(N.limit)} · ${N.daysLeft} ${N.daysLeft === 1 ? 'dia' : 'dias'}` : N.isPast ? `de ${fmt0(N.limit)} · mês encerrado` : `de ${fmt0(N.limit)} · mês futuro`;

  const hero = withHide('hero', () => `<section class="hero">
    <div class="bubble" data-a="poke">${esc(fala(N, md))}</div>
    <div class="gauge ${petCls()}">
      <svg class="arc ${N.pode < 0 ? 'over' : ''}" viewBox="0 0 240 240"><path class="trk" d="M46.46 193.54 A104 104 0 1 1 193.54 193.54" fill="none" stroke-width="11" stroke-linecap="round" pathLength="100"/><path class="val" d="M46.46 193.54 A104 104 0 1 1 193.54 193.54" fill="none" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="${N.pode < 0 ? 100 : (frac * 100).toFixed(2)} 200"/></svg>
      <div class="byun-wrap ${S.motion === 'bounce' ? 'bounce' : ''} ${ui.greet ? 'hello' : ''}" data-a="poke" style="${S.motion === 'bounce' ? hopStyle(N, md) : ''}">${byunSVG(md)}</div>
    </div>
    <div class="label">Pode gastar <!--eye--></div>
    <div class="big">${money(N.pode)}</div>
    <div class="sub">${sub()}</div>${pill()}
  </section>
  <div class="qa">
    <button data-a="add" data-v="gasto"><i>${ic('minus')}</i>Gasto</button>
    <button data-a="add" data-v="receita"><i>${ic('plus')}</i>Receita</button>
    <button data-a="move" data-v="dep"><i>${ic('piggy')}</i>Guardar</button>
    <button data-a="go" data-v="plan"><i>${ic('repeat')}</i>Fixos</button>
  </div>`);

  return topbar() + `<div class="home-grid">
    <div class="side"><div class="hero-card">${hero}</div>${withHide('saldo', () => saldoCard(N))}</div>
    <div class="main">
      <div class="cols">
        <div class="col">${`<div class="o3">${withHide('cartoes', () => cardsCard())}</div><div class="o4">${withHide('contas', () => billsCard(N))}</div>`}</div>
        <div class="col">${`<div class="o2">${withHide('cofrinho', () => boxCard(N))}</div><div class="o5">${withHide('recentes', () => recentCard(N))}</div><div class="o6">${withHide('extras', () => extrasCard(N))}</div>`}</div>
      </div>
    </div>
  </div>`;
}

function saldoCard(N) {
  const base = Math.max(N.entra, N.fixOut + N.gasto + N.exOut + N.exSave + Math.max(0, N.guard), 1);
  const parts = [
    ['Fixos', N.fixOut, 'var(--ink)'], ['Dia a dia', N.gasto, 'var(--s1)'],
    ['Extras', N.exOut + N.exSave, 'var(--s4)'], ['Guardado', Math.max(0, N.guard), 'var(--s7)'], ['Sobra', Math.max(0, N.sobra), 'var(--green2)']
  ];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const bar = parts.filter(p => p[1] > 0).map(p => `<i style="width:${p[1] / base * 100}%;background:${p[2]}" title="${p[0]}"></i>`).join('');
  const salPct = N.entra > 0 ? pct(N.sobra, N.entra) : 0;
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('wallet')} Saldo previsto</span>${N.entra > 0 ? `<span class="tag ${N.sobra < 0 ? 'gray' : ''}">${ic(N.sobra < 0 ? 'arrowDown' : 'arrowUp')} ${salPct}% livre</span>` : ''}</div>
    <div class="saldo-split"><div class="sp-a">
    <div class="saldo-big ${N.sobra < 0 ? 'neg' : ''}">${money(N.sobra)}</div>
    <div class="sub">valor estimado depois de pagar tudo do mês</div>
    <div class="stack">${bar || '<i style="width:100%;background:var(--line)"></i>'}</div>
    <div class="legend">
      <div>Entra <b class="pos">+${fmt(N.entra)}</b></div>
      <div><span class="dot" style="background:var(--ink)"></span>Fixos <b>-${fmt(N.fixOut)}</b></div>
      <div><span class="dot" style="background:var(--s1)"></span>Dia a dia <b>-${fmt(N.gasto)}</b></div>
      <div><span class="dot" style="background:var(--s4)"></span>Extras <b>-${fmt(N.exOut + N.exSave)}</b></div>
      <div><span class="dot" style="background:var(--s7)"></span>Guardado <b>${N.guard > 0 ? '-' : ''}${fmt(Math.abs(N.guard))}</b></div>
      ${N.incomes.map(({ f, date }) => `<div class="leg-inc tap" data-a="editFixed" data-v="${f.id}">💰 ${esc(f.name)}<b class="pos">${!noDate(f) && date <= today && N.isCur ? '✓ ' : ''}+${fmt(f.amount)}</b></div>`).join('')}
    </div></div><div class="sp-b">
    ${N.incomes.length ? '' : `<div class="empty" style="padding-bottom:0">Cadastre suas rendas em <button class="link" data-a="newIncome">Nova renda</button> pra ver a sobra real.</div>`}
  </div></div></section>`;
}

/* contas fixas viram lançamentos em Transações, ligados a Contas a pagar */
function fixedTx(f, m) { return S.tx.find(t => t.fixedId === f.id && t.date.slice(0, 7) === m); }
function ensureFixed(m) {
  if (!S.onboarded || !m) return false;
  let changed = false; S.fixedSkip = S.fixedSkip || {};
  S.fixed.filter(f => f.kind === 'sai' && (!f.since || f.since <= m)).forEach(f => {
    if (fixedTx(f, m) || (S.fixedSkip[m] || []).includes(f.id)) return;
    const a = acc(f.accId), wasPaid = (S.fixedPaid[m] || []).includes(f.id);
    const t = { id: uid(), type: 'gasto', amount: +f.amount || 0, catId: f.catId || null, accId: f.accId || null, note: f.name, date: `${m}-${pad(noDate(f) ? 1 : Math.min(+f.day || 1, dim(m)))}`, fixedId: f.id, at: 0, ...(noDate(f) ? { noDay: true } : {}) };
    if (!isCredit(a) || wasPaid) t.paid = wasPaid;          // no cartão, segue a fatura
    S.tx.push(t); changed = true;
  });
  return changed;
}
function syncFixedFuture(f, removed) {
  const cur = curKey();
  S.tx = S.tx.filter(t => {
    if (t.fixedId !== f.id || t.date.slice(0, 7) < cur || isPaid(t)) return true;
    if (removed) return false;
    const m = t.date.slice(0, 7);
    Object.assign(t, { amount: +f.amount || 0, catId: f.catId || null, accId: f.accId || null, note: f.name, date: `${m}-${pad(noDate(f) ? 1 : Math.min(+f.day || 1, dim(m)))}` });
    return true;
  });
}
function billsList(N) {
  const items = [];
  // 1) todas as contas fixas do mês (as do cartão aparecem também, mas o valor delas já está na fatura)
  N.fixOutList.forEach(f => {
    const t = fixedTx(f, N.m), a = acc(f.accId), cr = isCredit(a);
    items.push({ id: f.id, tx: t?.id, open: t ? `editTx|${t.id}` : `editFixed|${f.id}`, paid: t ? isPaid(t) : N.paid.includes(f.id), name: f.name,
      amount: t ? ((t.parts || []).length ? leftToPay(t) : t.amount) : f.amount, day: noDate(f) ? 99 : (+f.day || 1), icon: cat(f.catId)?.icon || '📌',
      sub: cr ? `${a.name} · já na fatura` : (a?.name || 'fixo'), inFatura: cr });
  });
  // 2) lançamentos avulsos marcados como "a pagar" (débito/pix com pagamento pendente ou em partes)
  S.tx.filter(t => t.type === 'gasto' && !t.fixedId && t.date.slice(0, 7) === N.m && !isCredit(acc(t.accId)) && (typeof t.paid === 'boolean' || (t.parts || []).length)).forEach(t => {
    items.push({ id: t.id, tx: t.id, open: `editTx|${t.id}`, paid: isPaid(t), name: t.note || cat(t.catId)?.name || 'Gasto', amount: (t.parts || []).length ? leftToPay(t) : t.amount,
      day: +t.date.slice(8), icon: cat(t.catId)?.icon || '📦', sub: `${acc(t.accId)?.name || ''} · lançamento`.replace(/^ · /, '') });
  });
  // 3) faturas dos cartões que vencem neste mês
  S.accounts.filter(isCredit).forEach(a => {
    const k = invoiceDueIn(a, N.m), v = invoice(a, k);
    if (v > 0) items.push({ id: `card:${a.id}@${k}`, open: `invoice|${a.id}|${k}`, paid: (S.fixedPaid[k] || []).includes('card:' + a.id), name: `Fatura ${a.name}`, amount: v, day: Math.min(+a.due || 10, dim(N.m)), icon: '💳', sub: 'compras e fixos do cartão' });
  });
  return items.sort((a, b) => a.day - b.day || (a.inFatura ? 1 : 0) - (b.inFatura ? 1 : 0));
}
function billsCard(N) {
  const items = billsList(N);
  const pend = items.filter(x => !x.paid && !x.inFatura);   // fixos do cartão não somam de novo: já estão na fatura
  const days = [...new Set(items.map(x => x.day).filter(d => d !== 99))];
  if (ui.payDay && !days.includes(ui.payDay)) ui.payDay = null;
  const shown = ui.payDay ? items.filter(x => x.day === ui.payDay) : items;
  const next = pend.find(x => x.day !== 99);
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('calendar')} Contas a pagar${next ? ` <span class="muted" style="font-weight:600;font-size:12px">· dia ${pad(next.day)}</span>` : ''}</span><button class="link" data-a="newFixed">Nova ${ic('plus')}</button></div>
    ${items.length ? `<div class="saldo-big" style="font-size:28px">${money(sum(pend))}</div>
    <div class="sub" style="margin-bottom:12px">${items.filter(x => x.paid).length} de ${items.length} pagas${items.some(x => x.inFatura) ? ' · fixos do cartão já contam na fatura' : ''}</div>
    <div class="days">${days.map(d => { const its = items.filter(x => x.day === d); const done = its.every(x => x.paid); return `<button class="${ui.payDay === d ? 'on' : ''} ${done ? 'done' : ''}" data-a="payDay" data-v="${d}">${pad(d)}<em>${'•'.repeat(Math.min(5, its.length))}</em></button>`; }).join('')}</div>
    ${shown.map(x => { const p = x.paid; const [oa, ...ov] = (x.open || '').split('|'); return `<div class="row tap ${p ? 'paid' : ''} ${x.inFatura ? 'in-fat' : ''}" data-a="${oa}" data-v="${ov.join('|')}"><button class="check ${p ? 'on' : ''}" data-a="${x.tx ? 'paidTx' : 'pay'}" data-v="${x.tx || x.id}" aria-label="Marcar como paga">${ic('check')}</button><div class="l"><div class="n">${esc(x.name)}</div><div class="d">${x.day === 99 ? 'sem data' : 'dia ' + pad(x.day)} · ${esc(x.sub)}</div></div><div class="v">${fmt(x.amount)}</div></div>`; }).join('')}`
      : `<div class="empty"><b>Nenhuma conta cadastrada</b>Aluguel, assinaturas e faturas aparecem aqui com o dia de vencimento.</div>`}
  </section>`;
}

function cardsCard() {
  const cards = S.accounts.filter(isCredit);
  if (!cards.length) return `<section class="card"><div class="card-h"><span class="t">${ic('card')} Cartões</span></div><div class="empty"><b>Nenhum cartão de crédito</b>Cadastre em Ajustes pra acompanhar faturas e limite.</div><button class="btn ghost" data-a="newAcc" data-v="credito">Adicionar cartão</button></section>`;
  ui.card = Math.min(ui.card, cards.length - 1);
  const a = cards[ui.card];
  const open = cardOpenMonth(a);
  const nexts = [0, 1, 2].map(i => addMonths(open, i));
  const fechada = a.closing && +todayISO().slice(8) > a.closing;
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('card')} Cartões</span>${cards.length > 1 ? `<span class="cstep"><button data-a="cardStep" data-v="-1" aria-label="Cartão anterior" ${ui.card === 0 ? 'disabled' : ''}>${ic('left')}</button><span class="muted">${ui.card + 1} de ${cards.length}</span><button data-a="cardStep" data-v="1" aria-label="Próximo cartão" ${ui.card === cards.length - 1 ? 'disabled' : ''}>${ic('right')}</button></span>` : ''}<button class="expand" data-a="go" data-v="cardsFull" aria-label="Abrir em tela cheia">${ic('expand')}</button></div>
    <div class="sub">Fatura de ${monthName(open).toLowerCase()}</div>
    <div class="saldo-big" style="font-size:28px;margin-bottom:12px">${money(invoice(a, open))}</div>
    <div class="cards-scroll" id="cardScroll">
      ${cards.map((c, i) => `<div class="ccard" data-a="invoice" data-v="${c.id}" style="background:linear-gradient(140deg,${c.color},${shade(c.color)})">
        <div class="top-r"><span>${esc(c.name)}</span><span class="st">${i === ui.card && fechada ? 'Fechada' : 'Aberta'}</span></div>
        <div class="chip-i"></div>
        <div class="bot"><div>Vence<b>${dueDate(c, cardOpenMonth(c))}</b></div><div style="text-align:right">Limite livre<b>${fmt(cardFree(c))}</b></div></div>
      </div>`).join('')}
      <div class="ccard add" data-a="newAcc" data-v="credito">+ Novo cartão</div>
    </div>
    <div class="flabel" style="margin-top:14px">PRÓXIMAS FATURAS</div>
    <div class="invoices">${nexts.map((m, i) => `<div class="inv ${i === 0 ? 'on' : ''}" data-a="invoice" data-v="${a.id}|${m}">${MES3[+m.slice(5) - 1]}${m.slice(0, 4) !== open.slice(0, 4) ? ' ' + m.slice(2, 4) : ''}<b>${fmt(invoice(a, m))}</b></div>`).join('')}</div>
  </section>`;
}
function invoiceSheet(accId, m) {
  const a = acc(accId); if (!a) return;
  openSheet(sheetHead(esc(a.name)) + invoiceBody(a, m || cardOpenMonth(a), false));
}
function invoiceBody(a, m, full) {
  const list = S.tx.filter(t => t.accId === a.id && t.type === 'gasto' && invMonth(t, a) === m).sort((x, y) => y.date.localeCompare(x.date) || (y.at || 0) - (x.at || 0));
  const total = sum(list);
  const months = [-1, 0, 1, 2, 3].map(i => addMonths(cardOpenMonth(a), i));
  if (!months.includes(m)) months.unshift(m);
  const byCat = {}; list.forEach(t => { const c = cat(t.catId); const k = c ? c.id : '_'; (byCat[k] = byCat[k] || { c, v: 0 }).v += t.amount; });
  const cats = Object.values(byCat).sort((x, y) => y.v - x.v);
  const paidKey = 'card:' + a.id, paid = (S.fixedPaid[m] || []).includes(paidKey);
  const used = sum(S.tx.filter(t => t.accId === a.id && t.type === 'gasto' && invMonth(t, a) >= cardOpenMonth(a) && !isPaid(t)));
  return `
    <div class="chips inv-months">${months.map(k => `<button class="chip ${k === m ? 'on' : ''}" data-a="${full ? 'fullInv' : 'invoice'}" data-v="${a.id}|${k}">${MES3[+k.slice(5) - 1]}${k.slice(0, 4) !== curKey().slice(0, 4) ? ' ' + k.slice(2, 4) : ''}</button>`).join('')}</div>
    <div class="sub" style="margin-top:6px">Fatura de ${monthName(m).toLowerCase()} · vence ${dueDate(a, m)}${paid ? ' · <b class="pos">paga</b>' : ''}</div>
    <div class="saldo-big">${money(total)}</div>
    ${cats.length > 1 ? `<div class="chips" style="margin-top:10px">${cats.map(x => `<span class="chip">${esc(x.c?.icon || '📦')} ${fmt0(x.v)}</span>`).join('')}</div>` : ''}
    ${full && +a.limit > 0 ? `<div class="flabel">Limite</div><div class="prog" style="height:10px"><i class="${used > a.limit ? 'over' : ''}" style="width:${Math.min(100, used / a.limit * 100)}%"></i></div><div class="sub" style="display:flex;justify-content:space-between;margin-top:6px"><span>usado ${fmt(used)}</span><span>livre ${fmt(cardFree(a))} de ${fmt0(a.limit)}</span></div>` : ''}
    <div class="flabel">${list.length} ${list.length === 1 ? 'compra' : 'compras'} nessa fatura</div>
    ${list.length ? `<div class="card" style="padding:4px 16px;margin:0">${list.map(txRow).join('')}</div>` : '<div class="empty">Nada nessa fatura.</div>'}
    <button class="btn ghost" data-a="editAcc" data-v="${a.id}">Editar cartão</button>`;
}
/* tela cheia: cartões */
function cardsFullView() {
  const cards = S.accounts.filter(isCredit);
  if (!cards.length) return topbar('Cartões') + `<div class="empty" style="margin-top:40px"><b>Nenhum cartão de crédito</b>Cadastre um pra acompanhar faturas e limite.</div><button class="btn" data-a="newAcc" data-v="credito">Adicionar cartão</button>`;
  const a = cards.find(c => c.id === ui.fullCard) || cards[0]; ui.fullCard = a.id;
  const m = ui.fullInvM && ui.fullInvAcc === a.id ? ui.fullInvM : cardOpenMonth(a);
  return topbar('Cartões') + `<div class="narrow full-cards">
    <div class="cards-grid">${cards.map(c => `<div class="ccard ${c.id === a.id ? 'sel' : 'dim'}" data-a="fullCard" data-v="${c.id}" style="background:linear-gradient(140deg,${c.color},${shade(c.color)})">
      <div class="top-r"><span>${esc(c.name)}</span><span class="st">${fmt(invoice(c, cardOpenMonth(c)))}</span></div><div class="chip-i"></div>
      <div class="bot"><div>Vence<b>${dueDate(c, cardOpenMonth(c))}</b></div><div style="text-align:right">Limite livre<b>${fmt(cardFree(c))}</b></div></div></div>`).join('')}
      <div class="ccard add" data-a="newAcc" data-v="credito">+ Novo cartão</div></div>
    <section class="card" style="margin-top:14px"><div class="card-h"><span class="t">${ic('card')} ${esc(a.name)}</span></div>${invoiceBody(a, m, true)}</section></div>`;
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * .55); g = Math.round(g * .55); b = Math.round(b * .55);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function boxCard(N) {
  const BX = N.BX;
  if (!BX.list.length) return `<section class="card">
    <div class="card-h"><span class="t">${ic('piggy')} Cofrinho</span></div>
    <div class="empty"><b>Quanto você tem guardado?</b>Crie uma caixinha pra acompanhar a reserva e ver quanto ela rende.</div>
    <button class="btn" data-a="newBox">${ic('plus')} Criar caixinha</button></section>`;
  return `<section class="card" id="cofrinho">
    <div class="card-h"><span class="t">${ic('piggy')} Cofrinho</span><button class="expand" data-a="go" data-v="boxesFull" aria-label="Abrir em tela cheia">${ic('expand')}</button><button class="link" data-a="newBox">Caixinha ${ic('plus')}</button></div>
    <div class="sub">Dinheiro guardado</div>
    <div class="saldo-big">${money(BX.total)}</div>
    <div style="font-size:12.5px;margin-top:4px"><b class="pos">+${fmt(BX.est)}</b> <span class="muted">de rendimento estimado em ${monthName(N.m).toLowerCase()}</span></div>
    ${BX.dep || BX.ret || BX.rend ? `<div class="sub" style="margin-top:2px">Este mês: guardou ${fmt(BX.dep)}${BX.ret ? ` · retirou ${fmt(BX.ret)}` : ''}${BX.rend ? ` · rendeu ${fmt(BX.rend)}` : ''}</div>` : ''}
    <div style="margin-top:10px">${BX.list.map(({ b, bal, est }) => `<div class="row tap" data-a="openBox" data-v="${b.id}"><div class="ico">${esc(b.icon || '🐷')}</div><div class="l"><div class="n">${esc(b.name)}</div><div class="d">${acc(b.accId) ? esc(acc(b.accId).name) + ' · ' : ''}${rateLabel(b)}${est > 0 ? ` · ~${fmt(est)}/mês` : ''}</div>${b.goal > 0 ? `<div class="prog" style="height:5px;margin-top:6px"><i style="width:${Math.min(100, bal / b.goal * 100)}%;background:var(--s7)"></i></div><div class="d" style="margin-top:3px">${pct(bal, b.goal)}% da meta de ${fmt0(b.goal)}</div>` : ''}</div><div class="v">${fmt(bal)}</div></div>`).join('')}</div>
    <div class="trio"><button class="btn ghost" data-a="move" data-v="dep">Guardar</button><button class="btn ghost" data-a="move" data-v="ret">Retirar</button><button class="btn ghost" data-a="move" data-v="rend">Rendeu</button></div>
  </section>`;
}
function boxForm(b) {
  openForm({
    title: b ? 'Editar caixinha' : 'Nova caixinha', saveLabel: b ? 'Salvar' : 'Criar caixinha',
    values: b ? { ...b } : (() => { const ac = acc(S.defaultAcc) || S.accounts.find(x => !isCredit(x)); const s = bankOf(ac?.bank)[3]; return { icon: '🐷', rateType: s.rateType, rate: s.rate, accId: ac?.id }; })(),
    fields: [
      { key: 'name', label: 'Nome', req: true, max: 30, ph: 'Ex.: Reserva de emergência, Viagem' },
      { key: 'icon', label: 'Emoji', max: 4, ph: '🐷' },
      ...(b ? [] : [{ key: 'initial', label: 'Quanto já tem guardado nela?', type: 'money', hint: 'Entra como saldo inicial. Não conta como gasto do mês.' }]),
      { key: 'accId', label: 'Onde está o dinheiro', type: 'select', options: accOpts(), hint: '<span id="bankSug"></span>' },
      { key: 'rateType', label: 'Como rende', type: 'radios', options: [['cdi', '% do CDI'], ['ano', '% ao ano'], ['mes', '% ao mês'], ['nada', 'Não rende']], def: 'cdi' },
      { key: 'rate', label: 'Taxa', ph: 'Ex.: 100', hint: `Para "% do CDI", 100 = rende igual ao CDI (hoje ${String(S.cdi).replace('.', ',')}% ao ano). Estimativa bruta, antes do IR.` },
      { key: 'goal', label: 'Meta (opcional)', type: 'money' }
    ],
    onOpen: form => { const upd = (apply) => { const ac = acc(form.querySelector('[name=accId]').value); const s = bankOf(ac?.bank)[3]; $('#bankSug').textContent = ac ? `Sugestão para ${bankOf(ac.bank)[1]}: ${s.info}. Confira no app do banco.` : ''; if (apply) { form.querySelectorAll('[name=rateType]').forEach(r => r.checked = r.value === s.rateType); form.querySelector('[name=rate]').value = s.rate.replace('.', ','); } }; upd(false); form._upd = upd; },
    onChange: (form, k) => { if (k === 'accId') form._upd(true); },
    onSave: v => {
      v.rate = String(v.rate || '').replace(',', '.');
      if (b) { Object.assign(b, v); return; }
      const nb = { id: uid(), name: v.name, icon: v.icon || '🐷', accId: v.accId, rateType: v.rateType, rate: v.rate, goal: v.goal };
      S.boxes = S.boxes || []; S.moves = S.moves || []; S.boxes.push(nb);
      if (v.initial > 0) S.moves.push({ id: uid(), boxId: nb.id, type: 'ini', amount: v.initial, date: todayISO(), note: 'Saldo inicial' });
    },
    onDelete: b ? () => { S.boxes = S.boxes.filter(x => x.id !== b.id); S.moves = S.moves.filter(m => m.boxId !== b.id); } : null
  });
}
const MOVE_T = { dep: ['Guardar dinheiro', 'Guardado'], ret: ['Retirar dinheiro', 'Retirado'], rend: ['Registrar rendimento', 'Rendimento registrado'] };
function moveForm(type, boxId) {
  if (!(S.boxes || []).length) { boxForm(); return; }
  openForm({
    title: MOVE_T[type][0], saveLabel: MOVE_T[type][0].split(' ')[0],
    values: { boxId: boxId || S.boxes[0].id, date: ui.month === curKey() ? todayISO() : ui.month + '-01' },
    fields: [
      { key: 'boxId', label: 'Caixinha', type: 'select', options: S.boxes.map(b => [b.id, `${b.icon || '🐷'} ${b.name}`]) },
      { key: 'amount', label: 'Valor', type: 'money', req: true },
      { key: 'date', label: 'Data', ph: 'AAAA-MM-DD', type: 'date' },
      { key: 'note', label: 'Nota (opcional)', max: 60 }
    ],
    onSave: v => { S.moves.push({ id: uid(), boxId: v.boxId, type, amount: v.amount, date: /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : todayISO(), note: v.note }); toast(MOVE_T[type][1]); }
  });
}
function boxSheet(id) {
  const b = box(id); if (!b) return;
  const bal = boxBal(b), est = bal * monthlyRate(b);
  const mv = S.moves.filter(m => m.boxId === id).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 30);
  const lab = { ini: 'Saldo inicial', dep: 'Guardou', ret: 'Retirou', rend: 'Rendimento' };
  openSheet(sheetHead(`${esc(b.icon || '🐷')} ${esc(b.name)}`) + boxBody(b));
}
function boxBody(b, full) {
  const id = b.id, bal = boxBal(b), est = bal * monthlyRate(b);
  const mv = S.moves.filter(m => m.boxId === id).sort((x, y) => y.date.localeCompare(x.date)).slice(0, full ? 12 : 30);
  const lab = { ini: 'Saldo inicial', dep: 'Guardou', ret: 'Retirou', rend: 'Rendimento' };
  return `
    <div class="saldo-big">${money(bal)}</div>
    <div class="sub">${acc(b.accId) ? esc(acc(b.accId).name) + ' · ' : ''}${rateLabel(b)} · rende ~${fmt(est)} por mês</div>
    <div class="trio"><button class="btn ghost" data-a="move" data-v="dep" data-b="${id}">Guardar</button><button class="btn ghost" data-a="move" data-v="ret" data-b="${id}">Retirar</button><button class="btn ghost" data-a="move" data-v="rend" data-b="${id}">Rendeu</button></div>
    <button class="btn ghost" data-a="fixBal" data-v="${id}">Atualizar com o saldo do banco</button>
    <div class="flabel">Histórico</div>
    ${mv.length ? mv.map(m => `<div class="row tap" data-a="delMove" data-v="${m.id}"><div class="l"><div class="n">${lab[m.type]}${m.note && m.type !== 'ini' ? ' · ' + esc(m.note) : ''}</div><div class="d">${dayLabel(m.date)}</div></div><div class="v ${m.type === 'ret' ? '' : 'pos'}">${m.type === 'ret' ? '-' : '+'}${fmt(Math.abs(m.amount))}</div></div>`).join('') : '<div class="empty">Sem movimentos.</div>'}
    ${b.goal > 0 ? `<div class="flabel">Meta</div><div class="prog" style="height:10px"><i style="width:${Math.min(100, bal / b.goal * 100)}%;background:var(--s7)"></i></div><div class="sub" style="margin-top:6px">${pct(bal, b.goal)}% de ${fmt0(b.goal)} · faltam ${fmt(Math.max(0, b.goal - bal))}</div>` : ''}
    <div class="sub" style="margin-top:8px">Toque num movimento pra apagar.</div>
    <button class="btn ghost" data-a="editBox" data-v="${id}">Editar caixinha</button>`;
}
function boxesFullView() {
  const BX = boxesInfo(ui.month);
  const ks = [-5, -4, -3, -2, -1, 0].map(i => addMonths(ui.month, i));
  CH = { boxes: { labels: ks.map(k => MES3[+k.slice(5) - 1]), series: [{ name: 'Guardado', color: 'var(--s7)', values: ks.map(k => sum(S.boxes || [], b => boxBal(b, k + '-31'))) }], tipLabel: i => monthName(ks[i]) + ' ' + ks[i].slice(0, 4) } };
  return topbar('Cofrinho') + `<div class="narrow full-boxes">
    <section class="card"><div class="sub">Dinheiro guardado</div><div class="big" style="text-align:left">${money(BX.total)}</div>
      <div style="font-size:13px;margin-top:4px"><b class="pos">+${fmt(BX.est)}</b> <span class="muted">de rendimento estimado em ${monthName(ui.month).toLowerCase()}</span></div>
      <div class="kpis two"><div class="kpi"><div class="k">Guardou no mês</div><div class="v">${fmt(BX.dep)}</div></div><div class="kpi"><div class="k">Rendeu no mês</div><div class="v pos">${fmt(BX.rend)}</div></div></div>
      <div class="trio"><button class="btn ghost" data-a="move" data-v="dep">Guardar</button><button class="btn ghost" data-a="move" data-v="ret">Retirar</button><button class="btn ghost" data-a="move" data-v="rend">Rendeu</button></div>
      <button class="btn" data-a="newBox">${ic('plus')} Nova caixinha</button></section>
    ${(S.boxes || []).length ? `<section class="card evo"><div class="card-h"><span class="t">${ic('trend')} Evolução</span></div><div class="chart fill" data-chart="boxes"></div></section>` : ''}
    ${(S.boxes || []).map(b => `<section class="card"><div class="card-h"><span class="t">${esc(b.icon || '🐷')} ${esc(b.name)}</span></div>${boxBody(b, true)}</section>`).join('')}
  </div>`;
}

function extrasCard(N) {
  const ex = extrasFor(N.m);
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('spark')} Valores extras</span><button class="link" data-a="newExtra">Novo ${ic('plus')}</button></div>
    ${ex.length ? ex.map(extraRow).join('') : `<div class="empty"><b>Nada por aqui</b>Reserva, vale, 13º, empréstimo pra amiga, obra... Qualquer valor que você quer controlar na mão.</div>`}
  </section>`;
}
function extraRow(e) {
  const k = { entra: ['+', 'pos', 'Entrada'], sai: ['-', '', 'Saída'], guardado: ['', '', 'Guardado'] }[e.kind] || ['', '', ''];
  const tags = [e.recurring ? 'todo mês' : 'só este mês', e.affects === false ? 'fora da sobra' : ''].filter(Boolean).join(' · ');
  return `<div class="row tap" data-a="editExtra" data-v="${e.id}"><div class="ico">${esc(e.icon || (e.kind === 'guardado' ? '🐷' : e.kind === 'entra' ? '💰' : '✨'))}</div><div class="l"><div class="n">${esc(e.name)} ${e.estimated ? '<span class="tag yellow" style="font-size:10px;padding:1px 7px">estimado</span>' : ''}</div><div class="d">${k[2]} · ${tags}</div></div><div class="v ${k[1]}">${e.estimated ? '≈ ' : ''}${k[0]}${fmt(e.amount)}</div></div>`;
}

function recentCard(N) {
  const list = [...N.tx].sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0)).slice(0, 6);
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('list')} Últimos lançamentos</span>${N.tx.length ? `<button class="link" data-a="go" data-v="tx">Ver tudo ${ic('right')}</button>` : ''}</div>
    ${list.length ? list.map(txRow).join('') : `<div class="empty"><b>Nenhum lançamento em ${monthName(N.m).toLowerCase()}</b>Toque em + pra anotar.</div>`}
  </section>`;
}
/* pago / devendo / me devem */
// pagamentos em partes
const r2 = v => Math.round(v * 100) / 100;
const partsSum = list => r2(sum(list || []));
const leftToPay = t => Math.max(0, r2(t.amount - partsSum(t.parts)));
function isPaid(t) {
  if (t.type !== 'gasto') return true;
  if ((t.parts || []).length && leftToPay(t) <= 0) return true;
  if (typeof t.paid === 'boolean') return t.paid;
  if ((t.parts || []).length) return false;
  const a = acc(t.accId);
  if (!isCredit(a)) return true;                                      // débito e pix já saem pagos
  return (S.fixedPaid[invMonth(t, a)] || []).includes('card:' + a.id); // cartão: pago quando a fatura é marcada
}
const oweTotal = t => +t.owedBy?.amount || t.amount;
const oweLeft = t => Math.max(0, r2(oweTotal(t) - partsSum(t.owedBy?.parts)));
const owes = t => t.owedBy && t.owedBy.name && !t.owedBy.received && oweLeft(t) > 0;
function debts(m = ui.month) {
  const unpaid = S.tx.filter(t => t.type === 'gasto' && t.date.slice(0, 7) <= m && !isPaid(t));   // o mês aberto + o que ficou sem pagar dos meses anteriores
  const owed = S.tx.filter(t => owes(t) && t.date.slice(0, 7) <= m);   // aparece a partir do mês em que a dívida surgiu
  const people = {}; owed.forEach(t => { const k = t.owedBy.name.trim(); (people[k] = people[k] || { name: k, v: 0, n: 0 }); people[k].v += oweLeft(t); people[k].n++; });
  const left = t => (t.parts || []).length ? leftToPay(t) : t.amount;
  const late = unpaid.filter(t => t.date.slice(0, 7) < m);
  return { unpaid, devo: sum(unpaid, left), late, devoLate: sum(late, left), devoMes: sum(unpaid, left) - sum(late, left), owed, meDevem: sum(owed, oweLeft), people: Object.values(people).sort((a, b) => b.v - a.v) };
}
function payPart(t, amt, date = todayISO()) {
  amt = r2(Math.min(amt, leftToPay(t))); if (amt <= 0) return;
  (t.parts = t.parts || []).push({ id: uid(), amount: amt, date });
  if (leftToPay(t) <= 0) { t.paid = true; t.paidAt = [...t.parts].sort((a, b) => a.date.localeCompare(b.date)).at(-1).date; }
  toast(leftToPay(t) <= 0 ? 'Pago ✓' : `Pagou ${fmt(amt)} · falta ${fmt(leftToPay(t))}`);
}
// quando alguém paga o que devia, o dinheiro volta como receita na conta (inteiro ou em partes)
function backAccount(t) {
  const a = acc(t.accId);
  return isCredit(a) ? (acc(S.defaultAcc) && !isCredit(acc(S.defaultAcc)) ? S.defaultAcc : (S.accounts.find(x => !isCredit(x)) || a).id) : t.accId;
}
function receivePart(t, amt, date = todayISO()) {
  const o = t.owedBy; if (!o) return;
  amt = r2(Math.min(amt, oweLeft(t))); if (amt <= 0) return;
  const back = backAccount(t);
  const r = { id: uid(), type: 'receita', amount: amt, accId: back, note: `${o.name} pagou${t.note ? ': ' + t.note : ''}`, date, at: Date.now(), fromOwe: t.id };
  S.tx.push(r); (o.parts = o.parts || []).push({ id: r.id, amount: amt, date: r.date, txId: r.id });
  if (oweLeft(t) <= 0) o.received = true;
  toast(o.received ? `${o.name} pagou tudo ✓ ${fmt(amt)} voltou pra ${acc(back)?.name || 'conta'}` : `${o.name} pagou ${fmt(amt)} · falta ${fmt(oweLeft(t))}`);
}
function receive(t, on) {
  const o = t.owedBy; if (!o) return;
  if (on && !o.received) receivePart(t, oweLeft(t), todayISO());
  else if (!on && (o.received || (o.parts || []).length)) {
    const ids = new Set([(o.parts || []).map(p => p.txId), o.recvTx].flat().filter(Boolean));
    S.tx = S.tx.filter(x => !ids.has(x.id)); o.received = false; o.parts = []; delete o.recvTx;
    toast('Voltou pra pendente');
  }
}
function txRow(t) {
  const c = cat(t.catId), a = acc(t.accId), r = t.type === 'receita';
  const title = t.note || (r ? 'Receita' : c?.name || 'Gasto');
  const sub = [t.fixedId ? 'conta fixa' : '', r ? (t.note ? 'Receita' : '') : (t.note ? c?.name : ''), a?.name, t.inst ? `parcela ${t.inst}` : ''].filter(Boolean).join(' · ');
  const op = partsSum(t.owedBy?.parts);
  const owe = t.owedBy && t.owedBy.name ? `<div class="owe ${t.owedBy.received ? 'ok' : ''}">${t.owedBy.received ? '✓ ' + esc(t.owedBy.name) + ' pagou' : esc(t.owedBy.name) + ' te deve ' + fmt(oweLeft(t)) + (op ? ` (já pagou ${fmt(op)})` : '')}</div>` : '';
  const shortD = iso => iso ? iso.slice(8) + '/' + iso.slice(5, 7) : '';
  const pp = r ? '' : (t.parts || []).length && !isPaid(t) ? `<div class="owe part">pago ${fmt(partsSum(t.parts))} · falta ${fmt(leftToPay(t))}</div>`
    : isPaid(t) && t.paidAt ? `<div class="paid-at">✓ pago em ${shortD(t.paidAt)}</div>` : '';
  const chk = ui.view === 'tx' && !r ? (ui.txType === 'medevem'
      ? `<button class="check ${t.owedBy?.received ? 'on' : ''}" data-a="recv" data-v="${t.id}" aria-label="Marcar como recebido">${ic('check')}</button>`
      : `<button class="check ${isPaid(t) ? 'on' : ''}" data-a="paidTx" data-v="${t.id}" aria-label="Marcar como pago">${ic('check')}</button>`) : '';
  return `<div class="row tap ${chk && isPaid(t) && ui.txType !== 'medevem' ? 'is-paid' : ''}" data-a="editTx" data-v="${t.id}">${chk}<div class="ico">${r ? '💰' : esc(c?.icon || '📦')}</div><div class="l"><div class="n">${esc(title)}</div><div class="d">${esc(sub || dayLabel(t.date))}</div>${pp}${owe}</div><div class="v ${r ? 'pos' : ''}">${r ? '+' : '-'}${fmt(t.amount)}</div></div>`;
}

/* ---------- Transações ---------- */
function txView() {
  const N = info();
  const q = ui.q.trim().toLowerCase();
  const DB = debts();
  const base = ui.txType === 'apagar' ? DB.unpaid : ui.txType === 'medevem' ? DB.owed : N.tx;
  let list = base.filter(t => ['all', 'apagar', 'medevem'].includes(ui.txType) || t.type === ui.txType)
    .filter(t => !ui.accF || t.accId === ui.accF).filter(t => !ui.catF || t.catId === ui.catF)
    .filter(t => !q || [t.note, cat(t.catId)?.name, acc(t.accId)?.name, String(t.amount).replace('.', ',')].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0));
  const groups = {};
  list.forEach(t => (groups[t.date] = groups[t.date] || []).push(t));
  const tot = sum(list.filter(t => t.type === 'gasto')), totR = sum(list.filter(t => t.type === 'receita'));
  return topbar() + `<h1>Transações</h1>
    <label class="search">${ic('search')}<input id="q" type="search" placeholder="Buscar por nota, categoria ou conta" value="${esc(ui.q)}" autocomplete="off"></label>
    <div class="debt-tiles">
      <button class="kpi ${ui.txType === 'apagar' ? 'on' : ''}" data-a="txType" data-v="apagar"><div class="k">Você deve</div><div class="v ${DB.devo ? 'neg' : ''}">${fmt(DB.devo)}</div><div class="s">${DB.unpaid.length ? (DB.late.length ? `${fmt(DB.devoMes)} de ${monthName(ui.month).toLowerCase()} + ${fmt(DB.devoLate)} de meses anteriores` : `${DB.unpaid.length} a pagar em ${monthName(ui.month).toLowerCase()}`) : 'tudo pago ✓'}</div></button>
      <button class="kpi ${ui.txType === 'medevem' ? 'on' : ''}" data-a="txType" data-v="medevem"><div class="k">Te devem</div><div class="v ${DB.meDevem ? 'pos' : ''}">${fmt(DB.meDevem)}</div><div class="s">${DB.people.length ? DB.people.slice(0, 2).map(p => esc(p.name)).join(', ') + (DB.people.length > 2 ? ` e +${DB.people.length - 2}` : '') : 'ninguém'}</div></button>
    </div>
    ${ui.txType === 'medevem' && DB.people.length ? `<div class="chips">${DB.people.map(p => `<span class="chip">${esc(p.name)} · ${fmt(p.v)}</span>`).join('')}</div>` : ''}
    <div class="chips">
      ${[['all', 'Tudo'], ['gasto', 'Gastos'], ['receita', 'Receitas'], ['apagar', 'A pagar'], ['medevem', 'Me devem']].map(([v, l]) => `<button class="chip ${ui.txType === v ? 'on' : ''}" data-a="txType" data-v="${v}">${l}</button>`).join('')}
      ${S.accounts.map(a => `<button class="chip ${ui.accF === a.id ? 'on' : ''}" data-a="accF" data-v="${a.id}"><span class="dot" style="background:${a.color}"></span>${esc(a.name)}</button>`).join('')}
    </div>
    <div class="chips">${S.categories.map(c => `<button class="chip ${ui.catF === c.id ? 'on' : ''}" data-a="catF" data-v="${c.id}">${esc(c.icon)} ${esc(c.name.split(' ')[0])}</button>`).join('')}</div>
    ${list.length ? `<div class="sub" style="margin:8px 4px">${list.length} lançamentos · <b class="ink2">-${fmt(tot)}</b>${totR ? ` · <b class="pos">+${fmt(totR)}</b>` : ''}</div>` : ''}
    ${list.length ? Object.entries(groups).map(([d, ts]) => `<div class="day-h"><span>${dayLabel(d)}</span><span>${fmt(sum(ts.filter(t => t.type === 'gasto')))}</span></div><div class="card" style="padding:4px 16px">${ts.map(txRow).join('')}</div>`).join('')
      : `<div class="empty" style="margin-top:40px"><b>${ui.txType === 'apagar' ? 'Nada pra pagar 🎉' : ui.txType === 'medevem' ? 'Ninguém te deve nada' : `Nenhum lançamento em ${monthName(ui.month).toLowerCase()}`}</b>${ui.txType === 'medevem' ? 'Ao lançar um gasto, abra "Data, nota e mais" e marque quem te deve.' : 'Toque em + pra anotar.'}</div>`}
    ${['all', 'gasto'].includes(ui.txType) && list.some(t => t.type === 'gasto') ? '<p class="sub" style="text-align:center;margin-top:14px">Toque no círculo pra marcar como pago.</p>' : ''}`;
}

/* ---------- Análises (gráficos) ---------- */
let CH = {};
function chartsView() {
  const N = info(), P = info(addMonths(ui.month, -1));
  const delta = P.gasto > 0 ? (N.gasto - P.gasto) / P.gasto * 100 : null;
  const biggest = [...N.gastos].sort((a, b) => b.amount - a.amount)[0];
  const dayOf = t => +t.date.slice(8);
  const daily = Array.from({ length: N.D }, (_, i) => sum(N.gastos.filter(t => dayOf(t) === i + 1)));
  const maxDay = daily.indexOf(Math.max(...daily));
  const wd = [0, 0, 0, 0, 0, 0, 0]; N.gastos.forEach(t => { const [y, m, d] = t.date.split('-').map(Number); wd[new Date(y, m - 1, d).getDay()] += t.amount; });
  const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const wdMax = wd.indexOf(Math.max(...wd));
  const lastDay = N.isCur ? N.day : N.isPast ? N.D : 0;
  let acc_ = 0;
  CH = {
    cum: { labels: daily.map((_, i) => String(i + 1)), series: [
      { name: 'Gasto acumulado', color: 'var(--green)', values: daily.map((v, i) => i < lastDay ? (acc_ += v) : null) },
      { name: 'Ritmo ideal', color: 'var(--muted)', dash: true, values: daily.map((_, i) => N.limit * (i + 1) / N.D) }
    ], tipLabel: i => `Dia ${i + 1}` },
    daily: { labels: daily.map((_, i) => String(i + 1)), values: daily, hi: N.isCur ? N.day - 1 : -1, tipLabel: i => `Dia ${i + 1} de ${monthName(N.m).toLowerCase()}` },
    months: (() => { const ks = [-5, -4, -3, -2, -1, 0].map(i => addMonths(ui.month, i)); const infos = ks.map(k => info(k)); return { labels: ks.map(k => MES3[+k.slice(5) - 1]), series: [
      { name: 'Entradas', color: 'var(--green2)', values: infos.map(x => x.entra) },
      { name: 'Saídas', color: 'var(--ink)', values: infos.map(x => x.fixOut + x.gasto + x.exOut + x.exSave) }
    ], tipLabel: i => monthName(ks[i]) + ' ' + ks[i].slice(0, 4) }; })(),
    boxes: (() => { const ks = [-5, -4, -3, -2, -1, 0].map(i => addMonths(ui.month, i)); return { labels: ks.map(k => MES3[+k.slice(5) - 1]), series: [{ name: 'Guardado', color: 'var(--s7)', values: ks.map(k => sum(S.boxes || [], b => boxBal(b, k + '-31'))) }], tipLabel: i => monthName(ks[i]) + ' ' + ks[i].slice(0, 4) }; })()
  };
  const catRows = N.byCat.filter(x => x.v > 0 || x.c.limit > 0).sort((a, b) => b.v - a.v);
  const maxCat = Math.max(1, ...catRows.map(x => Math.max(x.v, x.c.limit)));
  const accRows = S.accounts.map(a => ({ a, v: sum(N.gastos.filter(t => t.accId === a.id)) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const maxAcc = Math.max(1, ...accRows.map(x => x.v));

  return topbar() + `<h1>Análises</h1>
    <div class="kpis">
      <div class="kpi"><div class="k">Gasto no mês</div><div class="v">${fmt(N.gasto)}</div><div class="s">${delta === null ? 'sem mês anterior' : `<span class="${delta > 0 ? 'neg' : 'pos'}">${delta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta))}%</span> vs ${MES3[+P.m.slice(5) - 1].toLowerCase()}`}</div></div>
      <div class="kpi"><div class="k">Média por dia</div><div class="v">${fmt(lastDay ? N.gasto / lastDay : 0)}</div><div class="s">ideal: ${fmt(N.limit / N.D)}</div></div>
      <div class="kpi"><div class="k">Projeção do mês</div><div class="v ${N.projecao > N.limit && N.limit ? 'neg' : ''}">${fmt0(N.projecao)}</div><div class="s">limite ${fmt0(N.limit)}</div></div>
      <div class="kpi"><div class="k">Maior gasto</div><div class="v">${biggest ? fmt0(biggest.amount) : 'R$ 0'}</div><div class="s">${biggest ? esc(biggest.note || cat(biggest.catId)?.name || '') : 'nada ainda'}</div></div>
    </div>
    <section class="card"><div class="card-h"><span class="t">${ic('trend')} Gasto acumulado x ritmo ideal</span></div>
      <div class="ch-legend"><span><i style="background:var(--green)"></i>Gasto acumulado</span><span><i class="dash"></i>Ritmo ideal</span></div>
      <div class="chart" data-chart="cum"></div></section>
    <div class="masonry"><section class="card"><div class="card-h"><span class="t">${ic('calendar')} Gastos por dia</span></div>
      <div class="chart" data-chart="daily"></div>
      ${N.gasto ? `<div class="sub" style="margin-top:10px">Dia mais caro: <b class="ink2">${maxDay + 1}/${N.m.slice(5)}</b> (${fmt(daily[maxDay])}) · você gasta mais na <b class="ink2">${WD[wdMax]}</b></div>` : ''}</section>
    <section class="card"><div class="card-h"><span class="t">${ic('pie')} Por categoria</span><button class="link" data-a="go" data-v="plan">Limites</button></div>
      ${catRows.length ? catRows.map(x => { const over = x.c.limit > 0 && x.v > x.c.limit; return `<div class="hbar"><div class="top-l"><span><span class="dot" style="background:${catColor(x.c)}"></span><em>${esc(x.c.icon)} ${esc(x.c.name)}</em></span><b>${fmt(x.v)}</b></div>
        <div class="prog"><i class="${over ? 'over' : ''}" style="width:${x.v / maxCat * 100}%;${over ? '' : `background:${catColor(x.c)}`}"></i>${x.c.limit > 0 ? `<span class="mark" style="left:calc(${x.c.limit / maxCat * 100}% - 1px)"></span>` : ''}</div>
        <div class="sm"><span>${pct(x.v, N.gasto)}% do mês</span><span class="${over ? 'neg' : ''}">${x.c.limit > 0 ? (over ? `estourou ${fmt(x.v - x.c.limit)}` : `limite ${fmt0(x.c.limit)}`) : 'sem limite'}</span></div></div>`; }).join('')
      : '<div class="empty">Sem gastos ainda.</div>'}</section>
    <section class="card"><div class="card-h"><span class="t">${ic('card')} Por conta e cartão</span></div>
      ${'' /* contas */}${accRows.length ? accRows.map(x => `<div class="hbar"><div class="top-l"><span><span class="dot" style="background:${x.a.color}"></span><em>${esc(x.a.name)}</em></span><b>${fmt(x.v)}</b></div><div class="prog"><i style="width:${x.v / maxAcc * 100}%;background:${x.a.color}"></i></div><div class="sm"><span>${pct(x.v, N.gasto)}% do mês</span><span>${isCredit(x.a) ? 'crédito' : 'débito / pix'}</span></div></div>`).join('') : '<div class="empty">Sem gastos ainda.</div>'}</section>
    <section class="card"><div class="card-h"><span class="t">${ic('piggy')} Dinheiro guardado</span></div>
      <div class="ch-legend"><span><i style="background:var(--s7)"></i>Total no cofrinho</span></div>
      ${(S.boxes || []).length ? '<div class="chart" data-chart="boxes"></div>' : '<div class="empty">Crie uma caixinha no Início pra acompanhar.</div>'}</section>
    <section class="card"><div class="card-h"><span class="t">${ic('repeat')} Últimos 6 meses</span></div>
      <div class="ch-legend"><span><i class="sq" style="background:var(--green2)"></i>Entradas</span><span><i class="sq" style="background:var(--ink)"></i>Saídas</span></div>
      <div class="chart" data-chart="months"></div></section>
    </div>`;
}

/* gráficos em SVG puro, com tooltip */
function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function axes(W, H, pl, pr, pt, pb, max) {
  let g = '<g class="grid">';
  for (let k = 0; k <= 4; k++) { const y = pt + (H - pt - pb) * (1 - k / 4); g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl - 6}" y="${y + 3.5}" text-anchor="end">${short(max * k / 4)}</text>`; }
  return g + '</g>';
}
function xLabels(labels, x, H, pb, every) { return labels.map((l, i) => (i % every === 0 || i === labels.length - 1) ? `<text class="ax" x="${x(i)}" y="${H - pb + 16}" text-anchor="middle">${l}</text>` : '').join(''); }
function lineChart(el, o) {
  const W = el.clientWidth || 320, H = el.classList.contains('fill') && innerWidth >= 1100 ? Math.max(190, el.clientHeight) : 190, pl = 42, pr = 8, pt = 10, pb = 24;
  const max = niceMax(Math.max(...o.series.flatMap(s => s.values.filter(v => v != null)), 1));
  const n = o.labels.length, x = i => pl + (W - pl - pr) * (n <= 1 ? 0 : i / (n - 1)), y = v => pt + (H - pt - pb) * (1 - v / max);
  const paths = o.series.map(s => { let d = '', on = false; s.values.forEach((v, i) => { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); on = true; }); return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="4 4"' : ''}/>`; }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}">${axes(W, H, pl, pr, pt, pb, max)}${xLabels(o.labels, x, H, pb, Math.ceil(n / 6))}${paths}<g class="hov"></g><rect x="${pl}" y="0" width="${W - pl - pr}" height="${H - pb}" fill="transparent"/></svg>`;
  const hov = el.querySelector('.hov');
  hoverable(el, ev => {
    const r = el.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.round((ev.clientX - r.left - pl) / (W - pl - pr) * (n - 1))));
    hov.innerHTML = `<line class="hl" x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}"/>` + o.series.map(s => s.values[i] == null ? '' : `<circle cx="${x(i)}" cy="${y(s.values[i])}" r="4.5" fill="${s.color}" stroke="var(--card)" stroke-width="2"/>`).join('');
    return `<b>${o.tipLabel(i)}</b>` + o.series.map(s => s.values[i] == null ? '' : `<div class="tr"><span><i style="background:${s.color}"></i> ${s.name}</span><b>${fmt(s.values[i])}</b></div>`).join('');
  }, () => hov.innerHTML = '');
}
function barChart(el, o) {
  const W = el.clientWidth || 320, H = 170, pl = 42, pr = 4, pt = 10, pb = 24;
  const max = niceMax(Math.max(...o.values, 1)), n = o.values.length, bw = (W - pl - pr) / n;
  const y = v => pt + (H - pt - pb) * (1 - v / max), x = i => pl + bw * i + bw / 2;
  const bars = o.values.map((v, i) => { if (v <= 0) return ''; const h = Math.max(2, H - pb - y(v)), w = Math.max(2, bw - 2), x0 = pl + bw * i + 1, y0 = H - pb - h, r = Math.min(4, w / 2, h);
    return `<path d="M${x0} ${H - pb}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}H${x0 + w - r}Q${x0 + w} ${y0} ${x0 + w} ${y0 + r}V${H - pb}Z" fill="${i === o.hi ? 'var(--ink)' : 'var(--green2)'}" data-i="${i}"/>`; }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}">${axes(W, H, pl, pr, pt, pb, max)}${xLabels(o.labels, x, H, pb, Math.ceil(n / 7))}${bars}<g class="hov"></g><rect x="${pl}" y="0" width="${W - pl - pr}" height="${H - pb}" fill="transparent"/></svg>`;
  const hov = el.querySelector('.hov');
  hoverable(el, ev => {
    const r = el.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - r.left - pl) / bw)));
    hov.innerHTML = `<rect x="${pl + bw * i}" y="${pt}" width="${bw}" height="${H - pt - pb}" fill="var(--ink)" opacity=".06" rx="3"/>`;
    return `<b>${o.tipLabel(i)}</b><div class="tr"><span>Gastos</span><b>${fmt(o.values[i])}</b></div>`;
  }, () => hov.innerHTML = '');
}
function groupChart(el, o) {
  const W = el.clientWidth || 320, H = 190, pl = 42, pr = 4, pt = 10, pb = 24;
  const max = niceMax(Math.max(...o.series.flatMap(s => s.values), 1)), n = o.labels.length, gw = (W - pl - pr) / n;
  const y = v => pt + (H - pt - pb) * (1 - v / max), x = i => pl + gw * i + gw / 2;
  const k = o.series.length, bw = Math.min(22, (gw - 12) / k);
  let bars = '';
  o.series.forEach((s, si) => s.values.forEach((v, i) => { if (v <= 0) return; const h = Math.max(2, H - pb - y(v)), x0 = x(i) - (bw * k + 2 * (k - 1)) / 2 + si * (bw + 2), y0 = H - pb - h, r = Math.min(4, bw / 2, h);
    bars += `<path d="M${x0} ${H - pb}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}H${x0 + bw - r}Q${x0 + bw} ${y0} ${x0 + bw} ${y0 + r}V${H - pb}Z" fill="${s.color}"/>`; }));
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}">${axes(W, H, pl, pr, pt, pb, max)}${xLabels(o.labels, x, H, pb, 1)}<g class="hov"></g>${bars}<rect x="${pl}" y="0" width="${W - pl - pr}" height="${H - pb}" fill="transparent"/></svg>`;
  const hov = el.querySelector('.hov');
  hoverable(el, ev => {
    const r = el.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - r.left - pl) / gw)));
    hov.innerHTML = `<rect x="${pl + gw * i + 2}" y="${pt}" width="${gw - 4}" height="${H - pt - pb}" fill="var(--ink)" opacity=".06" rx="6"/>`;
    const sal = o.series[0].values[i] - o.series[1].values[i];
    return `<b>${o.tipLabel(i)}</b>` + o.series.map(s => `<div class="tr"><span><i style="background:${s.color}"></i> ${s.name}</span><b>${fmt(s.values[i])}</b></div>`).join('') + `<div class="tr"><span>Saldo</span><b>${fmt(sal)}</b></div>`;
  }, () => hov.innerHTML = '');
}
function hoverable(el, onMove, onLeave) {
  const tip = $('#tip');
  const move = ev => { const p = ev.touches ? ev.touches[0] : ev; tip.innerHTML = onMove(p); tip.classList.add('on');
    const tw = tip.offsetWidth, th = tip.offsetHeight; let lx = p.clientX + 14, ly = p.clientY - th - 14;
    if (lx + tw > innerWidth - 8) lx = p.clientX - tw - 14; if (ly < 8) ly = p.clientY + 16; tip.style.left = lx + 'px'; tip.style.top = ly + 'px'; };
  const leave = () => { tip.classList.remove('on'); onLeave(); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerdown', move);
  el.addEventListener('pointerleave', leave); el.addEventListener('pointercancel', leave);
}
function drawCharts() {
  document.querySelectorAll('[data-chart]').forEach(el => {
    const k = el.dataset.chart, o = CH[k]; if (!o) return;
    if (k === 'cum' || k === 'boxes') lineChart(el, o); else if (k === 'daily') barChart(el, o); else groupChart(el, o);
  });
}
ui.msgI = Math.floor(Math.random() * 12);
// ao abrir: o Byun dá oi e depois volta pras falas normais; de tempos em tempos ele fala sozinho
setTimeout(() => { ui.greet = false; const b = $('.bubble'); if (b && ui.view === 'home') { const n = info(); b.textContent = fala(n, mood(n)); b.style.animation = 'none'; b.offsetHeight; b.style.animation = ''; } const w = $('.byun-wrap'); if (w) w.classList.remove('hello'); }, 5000);
setInterval(() => { if (document.hidden || ui.view !== 'home' || ui.greet || $('.sheet')) return; const b = $('.bubble'); if (!b) return; ui.msgI++; const n = info(); b.textContent = fala(n, mood(n)); b.style.animation = 'none'; b.offsetHeight; b.style.animation = ''; const w = $('.byun-wrap'); if (w) { w.classList.remove('boop'); w.offsetWidth; w.classList.add('boop'); } }, 25000);
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawCharts, 150); });

/* ---------- Planejar ---------- */
function planView() {
  const N = info();
  const fIn = S.fixed.filter(f => f.kind === 'entra'), fOut = S.fixed.filter(f => f.kind === 'sai');
  const fixRow = f => `<div class="row tap" data-a="editFixed" data-v="${f.id}"><div class="ico">${esc(f.kind === 'entra' ? '💰' : cat(f.catId)?.icon || '📌')}</div><div class="l"><div class="n">${esc(f.name)}</div><div class="d">${noDate(f) ? 'sem data' : f.kind === 'entra' ? `${ruleLabel(f)} · ${shortDate(payDate(f, ui.month))}` : `dia ${pad(f.day || 1)}`}${acc(f.accId) ? ' · ' + esc(acc(f.accId).name) : ''}${cat(f.catId) && f.kind === 'sai' ? ' · ' + esc(cat(f.catId).name) : ''}</div></div><div class="v ${f.kind === 'entra' ? 'pos' : ''}">${f.kind === 'entra' ? '+' : '-'}${fmt(f.amount)}</div>${ic('right', 'i chev')}</div>`;
  return topbar() + `<h1>Planejar</h1><div class="masonry">
    <section class="card">
      <div class="card-h"><span class="t">${ic('repeat')} Rendas e contas fixas</span></div>
      <div class="duo"><button class="btn ghost" data-a="newIncome">${ic('plus')} Renda</button><button class="btn ghost" data-a="newFixed">${ic('plus')} Conta fixa</button></div>
      <div class="kpis two"><div class="kpi"><div class="k">Entra por mês</div><div class="v pos">${fmt(sum(fIn))}</div></div><div class="kpi"><div class="k">Sai por mês</div><div class="v">${fmt(sum(fOut))}</div></div></div>
      ${S.fixed.length ? [...fIn, ...fOut].map(fixRow).join('') : `<div class="empty"><b>Nada cadastrado</b>Comece pelas suas rendas. Contas fixas (aluguel, assinaturas) aparecem todo mês em Contas a pagar.</div>`}
    </section>
    <section class="card">
      <div class="card-h"><span class="t">${ic('spark')} Valores extras</span><button class="link" data-a="newExtra">Novo ${ic('plus')}</button></div>
      <div class="sub" style="margin:-6px 0 6px">Valores que você controla na mão: reserva, 13º, vale, obra, dinheiro emprestado...</div>
      ${S.extras.length ? S.extras.slice().sort((a, b) => (b.recurring ? 1 : 0) - (a.recurring ? 1 : 0)).map(e => extraRow(e).replace('</div></div><div class="v', `${!e.recurring ? ' · ' + monthName(e.month).toLowerCase() : ''}</div></div><div class="v`)).join('') : `<div class="empty">Nenhum extra ainda.</div>`}
    </section>
    <section class="card">
      <div class="card-h"><span class="t">${ic('gauge')} Limites do dia a dia</span><button class="link" data-a="newCat">Categoria ${ic('plus')}</button></div>
      <div class="sub" style="margin:-6px 0 8px">Fixos não entram aqui. O limite do mês é a soma dos limites por categoria.</div>
      <div class="row"><div class="ico">🎯</div><div class="l"><div class="n">Limite do mês</div><div class="d">soma dos limites por categoria</div></div><div class="v">${fmt(N.limit)}</div></div>
      ${S.categories.map(c => { const v = N.byCat.find(x => x.c.id === c.id)?.v || 0; const over = c.limit > 0 && v > c.limit; return `<div class="row tap" data-a="editCat" data-v="${c.id}"><div class="ico">${esc(c.icon)}</div><div class="l"><div class="n">${esc(c.name)}</div><div class="d ${over ? 'neg' : ''}">${fmt0(v)} de ${c.limit > 0 ? fmt0(c.limit) : 'sem limite'} este mês</div>${c.limit > 0 ? `<div class="prog" style="height:5px;margin-top:6px"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, v / c.limit * 100)}%;${over ? '' : `background:${catColor(c)}`}"></i></div>` : ''}</div><div class="v">${c.limit > 0 ? fmt0(c.limit) : '-'}</div></div>`; }).join('')}
    </section></div>`;
}

/* ---------- Ajustes ---------- */
function settingsView() {
  const sw = (k, n, d) => `<label class="switch"><div><div class="n">${n}</div><div class="d">${d}</div></div><span class="tgl"><input type="checkbox" data-set="${k}" ${S[k] ? 'checked' : ''}><i></i></span></label>`;
  return topbar('Ajustes') + `<div class="narrow">
    <section class="card" style="display:flex;align-items:center;gap:14px"><div style="width:64px">${byunSVG('happy')}</div><div><div style="font-weight:800;font-size:17px">Oi${S.name ? ', ' + esc(S.name) : ''}!</div><div class="sub">${CLOUD ? 'Seus dados ficam protegidos na sua conta.' : 'O Byun guarda tudo só neste aparelho.'}</div></div></section>
    ${CLOUD && user ? `<div class="section-t">Sua conta</div>
    <section class="card">
      <div class="row" style="padding-top:0"><div class="l"><div class="n">${esc(prof?.display_name || '')} <span class="muted" style="font-weight:500">@${esc(prof?.username || '')}</span></div><div class="d" id="syncState">${syncLabel()}</div></div></div>
      <button class="btn ghost" data-a="editIdentity">Mudar nome e @usuário</button>
      <button class="btn ghost" data-a="syncNow">Sincronizar agora</button>
      <button class="btn ghost" data-a="changePass">Trocar senha</button>
      <button class="btn ghost" data-a="logout">Sair da conta</button>
    </section>
` : ''}
    <div class="section-t">Seu mascote</div>
    <section class="card pet-card" data-a="editPet"><div class="pet-mini ${petCls()}">${byunSVG('happy')}</div><div style="flex:1"><div style="font-weight:800;font-size:16px">${esc(curPet().name || 'Byun')}</div><div class="sub">${esc((SPECIES.find(s => s[0] === curPet().species) || ['', 'Gato'])[1])} · toque pra personalizar</div></div>${ic('right')}</section>
    <div class="section-t">Você e o Byun</div>
    <section class="card">
      ${CLOUD && user ? '' : `<label class="fld" style="margin-top:0"><span>Seu nome</span><input class="inp" data-setv="name" value="${esc(S.name)}" placeholder="Como o Byun te chama"></label>`}
      <div class="flabel">Tema</div>
      <div class="seg"><button class="${S.theme === 'light' ? 'on' : ''}" data-a="setTheme" data-v="light">Claro</button><button class="${S.theme === 'dark' ? 'on' : ''}" data-a="setTheme" data-v="dark">Escuro</button></div>
      <div class="flabel">Jeito do ${esc(curPet().name)}</div>
      <div class="seg">${[['still', 'Paradinho'], ['follow', 'Segue o dedo'], ['bounce', 'Pulandinho']].map(([k, l]) => `<button class="${S.motion === k ? 'on' : ''}" data-a="setMotion" data-v="${k}">${l}</button>`).join('')}</div>
      <div style="margin-top:8px">${sw('sass', 'Modo julgador', 'Falas com humor ácido. Desligado, ele só informa.')}</div>
    </section>
    <div class="section-t">Contas e cartões</div>
    <section class="card">${S.accounts.map(a => `<div class="row tap" data-a="editAcc" data-v="${a.id}"><div class="ico" style="background:${a.color};border:0;color:#fff;font-size:15px">${isCredit(a) ? ic('card') : ic('wallet')}</div><div class="l"><div class="n">${esc(a.name)} ${S.defaultAcc === a.id ? '<span class="tag gray" style="font-size:10px;padding:1px 7px">padrão</span>' : ''}</div><div class="d">${isCredit(a) ? `Crédito · fecha dia ${a.closing} · vence dia ${a.due} · limite ${fmt0(a.limit)}` : 'Conta / débito / pix'}</div></div>${ic('right')}</div>`).join('')}
      <button class="btn ghost" data-a="newAcc" data-v="conta">${ic('plus')} Adicionar conta ou cartão</button></section>
    <div class="section-t">Categorias</div>
    <section class="card">${S.categories.map(c => `<div class="row tap" data-a="editCat" data-v="${c.id}"><div class="ico">${esc(c.icon)}</div><div class="l"><div class="n">${esc(c.name)}</div><div class="d">${c.limit > 0 ? 'limite ' + fmt0(c.limit) : 'sem limite'}</div></div><span class="dot" style="background:${catColor(c)}"></span></div>`).join('')}
      <button class="btn ghost" data-a="newCat">${ic('plus')} Nova categoria</button>
</section>
    <div class="section-t">Cofrinho</div>
    <section class="card"><label class="fld" style="margin-top:0"><span>CDI ao ano (%)</span><input class="inp" data-setv="cdi" inputmode="decimal" value="${String(S.cdi).replace('.', ',')}"><span class="hint">Usado pra estimar quanto as caixinhas rendem. Atualize quando o Copom mudar a Selic.</span></label></section>
    <div class="section-t">Seus dados</div>
    <section class="card">
      <button class="btn ghost" style="margin-top:0" data-a="go" data-v="install">${ic('share')} Instalar no celular</button>
      <button class="btn ghost" data-a="backup">Fazer backup / exportar</button>
      <button class="btn ghost" data-a="restore">Restaurar backup</button>
      <button class="btn ghost danger" data-a="wipe">Apagar todos os lançamentos</button>
      ${CLOUD && user ? '<button class="btn ghost danger" data-a="delAccount">Excluir minha conta</button>' : ''}
    </section>
    <p class="sub" style="text-align:center;margin:18px 0">Byun 1.1 · feito com carinho e um pouco de julgamento</p></div>`;
}

/* ---------- instalação ---------- */
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installSteps() {
  if (isIOS()) return `<ol class="steps"><li><span>Abra este endereço no <b>Safari</b> e toque em <b>Compartilhar</b> (ou em ••• e depois Compartilhar)</span></li><li><span>Escolha <b>Adicionar à Tela de Início</b></span></li><li><span>Deixe <b>Abrir como App Web</b> ligado, toque em <b>Adicionar</b> e abra o Byun pelo ícone</span></li></ol>`;
  return `<ol class="steps"><li><span>No <b>Chrome</b>, toque nos <b>três pontinhos</b> no canto</span></li><li><span>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></span></li><li><span>Confirme e abra o Byun pelo ícone</span></li></ol>${deferredPrompt ? '<button class="btn green" data-a="installNow">Instalar agora</button>' : ''}`;
}
function installView() {
  return topbar('Instalar') + `<div style="text-align:center"><h1 style="margin-bottom:6px">Instale no celular</h1><p class="sub" style="font-size:14px">Fica na tela de início, abre em tela cheia e funciona como um app, até offline.</p></div>
  <div class="phone"><div class="appicon"><div style="width:44px">${byunSVG('normal')}</div></div><small>Byun</small></div>${installSteps()}`;
}

/* ---------- onboarding ---------- */
function obData() { return ui.obd = ui.obd || { name: S.name || prof?.display_name || '', limit: '984,00', incomes: [{ name: 'Salário', amount: '', rule: 'util5', day: '5' }], saved: '', savedAcc: S.defaultAcc, savedRate: '100' }; }
function onboarding() {
  const dots = `<div class="dots">${[0, 1, 2].map(i => `<i class="${ui.ob === i ? 'on' : ''}"></i>`).join('')}</div>`;
  if (ui.ob === 0) return `<div class="ob"><div class="logo">${byunSVG('happy')}</div><div class="wordmark">byun</div>
    <p class="lead">Seu cofrinho que te julga. Pra você saber quanto ainda pode gastar no mês.</p>
    <div class="feat"><i>${ic('plus')}</i>Anote um gasto em dois toques</div>
    <div class="feat"><i>🎯</i>Defina o teto do mês e veja quanto sobra</div>
    <div class="feat"><i>🐾</i>O ${esc(curPet().name)} avisa antes de você estourar</div>${dots}
    <button class="btn" data-a="ob" data-v="1">Continuar</button></div>`;
  if (ui.ob === 1) {
    const d = obData();
    return `<div class="ob"><div class="logo-wrap ${petCls()}" style="width:90px;margin:0 auto">${byunSVG('normal')}</div><h1 style="text-align:center">Prazer, eu sou o ${esc(curPet().name)}</h1>
    <form id="obForm" novalidate>
      <label class="fld"><span>Como posso te chamar?</span><input data-ob="name" value="${esc(d.name)}" placeholder="Seu nome" autocomplete="given-name"></label>
      <label class="fld"><span>Quanto quer gastar no dia a dia por mês?</span><input data-ob="limit" inputmode="decimal" placeholder="984,00" value="${esc(d.limit)}"><span class="hint">Mercado, delivery, transporte, lazer... Contas fixas ficam de fora. Dá pra ajustar por categoria depois.</span></label>
      <div class="flabel" style="margin-top:22px">Suas rendas</div>
      ${d.incomes.map((r, i) => `<div class="ob-box">
        <div class="duo"><label class="fld" style="margin-top:0"><span>Nome</span><input data-obi="${i}" data-k="name" value="${esc(r.name)}" placeholder="Salário"></label>
        <label class="fld" style="margin-top:0"><span>Valor</span><input data-obi="${i}" data-k="amount" inputmode="decimal" value="${esc(r.amount)}" placeholder="0,00"></label></div>
        <div class="fld"><span>Quando cai</span><div class="radios">${RULES.map(([k, l]) => `<label><input type="radio" name="rule${i}" data-obi="${i}" data-k="rule" value="${k}" ${r.rule === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
        ${r.rule === 'dia' ? `<label class="fld"><span>Dia</span><input data-obi="${i}" data-k="day" inputmode="numeric" value="${esc(r.day)}" placeholder="10"></label>` : ''}
        ${d.incomes.length > 1 ? `<button type="button" class="link" style="color:var(--danger);margin-top:8px" data-a="obDelIncome" data-v="${i}">Remover</button>` : ''}
      </div>`).join('')}
      <button type="button" class="btn ghost" data-a="obAddIncome">${ic('plus')} Outra renda</button>
      <div class="flabel" style="margin-top:22px">Dinheiro guardado</div>
      <label class="fld" style="margin-top:0"><span>Quanto você já tem guardado?</span><input data-ob="saved" inputmode="decimal" value="${esc(d.saved)}" placeholder="0,00"><span class="hint">Vira sua primeira caixinha no cofrinho. Pode deixar vazio.</span></label>
      <div class="duo"><label class="fld"><span>Onde está</span><select data-ob="savedAcc">${S.accounts.map(a => `<option value="${a.id}" ${d.savedAcc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label class="fld"><span>Rende (% do CDI)</span><input data-ob="savedRate" inputmode="decimal" value="${esc(d.savedRate)}" placeholder="100"></label></div>
      ${dots}<button class="btn" type="submit">Continuar</button></form></div>`;
  }
  return `<div class="ob"><h1 style="text-align:center;margin-bottom:4px">Instale no celular</h1><p class="lead">Fica na tela de início, abre em tela cheia e funciona como um app.</p>
    <div class="phone"><div class="appicon"><div style="width:44px">${byunSVG('normal')}</div></div><small>Byun</small></div>${installSteps()}${dots}
    <button class="btn" data-a="obDone">Começar</button><button class="btn ghost" data-a="obDone">Agora não</button></div>`;
}

/* ---------- sheets ---------- */
function openSheet(html) {
  $('#sheet-root').innerHTML = `<div class="sheet-back" data-a="close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheet-root').innerHTML = ''; document.body.style.overflow = ''; draft = null; petEdit = null; }
const sheetHead = t => `<div class="sheet-h"><h3>${t}</h3><button class="icon-btn" data-a="close" aria-label="Fechar">${ic('x')}</button></div>`;

/* lançamento rápido */
function openAdd(type = 'gasto', t = null) {
  const def = S.accounts.find(a => a.id === S.defaultAcc) ? S.defaultAcc : S.accounts[0]?.id;
  const grp = t && t.group ? S.tx.filter(x => x.group === t.group).sort((a, b) => a.date.localeCompare(b.date)) : null;
  draft = t ? { type: t.type, cents: Math.round((grp ? sum(grp) : t.amount) * 100), catId: t.catId, accId: t.accId, note: t.note || '', date: grp ? grp[0].date : t.date, parcelas: grp ? grp.length : 1, groupId: t.group || null, more: true, step: 2, editId: t.id, paid: isPaid(t), paidAt: t.paidAt || '', owe: t.owedBy ? { on: true, name: t.owedBy.name, amount: moneyInput(t.owedBy.amount), received: !!t.owedBy.received } : { on: false, name: '', amount: '' } }
    : { type, cents: 0, catId: null, accId: def, note: '', date: ui.month === curKey() ? todayISO() : ui.month + '-01', parcelas: 1, more: false, step: 1, editId: null, paid: null, owe: { on: false, name: '', amount: '' } };
  openSheet('<div id="add"></div>'); renderAdd();
}
function renderAdd() {
  const d = draft; if (!d) return;
  const N = info(d.date.slice(0, 7)); const v = d.cents / 100;
  const editing = d.editId ? S.tx.find(t => t.id === d.editId) : null;
  let sub = '';
  if (d.type === 'gasto') {
    const c = cat(d.catId);
    if (c) { const used = (N.byCat.find(x => x.c.id === c.id)?.v || 0) - (editing && editing.catId === c.id ? editing.amount : 0); const rest = c.limit - used - v; sub = c.limit > 0 ? (rest >= 0 ? `${esc(c.name)}: sobram <b>${fmt(rest)}</b> de ${fmt0(c.limit)}` : `${esc(c.name)}: passa <b class="neg">${fmt(-rest)}</b> do limite de ${fmt0(c.limit)}`) : `${esc(c.name)}: sem limite definido`; }
    else sub = `Pode gastar no mês: <b>${fmt(N.pode + (editing ? editing.amount : 0) - v)}</b>`;
  } else sub = 'Dinheiro que entrou na conta';
  const amt = fmt(v);
  const tabs = `<div class="seg"><button class="${d.type === 'gasto' ? 'on' : ''}" data-a="dType" data-v="gasto">Gasto</button><button class="${d.type === 'receita' ? 'on' : ''}" data-a="dType" data-v="receita">Receita</button></div>`;
  const cats = d.type === 'gasto' ? `<div class="flabel">Categoria</div><div class="cats">${S.categories.map(c => `<button class="${d.catId === c.id ? 'on' : ''}" data-a="dCat" data-v="${c.id}"><i>${esc(c.icon)}</i><span>${esc(c.name.split(' ')[0])}</span></button>`).join('')}<button data-a="newCat"><i>+</i><span>Nova</span></button></div>` : '';
  const fx = d.editId ? S.fixed.find(f => f.id === S.tx.find(t => t.id === d.editId)?.fixedId) : null;
  if (fx) sub = 'Conta fixa: não entra no Pode gastar do dia a dia';
  const head = sheetHead(d.editId ? 'Editar lançamento' : 'Novo lançamento') + (fx ? `<div class="origin">${ic('repeat')}<div><b>Lançado pela conta fixa "${esc(fx.name)}"</b><span>${noDate(fx) ? 'Sem data' : 'Todo dia ' + pad(fx.day || 1)} · ${fmt(fx.amount)}. Mudar aqui vale só pra este mês.</span></div><button class="link" data-a="editFixed" data-v="${fx.id}">Ver conta fixa</button></div>` : '');
  if (d.step === 1) {
    $('#add').innerHTML = head + tabs + `<div class="amount ${d.cents ? '' : 'zero'}">${amt}<span class="caret"></span></div><div class="amount-sub">${sub}</div>${cats}
      <div class="quick">${[10, 20, 50, 100].map(q => `<button data-a="dQuick" data-v="${q}">+${q}</button>`).join('')}</div>
      <div class="pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map(k => `<button data-a="dKey" data-v="${k}" ${k === '⌫' ? 'aria-label="Apagar"' : ''}>${k}</button>`).join('')}</div>
      <button class="btn" data-a="dNext" ${d.cents ? '' : 'disabled'}>Continuar</button>`;
    return;
  }
  const a = acc(d.accId);
  $('#add').innerHTML = head + tabs + `<div class="amount" data-a="dBack" style="cursor:pointer">${amt}<span class="edit-amt">${ic('pencil')}</span></div><div class="amount-sub">${sub}</div>${cats}
    <div class="flabel">Conta</div><div class="chips">${S.accounts.map(x => `<button class="chip ${d.accId === x.id ? 'on' : ''}" data-a="dAcc" data-v="${x.id}"><span class="dot" style="background:${x.color}"></span>${esc(x.name)}</button>`).join('')}</div>
    <div class="details ${d.more ? 'open' : ''}"><button data-a="dMore">Data, nota e mais ${ic('down')}</button>
      ${d.more ? `<label class="fld"><span>Nota</span><input id="dNote" value="${esc(d.note)}" placeholder="Ex.: Uber pro metrô" maxlength="60"></label>
      <label class="fld"><span>Data</span><input id="dDate" type="date" value="${d.date}"></label>
      ${d.type === 'gasto' ? `<label class="switch"><div><div class="n">Já pago</div><div class="d">${fx ? 'Também marca em Contas a pagar' : isCredit(a) ? 'No cartão, fica pago quando a fatura é paga' : 'Débito e pix já saem pagos'}</div></div><span class="tgl"><input type="checkbox" id="dPaid" ${(d.paid ?? !isCredit(a)) ? 'checked' : ''}><i></i></span></label>
      ${d.paid ? `<label class="fld" style="margin-top:4px"><span>Pago em</span><input id="dPaidAt" type="date" value="${d.paidAt || todayISO()}"></label>` : ''}
      <label class="switch"><div><div class="n">Alguém me deve isso</div><div class="d">Ex.: dividiu a conta, pagou por alguém</div></div><span class="tgl"><input type="checkbox" id="dOweOn" ${d.owe?.on ? 'checked' : ''}><i></i></span></label>
      ${d.owe?.on ? `<div class="duo"><label class="fld" style="margin-top:0"><span>Quem</span><input id="dOweName" value="${esc(d.owe.name)}" placeholder="Nome" maxlength="30" list="peopleList"></label><label class="fld" style="margin-top:0"><span>Quanto</span><input id="dOweAmt" inputmode="decimal" value="${esc(d.owe.amount)}" placeholder="${moneyInput(v) || '0,00'}"></label></div>
      <datalist id="peopleList">${[...new Set(S.tx.filter(x => x.owedBy?.name).map(x => x.owedBy.name))].map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <span class="hint" style="display:block;margin-top:6px">Vazio = o valor inteiro.</span>` : ''}` : ''}
      ${d.type === 'gasto' && d.editId ? partsBlock(d) : ''}
      ${d.type === 'gasto' && isCredit(a) ? `<label class="fld"><span>Parcelas</span><select id="dParc">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}" ${d.parcelas === i + 1 ? 'selected' : ''}>${i === 0 ? `1x de ${fmt(v)} (de uma vez)` : `${i + 1}x de ${fmt(v / (i + 1))}`}</option>`).join('')}</select>${d.groupId || (d.editId && d.parcelas > 1) ? '<span class="hint">O valor lá em cima é o total da compra. Mudar aqui refaz todas as parcelas.</span>' : ''}</label>` : ''}` : ''}
    </div>
    <button class="btn" data-a="dSave" ${d.cents ? '' : 'disabled'}>${d.editId ? 'Salvar' : d.type === 'gasto' ? 'Lançar gasto' : 'Lançar receita'}</button>
    ${d.editId ? `<button class="btn ghost" data-a="dDup">${ic('copy')} Duplicar lançamento</button>` : ''}
    ${d.editId ? `<button class="btn ghost danger" data-a="dDel">${d.groupId ? 'Excluir compra (todas as parcelas)' : 'Excluir lançamento'}</button>` : ''}`;
}
function partsBlock(d) {
  const t = S.tx.find(x => x.id === d.editId); if (!t) return '';
  const lp = leftToPay(t), parts = t.parts || [];
  let h = `<div class="parts"><div class="parts-h"><b>Pagar em partes</b><span>${isPaid(t) && !parts.length ? 'já pago' : parts.length ? `pago ${fmt(partsSum(parts))} · falta ${fmt(lp)}` : `falta ${fmt(t.amount)}`}</span></div>
    ${parts.map(p => `<div class="part-row"><span>pago em ${dayLabel(p.date)}</span><b>${fmt(p.amount)}</b><button class="link" data-a="delPart" data-v="${p.id}">desfazer</button></div>`).join('')}
    ${lp > 0 && !(isPaid(t) && !parts.length) ? `<div class="part-add"><input id="dPartAmt" class="inp" inputmode="decimal" placeholder="Valor"><input id="dPartDate" class="inp" type="date" value="${todayISO()}" aria-label="Quando pagou"><button class="btn green" data-a="dPart">Pagar</button></div>` : ''}</div>`;
  if (t.owedBy && t.owedBy.name) {
    const ol = oweLeft(t), op = t.owedBy.parts || [];
    h += `<div class="parts"><div class="parts-h"><b>${esc(t.owedBy.name)} pagando em partes</b><span>${ol <= 0 ? 'recebido ✓' : `recebido ${fmt(partsSum(op))} · falta ${fmt(ol)}`}</span></div>
      ${op.map(p => `<div class="part-row"><span>recebido em ${dayLabel(p.date)}</span><b class="pos">+${fmt(p.amount)}</b><button class="link" data-a="delRecv" data-v="${p.id}">desfazer</button></div>`).join('')}
      ${ol > 0 ? `<div class="part-add"><input id="dRecvAmt" class="inp" inputmode="decimal" placeholder="Valor"><input id="dRecvDate" class="inp" type="date" value="${todayISO()}" aria-label="Quando recebeu"><button class="btn green" data-a="dRecv">Recebi</button></div><span class="hint">O valor volta como receita na sua conta.</span>` : ''}</div>`;
  }
  return h;
}
function saveDraft() {
  const d = draft; if (!d || !d.cents) return;
  const amount = d.cents / 100;
  if (d.owe?.on && !d.owe.name.trim()) { toast('Coloque o nome de quem te deve'); return; }
  const extra = t => {
    if (t.type !== 'gasto') { delete t.paid; delete t.owedBy; return t; }
    if (d.paid !== null && d.paid !== undefined) { t.paid = d.paid; if (d.paid) t.paidAt = d.paidAt || t.paidAt || todayISO(); else delete t.paidAt; }
    if (d.owe?.on) t.owedBy = { name: d.owe.name.trim(), amount: parseMoney(d.owe.amount) || 0, received: !!d.owe.received }; else delete t.owedBy;
    return t;
  };
  const credit = d.type === 'gasto' && isCredit(acc(d.accId));
  if (!credit) d.parcelas = 1;
  if (d.editId && !d.groupId && d.parcelas <= 1) {
    const t = S.tx.find(x => x.id === d.editId);
    extra(Object.assign(t, { type: d.type, amount, catId: d.type === 'gasto' ? d.catId : null, accId: d.accId, note: d.note.trim(), date: d.date }));
    toast('Lançamento atualizado');
  } else if (d.editId && d.parcelas <= 1) {
    // era parcelado e virou "de uma vez": junta tudo num lançamento só
    const old = S.tx.find(x => x.id === d.editId);
    S.tx = S.tx.filter(x => x.group !== d.groupId);
    S.tx.push(extra({ id: d.editId, type: d.type, amount, catId: d.catId, accId: d.accId, note: d.note.trim(), date: d.date, at: old?.at || Date.now() }));
    toast('Agora é uma compra de uma vez');
  } else if (d.parcelas > 1) {
    if (d.editId) S.tx = S.tx.filter(x => d.groupId ? x.group !== d.groupId : x.id !== d.editId);   // refaz as parcelas
    const g = uid(), each = Math.round(amount / d.parcelas * 100) / 100;
    for (let i = 0; i < d.parcelas; i++) {
      const [y, m, dd] = d.date.split('-').map(Number); const k = addMonths(`${y}-${pad(m)}`, i);
      const day = Math.min(dd, dim(k));
      const tx = { id: uid(), type: 'gasto', amount: i === d.parcelas - 1 ? Math.round((amount - each * (d.parcelas - 1)) * 100) / 100 : each, catId: d.catId, accId: d.accId, note: d.note.trim(), date: `${k}-${pad(day)}`, group: g, inst: `${i + 1}/${d.parcelas}`, at: Date.now() };
      if (d.paid !== null && d.paid !== undefined) tx.paid = d.paid;
      if (i === 0 && d.owe?.on) tx.owedBy = { name: d.owe.name.trim(), amount: parseMoney(d.owe.amount) || amount, received: false };
      S.tx.push(tx);
    }
    toast(d.editId ? `Refeito em ${d.parcelas}x` : `${d.parcelas}x lançado`);
  } else {
    S.tx.push(extra({ id: uid(), type: d.type, amount, catId: d.type === 'gasto' ? d.catId : null, accId: d.accId, note: d.note.trim(), date: d.date, at: Date.now() }));
    toast(d.type === 'gasto' ? 'Gasto lançado' : 'Receita lançada');
  }
  if (d.type === 'gasto') S.lastAdded = { amount: d.parcelas > 1 ? amount / d.parcelas : amount, at: Date.now() };
  ui.msgI = 0;
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) { }
  save(); closeSheet(); render();
}

/* formulário genérico */
function openForm({ title, fields, values = {}, onSave, onDelete, saveLabel = 'Salvar', onChange, onInput, onOpen }) {
  const fh0 = f => {
    const v = values[f.key] ?? f.def ?? '';
    const hint = f.hint ? `<span class="hint">${f.hint}</span>` : '';
    if (f.type === 'radios') return `<div class="fld"><span>${f.label}</span><div class="radios">${f.options.map(([ov, ol]) => `<label><input type="radio" name="${f.key}" value="${ov}" ${String(v) === String(ov) ? 'checked' : ''}><span>${ol}</span></label>`).join('')}</div>${hint}</div>`;
    if (f.type === 'colors') return `<div class="fld"><span>${f.label}</span><div class="swatches">${[...new Set([...(f.options), v].filter(Boolean))].map(c => `<label><input type="radio" name="${f.key}" value="${c}" ${v === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}<label class="custom-c" title="Outra cor"><input type="color" name="${f.key}_custom" value="${v || '#1f5a3a'}"></label></div>${hint}</div>`;
    if (f.type === 'toggle') return `<label class="switch fld ${f.disabled ? 'off' : ''}"><div><div class="n">${f.label}</div>${f.hint ? `<div class="d">${f.hint}</div>` : ''}</div><span class="tgl"><input type="checkbox" name="${f.key}" ${v ? 'checked' : ''} ${f.disabled ? 'disabled' : ''}><i></i></span></label>`;
    if (f.type === 'html') return f.html;
    if (f.type === 'select') return `<label class="fld"><span>${f.label}</span><select name="${f.key}">${f.options.map(([ov, ol]) => `<option value="${ov}" ${String(v) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>${hint}</label>`;
    if (f.type === 'money') return `<label class="fld"><span>${f.label}</span><input name="${f.key}" inputmode="decimal" placeholder="0,00" value="${moneyInput(v)}">${hint}</label>`;
    if (f.type === 'date') return `<label class="fld"><span>${f.label}</span><input name="${f.key}" type="date" value="${esc(v)}">${hint}</label>`;
    if (f.type === 'textarea') return `<label class="fld"><span>${f.label}</span><textarea name="${f.key}">${esc(v)}</textarea>${hint}</label>`;
    return `<label class="fld"><span>${f.label}</span><input name="${f.key}" ${f.type === 'number' ? 'inputmode="numeric"' : ''} ${f.max ? `maxlength="${f.max}"` : ''} placeholder="${esc(f.ph || '')}" value="${esc(v)}">${hint}</label>`;
  };
  const fh = f => `<div data-fk="${f.key}">${fh0(f)}</div>`;
  openSheet(sheetHead(title) + `<form id="gform" novalidate>${fields.map(fh).join('')}<button class="btn" type="submit">${saveLabel}</button>${onDelete ? '<button type="button" class="btn ghost danger" id="gdel">Excluir</button>' : ''}</form>`);
  const form = $('#gform');
  form.addEventListener('change', e => { if (e.target.type === 'color') { const k = e.target.name.replace('_custom', ''); form.querySelectorAll(`input[name="${k}"]`).forEach(r => r.checked = false); } if (onChange) onChange(form, e.target.name, e.target); });
  if (onInput) form.addEventListener('input', e => onInput(form, e.target.name, e.target));
  if (onOpen) onOpen(form);
  form.addEventListener('submit', e => {
    e.preventDefault(); const out = {};
    for (const f of fields) {
      if (f.type === 'html') continue;
      if (f.type === 'toggle') out[f.key] = form.querySelector(`[name="${f.key}"]`).checked;
      else if (f.type === 'radios' || f.type === 'colors') { const r = form.querySelector(`[name="${f.key}"]:checked`); out[f.key] = r ? r.value : (f.type === 'colors' ? form.querySelector(`[name="${f.key}_custom"]`).value : f.def); }
      else { const el = form.querySelector(`[name="${f.key}"]`); out[f.key] = f.type === 'money' ? parseMoney(el.value) : f.type === 'number' ? (parseInt(el.value) || 0) : el.value.trim(); }
      if (f.req && !out[f.key] && !(f.reqIf && !f.reqIf(form))) { toast(`Preencha: ${f.label}`); return; }
    }
    onSave(out); save(); closeSheet(); render();
  });
  if (onDelete) { const b = $('#gdel'); b.addEventListener('click', () => { if (b.dataset.sure) { onDelete(); save(); closeSheet(); render(); } else { b.dataset.sure = 1; b.textContent = 'Toque de novo pra confirmar'; } }); }
}

const catOpts = () => [['', 'Sem categoria'], ...S.categories.map(c => [c.id, `${c.icon} ${c.name}`])];
const accOpts = () => [['', 'Nenhuma'], ...S.accounts.map(a => [a.id, a.name])];
function fixedForm(f, kind) {
  kind = f ? f.kind : (kind || 'sai');
  if (kind === 'entra') return incomeForm(f);
  openForm({
    title: f ? 'Editar conta fixa' : 'Nova conta fixa', values: f || { day: 10 },
    fields: [
      { key: 'name', label: 'Nome', ph: 'Ex.: Aluguel, Internet, Spotify', req: true, max: 40 },
      { key: 'amount', label: 'Valor por mês', type: 'money', req: true },
      { key: 'nodate', label: 'Sem data específica', type: 'toggle', hint: 'Paga em qualquer dia do mês' },
      { key: 'day', label: 'Dia do vencimento', type: 'number', def: 10 },
      { key: 'catId', label: 'Categoria', type: 'select', options: catOpts() },
      { key: 'accId', label: 'Conta', type: 'select', options: accOpts() }
    ],
    onOpen: form => { const t = () => form.querySelector('[data-fk=day]').style.display = form.querySelector('[name=nodate]').checked ? 'none' : ''; t(); form.addEventListener('change', t); },
    onSave: v => { v.kind = 'sai'; v.day = Math.min(31, Math.max(1, v.day || 1)); if (f) { Object.assign(f, v); syncFixedFuture(f); } else S.fixed.push({ id: uid(), since: ui.month, ...v }); },
    onDelete: f ? () => { syncFixedFuture(f, true); S.fixed = S.fixed.filter(x => x.id !== f.id); } : null
  });
}
function incomeForm(f) {
  openForm({
    title: f ? 'Editar renda' : 'Nova renda', values: f ? { ...f, rule: f.rule || 'dia', sat: f.sat !== false } : { rule: 'util5', day: 5, sat: true, accId: S.defaultAcc },
    fields: [
      { key: 'name', label: 'Nome', ph: 'Ex.: Salário, Estágio, Freela fixo', req: true, max: 40 },
      { key: 'amount', label: 'Valor por mês', type: 'money', req: true },
      { key: 'rule', label: 'Quando cai', type: 'radios', options: RULES, def: 'util5' },
      { key: 'day', label: 'Dia', type: 'number', def: 5 },
      { key: 'sat', label: 'Sábado conta como dia útil', type: 'toggle', hint: 'Vale para o 5º dia útil. Pela regra da CLT, o sábado conta.' },
      { key: 'accId', label: 'Cai em qual conta', type: 'select', options: accOpts() }
    ],
    onOpen: form => { const t = () => { const r = form.querySelector('[name=rule]:checked')?.value; form.querySelector('[data-fk=day]').style.display = r === 'dia' ? '' : 'none'; form.querySelector('[data-fk=sat]').style.display = r === 'util5' ? '' : 'none'; }; t(); form.addEventListener('change', t); },
    onSave: v => { v.kind = 'entra'; v.day = Math.min(31, Math.max(1, v.day || 1)); if (f) Object.assign(f, v); else S.fixed.push({ id: uid(), since: ui.month, ...v }); },
    onDelete: f ? () => { S.fixed = S.fixed.filter(x => x.id !== f.id); } : null
  });
}
function extraForm(e) {
  openForm({
    title: e ? 'Editar valor extra' : 'Novo valor extra', values: e || { kind: 'sai', recurring: false, affects: true },
    fields: [
      { key: 'name', label: 'Nome', ph: 'Ex.: Reserva, 13º, Obra, Empréstimo', req: true, max: 40 },
      { key: 'icon', label: 'Emoji', ph: '✨', max: 4 },
      { key: 'amount', label: 'Valor', type: 'money', req: true },
      { key: 'kind', label: 'O que é', type: 'radios', options: [['entra', 'Entrada'], ['sai', 'Saída'], ['guardado', 'Guardar / reserva']], def: 'sai' },
      { key: 'recurring', label: 'Repete todo mês', type: 'toggle', hint: 'Desligado vale só para o mês selecionado' },
      { key: 'affects', label: 'Conta no saldo previsto', type: 'toggle', hint: 'Desligue pra só acompanhar o valor' },
      { key: 'estimated', label: 'É um valor estimado', type: 'toggle', hint: 'Mostra um selo de estimado' },
      { key: 'note', label: 'Observação', ph: 'Opcional', max: 80 }
    ],
    onSave: v => { if (e) Object.assign(e, v); else S.extras.push({ id: uid(), month: ui.month, since: ui.month, ...v }); },
    onDelete: e ? () => { S.extras = S.extras.filter(x => x.id !== e.id); } : null
  });
}
const EMOJI_MAP = [
  [['mercado', 'supermercado', 'feira', 'compras do mes', 'hortifruti'], '🛒'], [['comida', 'alimentacao', 'refeicao', 'almoco', 'janta'], '🍽️'],
  [['restaurante'], '🍽️'], [['delivery', 'ifood', 'entrega'], '🛵'], [['lanche', 'hamburguer', 'fast'], '🍔'], [['pizza'], '🍕'],
  [['cafe', 'cafeteria'], '☕'], [['padaria', 'pao'], '🥐'], [['doce', 'sorvete', 'chocolate'], '🍫'], [['bar', 'cerveja', 'bebida', 'balada'], '🍻'],
  [['transporte', 'onibus', 'passagem'], '🚌'], [['metro', 'trem'], '🚇'], [['uber', '99', 'taxi', 'corrida'], '🚕'], [['carro', 'estacionamento', 'pedagio'], '🚗'],
  [['gasolina', 'combustivel', 'posto', 'etanol'], '⛽'], [['moto'], '🏍️'], [['bike', 'bicicleta'], '🚲'],
  [['saude', 'farmacia', 'remedio'], '💊'], [['medico', 'consulta', 'exame', 'hospital', 'plano de saude'], '🩺'], [['dentista'], '🦷'], [['terapia', 'psicolog'], '🧠'],
  [['academia', 'treino', 'gym', 'musculacao'], '🏋️'], [['esporte', 'futebol'], '⚽'], [['pet', 'cachorro', 'gato', 'racao', 'veterin'], '🐾'],
  [['casa', 'moradia', 'aluguel', 'financiamento'], '🏠'], [['condominio', 'apartamento'], '🏢'], [['luz', 'energia', 'eletric'], '💡'], [['agua', 'saneamento'], '💧'], [['gas'], '🔥'],
  [['internet', 'wifi'], '📶'], [['celular', 'telefone', 'plano', 'chip'], '📱'], [['contas', 'boleto', 'fatura'], '🧾'],
  [['assinatura', 'streaming', 'netflix', 'prime', 'disney', 'max', 'tv'], '📺'], [['spotify', 'musica', 'show'], '🎵'],
  [['lazer', 'diversao', 'passeio', 'role'], '🎉'], [['cinema', 'filme', 'teatro'], '🎬'], [['viagem', 'ferias', 'hotel', 'passagem aerea', 'voo'], '✈️'],
  [['roupa', 'vestuario', 'loja', 'shopee', 'shein', 'moda'], '👕'], [['sapato', 'tenis'], '👟'], [['beleza', 'cabelo', 'unha', 'salao', 'estetica'], '💅'], [['maquiagem', 'skincare', 'cosmetico'], '💄'],
  [['presente', 'aniversario'], '🎁'], [['educacao', 'faculdade', 'curso', 'puc', 'mensalidade', 'estudo'], '📚'], [['livro', 'leitura'], '📖'], [['escola', 'material escolar'], '🎒'],
  [['trabalho', 'escritorio'], '💼'], [['investimento', 'acoes', 'tesouro', 'cdb'], '📈'], [['reserva', 'poupanca', 'guardar', 'cofrinho'], '🐷'],
  [['divida', 'emprestimo', 'parcela', 'juros'], '💸'], [['cartao', 'credito'], '💳'], [['filho', 'bebe', 'crianca', 'fralda'], '🍼'], [['jogo', 'game', 'videogame', 'steam'], '🎮'],
  [['festa', 'comemoracao'], '🥳'], [['doacao', 'caridade', 'dizimo', 'oferta'], '❤️'], [['igreja', 'religiao'], '⛪'], [['imposto', 'iptu', 'ipva', 'taxa'], '🏛️'],
  [['seguro', 'protecao'], '🛡️'], [['manutencao', 'conserto', 'reforma', 'obra'], '🔧'], [['eletronico', 'computador', 'notebook', 'tecnologia'], '💻'], [['mae', 'pai', 'familia'], '👨‍👩‍👧'],
  [['outros', 'diversos', 'geral'], '📦']
];
function suggestEmojis(name) {
  const n = norm(name); const hits = [];
  if (n.trim()) EMOJI_MAP.forEach(([words, e]) => { if (words.some(w => n.includes(w)) && !hits.includes(e)) hits.push(e); });
  ['🏷️', '📦', '✨', '💸', '🎯', '🛍️'].forEach(e => { if (hits.length < 6 && !hits.includes(e)) hits.push(e); });
  return hits.slice(0, 6);
}
function catForm(c) {
  openForm({
    title: c ? 'Editar categoria' : 'Nova categoria', values: c ? { ...c, housing: S.housingCat === c.id } : { icon: '🏷️' },
    fields: [
      { key: 'name', label: 'Nome', req: true, max: 30, ph: 'Ex.: Pet, Academia' },
      { key: 'icon', label: 'Emoji', max: 4, ph: '🏷️' },
      { key: 'emo', type: 'html', html: `<div class="emoji-sug" id="emoSug">${suggestEmojis(c?.name).map(e => `<button type="button" data-emo="${e}">${e}</button>`).join('')}</div>` },
      { key: 'limit', label: 'Limite por mês', type: 'money', hint: 'Deixe vazio pra sem limite' }
    ],
    onOpen: form => { let auto = !c; form.addEventListener('click', e => { const b = e.target.closest('[data-emo]'); if (b) { form.querySelector('[name=icon]').value = b.dataset.emo; auto = false; form.querySelectorAll('[data-emo]').forEach(x => x.classList.toggle('on', x === b)); } }); form._auto = () => auto; form._noAuto = () => auto = false; },
    onInput: (form, k, el) => {
      if (k === 'icon') { form._noAuto(); return; }
      if (k !== 'name') return;
      const sug = suggestEmojis(el.value); $('#emoSug').innerHTML = sug.map((e, i) => `<button type="button" data-emo="${e}" class="${i === 0 && form._auto() ? 'on' : ''}">${e}</button>`).join('');
      if (form._auto()) form.querySelector('[name=icon]').value = sug[0];
    },
    onSave: v => { const h = v.housing; delete v.housing; let t = c; if (c) Object.assign(c, v); else { t = { id: uid(), color: S.categories.length % 8, ...v }; S.categories.push(t); } if (h) S.housingCat = t.id; if (draft) draft.catId = t.id; },
    onDelete: c && S.categories.length > 1 ? () => { S.categories = S.categories.filter(x => x.id !== c.id); } : null
  });
}
function accForm(a, type = 'conta') {
  const other = S.accounts.find(x => x.id === S.defaultAcc && (!a || x.id !== a.id));
  const nameFor = (bank, tp) => { const n = bankOf(bank)[1].replace(' Bank', '').replace('Outro banco', ''); return tp === 'credito' ? `Cartão ${n}`.trim() : n; };
  const start = a ? { ...a, isDefault: S.defaultAcc === a.id } : { bank: 'nubank', type, color: bankOf('nubank')[2], name: nameFor('nubank', type), closing: 3, due: 10 };
  let autoName = !a;
  openForm({
    title: a ? 'Editar conta' : 'Nova conta ou cartão', values: start,
    fields: [
      { key: 'bank', label: 'Banco', type: 'select', options: BANKS.map(b => [b[0], b[1]]) },
      { key: 'type', label: 'Tipo', type: 'radios', options: [['conta', 'Conta / débito / pix'], ['credito', 'Cartão de crédito']], def: type },
      { key: 'name', label: 'Nome', req: true, max: 30, ph: 'Ex.: Cartão Santander' },
      { key: 'color', label: 'Cor', type: 'colors', options: [...new Set(BANKS.map(b => b[2]))].slice(0, 9) },
      { key: 'limit', label: 'Limite do cartão', type: 'money' },
      { key: 'closing', label: 'Dia que a fatura fecha (1 a 31)', type: 'number', req: true, reqIf: f => f.querySelector('[name=type]:checked')?.value === 'credito', hint: 'Compras depois desse dia vão pra próxima fatura. Se o vencimento for num dia antes do fechamento (ex.: fecha 26, vence 3), a fatura vence no mês seguinte.' },
      { key: 'due', label: 'Dia do vencimento (1 a 31)', type: 'number', req: true, reqIf: f => f.querySelector('[name=type]:checked')?.value === 'credito' },
      { key: 'isDefault', label: 'Conta padrão nos lançamentos', type: 'toggle', disabled: !!other, hint: other ? `A padrão hoje é ${esc(other.name)}. Pra trocar, abra ela e desligue a opção lá.` : 'Já vem selecionada quando você lança um gasto.' }
    ],
    onOpen: form => { const t = () => { const cr = form.querySelector('[name=type]:checked')?.value === 'credito'; ['limit', 'closing', 'due'].forEach(k => form.querySelector(`[data-fk=${k}]`).style.display = cr ? '' : 'none'); }; t(); form._t = t; },
    onInput: (form, k) => { if (k === 'name') autoName = false; },
    onChange: (form, k) => {
      const bank = form.querySelector('[name=bank]').value, tp = form.querySelector('[name=type]:checked')?.value;
      if (k === 'type') form._t();
      if ((k === 'bank' || k === 'type') && autoName) form.querySelector('[name=name]').value = nameFor(bank, tp);
      if (k === 'bank') { const c = bankOf(bank)[2]; const sw = form.querySelector(`[name=color][value="${c}"]`); form.querySelectorAll('[name=color]').forEach(r => r.checked = false); if (sw) sw.checked = true; else form.querySelector('[name=color_custom]').value = c; }
    },
    onSave: v => {
      const d = v.isDefault; delete v.isDefault;
      if (v.type === 'credito') { v.closing = Math.min(31, Math.max(1, v.closing || 1)); v.due = Math.min(31, Math.max(1, v.due || 10)); } else { v.closing = 0; v.due = 0; v.limit = 0; }
      let t = a; if (a) Object.assign(a, v); else { t = { id: uid(), ...v }; S.accounts.push(t); }
      if (d) S.defaultAcc = t.id; else if (S.defaultAcc === t.id) S.defaultAcc = null;
      sortAccounts();
    },
    onDelete: a && S.accounts.length > 1 ? () => { S.accounts = S.accounts.filter(x => x.id !== a.id); if (S.defaultAcc === a.id) S.defaultAcc = null; } : null
  });
}

function backupSheet() {
  const json = JSON.stringify(S);
  let href = ''; try { href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); } catch (e) { }
  openSheet(sheetHead('Backup') + `<p class="sub" style="font-size:13.5px">Seus dados ficam só neste aparelho. Guarde uma cópia de vez em quando, principalmente antes de trocar de celular.</p>
    <label class="fld"><span>Seus dados</span><textarea readonly id="bk">${esc(json)}</textarea></label>
    <button class="btn" data-a="copyBk">Copiar backup</button>
    ${href ? `<a class="btn ghost" style="text-decoration:none" href="${href}" download="byun-backup-${todayISO()}.json">Baixar arquivo</a>` : ''}`);
}
function restoreSheet() {
  openSheet(sheetHead('Restaurar backup') + `<p class="sub" style="font-size:13.5px">Escolha o arquivo ou cole o texto do backup. Isso substitui tudo que está aqui.</p>
    <label class="fld"><span>Arquivo</span><input type="file" id="rsFile" accept=".json,application/json"></label>
    <label class="fld"><span>Ou cole aqui</span><textarea id="rsTxt" placeholder='{"v":1,...}'></textarea></label>
    <button class="btn" data-a="doRestore">Restaurar</button>`);
  $('#rsFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => $('#rsTxt').value = r.result; r.readAsText(f); });
}

/* ---------- login, troca de senha e painel admin ---------- */
const EMAIL_BASE = String(CFG.EMAIL_BASE || '').trim().toLowerCase();
const toEmail = u => {
  u = String(u || '').trim().toLowerCase(); if (u.includes('@')) return u;
  const [local, domain] = EMAIL_BASE.split('@');
  return domain ? `${local}+${u}@${domain}` : `${u}@byun.example.com`;
};
const INITIAL_PASS = 'Fin#2026';
function authView() {
  const m = ui.auth || 'login';
  const msg = ui.authMsg ? `<div class="pill auth-msg ${ui.authOk ? 'ok' : 'bad'}" style="display:flex;margin:12px 0 0;padding:10px 14px;border-radius:14px;line-height:1.4">${esc(ui.authMsg)}</div>` : '';
  if (m === 'loading') return `<div class="ob"><div style="width:110px;margin:0 auto">${byunSVG('sleepy')}</div><p class="lead" style="margin-top:14px">Acordando o ${esc(curPet().name)}...</p></div>`;
  if (m === 'newpass') {
    const forced = ui.forced;
    return `<div class="ob"><div style="width:96px;margin:0 auto">${byunSVG(forced ? 'happy' : 'normal')}</div>
      <h1 style="text-align:center;margin:10px 0 4px">${forced ? `Oi, ${esc(prof?.display_name || '')}!` : 'Trocar senha'}</h1>
      <p class="lead" style="margin-bottom:10px">${forced ? 'Antes de começar, crie a sua senha. A senha inicial era só pra entrar.' : 'Escolha uma senha nova.'}</p>
      <form id="authForm" data-mode="newpass" method="post" action="#" novalidate>
        <input name="username" autocomplete="username" value="${esc(prof?.username || '')}" readonly hidden>
        <label class="fld"><span>NOVA SENHA</span><input name="password" type="password" autocomplete="new-password" required placeholder="MÍNIMO 8, COM LETRA E NÚMERO"></label>
        <label class="fld"><span>REPITA A SENHA</span><input name="password2" type="password" autocomplete="new-password" required placeholder="REPITA A SENHA"></label>
        ${msg}<button class="btn" type="submit">Salvar e entrar</button></form>
      ${forced ? '<button class="btn ghost" data-a="logout">Sair</button>' : '<button class="btn ghost" data-a="authMode" data-v="">Cancelar</button>'}</div>`;
  }
  return `<div class="ob"><div class="logo-wrap ${petCls()}" style="width:110px;margin:0 auto">${byunSVG('happy')}</div><div class="wordmark">byun</div>
    <p class="lead" style="margin-bottom:10px">Seu cofrinho que te julga. Pra você saber quanto ainda pode gastar no mês.</p>
    <form id="authForm" data-mode="login" method="post" action="#" novalidate>
      <label class="fld"><span>USUÁRIO</span><input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required placeholder="DIGITE SEU USUÁRIO"></label>
      <label class="fld"><span>SENHA</span><input name="password" type="password" autocomplete="current-password" required placeholder="DIGITE SUA SENHA"></label>
      ${msg}<button class="btn" type="submit">Entrar</button></form>
    <p class="sub" style="text-align:center;margin-top:16px">Esqueceu a senha? Peça pra administradora redefinir.</p></div>`;
}
function authError(e) {
  const t = String(e?.message || e || '').toLowerCase();
  if (t.includes('invalid login')) return 'Usuário ou senha incorretos.';
  if (t.includes('not confirmed')) return 'Essa conta ainda não foi confirmada. Fale com a administradora.';
  if (t.includes('rate limit') || t.includes('too many') || t.includes('security purposes')) return 'Muitas tentativas. Espere um pouquinho e tente de novo.';
  if (t.includes('different from the old') || t.includes('same password')) return 'A senha nova precisa ser diferente da atual.';
  if (t.includes('password')) return 'Senha fraca. Use pelo menos 8 caracteres com letras e números.';
  if (t.includes('fetch') || t.includes('network')) return 'Sem conexão com o servidor. Confira sua internet.';
  return 'Algo deu errado. Tente de novo.';
}
const strong = p => p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);
async function storeCredential(id, password, name) {
  try { if (window.PasswordCredential && navigator.credentials) await navigator.credentials.store(new PasswordCredential({ id, password, name: name || id })); } catch (e) { }
}
async function authSubmit(form) {
  const f = new FormData(form), mode = form.dataset.mode, btn = form.querySelector('button[type=submit]');
  const uname = String(f.get('username') || '').trim(), pass = String(f.get('password') || '');
  const fail = m => {
    let box = form.querySelector('.auth-msg');
    if (!box) { box = document.createElement('div'); box.style.cssText = 'display:flex;margin:12px 0 0;padding:10px 14px;border-radius:14px;line-height:1.4'; btn.before(box); }
    box.className = 'pill bad auth-msg'; box.textContent = m; btn.disabled = false; btn.textContent = mode === 'login' ? 'Entrar' : 'Salvar e entrar';
  };
  if (mode === 'login' && (!uname || !pass)) return fail('Preencha usuário e senha.');
  if (mode === 'newpass') {
    if (!strong(pass)) return fail('A senha precisa ter 8 caracteres ou mais, com letras e números.');
    if (pass === INITIAL_PASS) return fail('Escolha uma senha diferente da inicial.');
    if (pass !== f.get('password2')) return fail('As senhas não são iguais.');
  }
  btn.disabled = true; btn.textContent = 'Um segundo...';
  try {
    if (mode === 'login') {
      const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(uname), password: pass }); if (error) throw error;
      storeCredential(uname.toLowerCase(), pass);
      ui.authMsg = ''; await enter(data.user);
    } else {
      const { error } = await sb.auth.updateUser({ password: pass }); if (error) throw error;
      await sb.from('profiles').update({ must_change: false }).eq('user_id', user.id);
      if (prof) { prof.must_change = false; cacheProf(); }
      storeCredential(prof?.username || uname, pass, prof?.display_name);
      ui.forced = false; ui.authMsg = ''; toast('Senha salva');
      await enter(user);
    }
  } catch (e) { fail(authError(e)); }
}
async function logout() {
  if (sync.dirty) await push();
  try { localStorage.removeItem(localKey()); if (user) localStorage.removeItem(`byun.prof.${user.id}`); } catch (e) { }
  await sb.auth.signOut();
}
async function delAccount() {
  try {
    const { error } = await sb.rpc('delete_my_account'); if (error) throw error;
    try { localStorage.removeItem(localKey()); } catch (e) { }
    await sb.auth.signOut({ scope: 'local' }); toast('Conta excluída');
  } catch (e) { toast('Não consegui excluir agora. Tente de novo.'); }
}

/* painel da conta admin */
async function loadUsers() {
  const [u, p] = await Promise.all([sb.rpc('admin_list_users'), sb.rpc('admin_list_pending')]);
  ui.users = u.error ? [] : u.data; ui.pending = p.error ? [] : p.data;
  if (isAdmin && !ui.auth && !$('.sheet')) render();
}
function adminView() {
  const users = (ui.users || []).filter(x => !x.is_admin);
  const when = d => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nunca entrou';
  return `<div class="top"><b style="font-size:15px">Painel admin</b><button class="icon-btn" data-a="logout" aria-label="Sair">${ic('x')}</button></div>
    <h1>Pessoas</h1>
    ${!ui.users ? '<div class="empty">Carregando...</div>' : users.map(x => `<section class="card admin-user">
      <div style="display:flex;align-items:center;gap:14px"><div class="pet-mini ${petCls(x.pet)}">${byunSVG('happy', x.pet)}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:16px">${esc(x.display_name)} <span class="muted" style="font-weight:500;font-size:13px">@${esc(x.username)}</span></div>
        <div class="sub">${x.must_change ? '<span class="tag yellow">precisa criar a senha</span>' : '<span class="tag">ativa</span>'} · último acesso: ${when(x.last_sign_in_at)}</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn ghost" data-a="adPet" data-v="${esc(x.username)}">Editar mascote</button><button class="btn ghost" data-a="adReset" data-v="${esc(x.username)}">Redefinir senha</button></div>
    </section>`).join('')}
    ${(ui.pending || []).length ? `<div class="section-t">Liberadas, esperando criar a conta</div><section class="card">${ui.pending.map(x => `<div class="row"><div class="l"><div class="n">${esc(x.display_name)}</div><div class="d">crie no Supabase: <span class="code">${esc(toEmail(x.username))}</span></div></div><button class="chip" data-a="copyTxt" data-v="${esc(toEmail(x.username))}">Copiar</button></div>`).join('')}</section>` : ''}
    <button class="btn" data-a="adAllow">${ic('plus')} Liberar nova pessoa</button>
    <div class="section-t">Sua conta admin</div>
    <section class="card"><button class="btn ghost" style="margin-top:0" data-a="changePass">Trocar minha senha</button><button class="btn ghost" data-a="logout">Sair</button></section>
    <p class="sub" style="text-align:center;margin:18px 0">A conta admin não vê os gastos de ninguém. Só cuida das contas e dos mascotes.</p>`;
}
function copyText(t, okMsg) {
  const fallback = () => openSheet(sheetHead('Copie') + `<textarea class="inp" style="height:90px;padding:12px" readonly>${esc(t)}</textarea>`);
  try { navigator.clipboard.writeText(t).then(() => toast(okMsg), fallback); } catch (e) { fallback(); }
}

/* ---------- toast ---------- */
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2000); }

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, v = el.dataset.v;
  const N = () => info();
  switch (a) {
    case 'go': ui.view = v; window.scrollTo(0, 0); if (v === 'tx') { ui.accF = ui.catF = null; } render(); break;
    case 'month': ui.month = addMonths(ui.month, +v); ui.msgI = 0; render(); break;
    case 'cardStep': { const n = S.accounts.filter(isCredit).length; ui.card = Math.max(0, Math.min(n - 1, ui.card + +v)); render(); const sc = $('#cardScroll'); if (sc && sc.firstElementChild) sc.scrollTo({ left: ui.card * (sc.firstElementChild.offsetWidth + 12), behavior: 'smooth' }); break; }
    case 'hideCard': { if (HIDE_CARDS.has(v)) HIDE_CARDS.delete(v); else HIDE_CARDS.add(v); try { localStorage.setItem('byun.hideCards', JSON.stringify([...HIDE_CARDS])); } catch (er) { } render(); break; }
    case 'hide': HIDE = !HIDE; try { localStorage.setItem('byun.hide', HIDE ? '1' : '0'); } catch (er) { } render(); break;
    case 'theme': S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); render(); break;
    case 'setTheme': S.theme = v; save(); render(); break;
    case 'setMotion': S.motion = v; save(); document.querySelectorAll('.byun .eyes').forEach(g => g.removeAttribute('transform')); render(); break;
    case 'poke': {
      ui.msgI++; const n = N(); const b = $('.bubble'); if (b) { b.textContent = fala(n, mood(n)); b.style.animation = 'none'; b.offsetHeight; b.style.animation = ''; }
      const w = $('.byun-wrap'); if (w) { w.classList.remove('boop'); w.offsetWidth; w.classList.add('boop'); }
      break;
    }
    case 'add': openAdd(v); break;
    case 'close': closeSheet(); break;
    case 'dType': draft.type = v; renderAdd(); break;
    case 'dCat': draft.catId = draft.catId === v ? null : v; renderAdd(); break;
    case 'dAcc': draft.accId = v; renderAdd(); break;
    case 'dKey': if (v === '⌫') draft.cents = Math.floor(draft.cents / 10); else if (draft.cents < 1e9) draft.cents = draft.cents * (v === '00' ? 100 : 10) + (v === '00' ? 0 : +v); renderAdd(); break;
    case 'dQuick': draft.cents += +v * 100; renderAdd(); break;
    case 'dNext': draft.step = 2; renderAdd(); break;
    case 'dBack': draft.step = 1; renderAdd(); break;
    case 'dMore': draft.more = !draft.more; renderAdd(); break;
    case 'dSave': saveDraft(); break;
    case 'dDel': if (el.dataset.sure) { const t = S.tx.find(x => x.id === draft.editId); if (t?.fixedId) { const m = t.date.slice(0, 7); S.fixedSkip = S.fixedSkip || {}; (S.fixedSkip[m] = S.fixedSkip[m] || []).push(t.fixedId); } S.tx = S.tx.filter(x => draft.groupId ? x.group !== draft.groupId : x.id !== draft.editId); save(); closeSheet(); render(); toast(draft?.groupId ? 'Compra excluída (todas as parcelas)' : 'Lançamento excluído'); } else { el.dataset.sure = 1; el.textContent = 'Toque de novo pra confirmar'; } break;
    case 'editTx': { const t = S.tx.find(x => x.id === v); if (t) openAdd(t.type, t); break; }
    case 'txType': ui.txType = v; render(); break;
    case 'accF': ui.accF = ui.accF === v ? null : v; render(); break;
    case 'catF': ui.catF = ui.catF === v ? null : v; render(); break;
    case 'payDay': ui.payDay = ui.payDay === +v ? null : +v; render(); break;
    case 'pay': { let m = ui.month, key = v; if (v.includes('@')) { [key, m] = v.split('@'); } const p = S.fixedPaid[m] = S.fixedPaid[m] || []; const i = p.indexOf(key); const on = i < 0; if (!on) p.splice(i, 1); else { p.push(key); toast('Marcado como pago'); } v = key;
      if (v.startsWith('card:')) { const a = acc(v.slice(5)); if (a) S.tx.forEach(t => { if (t.accId === a.id && t.type === 'gasto' && invMonth(t, a) === m) { t.paid = on; if (on) t.paidAt = t.paidAt || todayISO(); else delete t.paidAt; } }); }
      save(); render(); break; }
    case 'dDup': {
      const t = S.tx.find(x => x.id === draft.editId); if (!t) break;
      const [y, m, dd] = t.date.split('-').map(Number); const nk = addMonths(`${y}-${pad(m)}`, 1);
      closeSheet();
      openForm({ title: 'Duplicar lançamento', saveLabel: 'Duplicar', values: { date: `${nk}-${pad(Math.min(dd, dim(nk)))}`, amount: t.amount },
        fields: [
          { key: 'info', type: 'html', html: `<div class="origin">${ic('copy')}<div><b>${esc(t.note || cat(t.catId)?.name || 'Lançamento')}</b><span>${esc(cat(t.catId)?.name || '')}${acc(t.accId) ? ' · ' + esc(acc(t.accId).name) : ''}</span></div></div>` },
          { key: 'date', label: 'Mês e dia em que vai aparecer', type: 'date', req: true },
          { key: 'amount', label: 'Valor', type: 'money', req: true }
        ],
        onSave: v => {
          const c = { id: uid(), type: t.type, amount: v.amount || t.amount, catId: t.catId, accId: t.accId, note: t.note, date: /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : t.date, at: Date.now() };
          if (t.owedBy?.name) c.owedBy = { name: t.owedBy.name, amount: t.owedBy.amount || 0, received: false };
          S.tx.push(c); toast(`Duplicado pra ${dayLabel(c.date)}`);
        } });
      break; }
    case 'dPart': { const t = S.tx.find(x => x.id === draft.editId); const amt = parseMoney($('#dPartAmt').value); if (!t || !amt) { toast('Digite o valor pago'); break; } payPart(t, amt, $('#dPartDate').value || todayISO()); draft.paid = isPaid(t); save(); renderAdd(); render(); break; }
    case 'dRecv': { const t = S.tx.find(x => x.id === draft.editId); const amt = parseMoney($('#dRecvAmt').value); if (!t || !amt) { toast('Digite o valor recebido'); break; } receivePart(t, amt, $('#dRecvDate').value || todayISO()); draft.owe.received = !!t.owedBy.received; save(); renderAdd(); render(); break; }
    case 'delRecv': { const t = S.tx.find(x => x.id === draft.editId); const o = t?.owedBy; if (o) { const p = (o.parts || []).find(x => x.id === v); o.parts = (o.parts || []).filter(x => x.id !== v); if (p?.txId) S.tx = S.tx.filter(x => x.id !== p.txId); if (oweLeft(t) > 0) o.received = false; draft.owe.received = !!o.received; save(); renderAdd(); render(); toast('Recebimento desfeito'); } break; }
    case 'delPart': { const t = S.tx.find(x => x.id === draft.editId); if (t) { t.parts = (t.parts || []).filter(p => p.id !== v); if (leftToPay(t) > 0) { t.paid = false; delete t.paidAt; } draft.paid = isPaid(t); save(); renderAdd(); render(); } break; }
    case 'paidTx': { const t = S.tx.find(x => x.id === v); if (t) { t.paid = !isPaid(t); if (!t.paid) { t.parts = []; delete t.paidAt; } else t.paidAt = todayISO();
      if (t.fixedId) { const m = t.date.slice(0, 7); const p = S.fixedPaid[m] = S.fixedPaid[m] || []; const i = p.indexOf(t.fixedId); if (t.paid && i < 0) p.push(t.fixedId); if (!t.paid && i >= 0) p.splice(i, 1); }
      toast(t.paid ? 'Pago ✓' : 'Voltou pra a pagar'); save(); render(); } break; }
    case 'recv': { const t = S.tx.find(x => x.id === v); if (t?.owedBy) { receive(t, !t.owedBy.received); save(); render(); } break; }
    case 'newFixed': fixedForm(null, 'sai'); break;
    case 'newIncome': incomeForm(); break;
    case 'newBox': boxForm(); break;
    case 'editBox': { const b = box(v); closeSheet(); boxForm(b); break; }
    case 'openBox': boxSheet(v); break;
    case 'fullCard': ui.fullCard = v; ui.fullInvM = null; render(); break;
    case 'fullInv': { const [id, m] = v.split('|'); ui.fullCard = id; ui.fullInvAcc = id; ui.fullInvM = m; render(); break; }
    case 'invoice': { const [id, m] = v.split('|'); invoiceSheet(id, m); break; }
    case 'goBoxes': { const c = $('#cofrinho'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.remove('flash'); c.offsetWidth; c.classList.add('flash'); } break; }
    case 'move': { const b = el.dataset.b; closeSheet(); moveForm(v, b); break; }
    case 'fixBal': { const b = box(v); closeSheet(); openForm({ title: 'Atualizar saldo', saveLabel: 'Atualizar', values: { real: boxBal(b) }, fields: [{ key: 'real', label: `Quanto tem hoje em ${b.name}?`, type: 'money', hint: 'Olhe no app do banco. A diferença entra como rendimento.' }], onSave: x => { const diff = Math.round((x.real - boxBal(b)) * 100) / 100; if (diff) S.moves.push({ id: uid(), boxId: b.id, type: 'rend', amount: diff, date: todayISO(), note: 'Ajuste pelo saldo do banco' }); toast('Saldo atualizado'); } }); break; }
    case 'delMove': if (el.dataset.sure) { const m = S.moves.find(x => x.id === v); S.moves = S.moves.filter(x => x.id !== v); save(); closeSheet(); render(); if (m && ui.view !== 'boxesFull') boxSheet(m.boxId); } else { el.dataset.sure = 1; el.querySelector('.n').textContent = 'Toque de novo pra apagar'; } break;
    case 'obAddIncome': obData().incomes.push({ name: '', amount: '', rule: 'util5', day: '5' }); render(); break;
    case 'obDelIncome': obData().incomes.splice(+v, 1); render(); break;
    case 'editFixed': closeSheet(); fixedForm(S.fixed.find(x => x.id === v)); break;
    case 'newExtra': extraForm(); break;
    case 'editExtra': extraForm(S.extras.find(x => x.id === v)); break;
    case 'newCat': catForm(); break;
    case 'editCat': catForm(cat(v)); break;
    case 'newAcc': accForm(null, v || 'conta'); break;
    case 'editAcc': closeSheet(); accForm(acc(v)); break;
    case 'backup': backupSheet(); break;
    case 'copyBk': { const t = $('#bk'); try { navigator.clipboard.writeText(t.value).then(() => toast('Backup copiado'), () => { t.select(); toast('Selecionei o texto, é só copiar'); }); } catch (er) { t.select(); } break; }
    case 'restore': restoreSheet(); break;
    case 'doRestore': { try { const d = JSON.parse($('#rsTxt').value); if (!d || !Array.isArray(d.tx)) throw 0; S = Object.assign(defaultState(), d, { onboarded: true }); save(); closeSheet(); render(); toast('Backup restaurado'); } catch (er) { toast('Esse texto não parece um backup do Byun'); } break; }
    case 'wipe': if (el.dataset.sure) { try { localStorage.removeItem(localKey()); } catch (er) { } S = defaultState(); ui.ob = 0; ui.view = 'home'; if (CLOUD && user) save(); render(); } else { el.dataset.sure = 1; el.textContent = 'Toque de novo: apaga TUDO'; } break;
    case 'authMode': ui.auth = v; ui.authMsg = ''; render(); break;
    case 'syncNow': setSync('saving'); push().then(pull); break;
    case 'logout': logout(); break;
    case 'changePass': ui.auth = 'newpass'; ui.forced = false; ui.authMsg = ''; render(); break;
    case 'delAccount': if (el.dataset.sure) { delAccount(); } else { el.dataset.sure = 1; el.textContent = 'Toque de novo: apaga a conta e TODOS os dados'; } break;
    case 'copyTxt': copyText(v, 'Copiado'); break;
    case 'editIdentity': openForm({ title: 'Nome e usuário', values: { display: prof.display_name, username: prof.username },
      fields: [{ key: 'display', label: 'Nome', req: true, max: 30, hint: 'É como o app te chama.' }, { key: 'username', label: '@usuário (pra entrar)', req: true, max: 30, hint: 'Só letras minúsculas, números, ponto ou traço. Depois de mudar, entre com o novo usuário e atualize no gerenciador de senhas.' }],
      onSave: async x => {
        const nu = x.username.toLowerCase().replace(/^@/, '');
        if (!/^[a-z0-9._-]{2,30}$/.test(nu)) { toast('Usuário inválido'); return; }
        const r1 = await sb.from('profiles').update({ display_name: x.display }).eq('user_id', user.id);
        if (!r1.error) { prof.display_name = x.display; S.name = x.display; save(); }
        if (nu !== prof.username) { const r2 = await sb.rpc('change_my_username', { p_new: nu }); if (r2.error) { toast(/EM_USO/.test(r2.error.message) ? 'Esse usuário já existe' : 'Não consegui mudar o usuário'); return; } prof.username = nu; toast(`Agora você entra como ${nu}`); } else toast('Nome atualizado');
        cacheProf(); render();
      } }); break;
    case 'editPet': openPetEditor(curPet(), p => savePet(p)); break;
    case 'peMood': petEdit.mood++; renderPetEditor(); break;
    case 'peSpecies': petEdit.p.species = v; renderPetEditor(); break;
    case 'peColor': petEdit.p[el.dataset.k] = v; renderPetEditor(); break;
    case 'peSave': { const p = petEdit.p; p.name = ($('#peName').value || 'Byun').trim().slice(0, 16); const cb = petEdit.onSave; closeSheet(); petEdit = null; cb(p); break; }
    case 'adPet': { const x = ui.users.find(u => u.username === v); openPetEditor(x.pet, async p => { const { error } = await sb.rpc('admin_set_pet', { p_username: v, p_pet: p }); toast(error ? 'Não consegui salvar' : 'Mascote atualizado'); loadUsers(); }, `Mascote de ${x.display_name}`); break; }
    case 'adReset': openForm({ title: 'Redefinir senha', saveLabel: 'Redefinir', values: { pass: INITIAL_PASS }, fields: [{ key: 'pass', label: 'Senha temporária', hint: 'A pessoa vai ser obrigada a trocar quando entrar. Ela sai de todos os aparelhos.' }], onSave: async x => { const { error } = await sb.rpc('admin_reset_password', { p_username: v, p_password: x.pass }); toast(error ? 'Não consegui redefinir' : 'Senha redefinida'); loadUsers(); } }); break;
    case 'adAllow': openForm({ title: 'Liberar nova pessoa', saveLabel: 'Liberar', fields: [{ key: 'display', label: 'Nome', req: true, ph: 'Ex.: Pedro', max: 30 }, { key: 'username', label: 'Usuário (pra entrar)', req: true, ph: 'ex.: pedro', max: 30, hint: 'Só letras minúsculas, números, ponto ou traço.' }], onSave: async x => { const u = x.username.toLowerCase().replace(/[^a-z0-9._-]/g, ''); const { error } = await sb.rpc('admin_allow_user', { p_username: u, p_display_name: x.display, p_pet: DEFAULT_PET }); toast(error ? 'Não consegui liberar' : 'Liberada! Agora crie a conta no Supabase'); loadUsers(); } }); break;
    case 'installNow': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; render(); }); } break;
    case 'ob': ui.ob = +v; render(); break;
    case 'obDone': S.onboarded = true; save(); ui.view = 'home'; render(); break;
  }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'authForm') { e.preventDefault(); authSubmit(e.target); return; }
  if (e.target.id !== 'obForm') return;
  e.preventDefault(); const d = obData();
  S.name = String(d.name || '').trim();
  const L = parseMoney(d.limit) || 984;
  const base = S.categories.filter(c => c.limit > 0), tot = sum(base, c => c.limit) || 1;
  let acc_ = 0; base.forEach((c, i) => { c.limit = i === base.length - 1 ? Math.round((L - acc_) * 100) / 100 : Math.round(c.limit / tot * L); acc_ += c.limit; });
  d.incomes.forEach(r => { const v = parseMoney(r.amount); if (v > 0) S.fixed.push({ id: uid(), kind: 'entra', name: (r.name || 'Renda').trim(), amount: v, rule: r.rule, day: Math.min(31, Math.max(1, parseInt(r.day) || 5)), sat: true, accId: S.defaultAcc, since: curKey() }); });
  const sv = parseMoney(d.saved);
  if (sv > 0) { const nb = { id: uid(), name: 'Reserva', icon: '🐷', accId: d.savedAcc, rateType: 'cdi', rate: String(d.savedRate || '100').replace(',', '.') }; S.boxes = [nb]; S.moves = [{ id: uid(), boxId: nb.id, type: 'ini', amount: sv, date: todayISO(), note: 'Saldo inicial' }]; }
  ui.obd = null; save(); ui.ob = 2; render();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.ob) { obData()[t.dataset.ob] = t.value; return; }
  if (t.dataset.obi) { const r = obData().incomes[+t.dataset.obi]; r[t.dataset.k] = t.value; if (t.dataset.k === 'rule') render(); return; }
  if (t.id === 'q') { ui.q = t.value; const pos = t.selectionStart; render(); const n = $('#q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } return; }
  if (draft && t.id === 'dNote') draft.note = t.value;
  if (draft && t.id === 'dOweName') draft.owe.name = t.value;
  if (draft && t.id === 'dOweAmt') draft.owe.amount = t.value;
  if (draft && t.id === 'dDate' && t.value) draft.date = t.value;
  if (petEdit && t.dataset.pk) { petEdit.p[t.dataset.pk] = t.value; const pv = $('.pet-prev'); if (pv) pv.firstElementChild.outerHTML = byunSVG('normal', petEdit.p); }
  if (t.dataset.setv) { S[t.dataset.setv] = t.dataset.setv === 'cdi' ? (parseFloat(t.value.replace(',', '.')) || 0) : t.value; save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (draft && t.id === 'dParc') { draft.parcelas = +t.value; renderAdd(); }
  if (draft && t.id === 'dPaid') { draft.paid = t.checked; if (t.checked && !draft.paidAt) draft.paidAt = todayISO(); renderAdd(); }
  if (draft && t.id === 'dPaidAt') draft.paidAt = t.value;
  if (draft && t.id === 'dOweOn') { draft.owe.on = t.checked; renderAdd(); }
  if (draft && t.id === 'dDate') renderAdd();
  if (t.dataset.set) { S[t.dataset.set] = t.checked; save(); }
  if (petEdit && t.dataset.pk) renderPetEditor();
  if (petEdit && t.dataset.pt) { petEdit.p[t.dataset.pt] = t.checked; renderPetEditor(); }
});
document.addEventListener('keydown', e => {
  if (!draft || draft.step !== 1 || e.target.matches('input,textarea,select')) { if (e.key === 'Escape' && $('.sheet')) closeSheet(); return; }
  if (/^[0-9]$/.test(e.key)) { draft.cents = draft.cents * 10 + +e.key; renderAdd(); }
  else if (e.key === 'Backspace') { draft.cents = Math.floor(draft.cents / 10); renderAdd(); }
  else if (e.key === 'Enter' && draft.cents) { draft.step = 2; renderAdd(); }
  else if (e.key === 'Escape') closeSheet();
});
/* deslizar o carrossel de cartões troca o cartão selecionado */
document.addEventListener('scroll', e => {
  const sc = e.target; if (!sc || sc.id !== 'cardScroll') return;
  clearTimeout(sc._t); sc._t = setTimeout(() => { const i = Math.round(sc.scrollLeft / ((sc.firstElementChild?.offsetWidth || 270) + 12)); const n = S.accounts.filter(isCredit).length; if (i !== ui.card && i < n) { ui.card = i; const left = sc.scrollLeft; render(); const ns = $('#cardScroll'); if (ns) ns.scrollLeft = left; } }, 140);
}, true);

/* ---------- olhos que seguem o dedo/cursor ---------- */
function look(x, y) {
  if (S.motion !== 'follow') return;
  document.querySelectorAll('.byun').forEach(svg => {
    const r = svg.getBoundingClientRect(); if (!r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * .6;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
    const tx = dx / d * 7 * k, ty = dy / d * 5 * k;
    const g = svg.querySelector('.eyes'); if (g) g.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
    const p = svg.querySelector('.pupils'); if (p) p.setAttribute('transform', `translate(${(tx * .5).toFixed(1)} ${(ty * .5).toFixed(1)})`);
  });
}
addEventListener('pointermove', e => look(e.clientX, e.clientY), { passive: true });
addEventListener('pointerdown', e => look(e.clientX, e.clientY), { passive: true });
addEventListener('touchmove', e => { const t = e.touches[0]; if (t) look(t.clientX, t.clientY); }, { passive: true });

/* atualiza a fala quando o dia/hora muda e o app fica aberto */
setInterval(() => { if (ui.view === 'home' && !$('.sheet')) { const n = info(); const b = $('.bubble'); if (b && S.lastAdded && Date.now() - S.lastAdded.at > 15 * 60e3) render(); } }, 60e3);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (sync.dirty) push(); return; }
  if ($('.sheet')) return;
  if (CLOUD && user && !sync.dirty) pull(); else render();
});
addEventListener('online', () => { if (sync.dirty) push(); });

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  try { navigator.serviceWorker.register('sw.js').catch(() => { }); } catch (e) { }
}

boot();

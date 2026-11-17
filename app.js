'use strict';
/* ==========================================================
   Byun: o gatinho que cuida (e julga) os seus gastos
   Tudo fica salvo no próprio aparelho (localStorage).
   ========================================================== */

const KEY = 'byun.v1';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MES3 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
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
const fmt = v => brl.format(v || 0).replace(/ /g, ' ');
const fmt0 = v => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
const short = v => { const a = Math.abs(v); if (a >= 1000) return (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'; return Math.round(v).toString(); };
const sum = (arr, f = x => x.amount) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
function money(v, cls = '') {
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
  ].map(a => ({ id: uid(), name: a[0], type: a[1], color: a[2], limit: a[1] === 'credito' ? 1500 : 0, closing: a[1] === 'credito' ? 3 : 0, due: a[1] === 'credito' ? 10 : 0 }));
  return {
    v: 1, onboarded: false, name: '', theme: 'light', follow: true, sass: true, housingRef: 30,
    categories: cats, accounts: accs, housingCat: cats[5].id, defaultAcc: accs[0].id,
    tx: [], fixed: [], fixedPaid: {}, extras: [], lastAdded: null
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
function load() { const d = defaultState(); const r = readKey(localKey()); return r ? Object.assign(d, r) : d; }
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
  } else if (rAt > lAt) { S = Object.assign(defaultState(), remote); writeLocal(); setSync('ok'); }
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
  S = load(); if (!S.name && prof.display_name) S.name = prof.display_name;
  render(); await pull();
}
async function boot() {
  if (!CLOUD) { render(); return; }
  ui.auth = 'loading'; render();
  sb.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT') { user = null; prof = null; isAdmin = false; S = defaultState(); ui.auth = 'login'; ui.view = 'home'; ui.ob = 0; ui.users = ui.pending = null; ui.month = curKey(); render(); }
  });
  let session = null;
  try { session = (await sb.auth.getSession()).data.session; } catch (e) { }
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  if (session) enter(session.user); else { ui.auth = 'login'; render(); }
}

const ui = { view: 'home', month: curKey(), txType: 'all', q: '', accF: null, catF: null, msgI: 0, ob: 0, payDay: null, card: 0 };
let draft = null, deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

const cat = id => S.categories.find(c => c.id === id);
const acc = id => S.accounts.find(a => a.id === id);
const catColor = c => c ? `var(--s${(c.color % 8) + 1})` : 'var(--muted)';
const isCredit = a => a && a.type === 'credito';

/* ---------- cálculos do mês ---------- */
function extrasFor(m) { return S.extras.filter(e => e.recurring ? (!e.since || e.since <= m) : e.month === m); }
function invMonth(t, a) { const d = +t.date.slice(8); return a.closing && d > a.closing ? addMonths(t.date.slice(0, 7), 1) : t.date.slice(0, 7); }
function invoice(a, m) { return sum(S.tx.filter(t => t.accId === a.id && t.type === 'gasto' && invMonth(t, a) === m)); }
function cardOpenMonth(a) { const t = todayISO(); return a.closing && +t.slice(8) > a.closing ? addMonths(t.slice(0, 7), 1) : t.slice(0, 7); }
function cardFree(a) {
  const open = cardOpenMonth(a);
  const used = sum(S.tx.filter(t => t.accId === a.id && t.type === 'gasto' && invMonth(t, a) >= open && !(S.fixedPaid[invMonth(t, a)] || []).includes('card:' + a.id)));
  return (+a.limit || 0) - used;
}

function info(m = ui.month) {
  const tx = S.tx.filter(t => t.date.slice(0, 7) === m);
  const gastos = tx.filter(t => t.type === 'gasto'), receitas = tx.filter(t => t.type === 'receita');
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
  const sobra = entra - fixOut - gasto - exOut - exSave;
  const diario = daysLeft > 0 ? Math.max(0, pode) / daysLeft : 0;
  const projecao = day > 0 ? gasto / day * D : 0;
  return { m, tx, gastos, receitas, gasto, receita, limit, fixIn, fixOut, fixOutList, paid, exIn, exOut, exSave, D, isCur, isPast, day, daysLeft, pode, expected, byCat, overCats, entra, sobra, diario, projecao };
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
  happy: ['Tô orgulhoso. Não acostuma.', 'Sobrou {pode}. Eu tô de olho, viu?', '{diario} por dia. Isso é um limite, não uma meta.', 'Gastando abaixo do ritmo. Quem é você e o que fez com a {nome}?'],
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
function fala(N, md) {
  const bank = S.sass ? FALAS : CALMO;
  let key = md;
  if (N.isPast) key = 'past'; else if (!N.isCur) key = 'future'; else if (N.gasto === 0) key = 'start';
  const list = bank[key] || bank.normal;
  const over = N.overCats[0];
  const vars = {
    limite: fmt0(N.limit), pode: fmt(N.pode), dias: N.daysLeft, diario: fmt(N.diario), gasto: fmt(N.gasto),
    projecao: fmt0(N.projecao), ultimo: fmt0(S.lastAdded?.amount || 0), categoria: over ? over.c.name.split(' ')[0] : '',
    excesso: fmt0(N.gasto - N.limit), sobra: fmt(N.sobra), nome: S.name || 'dona'
  };
  return list[ui.msgI % list.length].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
const DEFAULT_PET = { name: 'Byun', species: 'gato', body: '#0b0b0b', eyes: '#ffffff', accent: '#1f5a3a', blush: false };
const SPECIES = [['gato', 'Gato'], ['onca', 'Onça'], ['coelho', 'Coelho'], ['urso', 'Urso'], ['golfinho', 'Golfinho'], ['tubarao', 'Tubarão']];
const BODY_COLORS = ['#0b0b0b', '#4a4a4a', '#ffffff', '#f2c6d8', '#e8a33d', '#8b5e3c', '#7c4dcc', '#2f6fdb', '#1f5a3a', '#c0392b'];
const EYE_COLORS = ['#ffffff', '#3ddc84', '#ffd166', '#5ec8ff', '#ff8fab', '#b388ff', '#0b0b0b', '#6b3e1f'];
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
  } else if (p.species === 'golfinho') {
    ears = '<path d="M84 60 C90 34 104 22 122 20 C112 32 110 46 114 60 Z"/>';
    extra = `<ellipse cx="100" cy="146" rx="24" ry="13" fill="${light}" opacity=".55"/>`;
  } else if (p.species === 'tubarao') {
    ears = '<path d="M82 60 L106 10 C112 26 116 44 118 60 Z"/>';
    extra = `<ellipse cx="100" cy="146" rx="46" ry="20" fill="${light}" opacity=".45"/>`;
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
    <div class="pet-prev" data-a="peMood">${byunSVG(moods[petEdit.mood % moods.length], p)}<span>toque pra ver outro humor</span></div>
    <label class="fld"><span>Nome do mascote</span><input id="peName" value="${esc(p.name)}" maxlength="16" placeholder="Byun"></label>
    <div class="flabel">Bichinho</div>
    <div class="species">${SPECIES.map(([k, l]) => `<button class="${p.species === k ? 'on' : ''}" data-a="peSpecies" data-v="${k}"><i>${byunSVG('normal', Object.assign({}, p, { species: k }))}</i>${l}</button>`).join('')}</div>
    <div class="flabel">Cor do corpo</div>${sw('body', BODY_COLORS)}
    <div class="flabel">Cor dos olhos</div>${sw('eyes', EYE_COLORS)}
    <div class="flabel">Cor do app</div>${sw('accent', ACCENTS)}
    <label class="switch"><div><div class="n">Bochechas rosadas</div></div><span class="tgl"><input type="checkbox" data-pt="blush" ${p.blush ? 'checked' : ''}><i></i></span></label>
    <button class="btn" data-a="peSave">Salvar</button>`;
}

/* ---------- moldura ---------- */
function topbar(title) {
  if (title) return `<div class="top"><button class="icon-btn" data-a="go" data-v="home" aria-label="Voltar">${ic('left')}</button><b>${title}</b><span style="width:40px"></span></div>`;
  return `<div class="top"><button class="icon-btn flat" data-a="theme" aria-label="Tema">${ic(S.theme === 'dark' ? 'sun' : 'moon')}</button>
    <div class="month"><button class="icon-btn flat" data-a="month" data-v="-1" aria-label="Mês anterior">${ic('left')}</button><span>${monthName(ui.month)}${ui.month.slice(0, 4) !== curKey().slice(0, 4) ? ' ' + ui.month.slice(0, 4) : ''}</span><button class="icon-btn flat" data-a="month" data-v="1" aria-label="Próximo mês">${ic('right')}</button></div>
    <button class="icon-btn" data-a="go" data-v="settings" aria-label="Ajustes">${ic('gear')}</button></div>`;
}
function nav() {
  const b = (v, i, l) => `<button class="${ui.view === v ? 'on' : ''}" data-a="go" data-v="${v}" aria-label="${l}">${ic(i)}</button>`;
  return `<nav class="nav">${b('home', 'home', 'Início')}${b('tx', 'list', 'Transações')}<button class="plus" data-a="add" data-v="gasto" aria-label="Novo lançamento">${ic('plus')}</button>${b('charts', 'pie', 'Análises')}${b('plan', 'sliders', 'Planejar')}</nav>`;
}

function render() {
  document.documentElement.dataset.theme = S.theme; applyAccent();
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = S.theme === 'dark' ? '#0a0b0a' : '#ffffff';
  const app = $('#app');
  if (CLOUD && (!user || ui.auth)) { app.innerHTML = authView(); return; }
  if (CLOUD && isAdmin) { app.innerHTML = adminView(); return; }
  if (!S.onboarded) { app.innerHTML = onboarding(); return; }
  const views = { home: homeView, tx: txView, charts: chartsView, plan: planView, settings: settingsView, install: installView };
  app.innerHTML = (views[ui.view] || homeView)() + nav();
  requestAnimationFrame(drawCharts);
}

/* ---------- Início ---------- */
function homeView() {
  const N = info(), md = mood(N);
  const frac = N.limit > 0 ? Math.max(0, Math.min(1, N.pode / N.limit)) : 0;
  let pill;
  if (N.limit > 0 && N.gasto > N.limit) pill = `<span class="pill bad">Passou ${fmt0(N.gasto - N.limit)} do limite</span>`;
  else if (N.isCur && N.gasto > N.expected * 1.05) pill = `<span class="pill bad">Acima do ritmo</span>`;
  else pill = `<span class="pill ok">${ic('check')} No ritmo</span>`;
  const sub = N.isCur ? `de ${fmt0(N.limit)} · ${N.daysLeft} ${N.daysLeft === 1 ? 'dia' : 'dias'}` : N.isPast ? `de ${fmt0(N.limit)} · mês encerrado` : `de ${fmt0(N.limit)} · mês futuro`;

  const hero = `<section class="hero">
    <div class="bubble" data-a="poke">${esc(fala(N, md))}</div>
    <div class="gauge">
      <svg class="arc ${N.pode < 0 ? 'over' : ''}" viewBox="0 0 240 240"><path class="trk" d="M46.46 193.54 A104 104 0 1 1 193.54 193.54" fill="none" stroke-width="11" stroke-linecap="round" pathLength="100"/><path class="val" d="M46.46 193.54 A104 104 0 1 1 193.54 193.54" fill="none" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="${N.pode < 0 ? 100 : (frac * 100).toFixed(2)} 200"/></svg>
      <div class="byun-wrap" data-a="poke">${byunSVG(md)}</div>
    </div>
    <div class="label">Pode gastar</div>
    <div class="big">${money(N.pode)}</div>
    <div class="sub">${sub}</div>${pill}
  </section>
  <div class="qa">
    <button data-a="add" data-v="gasto"><i>${ic('minus')}</i>Gasto</button>
    <button data-a="add" data-v="receita"><i>${ic('plus')}</i>Receita</button>
    <button data-a="go" data-v="plan"><i>${ic('repeat')}</i>Fixos</button>
    <button data-a="go" data-v="plan"><i>${ic('gauge')}</i>Limites</button>
  </div>`;

  return topbar() + `<div class="home-grid">
    <div class="col">${hero}${saldoCard(N)}${recentCard(N)}</div>
    <div class="col">${billsCard(N)}${cardsCard()}</div>
    <div class="col">${housingCard(N)}${extrasCard(N)}</div>
  </div>`;
}

function saldoCard(N) {
  const base = Math.max(N.entra, N.fixOut + N.gasto + N.exOut + N.exSave, 1);
  const parts = [
    ['Fixos', N.fixOut, 'var(--ink)'], ['Dia a dia', N.gasto, 'var(--s1)'],
    ['Extras', N.exOut + N.exSave, 'var(--s4)'], ['Sobra', Math.max(0, N.sobra), 'var(--green2)']
  ];
  const bar = parts.filter(p => p[1] > 0).map(p => `<i style="width:${p[1] / base * 100}%;background:${p[2]}" title="${p[0]}"></i>`).join('');
  const salPct = N.entra > 0 ? pct(N.sobra, N.entra) : 0;
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('wallet')} Saldo previsto</span>${N.entra > 0 ? `<span class="tag ${N.sobra < 0 ? 'gray' : ''}">${ic(N.sobra < 0 ? 'arrowDown' : 'arrowUp')} ${salPct}% livre</span>` : ''}</div>
    <div class="saldo-big ${N.sobra < 0 ? 'neg' : ''}">${money(N.sobra)}</div>
    <div class="sub">valor estimado depois de pagar tudo do mês</div>
    <div class="stack">${bar || '<i style="width:100%;background:var(--line)"></i>'}</div>
    <div class="legend">
      <div>Entra <b class="pos">+${fmt(N.entra)}</b></div>
      <div><span class="dot" style="background:var(--ink)"></span>Fixos <b>-${fmt(N.fixOut)}</b></div>
      <div><span class="dot" style="background:var(--s1)"></span>Dia a dia <b>-${fmt(N.gasto)}</b></div>
      <div><span class="dot" style="background:var(--s4)"></span>Extras <b>-${fmt(N.exOut + N.exSave)}</b></div>
    </div>
    ${N.entra === 0 ? `<div class="empty" style="padding-bottom:0">Cadastre seu salário em <button class="link" data-a="go" data-v="plan">Planejar</button> pra ver a sobra real.</div>` : ''}
  </section>`;
}

function billsList(N) {
  const items = N.fixOutList.map(f => ({ id: f.id, name: f.name, amount: f.amount, day: +f.day || 1, icon: cat(f.catId)?.icon || '📌', sub: acc(f.accId)?.name || 'fixo' }));
  S.accounts.filter(isCredit).forEach(a => {
    const v = invoice(a, N.m);
    if (v > 0) items.push({ id: 'card:' + a.id, name: 'Fatura ' + a.name, amount: v, day: +a.due || 10, icon: '💳', sub: 'já contado no dia a dia' });
  });
  return items.sort((a, b) => a.day - b.day);
}
function billsCard(N) {
  const items = billsList(N);
  const pend = items.filter(x => !N.paid.includes(x.id));
  const days = [...new Set(items.map(x => x.day))];
  if (ui.payDay && !days.includes(ui.payDay)) ui.payDay = null;
  const shown = ui.payDay ? items.filter(x => x.day === ui.payDay) : items;
  const next = pend[0];
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('calendar')} Contas a pagar${next ? ` <span class="muted" style="font-weight:600;font-size:12px">· dia ${pad(next.day)}</span>` : ''}</span><button class="link" data-a="newFixed">Nova ${ic('plus')}</button></div>
    ${items.length ? `<div class="saldo-big" style="font-size:28px">${money(sum(pend))}</div>
    <div class="sub" style="margin-bottom:12px">${items.length - pend.length} de ${items.length} pagas</div>
    <div class="days">${days.map(d => { const its = items.filter(x => x.day === d); const done = its.every(x => N.paid.includes(x.id)); return `<button class="${ui.payDay === d ? 'on' : ''} ${done ? 'done' : ''}" data-a="payDay" data-v="${d}">${pad(d)}<em>${'•'.repeat(Math.min(5, its.length))}</em></button>`; }).join('')}</div>
    ${shown.map(x => { const p = N.paid.includes(x.id); return `<div class="row ${p ? 'paid' : ''}"><button class="check ${p ? 'on' : ''}" data-a="pay" data-v="${x.id}" aria-label="Marcar como paga">${ic('check')}</button><div class="l"><div class="n">${esc(x.name)}</div><div class="d">dia ${pad(x.day)} · ${esc(x.sub)}</div></div><div class="v">${fmt(x.amount)}</div></div>`; }).join('')}`
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
    <div class="card-h"><span class="t">${ic('card')} Cartões</span><span class="muted" style="font-size:12px">${ui.card + 1} de ${cards.length}</span></div>
    <div class="sub">Fatura de ${monthName(open).toLowerCase()}</div>
    <div class="saldo-big" style="font-size:28px;margin-bottom:12px">${money(invoice(a, open))}</div>
    <div class="cards-scroll" id="cardScroll">
      ${cards.map((c, i) => `<div class="ccard" data-a="editAcc" data-v="${c.id}" style="background:linear-gradient(140deg,${c.color},${shade(c.color)})">
        <div class="top-r"><span>${esc(c.name)}</span><span class="st">${i === ui.card && fechada ? 'Fechada' : 'Aberta'}</span></div>
        <div class="chip-i"></div>
        <div class="bot"><div>Vence<b>${pad(c.due || 10)}/${pad(+cardOpenMonth(c).slice(5))}</b></div><div style="text-align:right">Limite livre<b>${fmt(cardFree(c))}</b></div></div>
      </div>`).join('')}
      <div class="ccard add" data-a="newAcc" data-v="credito">+ Novo cartão</div>
    </div>
    <div class="flabel" style="margin-top:14px">PRÓXIMAS FATURAS</div>
    <div class="invoices">${nexts.map((m, i) => `<div class="inv ${i === 0 ? 'on' : ''}">${MES3[+m.slice(5) - 1]}${m.slice(0, 4) !== open.slice(0, 4) ? ' ' + m.slice(2, 4) : ''}<b>${fmt(invoice(a, m))}</b></div>`).join('')}</div>
  </section>`;
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * .55); g = Math.round(g * .55); b = Math.round(b * .55);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function housingCard(N) {
  const hc = cat(S.housingCat);
  if (!hc) return '';
  const v = sum(N.fixOutList.filter(f => f.catId === hc.id)) + (N.byCat.find(x => x.c.id === hc.id)?.v || 0);
  const sal = N.fixIn + N.receita;
  const p = sal > 0 ? v / sal * 100 : 0, ref = +S.housingRef || 30;
  const items = N.fixOutList.filter(f => f.catId === hc.id);
  return `<section class="card">
    <div class="card-h"><span class="t">${ic('house')} ${esc(hc.name)}</span><button class="link" data-a="go" data-v="plan">Ajustar</button></div>
    <div class="sub">Quanto você gasta pra morar</div>
    <div class="saldo-big" style="font-size:28px">${money(v)}</div>
    ${sal > 0 ? `<div style="font-size:12.5px;margin-top:4px"><b class="${p > ref ? 'neg' : 'pos'}">${p > ref ? '' : '✓ '}${Math.round(p)}% do que entra</b> <span class="muted">referência: até ${ref}%</span></div>
    <div class="prog" style="margin:14px 0 4px"><i class="${p > ref ? 'over' : ''}" style="width:${Math.min(100, p / 60 * 100)}%"></i><span class="mark" style="left:${ref / 60 * 100}%"></span></div>
    <div class="sub" style="display:flex;justify-content:space-between"><span>0%</span><span>60% do que entra</span></div>` : `<div class="sub">Cadastre o salário pra ver o peso no orçamento.</div>`}
    ${items.length ? `<div class="flabel">O que entra na conta</div>${items.map(f => `<div class="row"><div class="ico">${esc(cat(f.catId)?.icon || '🏠')}</div><div class="l"><div class="n">${esc(f.name)}</div><div class="d">dia ${pad(f.day || 1)}</div></div><div class="v">${fmt(f.amount)}</div></div>`).join('')}` : ''}
  </section>`;
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
function txRow(t) {
  const c = cat(t.catId), a = acc(t.accId), r = t.type === 'receita';
  const title = t.note || (r ? 'Receita' : c?.name || 'Gasto');
  const sub = [r ? (t.note ? 'Receita' : '') : (t.note ? c?.name : ''), a?.name, t.inst ? `parcela ${t.inst}` : ''].filter(Boolean).join(' · ');
  return `<div class="row tap" data-a="editTx" data-v="${t.id}"><div class="ico">${r ? '💰' : esc(c?.icon || '📦')}</div><div class="l"><div class="n">${esc(title)}</div><div class="d">${esc(sub || dayLabel(t.date))}</div></div><div class="v ${r ? 'pos' : ''}">${r ? '+' : '-'}${fmt(t.amount)}</div></div>`;
}

/* ---------- Transações ---------- */
function txView() {
  const N = info();
  const q = ui.q.trim().toLowerCase();
  let list = N.tx.filter(t => ui.txType === 'all' || t.type === ui.txType)
    .filter(t => !ui.accF || t.accId === ui.accF).filter(t => !ui.catF || t.catId === ui.catF)
    .filter(t => !q || [t.note, cat(t.catId)?.name, acc(t.accId)?.name, String(t.amount).replace('.', ',')].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0));
  const groups = {};
  list.forEach(t => (groups[t.date] = groups[t.date] || []).push(t));
  const tot = sum(list.filter(t => t.type === 'gasto')), totR = sum(list.filter(t => t.type === 'receita'));
  return topbar() + `<h1>Transações</h1>
    <label class="search">${ic('search')}<input id="q" type="search" placeholder="Buscar por nota, categoria ou conta" value="${esc(ui.q)}" autocomplete="off"></label>
    <div class="chips">
      ${[['all', 'Tudo'], ['gasto', 'Gastos'], ['receita', 'Receitas']].map(([v, l]) => `<button class="chip ${ui.txType === v ? 'on' : ''}" data-a="txType" data-v="${v}">${l}</button>`).join('')}
      ${S.accounts.map(a => `<button class="chip ${ui.accF === a.id ? 'on' : ''}" data-a="accF" data-v="${a.id}"><span class="dot" style="background:${a.color}"></span>${esc(a.name)}</button>`).join('')}
    </div>
    <div class="chips">${S.categories.map(c => `<button class="chip ${ui.catF === c.id ? 'on' : ''}" data-a="catF" data-v="${c.id}">${esc(c.icon)} ${esc(c.name.split(' ')[0])}</button>`).join('')}</div>
    ${list.length ? `<div class="sub" style="margin:8px 4px">${list.length} lançamentos · <b class="ink2">-${fmt(tot)}</b>${totR ? ` · <b class="pos">+${fmt(totR)}</b>` : ''}</div>` : ''}
    ${list.length ? Object.entries(groups).map(([d, ts]) => `<div class="day-h"><span>${dayLabel(d)}</span><span>${fmt(sum(ts.filter(t => t.type === 'gasto')))}</span></div><div class="card" style="padding:4px 16px">${ts.map(txRow).join('')}</div>`).join('')
      : `<div class="empty" style="margin-top:40px"><b>Nenhum lançamento em ${monthName(ui.month).toLowerCase()}</b>Toque em + pra anotar.</div>`}`;
}

/* ---------- Análises (gráficos) ---------- */
let CH = {};
function chartsView() {
  const N = info(), P = info(addMonths(ui.month, -1));
  const delta = P.gasto > 0 ? (N.gasto - P.gasto) / P.gasto * 100 : null;
  const biggest = [...N.gastos].sort((a, b) => b.amount - a.amount)[0];
  const daily = Array.from({ length: N.D }, (_, i) => sum(N.gastos.filter(t => +t.date.slice(8) === i + 1)));
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
    ], tipLabel: i => monthName(ks[i]) + ' ' + ks[i].slice(0, 4) }; })()
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
    <div class="charts-grid">
    <section class="card wide"><div class="card-h"><span class="t">${ic('trend')} Gasto acumulado x ritmo ideal</span></div>
      <div class="ch-legend"><span><i style="background:var(--green)"></i>Gasto acumulado</span><span><i class="dash"></i>Ritmo ideal</span></div>
      <div class="chart" data-chart="cum"></div></section>
    <section class="card"><div class="card-h"><span class="t">${ic('calendar')} Gastos por dia</span></div>
      <div class="chart" data-chart="daily"></div>
      ${N.gasto ? `<div class="sub" style="margin-top:10px">Dia mais caro: <b class="ink2">${maxDay + 1}/${N.m.slice(5)}</b> (${fmt(daily[maxDay])}) · você gasta mais na <b class="ink2">${WD[wdMax]}</b></div>` : ''}</section>
    <section class="card"><div class="card-h"><span class="t">${ic('pie')} Por categoria</span><button class="link" data-a="go" data-v="plan">Limites</button></div>
      ${catRows.length ? catRows.map(x => { const over = x.c.limit > 0 && x.v > x.c.limit; return `<div class="hbar"><div class="top-l"><span><span class="dot" style="background:${catColor(x.c)}"></span><em>${esc(x.c.icon)} ${esc(x.c.name)}</em></span><b>${fmt(x.v)}</b></div>
        <div class="prog"><i class="${over ? 'over' : ''}" style="width:${x.v / maxCat * 100}%;${over ? '' : `background:${catColor(x.c)}`}"></i>${x.c.limit > 0 ? `<span class="mark" style="left:calc(${x.c.limit / maxCat * 100}% - 1px)"></span>` : ''}</div>
        <div class="sm"><span>${pct(x.v, N.gasto)}% do mês</span><span class="${over ? 'neg' : ''}">${x.c.limit > 0 ? (over ? `estourou ${fmt(x.v - x.c.limit)}` : `limite ${fmt0(x.c.limit)}`) : 'sem limite'}</span></div></div>`; }).join('')
      : '<div class="empty">Sem gastos ainda.</div>'}</section>
    <section class="card"><div class="card-h"><span class="t">${ic('card')} Por conta e cartão</span></div>
      ${accRows.length ? accRows.map(x => `<div class="hbar"><div class="top-l"><span><span class="dot" style="background:${x.a.color}"></span><em>${esc(x.a.name)}</em></span><b>${fmt(x.v)}</b></div><div class="prog"><i style="width:${x.v / maxAcc * 100}%;background:${x.a.color}"></i></div><div class="sm"><span>${pct(x.v, N.gasto)}% do mês</span><span>${isCredit(x.a) ? 'crédito' : 'débito / pix'}</span></div></div>`).join('') : '<div class="empty">Sem gastos ainda.</div>'}</section>
    <section class="card wide"><div class="card-h"><span class="t">${ic('repeat')} Últimos 6 meses</span></div>
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
  const W = el.clientWidth || 320, H = 190, pl = 42, pr = 8, pt = 10, pb = 24;
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
    if (k === 'cum') lineChart(el, o); else if (k === 'daily') barChart(el, o); else groupChart(el, o);
  });
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawCharts, 150); });

/* ---------- Planejar ---------- */
function planView() {
  const N = info();
  const fIn = S.fixed.filter(f => f.kind === 'entra'), fOut = S.fixed.filter(f => f.kind === 'sai');
  const fixRow = f => `<div class="row tap" data-a="editFixed" data-v="${f.id}"><div class="ico">${esc(f.kind === 'entra' ? '💰' : cat(f.catId)?.icon || '📌')}</div><div class="l"><div class="n">${esc(f.name)}</div><div class="d">dia ${pad(f.day || 1)}${acc(f.accId) ? ' · ' + esc(acc(f.accId).name) : ''}${cat(f.catId) && f.kind === 'sai' ? ' · ' + esc(cat(f.catId).name) : ''}</div></div><div class="v ${f.kind === 'entra' ? 'pos' : ''}">${f.kind === 'entra' ? '+' : '-'}${fmt(f.amount)}</div></div>`;
  return topbar() + `<h1>Planejar</h1><div class="plan-grid"><div>
    <section class="card">
      <div class="card-h"><span class="t">${ic('repeat')} Fixos e salário</span><button class="link" data-a="newFixed">Novo ${ic('plus')}</button></div>
      <div class="kpis" style="margin-bottom:6px"><div class="kpi" style="background:var(--card2)"><div class="k">Entra por mês</div><div class="v pos">${fmt(N.fixIn)}</div></div><div class="kpi" style="background:var(--card2)"><div class="k">Sai por mês</div><div class="v">${fmt(N.fixOut)}</div></div></div>
      ${S.fixed.length ? [...fIn, ...fOut].map(fixRow).join('') : `<div class="empty"><b>Nada cadastrado</b>Comece pelo salário e pelo aluguel. Eles aparecem todo mês em Contas a pagar pra você marcar como pago.</div>`}
    </section>
    <section class="card">
      <div class="card-h"><span class="t">${ic('spark')} Valores extras</span><button class="link" data-a="newExtra">Novo ${ic('plus')}</button></div>
      <div class="sub" style="margin:-6px 0 6px">Valores que você controla na mão: reserva, 13º, vale, obra, dinheiro emprestado...</div>
      ${S.extras.length ? S.extras.slice().sort((a, b) => (b.recurring ? 1 : 0) - (a.recurring ? 1 : 0)).map(e => extraRow(e).replace('</div></div><div class="v', `${!e.recurring ? ' · ' + monthName(e.month).toLowerCase() : ''}</div></div><div class="v`)).join('') : `<div class="empty">Nenhum extra ainda.</div>`}
    </section></div><div>
    <section class="card">
      <div class="card-h"><span class="t">${ic('gauge')} Limites do dia a dia</span><button class="link" data-a="newCat">Categoria ${ic('plus')}</button></div>
      <div class="sub" style="margin:-6px 0 8px">Fixos não entram aqui. O limite do mês é a soma dos limites por categoria.</div>
      <div class="row"><div class="ico">🎯</div><div class="l"><div class="n">Limite do mês</div><div class="d">soma dos limites por categoria</div></div><div class="v">${fmt(N.limit)}</div></div>
      ${S.categories.map(c => { const v = N.byCat.find(x => x.c.id === c.id)?.v || 0; const over = c.limit > 0 && v > c.limit; return `<div class="row tap" data-a="editCat" data-v="${c.id}"><div class="ico">${esc(c.icon)}</div><div class="l"><div class="n">${esc(c.name)}</div><div class="d ${over ? 'neg' : ''}">${fmt0(v)} de ${c.limit > 0 ? fmt0(c.limit) : 'sem limite'} este mês</div>${c.limit > 0 ? `<div class="prog" style="height:5px;margin-top:6px"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, v / c.limit * 100)}%;${over ? '' : `background:${catColor(c)}`}"></i></div>` : ''}</div><div class="v">${c.limit > 0 ? fmt0(c.limit) : '-'}</div></div>`; }).join('')}
    </section></div></div>`;
}

/* ---------- Ajustes ---------- */
function settingsView() {
  const sw = (k, n, d) => `<label class="switch"><div><div class="n">${n}</div><div class="d">${d}</div></div><span class="tgl"><input type="checkbox" data-set="${k}" ${S[k] ? 'checked' : ''}><i></i></span></label>`;
  return topbar('Ajustes') + `
    <section class="card" style="display:flex;align-items:center;gap:14px"><div style="width:64px">${byunSVG('happy')}</div><div><div style="font-weight:800;font-size:17px">Oi${S.name ? ', ' + esc(S.name) : ''}!</div><div class="sub">${CLOUD ? 'Seus dados ficam protegidos na sua conta.' : 'O Byun guarda tudo só neste aparelho.'}</div></div></section>
    ${CLOUD && user ? `<div class="section-t">Sua conta</div>
    <section class="card">
      <div class="row" style="padding-top:0"><div class="l"><div class="n">${esc(prof?.display_name || '')} <span class="muted" style="font-weight:500">@${esc(prof?.username || '')}</span></div><div class="d" id="syncState">${syncLabel()}</div></div></div>
      <button class="btn ghost" data-a="syncNow">Sincronizar agora</button>
      <button class="btn ghost" data-a="changePass">Trocar senha</button>
      <button class="btn ghost" data-a="logout">Sair da conta</button>
    </section>
` : ''}
    <div class="section-t">Seu mascote</div>
    <section class="card pet-card" data-a="editPet"><div class="pet-mini">${byunSVG('happy')}</div><div style="flex:1"><div style="font-weight:800;font-size:16px">${esc(curPet().name || 'Byun')}</div><div class="sub">${esc((SPECIES.find(s => s[0] === curPet().species) || ['', 'Gato'])[1])} · toque pra personalizar</div></div>${ic('right')}</section>
    <div class="section-t">Você e o Byun</div>
    <section class="card">
      <label class="fld" style="margin-top:0"><span>Seu nome</span><input class="inp" data-setv="name" value="${esc(S.name)}" placeholder="Como o Byun te chama"></label>
      <div class="flabel">Tema</div>
      <div class="seg"><button class="${S.theme === 'light' ? 'on' : ''}" data-a="setTheme" data-v="light">Claro</button><button class="${S.theme === 'dark' ? 'on' : ''}" data-a="setTheme" data-v="dark">Escuro</button></div>
      <div style="margin-top:8px">${sw('follow', 'Seguir o dedo', 'Os olhos do Byun acompanham o toque e o cursor')}${sw('sass', 'Modo julgador', 'Falas com humor ácido. Desligado, ele só informa.')}</div>
    </section>
    <div class="section-t">Contas e cartões</div>
    <section class="card">${S.accounts.map(a => `<div class="row tap" data-a="editAcc" data-v="${a.id}"><div class="ico" style="background:${a.color};border:0;color:#fff;font-size:15px">${isCredit(a) ? ic('card') : ic('wallet')}</div><div class="l"><div class="n">${esc(a.name)} ${S.defaultAcc === a.id ? '<span class="tag gray" style="font-size:10px;padding:1px 7px">padrão</span>' : ''}</div><div class="d">${isCredit(a) ? `Crédito · fecha dia ${a.closing} · vence dia ${a.due} · limite ${fmt0(a.limit)}` : 'Conta / débito / pix'}</div></div>${ic('right')}</div>`).join('')}
      <button class="btn ghost" data-a="newAcc" data-v="conta">${ic('plus')} Adicionar conta ou cartão</button></section>
    <div class="section-t">Categorias</div>
    <section class="card">${S.categories.map(c => `<div class="row tap" data-a="editCat" data-v="${c.id}"><div class="ico">${esc(c.icon)}</div><div class="l"><div class="n">${esc(c.name)} ${S.housingCat === c.id ? '<span class="tag gray" style="font-size:10px;padding:1px 7px">moradia</span>' : ''}</div><div class="d">${c.limit > 0 ? 'limite ' + fmt0(c.limit) : 'sem limite'}</div></div><span class="dot" style="background:${catColor(c)}"></span></div>`).join('')}
      <button class="btn ghost" data-a="newCat">${ic('plus')} Nova categoria</button>
      <label class="fld"><span>Referência de moradia (% do que entra)</span><input class="inp" data-setv="housingRef" inputmode="numeric" value="${S.housingRef}"></label></section>
    <div class="section-t">Seus dados</div>
    <section class="card">
      <button class="btn ghost" style="margin-top:0" data-a="go" data-v="install">${ic('share')} Instalar no celular</button>
      <button class="btn ghost" data-a="backup">Fazer backup / exportar</button>
      <button class="btn ghost" data-a="restore">Restaurar backup</button>
      <button class="btn ghost danger" data-a="wipe">Apagar todos os lançamentos</button>
      ${CLOUD && user ? '<button class="btn ghost danger" data-a="delAccount">Excluir minha conta</button>' : ''}
    </section>
    <p class="sub" style="text-align:center;margin:18px 0">Byun 1.1 · feito com carinho e um pouco de julgamento</p>`;
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
function onboarding() {
  const dots = `<div class="dots">${[0, 1, 2].map(i => `<i class="${ui.ob === i ? 'on' : ''}"></i>`).join('')}</div>`;
  if (ui.ob === 0) return `<div class="ob"><div class="logo">${byunSVG('happy')}</div><div class="wordmark">byun</div>
    <p class="lead">Seu cofrinho que te julga. Pra você saber quanto ainda pode gastar no mês.</p>
    <div class="feat"><i>${ic('plus')}</i>Anote um gasto em dois toques</div>
    <div class="feat"><i>🎯</i>Defina o teto do mês e veja quanto sobra</div>
    <div class="feat"><i>🐾</i>O ${esc(curPet().name)} avisa antes de você estourar</div>${dots}
    <button class="btn" data-a="ob" data-v="1">Continuar</button></div>`;
  if (ui.ob === 1) return `<div class="ob"><div style="width:90px;margin:0 auto">${byunSVG('normal')}</div><h1 style="text-align:center">Prazer, eu sou o ${esc(curPet().name)}</h1>
    <form id="obForm">
      <label class="fld"><span>Como posso te chamar?</span><input name="name" value="${esc(S.name)}" placeholder="Seu nome" autocomplete="given-name"></label>
      <label class="fld"><span>Quanto quer gastar no dia a dia por mês?</span><input name="limit" inputmode="decimal" placeholder="984,00" value="984,00"><span class="hint">Mercado, delivery, transporte, lazer... Fixos como aluguel ficam de fora. Dá pra ajustar por categoria depois.</span></label>
      <label class="fld"><span>Salário ou renda do mês (opcional)</span><input name="salary" inputmode="decimal" placeholder="0,00"></label>
      <label class="fld"><span>Dia que cai</span><input name="day" inputmode="numeric" placeholder="5" value="5"></label>
      ${dots}<button class="btn" type="submit">Continuar</button></form></div>`;
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
  draft = t ? { type: t.type, cents: Math.round(t.amount * 100), catId: t.catId, accId: t.accId, note: t.note || '', date: t.date, parcelas: 1, more: true, step: 2, editId: t.id }
    : { type, cents: 0, catId: null, accId: def, note: '', date: ui.month === curKey() ? todayISO() : ui.month + '-01', parcelas: 1, more: false, step: 1, editId: null };
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
  const head = sheetHead(d.editId ? 'Editar lançamento' : 'Novo lançamento');
  if (d.step === 1) {
    $('#add').innerHTML = head + tabs + `<div class="amount ${d.cents ? '' : 'zero'}">${amt}<span class="caret"></span></div><div class="amount-sub">${sub}</div>${cats}
      <div class="quick">${[10, 20, 50, 100].map(q => `<button data-a="dQuick" data-v="${q}">+${q}</button>`).join('')}</div>
      <div class="pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map(k => `<button data-a="dKey" data-v="${k}" ${k === '⌫' ? 'aria-label="Apagar"' : ''}>${k}</button>`).join('')}</div>
      <button class="btn" data-a="dNext" ${d.cents ? '' : 'disabled'}>Continuar</button>`;
    return;
  }
  const a = acc(d.accId);
  $('#add').innerHTML = head + tabs + `<div class="amount" data-a="dBack" style="cursor:pointer">${amt}</div><div class="amount-sub">${sub}</div>${cats}
    <div class="flabel">Conta</div><div class="chips">${S.accounts.map(x => `<button class="chip ${d.accId === x.id ? 'on' : ''}" data-a="dAcc" data-v="${x.id}"><span class="dot" style="background:${x.color}"></span>${esc(x.name)}</button>`).join('')}</div>
    <div class="details ${d.more ? 'open' : ''}"><button data-a="dMore">Data, nota e mais ${ic('down')}</button>
      ${d.more ? `<label class="fld"><span>Nota</span><input id="dNote" value="${esc(d.note)}" placeholder="Ex.: Uber pro metrô" maxlength="60"></label>
      <label class="fld"><span>Data</span><input id="dDate" type="date" value="${d.date}"></label>
      ${d.type === 'gasto' && isCredit(a) && !d.editId ? `<label class="fld"><span>Parcelas</span><select id="dParc">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}" ${d.parcelas === i + 1 ? 'selected' : ''}>${i === 0 ? 'À vista' : `${i + 1}x de ${fmt(v / (i + 1))}`}</option>`).join('')}</select></label>` : ''}` : ''}
    </div>
    <button class="btn" data-a="dSave" ${d.cents ? '' : 'disabled'}>${d.editId ? 'Salvar' : d.type === 'gasto' ? 'Lançar gasto' : 'Lançar receita'}</button>
    ${d.editId ? '<button class="btn ghost danger" data-a="dDel">Excluir lançamento</button>' : ''}`;
}
function saveDraft() {
  const d = draft; if (!d || !d.cents) return;
  const amount = d.cents / 100;
  if (d.editId) {
    const t = S.tx.find(x => x.id === d.editId);
    Object.assign(t, { type: d.type, amount, catId: d.type === 'gasto' ? d.catId : null, accId: d.accId, note: d.note.trim(), date: d.date });
    toast('Lançamento atualizado');
  } else if (d.parcelas > 1) {
    const g = uid(), each = Math.round(amount / d.parcelas * 100) / 100;
    for (let i = 0; i < d.parcelas; i++) {
      const [y, m, dd] = d.date.split('-').map(Number); const k = addMonths(`${y}-${pad(m)}`, i);
      const day = Math.min(dd, dim(k));
      S.tx.push({ id: uid(), type: 'gasto', amount: i === d.parcelas - 1 ? Math.round((amount - each * (d.parcelas - 1)) * 100) / 100 : each, catId: d.catId, accId: d.accId, note: d.note.trim(), date: `${k}-${pad(day)}`, group: g, inst: `${i + 1}/${d.parcelas}`, at: Date.now() });
    }
    toast(`${d.parcelas}x lançado`);
  } else {
    S.tx.push({ id: uid(), type: d.type, amount, catId: d.type === 'gasto' ? d.catId : null, accId: d.accId, note: d.note.trim(), date: d.date, at: Date.now() });
    toast(d.type === 'gasto' ? 'Gasto lançado' : 'Receita lançada');
  }
  if (d.type === 'gasto') S.lastAdded = { amount: d.parcelas > 1 ? amount / d.parcelas : amount, at: Date.now() };
  ui.msgI = 0;
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) { }
  save(); closeSheet(); render();
}

/* formulário genérico */
function openForm({ title, fields, values = {}, onSave, onDelete, saveLabel = 'Salvar' }) {
  const fh = f => {
    const v = values[f.key] ?? f.def ?? '';
    const hint = f.hint ? `<span class="hint">${f.hint}</span>` : '';
    if (f.type === 'radios') return `<div class="fld"><span>${f.label}</span><div class="radios">${f.options.map(([ov, ol]) => `<label><input type="radio" name="${f.key}" value="${ov}" ${String(v) === String(ov) ? 'checked' : ''}><span>${ol}</span></label>`).join('')}</div>${hint}</div>`;
    if (f.type === 'colors') return `<div class="fld"><span>${f.label}</span><div class="swatches">${[...new Set([...(f.options), v].filter(Boolean))].map(c => `<label><input type="radio" name="${f.key}" value="${c}" ${v === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}<label title="Outra cor"><input type="color" name="${f.key}_custom" value="${v || '#1f5a3a'}" style="position:static;opacity:1;width:34px;height:34px;border:0;padding:0;background:none"></label></div>${hint}</div>`;
    if (f.type === 'toggle') return `<label class="switch fld"><div><div class="n">${f.label}</div>${f.hint ? `<div class="d">${f.hint}</div>` : ''}</div><span class="tgl"><input type="checkbox" name="${f.key}" ${v ? 'checked' : ''}><i></i></span></label>`;
    if (f.type === 'select') return `<label class="fld"><span>${f.label}</span><select name="${f.key}">${f.options.map(([ov, ol]) => `<option value="${ov}" ${String(v) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>${hint}</label>`;
    if (f.type === 'money') return `<label class="fld"><span>${f.label}</span><input name="${f.key}" inputmode="decimal" placeholder="0,00" value="${moneyInput(v)}">${hint}</label>`;
    if (f.type === 'textarea') return `<label class="fld"><span>${f.label}</span><textarea name="${f.key}">${esc(v)}</textarea>${hint}</label>`;
    return `<label class="fld"><span>${f.label}</span><input name="${f.key}" ${f.type === 'number' ? 'inputmode="numeric"' : ''} ${f.max ? `maxlength="${f.max}"` : ''} placeholder="${esc(f.ph || '')}" value="${esc(v)}">${hint}</label>`;
  };
  openSheet(sheetHead(title) + `<form id="gform" novalidate>${fields.map(fh).join('')}<button class="btn" type="submit">${saveLabel}</button>${onDelete ? '<button type="button" class="btn ghost danger" id="gdel">Excluir</button>' : ''}</form>`);
  const form = $('#gform');
  form.addEventListener('change', e => { if (e.target.type === 'color') { const k = e.target.name.replace('_custom', ''); form.querySelectorAll(`input[name="${k}"]`).forEach(r => r.checked = false); } });
  form.addEventListener('submit', e => {
    e.preventDefault(); const out = {};
    for (const f of fields) {
      if (f.type === 'toggle') out[f.key] = form.querySelector(`[name="${f.key}"]`).checked;
      else if (f.type === 'radios' || f.type === 'colors') { const r = form.querySelector(`[name="${f.key}"]:checked`); out[f.key] = r ? r.value : (f.type === 'colors' ? form.querySelector(`[name="${f.key}_custom"]`).value : f.def); }
      else { const el = form.querySelector(`[name="${f.key}"]`); out[f.key] = f.type === 'money' ? parseMoney(el.value) : f.type === 'number' ? (parseInt(el.value) || 0) : el.value.trim(); }
      if (f.req && !out[f.key]) { toast(`Preencha: ${f.label}`); return; }
    }
    onSave(out); save(); closeSheet(); render();
  });
  if (onDelete) { const b = $('#gdel'); b.addEventListener('click', () => { if (b.dataset.sure) { onDelete(); save(); closeSheet(); render(); } else { b.dataset.sure = 1; b.textContent = 'Toque de novo pra confirmar'; } }); }
}

const catOpts = () => [['', 'Sem categoria'], ...S.categories.map(c => [c.id, `${c.icon} ${c.name}`])];
const accOpts = () => [['', 'Nenhuma'], ...S.accounts.map(a => [a.id, a.name])];
function fixedForm(f) {
  openForm({
    title: f ? 'Editar fixo' : 'Novo fixo', values: f || { kind: 'sai', day: 5 },
    fields: [
      { key: 'kind', label: 'Tipo', type: 'radios', options: [['entra', 'Entra (salário, renda)'], ['sai', 'Sai (aluguel, assinatura)']], def: 'sai' },
      { key: 'name', label: 'Nome', ph: 'Ex.: Aluguel, Salário, Spotify', req: true, max: 40 },
      { key: 'amount', label: 'Valor por mês', type: 'money', req: true },
      { key: 'day', label: 'Dia do vencimento / recebimento', type: 'number', def: 5 },
      { key: 'catId', label: 'Categoria', type: 'select', options: catOpts(), hint: 'Use Moradia pro aluguel, condomínio e luz entrarem no card de moradia.' },
      { key: 'accId', label: 'Conta', type: 'select', options: accOpts() }
    ],
    onSave: v => { v.day = Math.min(31, Math.max(1, v.day || 1)); if (f) Object.assign(f, v); else S.fixed.push({ id: uid(), since: ui.month, ...v }); },
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
function catForm(c) {
  openForm({
    title: c ? 'Editar categoria' : 'Nova categoria', values: c ? { ...c, housing: S.housingCat === c.id } : { icon: '🏷️' },
    fields: [
      { key: 'name', label: 'Nome', req: true, max: 30, ph: 'Ex.: Pet, Academia' },
      { key: 'icon', label: 'Emoji', max: 4, ph: '🏷️' },
      { key: 'limit', label: 'Limite por mês', type: 'money', hint: 'Deixe vazio pra sem limite' },
      { key: 'housing', label: 'É a categoria de moradia', type: 'toggle' }
    ],
    onSave: v => { const h = v.housing; delete v.housing; let t = c; if (c) Object.assign(c, v); else { t = { id: uid(), color: S.categories.length % 8, ...v }; S.categories.push(t); } if (h) S.housingCat = t.id; if (draft) draft.catId = t.id; },
    onDelete: c && S.categories.length > 1 ? () => { S.categories = S.categories.filter(x => x.id !== c.id); } : null
  });
}
function accForm(a, type = 'conta') {
  openForm({
    title: a ? 'Editar conta' : 'Nova conta ou cartão', values: a ? { ...a, isDefault: S.defaultAcc === a.id } : { type, color: '#1f5a3a', closing: 3, due: 10 },
    fields: [
      { key: 'name', label: 'Nome', req: true, max: 30, ph: 'Ex.: Cartão Santander' },
      { key: 'type', label: 'Tipo', type: 'radios', options: [['conta', 'Conta / débito / pix'], ['credito', 'Cartão de crédito']], def: type },
      { key: 'color', label: 'Cor', type: 'colors', options: ACC_COLORS },
      { key: 'limit', label: 'Limite do cartão', type: 'money', hint: 'Só para cartão de crédito' },
      { key: 'closing', label: 'Dia que a fatura fecha', type: 'number', hint: 'Compras depois desse dia vão pra próxima fatura' },
      { key: 'due', label: 'Dia do vencimento', type: 'number' },
      { key: 'isDefault', label: 'Conta padrão nos lançamentos', type: 'toggle' }
    ],
    onSave: v => { const d = v.isDefault; delete v.isDefault; let t = a; if (a) Object.assign(a, v); else { t = { id: uid(), ...v }; S.accounts.push(t); } if (d) S.defaultAcc = t.id; },
    onDelete: a && S.accounts.length > 1 ? () => { S.accounts = S.accounts.filter(x => x.id !== a.id); if (S.defaultAcc === a.id) S.defaultAcc = S.accounts[0].id; } : null
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
        <label class="fld"><span>Nova senha</span><input name="password" type="password" autocomplete="new-password" required placeholder="mínimo 8, com letra e número"></label>
        <label class="fld"><span>Repita a senha</span><input name="password2" type="password" autocomplete="new-password" required></label>
        ${msg}<button class="btn" type="submit">Salvar e entrar</button></form>
      ${forced ? '<button class="btn ghost" data-a="logout">Sair</button>' : '<button class="btn ghost" data-a="authMode" data-v="">Cancelar</button>'}</div>`;
  }
  return `<div class="ob"><div style="width:110px;margin:0 auto">${byunSVG('happy')}</div><div class="wordmark">byun</div>
    <p class="lead" style="margin-bottom:10px">Seu cofrinho que te julga. Pra você saber quanto ainda pode gastar no mês.</p>
    <form id="authForm" data-mode="login" method="post" action="#" novalidate>
      <label class="fld"><span>Usuário</span><input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required placeholder="Ex.: Layla"></label>
      <label class="fld"><span>Senha</span><input name="password" type="password" autocomplete="current-password" required placeholder="sua senha"></label>
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
      <div style="display:flex;align-items:center;gap:14px"><div class="pet-mini">${byunSVG('happy', x.pet)}</div>
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
    case 'theme': S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); render(); break;
    case 'setTheme': S.theme = v; save(); render(); break;
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
    case 'dBack': if (!draft.editId) { draft.step = 1; renderAdd(); } break;
    case 'dMore': draft.more = !draft.more; renderAdd(); break;
    case 'dSave': saveDraft(); break;
    case 'dDel': if (el.dataset.sure) { const t = S.tx.find(x => x.id === draft.editId); S.tx = S.tx.filter(x => x.id !== draft.editId); save(); closeSheet(); render(); toast('Lançamento excluído'); } else { el.dataset.sure = 1; el.textContent = 'Toque de novo pra confirmar'; } break;
    case 'editTx': { const t = S.tx.find(x => x.id === v); if (t) openAdd(t.type, t); break; }
    case 'txType': ui.txType = v; render(); break;
    case 'accF': ui.accF = ui.accF === v ? null : v; render(); break;
    case 'catF': ui.catF = ui.catF === v ? null : v; render(); break;
    case 'payDay': ui.payDay = ui.payDay === +v ? null : +v; render(); break;
    case 'pay': { const m = ui.month; const p = S.fixedPaid[m] = S.fixedPaid[m] || []; const i = p.indexOf(v); if (i >= 0) p.splice(i, 1); else { p.push(v); toast('Marcado como pago'); } save(); render(); break; }
    case 'newFixed': fixedForm(); break;
    case 'editFixed': fixedForm(S.fixed.find(x => x.id === v)); break;
    case 'newExtra': extraForm(); break;
    case 'editExtra': extraForm(S.extras.find(x => x.id === v)); break;
    case 'newCat': catForm(); break;
    case 'editCat': catForm(cat(v)); break;
    case 'newAcc': accForm(null, v || 'conta'); break;
    case 'editAcc': accForm(acc(v)); break;
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
  e.preventDefault(); const f = new FormData(e.target);
  S.name = String(f.get('name') || '').trim();
  const L = parseMoney(f.get('limit')) || 984;
  const base = S.categories.filter(c => c.limit > 0), tot = sum(base, c => c.limit) || 1;
  let acc_ = 0; base.forEach((c, i) => { c.limit = i === base.length - 1 ? Math.round((L - acc_) * 100) / 100 : Math.round(c.limit / tot * L); acc_ += c.limit; });
  const sal = parseMoney(f.get('salary'));
  if (sal > 0 && !S.fixed.some(x => x.kind === 'entra')) S.fixed.push({ id: uid(), kind: 'entra', name: 'Salário', amount: sal, day: Math.min(31, Math.max(1, parseInt(f.get('day')) || 5)), catId: '', accId: S.defaultAcc, since: curKey() });
  save(); ui.ob = 2; render();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { ui.q = t.value; const pos = t.selectionStart; render(); const n = $('#q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } return; }
  if (draft && t.id === 'dNote') draft.note = t.value;
  if (draft && t.id === 'dDate' && t.value) draft.date = t.value;
  if (petEdit && t.dataset.pk) { petEdit.p[t.dataset.pk] = t.value; const pv = $('.pet-prev'); if (pv) pv.firstElementChild.outerHTML = byunSVG('normal', petEdit.p); }
  if (t.dataset.setv) { S[t.dataset.setv] = t.dataset.setv === 'housingRef' ? (parseInt(t.value) || 30) : t.value; save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (draft && t.id === 'dParc') { draft.parcelas = +t.value; renderAdd(); }
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
  clearTimeout(sc._t); sc._t = setTimeout(() => { const i = Math.round(sc.scrollLeft / 282); const n = S.accounts.filter(isCredit).length; if (i !== ui.card && i < n) { ui.card = i; const left = sc.scrollLeft; render(); const ns = $('#cardScroll'); if (ns) ns.scrollLeft = left; } }, 140);
}, true);

/* ---------- olhos que seguem o dedo/cursor ---------- */
function look(x, y) {
  if (!S.follow) return;
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

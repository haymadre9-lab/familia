/* familia · app.js
   Datos en Supabase (proyecto UsoEmbsa), tablas fam_items / fam_miembros / fam_ajustes.
   La anon key es pública por diseño: quien manda es el RLS. */

const SB_URL = 'https://ewacvknaabxwhrsbbjer.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3YWN2a25hYWJ4d2hyc2JiamVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTg4NjgsImV4cCI6MjA5NTA3NDg2OH0.39QS7tReESKGcSBOTOp847Sa2fV_1K9QDiK04K3_AJA';

const SB = window.supabase.createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'fam:sesion' }
});

/* ---------- estado ---------- */
let items = [], familia = null, yo = null, tab = 'hoy', offset = 0;
let panelMode = null, panelDay = null, contextDate = null;
let query = '', filtros = [], draft = {}, orden = 'usuario';
let cola = [], avisados = {}, permiso = 'default';
let tema = 'oscuro';

/* aclara u oscurece un color para que se lea sobre el fondo actual */
function tint(hex) {
  if (tema !== 'claro' || !hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * .62), g = Math.round(((n >> 8) & 255) * .62), b = Math.round((n & 255) * .62);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function aplicaTema() {
  document.body.classList.toggle('claro', tema === 'claro');
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', tema === 'claro' ? '#F2F4FB' : '#0E1226');
  const b = document.querySelector('#btnTema');
  if (b) b.textContent = 'Aspecto: ' + tema;
}
/* de qué color va cada chip cuando está elegido */
function chipColor(seg, v) {
  if (seg === 'persona' || (seg === 'filtro' && PERSONA[v])) return PERSONA[v];
  if (SUBC[v]) return SUBC[v];
  if (seg === 'tipo' && TIPO[v]) return TIPO[v].c;
  if (seg === 'filtro') {
    if (v === 'Salud') return TIPO.salud.c;
    if (v === 'Casa') return TIPO.casa.c;
    if (v === 'Compra') return TIPO.compra.c;
  }
  return null;
}
function pintaChip(btn, seg, on) {
  const c = on ? chipColor(seg, btn.dataset.v || btn.dataset.filtro) : null;
  if (c) { btn.style.background = c + '26'; btn.style.color = tint(c); btn.style.borderColor = c; }
  else { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
}
function pintaSegs(root) {
  root.querySelectorAll('.seg').forEach(seg => {
    const s = seg.dataset.seg || 'filtro';
    seg.querySelectorAll('button').forEach(b => pintaChip(b, s, b.classList.contains('on')));
  });
}

const DEF_COLORES = { Ian: '#45D6E8', Unax: '#FFB03B', Carlos: '#FF3D71', Miren: '#C86BFF' };
let PERSONA = Object.assign({}, DEF_COLORES);

const TIPO = {
  compra: { n: 'Compra', c: '#6EE7A0' }, casa: { n: 'Casa', c: '#8FA8FF' },
  cole: { n: 'Cole', c: '#45D6E8' }, salud: { n: 'Salud', c: '#FF8A5C' }
};
const SUBC = { 'Deberes': '#8FA8FF', 'Examen': '#FF6B8B', 'Tutoría': '#C08CF0', 'Excursión': '#6EE7A0' };
const COLE = ['Deberes', 'Examen', 'Tutoría', 'Excursión'];
const GENTE = ['Ian', 'Unax', 'Carlos', 'Miren'];
const F_TIPO = ['Deberes', 'Examen', 'Tutoría', 'Excursión', 'Salud', 'Casa', 'Compra'];
const AVISOS = [['no', 'Sin aviso'], ['1d', '1 día antes'], ['2d', '2 días antes'], ['2h', '2 h antes'], ['30m', '30 min antes']];

const SEC = {
  cosmetica: { n: 'Cosmética', i: '🧴' }, congelados: { n: 'Congelados', i: '🧊' },
  fruta: { n: 'Fruta y verdura', i: '🍎' }, envasados: { n: 'Envasados', i: '🥫' },
  carne: { n: 'Carne y embutidos', i: '🥩' }, pescado: { n: 'Pescado', i: '🐟' },
  pan: { n: 'Pan', i: '🥖' }, lacteos: { n: 'Lácteos', i: '🥛' },
  precocinados: { n: 'Precocinados', i: '🍕' }, otros: { n: 'Otros', i: '🛒' }
};
const ORDEN_USUARIO = ['cosmetica', 'congelados', 'fruta', 'envasados', 'carne', 'pescado', 'pan', 'lacteos', 'precocinados', 'otros'];
const ORDEN_TIENDA = ['fruta', 'pan', 'lacteos', 'carne', 'pescado', 'envasados', 'precocinados', 'congelados', 'cosmetica', 'otros'];

const DICT = {
  lacteos: ['leche', 'yogur', 'queso', 'mantequilla', 'nata', 'cuajada', 'kefir', 'natillas', 'flan', 'batido', 'petit', 'requeson', 'margarina'],
  carne: ['pollo', 'ternera', 'cerdo', 'chuleta', 'filete', 'jamon', 'jamón', 'chorizo', 'salchich', 'bacon', 'panceta', 'lomo', 'pavo', 'hamburgues', 'albondig', 'morcilla', 'salami', 'mortadela', 'cordero', 'costilla', 'fuet', 'longaniza', 'carne', 'solomillo'],
  pescado: ['pescado', 'merluza', 'salmon', 'salmón', 'bacalao', 'gamba', 'marisco', 'sardina', 'lubina', 'dorada', 'calamar', 'mejillon', 'langostino', 'anchoa', 'boqueron'],
  fruta: ['manzana', 'platano', 'plátano', 'naranja', 'pera', 'uva', 'fresa', 'sandia', 'melon', 'limon', 'limón', 'tomate', 'lechuga', 'cebolla', 'patata', 'zanahoria', 'pimiento', 'ajo', 'pepino', 'calabacin', 'brocoli', 'espinaca', 'aguacate', 'kiwi', 'mandarina', 'champiñon', 'puerro', 'judia', 'judía', 'fruta', 'verdura', 'ensalada', 'setas', 'piña', 'melocoton', 'ciruela', 'cereza'],
  congelados: ['congelad', 'helado', 'hielo', 'guisante'],
  precocinados: ['pizza', 'croqueta', 'empanadilla', 'lasaña', 'lasagna', 'nugget', 'precocinad', 'tortilla', 'ensaladilla', 'san jacobo', 'rebozad'],
  pan: ['pan', 'barra', 'bollo', 'magdalena', 'croissant', 'tostada', 'molde', 'chapata', 'bolleria', 'donut'],
  cosmetica: ['champu', 'champú', 'gel de baño', 'jabon', 'jabón', 'pasta de dientes', 'dentifric', 'desodorante', 'colonia', 'crema', 'cuchilla', 'maquinilla', 'compresa', 'tampon', 'higienico', 'higiénico', 'servilleta', 'detergente', 'suavizante', 'lejia', 'lejía', 'bayeta', 'fregasuelos', 'esponja', 'pañal', 'toallita', 'cepillo', 'papel de cocina', 'basura'],
  envasados: ['arroz', 'pasta', 'macarron', 'espagueti', 'harina', 'azucar', 'azúcar', 'sal', 'aceite', 'vinagre', 'conserva', 'atun', 'atún', 'tomate frito', 'legumbre', 'garbanzo', 'lenteja', 'alubia', 'galleta', 'cereal', 'cafe', 'café', 'chocolate', 'mermelada', 'miel', 'caldo', 'salsa', 'ketchup', 'mayonesa', 'agua', 'refresco', 'cerveza', 'vino', 'zumo', 'frutos secos', 'especias', 'huevo', 'levadura', 'cacao']
};

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => iso(new Date());
const parse = s => new Date(s + 'T00:00:00');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function shift(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
function monday(off) { const d = new Date(), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd + off * 7); d.setHours(0, 0, 0, 0); return d; }
function color(it) { return (it.persona && PERSONA[it.persona]) ? PERSONA[it.persona] : TIPO[it.tipo].c; }
function orderList() { return orden === 'tienda' ? ORDEN_TIENDA : ORDEN_USUARIO; }
function guess(txt) {
  const t = txt.toLowerCase();
  for (const s in DICT) for (const w of DICT[s]) if (t.includes(w)) return s;
  return 'otros';
}
function status(s) { $('#dot').className = 'dot' + (s === 'wait' ? ' wait' : s === 'bad' ? ' bad' : ''); }
const live = f => items.filter(it => !it.borrado && f(it));
const byDate = (a, b) => ((a.fecha || '9999') + (a.hora || '99:99')) < ((b.fecha || '9999') + (b.hora || '99:99')) ? -1 : 1;
const get = id => items.find(x => x.id === id);

/* ---------- datos ---------- */
function limpiaFila(r) {
  return {
    id: r.id, tipo: r.tipo, texto: r.texto, cant: r.cant || '', sec: r.sec || 'otros',
    persona: r.persona || '', sub: r.sub || '', fecha: r.fecha || '',
    hora: r.hora ? String(r.hora).slice(0, 5) : '', lugar: r.lugar || '', notas: r.notas || '',
    aviso: r.aviso || 'no', voz: !!r.voz, hecho: !!r.hecho, borrado: !!r.borrado,
    actualizado: r.actualizado || new Date().toISOString()
  };
}
function aFila(it) {
  return {
    id: it.id, familia, tipo: it.tipo, texto: it.texto, cant: it.cant || null, sec: it.sec || null,
    persona: it.persona || null, sub: it.sub || null, fecha: it.fecha || null, hora: it.hora || null,
    lugar: it.lugar || null, notas: it.notas || null, aviso: it.aviso || 'no',
    voz: !!it.voz, hecho: !!it.hecho, borrado: !!it.borrado
  };
}
function cache() { try { localStorage.setItem('fam:items', JSON.stringify(items)); } catch (e) {} }
function leerCache() { try { items = JSON.parse(localStorage.getItem('fam:items')) || []; } catch (e) { items = []; } }

async function cargar() {
  status('wait');
  const { data, error } = await SB.from('fam_items').select('*');
  if (error) { status('bad'); return; }
  items = data.map(limpiaFila);
  cache(); status('ok'); draw();
}

async function subir(it) {
  const { error } = await SB.from('fam_items').upsert(aFila(it));
  if (error) { encolar(it); status('bad'); return false; }
  status('ok'); return true;
}
function encolar(it) {
  cola = cola.filter(x => x.id !== it.id); cola.push(it);
  try { localStorage.setItem('fam:cola', JSON.stringify(cola)); } catch (e) {}
  pintaOffline();
}
async function vaciarCola() {
  if (!cola.length || !navigator.onLine) return;
  const copia = cola.slice(); cola = [];
  for (const it of copia) { if (!(await subir(it))) return; }
  try { localStorage.setItem('fam:cola', '[]'); } catch (e) {}
  pintaOffline();
}
function pintaOffline() {
  let el = $('#offline');
  if (!cola.length) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'offline'; el.className = 'offline'; document.body.appendChild(el); }
  el.textContent = cola.length + (cola.length === 1 ? ' cambio sin enviar' : ' cambios sin enviar') + ' · se subirán solos';
}

function upsert(o) {
  o.actualizado = new Date().toISOString();
  const i = items.findIndex(x => x.id === o.id);
  if (i >= 0) items[i] = o; else items.push(o);
  cache(); draw(); subir(o);
}

function escuchar() {
  SB.channel('fam-' + familia)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fam_items' }, p => {
      if (!p.new || !p.new.id) return;
      const it = limpiaFila(p.new);
      const i = items.findIndex(x => x.id === it.id);
      if (i >= 0) { if (items[i].actualizado > it.actualizado) return; items[i] = it; }
      else items.push(it);
      cache(); draw();
    })
    .subscribe();
}

/* ---------- avisos ---------- */
function triggerTime(it) {
  if (!it.fecha || !it.aviso || it.aviso === 'no' || it.hecho) return null;
  const base = new Date(it.fecha + 'T' + (it.hora || '08:00') + ':00');
  const off = { '1d': 1440, '2d': 2880, '2h': 120, '30m': 30 }[it.aviso] || 0;
  return base.getTime() - off * 60000;
}
function checkAvisos() {
  const now = Date.now();
  const due = live(it => {
    const t = triggerTime(it);
    return t !== null && t <= now && now - t < 36 * 36e5 && !avisados[it.id];
  });
  if (!due.length) return;
  due.forEach(it => {
    avisados[it.id] = 1;
    if (permiso === 'granted') {
      try {
        new Notification((it.persona ? it.persona + ' · ' : '') + it.texto, {
          body: (it.hora ? it.hora + ' · ' : '') + cap(parse(it.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })),
          icon: 'icono-192.png', tag: it.id
        });
      } catch (e) {}
    }
  });
  try { localStorage.setItem('fam:avisados', JSON.stringify(avisados)); } catch (e) {}
  render();
}
function avisoBanner() {
  if (permiso === 'granted') return '';
  const prox = live(it => { const t = triggerTime(it); return t !== null && t > Date.now(); }).length;
  return '<div class="warn"><div>Avisos apagados en este móvil' + (prox ? ' y tienes ' + prox + ' programados.' : '.') +
    ' <button id="askPerm">Activar</button></div></div>';
}
async function pedirPermiso() {
  try {
    const p = await Notification.requestPermission();
    permiso = p; render();
    if (p === 'granted') new Notification('Avisos activados', { body: 'Te avisaré con la app abierta.', icon: 'icono-192.png' });
  } catch (e) { permiso = 'nope'; render(); }
}

/* ---------- tarjetas ---------- */
function cardHTML(it, o) {
  o = o || {};
  const tags = [];
  if (it.persona) { const pc = PERSONA[it.persona] || '#8A94C4'; tags.push(`<span class="tag" style="background:${pc}22;color:${tint(pc)}">${it.persona}</span>`); }
  if (it.sub) tags.push(`<span class="tag" style="background:${SUBC[it.sub]}1f;color:${tint(SUBC[it.sub])}">${it.sub}</span>`);
  else if (it.tipo !== 'compra' && o.showTipo !== false) tags.push(`<span class="tag" style="background:${TIPO[it.tipo].c}1f;color:${tint(TIPO[it.tipo].c)}">${TIPO[it.tipo].n}</span>`);
  if (it.hora) tags.push(esc(it.hora));
  if (o.showFecha && it.fecha) tags.push(cap(parse(it.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })));
  if (it.lugar) tags.push(esc(it.lugar));
  if (it.aviso && it.aviso !== 'no' && !it.hecho) tags.push('🔔 ' + (AVISOS.find(a => a[0] === it.aviso) || ['', ''])[1].toLowerCase());
  if (it.notas) tags.push(esc(it.notas));
  if (o.showSec && it.tipo === 'compra') tags.push(SEC[it.sec || 'otros'].i + ' ' + SEC[it.sec || 'otros'].n);
  const q = (it.voz ? '<span class="qty">🎤</span>' : '') + (it.cant ? `<span class="qty">${esc(it.cant)}</span>` : '');
  return `<div class="card ${it.hecho && o.strike !== false ? 'done' : ''}" style="border-left-color:${color(it)}">
    <button class="check ${it.hecho ? 'on' : ''}" data-check="${it.id}">${it.hecho ? '✓' : ''}</button>
    <button class="c-body" data-edit="${it.id}"><div class="c-text">${q}${esc(it.texto)}</div>
    ${tags.length ? '<div class="c-meta">' + tags.join('') + '</div>' : ''}</button>
    <button class="del" data-del="${it.id}">×</button></div>`;
}
function section(t, list, o) {
  if (!list.length) return '';
  return `<section class="sec"><h3>${esc(t)}</h3>${list.map(i => cardHTML(i, o)).join('')}</section>`;
}

/* ---------- vistas ---------- */
function renderHoy() {
  const t = today();
  const hoy = live(i => i.fecha === t).sort(byDate);
  const atras = live(i => !i.hecho && i.fecha && i.fecha < t).sort(byDate);
  const man = live(i => !i.hecho && i.fecha === shift(t, 1)).sort(byDate);
  const d = new Date();
  const pend = hoy.filter(i => !i.hecho).length;
  let h = `<div class="big-date" style="font-size:52px">${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</div>
    <p class="big-sub">${cap(d.toLocaleDateString('es-ES', { weekday: 'long' }))} · ${pend ? pend + (pend === 1 ? ' cosa por hacer' : ' cosas por hacer') : 'nada pendiente hoy'}</p>` + avisoBanner();
  if (atras.length) h += section('Se te pasó', atras, { showFecha: true });
  h += hoy.filter(i => !i.hecho).map(i => cardHTML(i)).join('');
  if (!pend) h += '<p class="empty">Hoy no hay nada apuntado. Mira la semana o el mes para lo que viene.</p>';
  h += section('Hecho hoy', hoy.filter(i => i.hecho));
  h += `<div class="ahead"><h3>Mañana</h3><p>${man.length ? man.length + (man.length === 1 ? ' cosa apuntada' : ' cosas apuntadas') : 'Nada apuntado.'}</p>${man.map(i => cardHTML(i)).join('')}</div>`;
  return h;
}

function renderSemana() {
  const start = monday(offset), days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(iso(d)); }
  const wEnd = days[6], t = today();
  const week = live(it => it.fecha >= days[0] && it.fecha <= wEnd).sort(byDate);
  const titulo = offset === 0 ? 'Esta semana' : offset === 1 ? 'La semana que viene' : offset === -1 ? 'La semana pasada'
    : 'Semana del ' + parse(days[0]).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  let h = `<div class="weeknav"><div><h2>${titulo}</h2><p>${parse(days[0]).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} – ${parse(wEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} · ${week.filter(i => !i.hecho).length} pendientes</p></div>
    <div class="navbtns"><button data-nav="-1">‹</button>${offset !== 0 ? '<button class="today" data-nav="0">Hoy</button>' : ''}<button data-nav="1">›</button></div></div>`;
  h += '<div class="strip">' + days.map(dia => {
    const list = week.filter(x => x.fecha === dia && !x.hecho);
    const pips = list.slice(0, 4).map(x => `<span class="pip" style="background:${color(x)}"></span>`).join('');
    return `<button class="sday ${dia === t ? 'now' : dia < t ? 'past' : ''}${list.length ? ' has' : ''}" data-open="${dia}">
      <b>${parse(dia).getDate()}</b><span>${parse(dia).toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2)}</span><div class="pips">${pips}</div></button>`;
  }).join('') + '</div>';
  days.forEach(dia => {
    const list = week.filter(x => x.fecha === dia);
    const nom = cap(parse(dia).toLocaleDateString('es-ES', { weekday: 'long' }));
    if (!list.length) { h += `<div class="empty-day"><b>${nom} ${parse(dia).getDate()}</b><hr></div>`; return; }
    h += `<button class="dayrow" data-open="${dia}"><div class="day ${dia === t ? 'now' : ''}">
      <div class="day-head"><b>${nom} ${parse(dia).getDate()}</b><span class="count">${list.length}</span><span class="chev">›</span></div>
      ${list.map(i => cardHTML(i)).join('')}</div></button>`;
  });
  const futuro = live(it => !it.hecho && it.fecha > wEnd).sort(byDate);
  h += `<div class="ahead"><h3>Más adelante</h3><p>${futuro.length ? futuro.length + ' cosas apuntadas después del ' + parse(wEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Nada apuntado después de esta semana.'}</p>`;
  let mes = null;
  futuro.forEach(it => {
    const m = cap(parse(it.fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
    if (m !== mes) { if (mes) h += '</div>'; h += `<div class="mgroup"><h4>${m}</h4>`; mes = m; }
    h += cardHTML(it, { showFecha: true });
  });
  if (mes) h += '</div>';
  h += '</div>';
  const atras = live(it => !it.hecho && it.fecha && it.fecha < days[0]).sort(byDate);
  if (offset === 0 && atras.length) h = section('Atrasado', atras, { showFecha: true }) + h;
  return h;
}

function renderMes() {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset);
  const y = base.getFullYear(), m = base.getMonth(), t = today();
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const mes = live(i => i.fecha >= iso(first) && i.fecha <= iso(last)).sort(byDate);
  let h = `<div class="weeknav"><div><h2>${cap(first.toLocaleDateString('es-ES', { month: 'long' }))} ${y}</h2>
    <p>${mes.filter(i => !i.hecho).length} pendientes este mes</p></div>
    <div class="navbtns"><button data-nav="-1">‹</button>${offset !== 0 ? '<button class="today" data-nav="0">Hoy</button>' : ''}<button data-nav="1">›</button></div></div>`;
  h += '<div class="mgrid">' + ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<span class="wd">${x}</span>`).join('');
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) h += '<span></span>';
  for (let dnum = 1; dnum <= last.getDate(); dnum++) {
    const dia = iso(new Date(y, m, dnum));
    const list = mes.filter(x => x.fecha === dia && !x.hecho);
    const pips = list.slice(0, 3).map(x => `<span class="pip" style="background:${color(x)}"></span>`).join('');
    h += `<button class="mday ${dia === t ? 'now' : dia < t ? 'past' : ''}${list.length ? ' has' : ''}" data-open="${dia}">${dnum}<div class="pips">${pips}</div></button>`;
  }
  h += '</div>';
  const pendientes = mes.filter(i => !i.hecho);
  h += `<div class="ahead"><h3>Todo el mes, por orden</h3><p>${pendientes.length ? 'De la primera a la última.' : 'Nada apuntado este mes.'}</p>`;
  let dia2 = null;
  pendientes.forEach(it => {
    if (it.fecha !== dia2) { dia2 = it.fecha; h += `<div class="day-head" style="padding-top:14px"><b>${cap(parse(it.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }))}</b></div>`; }
    h += cardHTML(it);
  });
  return h + '</div>';
}

function renderCompra() {
  const pend = live(i => i.tipo === 'compra' && !i.hecho);
  const carro = live(i => i.tipo === 'compra' && i.hecho);
  let h = `<div class="qadd"><input class="field n" id="q_texto" placeholder="Añadir producto">
    <input class="field q" id="q_cant" placeholder="1"><button class="mic" id="q_mic" style="margin:0;width:46px">🎤</button><button id="q_add">+</button></div>`;
  h += `<button class="review" data-cart="1"><b>Revisar el carro</b><span>${carro.length} cogidos ›</span></button>`;
  let total = 0;
  orderList().forEach(s => {
    const list = pend.filter(i => (i.sec || 'otros') === s);
    if (!list.length) return;
    total += list.length;
    h += `<div class="shead"><span class="ico">${SEC[s].i}</span><h3>${SEC[s].n}</h3><em>${list.length}</em><hr class="srule"></div>` + list.map(i => cardHTML(i)).join('');
  });
  if (!total) h += '<p class="empty">La lista está vacía. Escribe arriba y se coloca sola en su sección: leche va a lácteos, merluza a pescado.</p>';
  return h;
}

function render() {
  let h = '';
  if (tab === 'hoy') h = renderHoy();
  if (tab === 'semana') h = renderSemana();
  if (tab === 'mes') h = renderMes();
  if (tab === 'compra') h = renderCompra();
  if (tab === 'casa') {
    const t2 = live(i => i.tipo === 'casa').sort(byDate);
    h += section('Pendiente', t2.filter(i => !i.hecho), { showFecha: true }) + section('Hecho', t2.filter(i => i.hecho), { showFecha: true });
    if (!t2.length) h += '<p class="empty">Recados, papeleo y cosas del piso.</p>';
  }
  if (tab === 'cole') {
    const co = live(i => i.tipo === 'cole').sort(byDate);
    ['Ian', 'Unax'].forEach(n => { h += section(n, co.filter(i => i.persona === n && !i.hecho), { showFecha: true }); });
    h += section('Hecho', co.filter(i => i.hecho), { showFecha: true });
    if (!co.length) h += '<p class="empty">Deberes, exámenes, tutorías y excursiones de Ian y Unax.</p>';
  }
  if (tab === 'salud') {
    const s = live(i => i.tipo === 'salud').sort(byDate);
    h += section('Próximas citas', s.filter(i => !i.hecho), { showFecha: true }) + section('Pasadas', s.filter(i => i.hecho), { showFecha: true });
    if (!s.length) h += '<p class="empty">Pediatra, dentista, revisiones. Con hora y sitio.</p>';
  }
  $('#view').innerHTML = h;
}
function draw() { render(); if (panelMode === 'find') findResults(); else if (panelMode) renderPanel(); }

/* ---------- paneles ---------- */
function openDay(dia) { panelMode = 'day'; panelDay = dia; contextDate = dia; $('#panel').classList.remove('hidden'); $('#panelFab').classList.remove('hidden'); renderPanel(); }
function openCart() { panelMode = 'cart'; $('#panel').classList.remove('hidden'); $('#panelFab').classList.add('hidden'); renderPanel(); }
function closePanel() { panelMode = null; contextDate = null; $('#panel').classList.add('hidden'); }

function renderPanel() {
  if (panelMode === 'day') {
    const list = live(x => x.fecha === panelDay).sort(byDate);
    $('#panelNav').innerHTML = '<button data-day="-1">‹</button><button data-day="1">›</button>';
    const d = parse(panelDay);
    let h = `<div class="big-date">${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</div>
      <p class="big-sub">${cap(d.toLocaleDateString('es-ES', { weekday: 'long' }))}${panelDay === today() ? ' · hoy' : ''} · ${list.length}${list.length === 1 ? ' cosa' : ' cosas'}</p>`;
    if (!list.length) h += '<p class="empty">Día libre. Con el + añades algo directamente a este día.</p>';
    h += list.filter(i => !i.hecho).map(i => cardHTML(i)).join('');
    h += section('Hecho', list.filter(i => i.hecho));
    $('#panelBody').innerHTML = h;
  }
  if (panelMode === 'cart') {
    const carro = live(i => i.tipo === 'compra' && i.hecho);
    $('#panelNav').innerHTML = carro.length ? '<button class="bar-btn" id="emptyCart" style="width:auto;padding:0 12px;color:var(--hoy)">Vaciar</button>' : '';
    let h = `<div class="big-date">${carro.length}</div><p class="big-sub">en el carro · repasa antes de pasar por caja</p>`;
    if (!carro.length) h += '<p class="empty">Nada cogido todavía. Según marques productos salen de la lista y entran aquí.</p>';
    orderList().forEach(s => {
      const l = carro.filter(i => (i.sec || 'otros') === s);
      if (!l.length) return;
      h += `<div class="shead"><span class="ico">${SEC[s].i}</span><h3>${SEC[s].n}</h3><em>${l.length}</em><hr class="srule"></div>` + l.map(i => cardHTML(i, { strike: false })).join('');
    });
    $('#panelBody').innerHTML = h;
  }
}

/* ---------- buscador ---------- */
function openFind() {
  panelMode = 'find'; query = ''; filtros = [];
  $('#panel').classList.remove('hidden'); $('#panelFab').classList.add('hidden'); $('#panelNav').innerHTML = '';
  const chips = GENTE.concat(F_TIPO).map(f => `<button data-filtro="${f}">${f}</button>`).join('');
  $('#panelBody').innerHTML = `<div class="big-date" style="font-size:34px">Buscar</div>
    <p class="big-sub">Un nombre, un tipo, o lo que escribas. Busca también en lo ya pasado.</p>
    <input class="field" id="findInput" placeholder="dentista, mates, excursión…">
    <div class="seg" id="findChips">${chips}</div><div id="findResults"></div>`;
  findResults();
  pintaSegs($('#panelBody'));
  setTimeout(() => { const e = $('#findInput'); if (e) e.focus(); }, 60);
}
function matchFiltro(it) {
  const per = filtros.filter(f => GENTE.includes(f));
  const tip = filtros.filter(f => F_TIPO.includes(f));
  if (per.length && !per.includes(it.persona)) return false;
  if (tip.length) {
    const ok = tip.some(f => it.sub === f || (f === 'Salud' && it.tipo === 'salud') || (f === 'Casa' && it.tipo === 'casa') || (f === 'Compra' && it.tipo === 'compra'));
    if (!ok) return false;
  }
  return true;
}
function findResults() {
  const box = $('#findResults'); if (!box) return;
  const q = query.trim().toLowerCase();
  let res = live(it => {
    if (!matchFiltro(it)) return false;
    if (!q) return true;
    const bag = [it.texto, it.notas, it.lugar, it.persona, it.sub, it.cant, it.sec ? SEC[it.sec].n : '', TIPO[it.tipo].n].join(' ').toLowerCase();
    return q.split(/\s+/).every(w => bag.includes(w));
  });
  const t = today();
  res.sort((a, b) => {
    const fa = a.fecha || '', fb = b.fecha || '', pa = fa >= t ? 0 : 1, pb = fb >= t ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return pa === 0 ? (fa < fb ? -1 : 1) : (fa > fb ? -1 : 1);
  });
  if (!q && !filtros.length) { box.innerHTML = '<p class="empty">Escribe algo o toca un filtro. Ejemplo: Unax + Examen para ver todos sus exámenes, pasados y futuros.</p>'; return; }
  if (!res.length) { box.innerHTML = '<p class="empty">Sin resultados. Prueba con menos filtros o media palabra.</p>'; return; }
  const prox = res.filter(i => (i.fecha || '') >= t);
  box.innerHTML = `<p class="find-count">${res.length}${res.length === 1 ? ' resultado' : ' resultados'} · ${prox.length} por venir</p>`
    + section('Por venir', prox, { showFecha: true })
    + section('Ya pasado', res.filter(i => (i.fecha || '') < t), { showFecha: true });
}

/* ---------- dictado ---------- */
function dictar(inputId, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const inp = $('#' + inputId);
  if (!SR) { inp.placeholder = 'Este navegador no deja dictar'; return; }
  try {
    const r = new SR();
    r.lang = 'es-ES'; r.interimResults = true; r.continuous = false;
    btn.textContent = '●'; btn.style.color = '#FF3D71';
    r.onresult = e => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      inp.value = txt.trim();
      if (e.results[e.results.length - 1].isFinal) draft.voz = true;
    };
    r.onerror = () => { inp.placeholder = 'No se pudo usar el micrófono'; };
    r.onend = () => { btn.textContent = '🎤'; btn.style.color = ''; };
    r.start();
  } catch (e) { inp.placeholder = 'No se pudo usar el micrófono'; btn.textContent = '🎤'; }
}

/* ---------- formulario ---------- */
function openSheet(it, presetFecha) {
  const isEdit = !!it;
  let tipo = it ? it.tipo : (tab === 'compra' ? 'compra' : ['casa', 'cole', 'salud'].includes(tab) ? tab : 'cole');
  if (panelMode === 'day' && !it) tipo = 'cole';
  draft = { id: it ? it.id : uid(), tipo, persona: (it && it.persona) || 'Ian', sub: (it && it.sub) || 'Deberes', sec: (it && it.sec) || 'otros', voz: (it && it.voz) || false, aviso: it ? (it.aviso || 'no') : '1d' };
  let h = '';
  $('#sheetTitle').textContent = isEdit ? 'Editar' : (tipo === 'compra' ? 'Añadir a la compra' : 'Añadir');
  $('#delBtn').classList.toggle('hidden', !isEdit);
  if (!isEdit && tipo !== 'compra') {
    h += '<div class="seg" data-seg="tipo">' + [['cole', 'Cole'], ['salud', 'Salud'], ['casa', 'Casa'], ['compra', 'Compra']]
      .map(p => `<button data-v="${p[0]}"${p[0] === tipo ? ' class="on"' : ''}>${p[1]}</button>`).join('') + '</div>';
  }
  h += `<div class="rowmic"><input class="field" id="f_texto" value="${esc(it && it.texto || '')}" placeholder="${tipo === 'compra' ? 'Producto' : '¿Qué es?'}">
    <button class="mic" id="f_mic">🎤</button></div>`;
  h += `<div id="blkCompra" class="${tipo === 'compra' ? '' : 'hidden'}">
    <input class="field" id="f_cant" value="${esc(it && it.cant || '')}" placeholder="Cantidad (2, 1 kg, 500 g…)">
    <div class="seg" data-seg="sec">${orderList().map(s => `<button data-v="${s}"${s === draft.sec ? ' class="on"' : ''}>${SEC[s].i} ${SEC[s].n}</button>`).join('')}</div></div>`;
  h += `<div id="blkOtro" class="${tipo === 'compra' ? 'hidden' : ''}">
    <div class="seg" data-seg="persona">${GENTE.map(n => `<button data-v="${n}"${n === draft.persona ? ' class="on"' : ''}>${n}</button>`).join('')}</div>
    <div class="seg" data-seg="sub" id="segSub">${COLE.map(n => `<button data-v="${n}"${n === draft.sub ? ' class="on"' : ''}>${n}</button>`).join('')}</div>
    <div class="two"><input class="field" id="f_fecha" type="date" value="${it ? (it.fecha || '') : (presetFecha || contextDate || today())}">
    <input class="field" id="f_hora" type="time" value="${it && it.hora || ''}"></div>
    <div class="seg" data-seg="aviso">${AVISOS.map(a => `<button data-v="${a[0]}"${a[0] === draft.aviso ? ' class="on"' : ''}>${a[1]}</button>`).join('')}</div>
    <input class="field" id="f_lugar" value="${esc(it && it.lugar || '')}" placeholder="Sitio (opcional)">
    <input class="field" id="f_notas" value="${esc(it && it.notas || '')}" placeholder="Nota (opcional)"></div>`;
  $('#sheetBody').innerHTML = h;
  if (tipo !== 'cole') $('#segSub').classList.add('hidden');
  pintaSegs($('#sheetBody'));
  $('#sheet').classList.remove('hidden');
  setTimeout(() => $('#f_texto').focus(), 60);
  $('#f_mic').addEventListener('click', function () { dictar('f_texto', this); });
  $('#sheetBody').querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(x => { x.classList.remove('on'); pintaChip(x, seg.dataset.seg, false); });
      b.classList.add('on'); pintaChip(b, seg.dataset.seg, true); draft[seg.dataset.seg] = b.dataset.v;
      if (seg.dataset.seg === 'tipo') {
        $('#blkCompra').classList.toggle('hidden', b.dataset.v !== 'compra');
        $('#blkOtro').classList.toggle('hidden', b.dataset.v === 'compra');
        $('#segSub').classList.toggle('hidden', b.dataset.v !== 'cole');
      }
    });
  });
}

function save() {
  const tx = $('#f_texto').value;
  if (!tx.trim()) { $('#f_texto').focus(); return; }
  const prev = get(draft.id) || {};
  const it = { id: draft.id, tipo: draft.tipo, texto: tx.trim(), voz: draft.voz || prev.voz || false, hecho: !!prev.hecho, borrado: false };
  if (draft.tipo === 'compra') { it.cant = $('#f_cant').value.trim(); it.sec = draft.sec; }
  else {
    it.persona = draft.persona;
    if (draft.tipo === 'cole') it.sub = draft.sub;
    it.fecha = $('#f_fecha').value || ''; it.hora = $('#f_hora').value || '';
    it.aviso = draft.aviso; it.lugar = $('#f_lugar').value.trim(); it.notas = $('#f_notas').value.trim();
  }
  $('#sheet').classList.add('hidden'); upsert(it);
}
function quickAdd() {
  const t = $('#q_texto').value.trim(); if (!t) return;
  upsert({ id: uid(), tipo: 'compra', texto: t, cant: $('#q_cant').value.trim(), sec: guess(t), hecho: false, borrado: false });
  $('#q_texto').value = ''; $('#q_cant').value = '';
  setTimeout(() => { const e = $('#q_texto'); if (e) e.focus(); }, 30);
}

/* ---------- ajustes ---------- */
function pintaColores() {
  $('#colorRows').innerHTML = GENTE.map(n =>
    `<div class="crow"><b>${n}</b>${n === 'Carlos' || n === 'Miren' ? '<em>adulto</em>' : ''}<input type="color" data-color="${n}" value="${PERSONA[n]}"></div>`).join('');
}
async function guardaAjustes() {
  await SB.from('fam_ajustes').upsert({ familia, colores: PERSONA, orden, actualizado: new Date().toISOString() });
}
async function cargarAjustes() {
  const { data } = await SB.from('fam_ajustes').select('*').eq('familia', familia).maybeSingle();
  if (data) {
    if (data.colores) for (const k in DEF_COLORES) if (data.colores[k]) PERSONA[k] = data.colores[k];
    if (data.orden) orden = data.orden;
  }
  $('#btnOrden').textContent = 'Orden de la compra: ' + (orden === 'tienda' ? 'recorrido de tienda' : 'mi lista');
}

/* ---------- eventos ---------- */
function wire(root) {
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-check]'), d = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]'),
      n = e.target.closest('[data-nav]'), op = e.target.closest('[data-open]'), ca = e.target.closest('[data-cart]'),
      dn = e.target.closest('[data-day]'), fi = e.target.closest('[data-filtro]');
    if (fi) {
      const f = fi.dataset.filtro, k = filtros.indexOf(f);
      if (k >= 0) filtros.splice(k, 1); else filtros.push(f);
      fi.classList.toggle('on', k < 0); pintaChip(fi, 'filtro', k < 0); findResults(); return;
    }
    if (c) { const a = get(c.dataset.check); a.hecho = !a.hecho; upsert(a); return; }
    if (d) { const b = get(d.dataset.del); b.borrado = true; upsert(b); return; }
    if (ed) { openSheet(get(ed.dataset.edit)); return; }
    if (n) { const v = +n.dataset.nav; offset = v === 0 ? 0 : offset + v; render(); return; }
    if (op) { openDay(op.dataset.open); return; }
    if (ca) { openCart(); return; }
    if (dn) { panelDay = shift(panelDay, +dn.dataset.day); contextDate = panelDay; renderPanel(); return; }
    if (e.target.id === 'askPerm') { pedirPermiso(); return; }
    if (e.target.id === 'q_mic') { dictar('q_texto', e.target); return; }
    if (e.target.id === 'q_add') { quickAdd(); return; }
    if (e.target.id === 'emptyCart') {
      live(i => i.tipo === 'compra' && i.hecho).forEach(i => { i.borrado = true; upsert(i); });
      closePanel(); return;
    }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && ['q_texto', 'q_cant'].includes(e.target.id)) quickAdd(); });
  root.addEventListener('input', e => { if (e.target.id === 'findInput') { query = e.target.value; findResults(); } });
}

$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('is-on'));
  b.classList.add('is-on'); tab = b.dataset.tab; offset = 0; render();
});
$('#findBtn').addEventListener('click', openFind);
$('#panelBack').addEventListener('click', closePanel);
$('#panelFab').addEventListener('click', () => openSheet(null, panelDay));
$('#fab').addEventListener('click', () => openSheet(null));
$('#sheetClose').addEventListener('click', () => $('#sheet').classList.add('hidden'));
$('#saveBtn').addEventListener('click', save);
$('#delBtn').addEventListener('click', () => {
  const it = get(draft.id); $('#sheet').classList.add('hidden');
  if (it) { it.borrado = true; upsert(it); }
});
$('#menuBtn').addEventListener('click', () => { pintaColores(); $('#menu').classList.remove('hidden'); });
$('#menuClose').addEventListener('click', () => { $('#menu').classList.add('hidden'); $('#ioBox').classList.add('hidden'); $('#menuHint').textContent = ''; });
$('#menu').addEventListener('input', e => {
  const c = e.target.closest('[data-color]'); if (!c) return;
  PERSONA[c.dataset.color] = c.value; draw(); guardaAjustes();
});
$('#btnPerm').addEventListener('click', pedirPermiso);
$('#btnTema').addEventListener('click', () => {
  tema = tema === 'claro' ? 'oscuro' : 'claro';
  try { localStorage.setItem('fam:tema', tema); } catch (e) {}
  aplicaTema(); draw();
});
$('#btnOrden').addEventListener('click', function () {
  orden = orden === 'tienda' ? 'usuario' : 'tienda';
  this.textContent = 'Orden de la compra: ' + (orden === 'tienda' ? 'recorrido de tienda' : 'mi lista');
  $('#menuHint').textContent = orden === 'tienda' ? 'Fruta primero, congelados y cosmética al final.' : 'Tu orden: cosmética, congelados, fruta…';
  guardaAjustes(); draw();
});
$('#btnExport').addEventListener('click', () => {
  const b = $('#ioBox'); b.classList.remove('hidden'); b.value = JSON.stringify({ items }); b.select();
  $('#menuHint').textContent = 'Copia este texto y guárdalo donde quieras.';
});
$('#btnImport').addEventListener('click', async () => {
  const b = $('#ioBox');
  if (b.classList.contains('hidden') || !b.value.trim()) {
    b.classList.remove('hidden'); b.value = ''; b.focus();
    $('#menuHint').textContent = 'Pega la copia (vale la del prototipo) y vuelve a pulsar.'; return;
  }
  try {
    const inc = (JSON.parse(b.value).items || []).map(o => ({
      id: o.id || uid(), tipo: o.tipo, texto: o.texto, cant: o.cant || '', sec: o.sec || 'otros',
      persona: o.persona || o.nino || '', sub: o.sub || '', fecha: o.fecha || '', hora: o.hora || '',
      lugar: o.lugar || '', notas: o.notas || '', aviso: o.aviso || 'no', voz: !!o.voz,
      hecho: !!o.hecho, borrado: !!(o.borrado || o.deleted)
    })).filter(o => o.texto && o.tipo);
    const { error } = await SB.from('fam_items').upsert(inc.map(aFila));
    if (error) throw error;
    await cargar();
    $('#menuHint').textContent = inc.length + ' elementos importados.';
  } catch (e) { $('#menuHint').textContent = 'No se pudo importar: ' + (e.message || 'texto no válido'); }
});
$('#btnSalir').addEventListener('click', async () => {
  await SB.auth.signOut(); localStorage.removeItem('fam:items'); location.reload();
});
$('#entrar').addEventListener('click', entrar);
$('#pass').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
$('#mail').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#pass').focus(); } });

wire($('#view')); wire($('#panel'));
window.addEventListener('online', vaciarCola);

/* ---------- arranque ---------- */
async function entrar() {
  const email = $('#mail').value.trim().toLowerCase(), password = $('#pass').value;
  if (!email || !password) { $('#gateMsg').textContent = 'Faltan el correo o la contraseña.'; return; }
  const btn = $('#entrar');
  btn.disabled = true; btn.textContent = 'Entrando…'; $('#gateMsg').textContent = '';
  try {
    const { error } = await SB.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await arrancar();
  } catch (err) {
    $('#gateMsg').textContent = 'No entra: ' + (err.message || 'error desconocido');
  }
  btn.disabled = false; btn.textContent = 'Entrar';
}

async function arrancar() {
  const { data: { session } } = await SB.auth.getSession();
  const user = session && session.user;
  if (!user) { $('#gate').classList.remove('hidden'); $('#main').classList.add('hidden'); return; }
  $('#gateMsg').textContent = '';
  const { data: mi } = await SB.from('fam_miembros').select('familia,nombre').eq('user_id', user.id).maybeSingle();
  if (!mi) { $('#gateMsg').textContent = 'Tu usuario no está en ninguna familia. Falta la fila en fam_miembros.'; return; }
  familia = mi.familia; yo = mi.nombre;
  $('#gate').classList.add('hidden'); $('#main').classList.remove('hidden');
  try { avisados = JSON.parse(localStorage.getItem('fam:avisados')) || {}; } catch (e) {}
  try { cola = JSON.parse(localStorage.getItem('fam:cola')) || []; } catch (e) {}
  try { permiso = typeof Notification !== 'undefined' ? Notification.permission : 'nope'; } catch (e) { permiso = 'nope'; }
  leerCache(); render();
  await cargarAjustes();
  await cargar();
  escuchar(); vaciarCola(); checkAvisos(); pintaOffline();
  setInterval(checkAvisos, 60000);
  setInterval(vaciarCola, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { cargar(); checkAvisos(); } });
}

try { tema = localStorage.getItem('fam:tema') || 'oscuro'; } catch (e) {}
aplicaTema();
var _v = document.querySelector('#ver'); if (_v) _v.textContent = 'v4 · listo';

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
arrancar();

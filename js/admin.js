// ============================================================
// js/admin.js â€“ LÃ³gica Completa del Panel de AdministraciÃ³n
// Firebase Auth + Firestore + Chart.js + QRCode.js
// ============================================================

import { db, auth } from './config.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDoc, setDoc, query, orderBy, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONSTANTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Correos autorizados para acceder al panel (vacÃ­o = todos los autenticados) */
const ALLOWED_EMAILS = new Set([
  'constanza.garrido.i@usach.cl',
  'anais.flores@usach.cl'
]);

const FERIAS = {
  Recoleta: [
    'Zapadores 393 â€“ Martes','Zapadores 392 â€“ Martes','Chacabuco Grande â€“ MiÃ©rcoles',
    'Einstein â€“ Jueves','El Guanaco â€“ Jueves','San JosÃ© â€“ Jueves',
    'Raquel â€“ Viernes','Valdivieso â€“ Viernes','Einstein Poniente â€“ SÃ¡bado',
    'N.Âº 9 HÃ©roes de la ConcepciÃ³n â€“ SÃ¡bado','El Guanaco â€“ Domingo','La Serena â€“ Domingo'
  ],
  Huechuraba: [
    'Aguirre Luco (Feria Libre N.Âº 1) â€“ Martes',
    'Pablo Neruda (Feria Libre N.Âº 3) â€“ MiÃ©rcoles',
    'Pablo Neruda (Feria Libre N.Âº 3) â€“ SÃ¡bado',
    'Salvador Allende (Feria Libre N.Âº 2) â€“ Domingo'
  ]
};

/** Paleta de colores para grÃ¡ficos */
const PALETTE = [
  '#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444',
  '#06b6d4','#f97316','#ec4899','#84cc16','#6366f1'
];

/** DefiniciÃ³n de todas las preguntas fijas editables (vaciadas segÃºn solicitud) */
const FIXED_QUESTIONS = {
  general: [],
  secA: [],
  secB: [],
  secC: [],
  secD: []
};

let currentFixedTab = 'flujo';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ESTADO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const state = {
  allResponses:            [],
  filteredResponses:       [],
  dynamicQuestions:        [],
  masterOrder:             [],
  activeQuestionId:        '',
  activeQuestionChartType: 'horizontalBar',
  questionChartInstance:   null,
  chartInstance:           null,
  distChartInstance:       null,
  currentPanel:            'dashboard'
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AUTENTICACIÃ“N
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Escucha cambios de sesiÃ³n de Firebase Auth */
onAuthStateChanged(auth, (user) => {
  if (user) {
    const email = (user.email || '').toLowerCase();
    // Si ALLOWED_EMAILS tiene correos, validar; si estÃ¡ vacÃ­o, permitir todos
    if (ALLOWED_EMAILS.size > 0 && !ALLOWED_EMAILS.has(email)) {
      signOut(auth);
      showLoginError('Acceso denegado. Este correo no estÃ¡ autorizado.');
      return;
    }
    onAuthenticated(user);
  } else {
    showScreen('login');
  }
});

/** Maneja el submit del formulario de login */
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearLoginError();

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  // ValidaciÃ³n previa sin tocar Firebase
  if (ALLOWED_EMAILS.size > 0 && !ALLOWED_EMAILS.has(email)) {
    showLoginError('Acceso denegado. Este correo no estÃ¡ autorizado para acceder al panel.');
    return;
  }

  setLoginLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged manejarÃ¡ el Ã©xito
  } catch (err) {
    const msgs = {
      'auth/wrong-password':        'ContraseÃ±a incorrecta.',
      'auth/invalid-credential':    'Credenciales invÃ¡lidas. Verifique los datos.',
      'auth/user-not-found':        'Usuario no encontrado.',
      'auth/too-many-requests':     'Demasiados intentos. Intente mÃ¡s tarde.',
      'auth/network-request-failed':'Error de red. Verifique su conexiÃ³n.'
    };
    showLoginError(msgs[err.code] || `Error al iniciar sesiÃ³n: ${err.message}`);
  } finally {
    setLoginLoading(false);
  }
});

/** Toggle de visibilidad de contraseÃ±a */
document.getElementById('toggle-pwd').addEventListener('click', () => {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
});

async function logout() {
  try {
    await signOut(auth);
    toast('SesiÃ³n cerrada correctamente.', 'success');
  } catch {
    toast('Error al cerrar sesiÃ³n.', 'error');
  }
}

// â”€â”€ Helpers de UI del login â”€â”€
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.classList.remove('hidden');
  el.classList.add('flex');
  document.getElementById('login-error-text').textContent = msg;
}
function clearLoginError() {
  const el = document.getElementById('login-error');
  el.classList.add('hidden');
  el.classList.remove('flex');
}
function setLoginLoading(loading) {
  const btn  = document.getElementById('login-btn');
  const text = document.getElementById('login-btn-text');
  btn.disabled = loading;
  text.textContent = loading ? 'Verificandoâ€¦' : 'Iniciar sesiÃ³n';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INICIALIZACIÃ“N DEL PANEL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function onAuthenticated(user) {
  // Mostrar email del usuario en sidebar
  const emailEl = document.getElementById('sidebar-user-email');
  if (emailEl) emailEl.textContent = user.email;

  // Mostrar panel admin
  showScreen('admin');

  // Inicializar URL del QR con la ruta actual a index.html
  const qrUrlInput = document.getElementById('qr-url');
  if (qrUrlInput) {
    qrUrlInput.value = window.location.origin
      + window.location.pathname.replace('admin.html', 'index.html');
  }

  // Arrancar listeners en tiempo real
  startRealtimeListeners();
}

function showScreen(which) {
  const login = document.getElementById('login-screen');
  const panel = document.getElementById('admin-panel');
  if (which === 'login') {
    login.style.display = 'flex';
    panel.style.display  = 'none';
  } else {
    login.style.display = 'none';
    panel.style.display  = 'flex';
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LISTENERS EN TIEMPO REAL (Firestore)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function syncMasterOrderWithDynamicQuestions() {
  if (!Array.isArray(state.masterOrder) || !state.masterOrder.length) {
    state.masterOrder = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
  }

  // Quitar IDs de preguntas dinÃ¡micas que ya no existen
  const validDqKeys = new Set(state.dynamicQuestions.map(d => `dq_${d.id}`));
  state.masterOrder = state.masterOrder.filter(id => {
    if (id.startsWith('dq_')) return validDqKeys.has(id);
    return true;
  });

  // Agregar preguntas dinÃ¡micas que falten
  const currentSet = new Set(state.masterOrder);
  const sortedDQs = [...state.dynamicQuestions].sort((a, b) => (Number(a.orden) || 999) - (Number(b.orden) || 999));
  sortedDQs.forEach(dq => {
    const dqKey = `dq_${dq.id}`;
    if (!currentSet.has(dqKey)) {
      const targetPos = Math.max(1, parseInt(dq.orden, 10) || 1);
      const insertIdx = Math.min(targetPos - 1, state.masterOrder.length - 1);
      state.masterOrder.splice(insertIdx, 0, dqKey);
      currentSet.add(dqKey);
    }
  });
}

function applyAdminQuestionOverrides(data) {
  if (!data || typeof data !== 'object') return;
  ['general', 'secA', 'secB', 'secC', 'secD'].forEach(sec => {
    if (data[sec] && typeof data[sec] === 'object') {
      (FIXED_QUESTIONS[sec] || []).forEach(q => {
        if (data[sec][q.id]) {
          if (data[sec][q.id].text) q.text = data[sec][q.id].text;
          if (Array.isArray(data[sec][q.id].options)) q.options = data[sec][q.id].options;
        }
      });
    }
  });
}

function startRealtimeListeners() {
  // Respuestas
  const respQuery = query(collection(db, 'respuestas'), orderBy('timestamp', 'desc'));
  onSnapshot(respQuery, (snap) => {
    state.allResponses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    applyFilters();
  }, (err) => console.error('Listener respuestas:', err));

  // Preguntas dinÃ¡micas
  const dqQuery = query(collection(db, 'preguntas_dinamicas'), orderBy('orden', 'asc'));
  onSnapshot(dqQuery, async (snap) => {
    // Si la pregunta duplicada '4bewFS5wfu0aWyABtuUX' existe, eliminarla de Firestore
    const targetDoc = snap.docs.find(d => d.id === '4bewFS5wfu0aWyABtuUX' || String(d.data()?.titulo || '').toLowerCase().includes('permiso o patente'));
    if (targetDoc) {
      try {
        await deleteDoc(doc(db, 'preguntas_dinamicas', targetDoc.id));
        console.log('Pregunta eliminada de Firestore:', targetDoc.id);
      } catch (e) {
        console.warn('EliminaciÃ³n Firestore:', e);
      }
    }

    state.dynamicQuestions = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.id !== '4bewFS5wfu0aWyABtuUX' && !String(d.titulo || '').toLowerCase().includes('permiso o patente'));

    syncMasterOrderWithDynamicQuestions();
    renderDQList();
    refreshChartQuestionSelect();
    if (state.currentPanel === 'preguntas-fijas') {
      renderFixedQuestions(currentFixedTab);
    }
  }, (err) => console.error('Listener preguntas_dinamicas:', err));

  // ConfiguraciÃ³n de preguntas fijas y orden maestro
  onSnapshot(doc(db, 'config', 'preguntas_fijas'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.masterOrder) && data.masterOrder.length > 0) {
        state.masterOrder = data.masterOrder;
      }
      applyAdminQuestionOverrides(data);
    }
    syncMasterOrderWithDynamicQuestions();
    if (state.currentPanel === 'preguntas-fijas') {
      renderFixedQuestions(currentFixedTab);
    }
  }, (err) => console.error('Listener preguntas_fijas:', err));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ESTADÃSTICAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function updateStats() {
  const all   = state.allResponses;
  const total = all.length;

  // P1 â€“ DistribuciÃ³n comunal
  const recoleta   = all.filter(r => r.q1 === 'Recoleta').length;
  const huechuraba = all.filter(r => r.q1 === 'Huechuraba').length;

  // P16 â€“ FormalizaciÃ³n (campo nuevo)
  const inscritosP16 = all.filter(r => {
    const v = (r.q16 || '').toLowerCase();
    return v.includes('estoy inscrito') || v === 'a' || (r.seccion || '').toUpperCase() === 'A';
  }).length;

  // P14 â€“ PenetraciÃ³n de POS / Tarjeta
  const conPOS = all.filter(r => {
    const v = (r.q14 || '').trim().toLowerCase();
    return v === 'sÃ­.' || v === 'sÃ­' || v === 'si' || v === 'si.';
  }).length;

  // P17 â€“ Brecha Informativa (no tienen suficiente info)
  const brechaInfo = all.filter(r => {
    const v = (r.q17 || '').toLowerCase();
    return v.includes('me falta') || v.includes('algo de') || v.includes('no podria');
  }).length;

  const recPct  = total > 0 ? ((recoleta   / total) * 100).toFixed(1) : 0;
  const huePct  = total > 0 ? ((huechuraba / total) * 100).toFixed(1) : 0;
  const inscPct = total > 0 ? ((inscritosP16 / total) * 100).toFixed(1) : 0;
  const posPct  = total > 0 ? ((conPOS / total) * 100).toFixed(1) : 0;
  const gapPct  = total > 0 ? ((brechaInfo / total) * 100).toFixed(1) : 0;

  setText('stat-total',          total);
  setText('stat-recoleta',       recoleta);
  setText('stat-recoleta-pct',   `${recPct}%`);
  setText('stat-huechuraba',     huechuraba);
  setText('stat-huechuraba-pct', `${huePct}%`);
  setText('stat-inscritos',      inscritosP16);
  setText('stat-inscritos-pct',  `${inscPct}%`);
  setText('stat-pos',            conPOS);
  setText('stat-pos-pct',        `${posPct}%`);
  setText('stat-gap',            brechaInfo);
  setText('stat-gap-pct',        `${gapPct}%`);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FILTROS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function applyFilters() {
  const comuna  = val('filter-comuna');
  const feria   = val('filter-feria');
  const q16val  = val('filter-q7');   // El select en HTML sigue siendo filter-q7 por compatibilidad
  const diaVal  = val('filter-dia');  // Nuevo filtro: dÃ­a de la feria

  const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let filtered = [...state.allResponses];

  // Filtro por Comuna (P1)
  if (comuna) {
    const cN = norm(comuna);
    filtered = filtered.filter(r => { const v = norm(r.q1); return v === cN || v.includes(cN); });
  }

  // Filtro por Feria (P2)
  if (feria) {
    const fN = norm(feria);
    filtered = filtered.filter(r => { const v = norm(r.q2); return v === fN || v.includes(fN); });
  }

  // Filtro por DÃ­a de la Feria (P2 â€“ el campo q2 contiene feria + dÃ­a)
  if (diaVal) {
    const dN = norm(diaVal);
    filtered = filtered.filter(r => {
      // Intentar en campo dedicado q2_dia si existe, sino buscar en q2 (texto libre)
      const vDia  = norm(r.q2_dia  || '');
      const vFull = norm(r.q2      || '');   // ej. "Feria Los Dominicos Â· SÃ¡bado"
      return vDia === dN || vDia.includes(dN) || vFull.includes(dN);
    });
  }

  // Filtro por SituaciÃ³n Ley 21.745 (P16 / filter-q7)
  if (q16val) {
    const qN = norm(q16val);
    filtered = filtered.filter(r => {
      // Primero intentar coincidencia directa con r.q16 (nueva estructura)
      const v16 = norm(r.q16 || '');
      if (v16 && (v16 === qN || v16.includes(qN.replace(/\.$/, '')))) return true;
      // Fallback: coincidir por secciÃ³n asignada
      const sec = (r.seccion || '').toUpperCase();
      if (qN.includes('inscrito/a') && !qN.includes('no estoy')) return sec === 'A';
      if (qN.includes('no estoy'))                               return sec === 'B';
      if (qN.includes('tramite') || qN.includes('trÃ¡mite'))     return sec === 'C';
      if (qN.includes('no se') || qN.includes('no sÃ©'))         return sec === 'D';
      // Fallback legacy (r.q7)
      const v7 = norm(r.q7 || '');
      return v7 === qN || v7.includes(qN);
    });
  }

  state.filteredResponses = filtered;

  // Actualizar dropdowns de feria y dÃ­a segÃºn la comuna seleccionada (datos reales)
  updateFeriaSelect(comuna);
  updateDiaSelect(comuna);

  // Re-renderizar todos los componentes del dashboard
  renderTable();
  renderQ8Chart();
  renderP17Chart();
  renderFeriaDirectiveChart();
  renderSummaryBreakdownTable();

  const countEl = document.getElementById('table-count');
  if (countEl) countEl.textContent = `${filtered.length} de ${state.allResponses.length} respuestas`;
}

function updateFeriaSelect(selectedComuna) {
  const select = document.getElementById('filter-feria');
  if (!select) return;

  const current = select.value;
  const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extraer ferias Ãºnicas desde las respuestas reales
  let source = state.allResponses;
  if (selectedComuna) {
    const cN = norm(selectedComuna);
    source = source.filter(r => norm(r.q1) === cN || norm(r.q1).includes(cN));
  }

  // Preferir q2_feria (campo dedicado), fallback a extraer de q2 ("Feria X - DÃ­a")
  const feriaSet = new Set();
  source.forEach(r => {
    const f = (r.q2_feria || '').trim();
    if (f) {
      feriaSet.add(f);
    } else if (r.q2) {
      // q2 puede ser "Nombre Feria - DÃ­a" â€” tomar la parte antes del guion
      const parts = String(r.q2).split(/[-Â·]/)[0].trim();
      if (parts) feriaSet.add(parts);
    }
  });

  const ferias = [...feriaSet].sort((a, b) => a.localeCompare(b, 'es'));

  select.innerHTML = '<option value="">Todas las ferias</option>';
  ferias.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    if (f === current) opt.selected = true;
    select.appendChild(opt);
  });
}

function updateDiaSelect(selectedComuna) {
  const select = document.getElementById('filter-dia');
  if (!select) return;

  const current = select.value;
  const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let source = state.allResponses;
  if (selectedComuna) {
    const cN = norm(selectedComuna);
    source = source.filter(r => norm(r.q1) === cN || norm(r.q1).includes(cN));
  }

  // Extraer dÃ­as Ãºnicos desde las respuestas reales
  const ORDER = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const diaSet = new Set();
  source.forEach(r => {
    const d = (r.q2_dia || '').trim();
    if (d) {
      diaSet.add(d);
    } else if (r.q2) {
      // q2 puede ser "Feria X - SÃ¡bado"
      const parts = String(r.q2).split(/[-Â·]/);
      if (parts.length > 1) {
        const dia = parts[parts.length - 1].trim();
        if (dia) diaSet.add(dia);
      }
    }
  });

  // Ordenar segÃºn dÃ­a de la semana
  const dias = [...diaSet].sort((a, b) => {
    const ai = ORDER.indexOf(norm(a));
    const bi = ORDER.indexOf(norm(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  select.innerHTML = '<option value="">Todos los dÃ­as</option>';
  dias.forEach(d => {
    const opt = document.createElement('option');
    opt.value = norm(d);   // valor normalizado para comparar en filtro
    opt.textContent = d;   // texto original con tilde (ej: "SÃ¡bado")
    if (norm(d) === norm(current)) opt.selected = true;
    select.appendChild(opt);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TABLA DE RESPUESTAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderTable() {
  const tbody = document.getElementById('responses-tbody');
  if (!tbody) return;

  if (!state.filteredResponses.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-14 text-slate-300 text-sm">
      Sin respuestas que mostrar. Ajusta los filtros.
    </td></tr>`;
    return;
  }

  // Badges P16 (SituaciÃ³n Ley 21.745)
  const q16Badges = {
    'Estoy inscrito/a.':           'bg-emerald-100 text-emerald-700',
    'No estoy inscrito/a.':        'bg-rose-100 text-rose-700',
    'Estoy realizando el trÃ¡mite.':'bg-amber-100 text-amber-700',
    'No sÃ© si estoy inscrito/a.':  'bg-slate-100 text-slate-600'
  };
  const posBadge = { 'SÃ­.': 'bg-indigo-100 text-indigo-700', 'No.': 'bg-gray-100 text-gray-600' };
  const q17Short = v => {
    if (!v) return 'â€“';
    if (v.toLowerCase().includes('suficiente')) return 'âœ… Suficiente';
    if (v.toLowerCase().includes('algo de'))    return 'ðŸŸ¡ Algo';
    if (v.toLowerCase().includes('me falta'))   return 'ðŸ”´ Falta info';
    return 'â” No sabe';
  };

  tbody.innerHTML = state.filteredResponses.map(r => {
    // Usar q16 (nuevo) con fallback a q7 (legado)
    const q16val = r.q16 || r.q7 || 'â€“';
    const badge16Cls = q16Badges[q16val] || q16Badges[r.q7] || 'bg-gray-100 text-gray-600';
    const posVal = r.q14 || 'â€“';
    const badgePOS = posBadge[posVal] || 'bg-gray-100 text-gray-500';
    const q16Short = q16val.length > 20 ? q16val.slice(0, 18) + 'â€¦' : q16val;
    const feriaShort = r.q2 ? (r.q2.length > 22 ? r.q2.slice(0, 20) + 'â€¦' : r.q2) : 'â€“';
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">${r.fechaRespuesta || 'â€“'}</td>
        <td class="px-4 py-3 text-slate-700 font-semibold text-xs">${escHtml(r.q1 || 'â€“')}</td>
        <td class="px-4 py-3 text-slate-600 text-xs" title="${escHtml(r.q2 || '')}">${escHtml(feriaShort)}</td>
        <td class="px-4 py-3">
          <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badge16Cls}" title="${escHtml(q16val)}">
            ${escHtml(q16Short)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgePOS}">
            ${escHtml(posVal)}
          </span>
        </td>
        <td class="px-4 py-3 text-slate-600 text-xs font-medium">${q17Short(r.q17)}</td>
      </tr>`;
  }).join('');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GRÃFICOS Y ANALÃTICA (Chart.js con etiquetas visibles sin hover)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Plugin de Chart.js para imprimir porcentajes fijos directamente sin mostrar cantidad altiro */
const alwaysShowDataLabelsPlugin = {
  id: 'alwaysShowDataLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const isHorizontal = chart.config.options?.indexAxis === 'y';
    const isRound = ['pie', 'doughnut'].includes(chart.config.type);

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta || !meta.visible) return;

      const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);

      meta.data.forEach((element, index) => {
        const val = dataset.data[index];
        if (val == null || val === 0) return;
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
        // Dejar solo el porcentaje fijo en el grÃ¡fico
        const text = `${pct}%`;

        ctx.save();
        ctx.font = 'bold 12px Inter, sans-serif';

        if (isHorizontal) {
          // Barra horizontal: colocar solo el porcentaje al final de la barra
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const x = element.x + 8;
          ctx.fillText(text, x, element.y);
        } else if (isRound) {
          // GrÃ¡fico de pastel: colocar solo el porcentaje con drop-shadow
          const pos = element.tooltipPosition();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 4;
          ctx.fillText(text, pos.x, pos.y);
        } else {
          // Barra vertical: colocar porcentaje arriba
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(text, element.x, Math.max(element.y - 4, 15));
        }
        ctx.restore();
      });
    });
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ANALÃTICA PREGUNTA GLOBAL 8 (Filtrada por Comuna, Feria y Estado de InscripciÃ³n)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let q8ChartInstance = null;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GRÃFICO 1: P16 â€“ SITUACIÃ“N FRENTE A LA LEY N.Âº 21.745
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderQ8Chart() {
  const canvas       = document.getElementById('q8-chart');
  const emptyEl      = document.getElementById('q8-chart-empty');
  const badgeEl      = document.getElementById('q8-active-filter-badge');
  const totalEvalEl  = document.getElementById('q8-total-eval');
  const cardsEl      = document.getElementById('q8-breakdown-cards');
  const insightEl    = document.getElementById('q8-insight-text');

  if (!canvas) return;

  // Reflejar filtros activos en el badge
  const comuna = val('filter-comuna');
  const feria  = val('filter-feria');
  const q16f   = val('filter-q7');
  const filterLabel = [comuna || 'Todas las comunas', feria || 'Todas las ferias', q16f ? `Filtro: ${q16f.replace(/\.$/, '')}` : 'Todos los estados'].join(' Â· ');
  if (badgeEl) {
    badgeEl.textContent  = filterLabel;
    badgeEl.className    = q16f
      ? 'text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300'
      : 'text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200';
  }

  const responses = state.filteredResponses || [];

  // Opciones de P16 con colores funcionales (verde=inscrito, rojo=no, Ã¡mbar=trÃ¡mite, slate=no sabe)
  const P16_OPTS = [
    { key: 'Estoy inscrito/a.',           label: 'Inscrito/a (Rama A)',     color: '#10b981', bg: 'bg-emerald-50', tc: 'text-emerald-700', bc: 'border-emerald-200' },
    { key: 'No estoy inscrito/a.',        label: 'No inscrito/a (Rama B)', color: '#ef4444', bg: 'bg-rose-50',    tc: 'text-rose-700',    bc: 'border-rose-200'   },
    { key: 'Estoy realizando el trÃ¡mite.',label: 'En trÃ¡mite (Rama C)',     color: '#3b82f6', bg: 'bg-blue-50',   tc: 'text-blue-700',    bc: 'border-blue-200'   },
    { key: 'No sÃ© si estoy inscrito/a.', label: 'No sabe (Rama D)',        color: '#f59e0b', bg: 'bg-amber-50',  tc: 'text-amber-700',   bc: 'border-amber-200'  },
  ];

  const counts = {};
  P16_OPTS.forEach(o => { counts[o.key] = 0; });
  let total16 = 0;

  responses.forEach(r => {
    // Usar q16 (nuevo) con fallback a q7 (legado)
    let v = r.q16 || r.q7 || null;
    if (!v) return;
    total16++;
    // Normalizar para que coincida con las keys (los valores del cuestionario terminan en '.')
    const matched = P16_OPTS.find(o => o.key === v || o.key.replace(/\.$/, '') === v.replace(/\.$/, ''));
    if (matched) counts[matched.key]++;
    else counts['No sÃ© si estoy inscrito/a.']++; // bucket genÃ©rico
  });

  if (totalEvalEl) totalEvalEl.textContent = `${total16} respuesta${total16 === 1 ? '' : 's'}`;

  if (q8ChartInstance) { q8ChartInstance.destroy(); q8ChartInstance = null; }

  if (total16 === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (cardsEl)  cardsEl.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Sin datos para P16 con estos filtros.</p>';
    if (insightEl) insightEl.textContent = 'Sin datos suficientes para calcular el diagnÃ³stico de formalizaciÃ³n.';
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const selectedType = val('q8-chart-type') || 'doughnut';
  let chartType = selectedType;
  let indexAxis = 'x';
  if (selectedType === 'horizontalBar') { chartType = 'bar'; indexAxis = 'y'; }
  const isRound = ['pie', 'doughnut'].includes(chartType);

  q8ChartInstance = new Chart(canvas.getContext('2d'), {
    type: chartType,
    data: {
      labels: P16_OPTS.map(o => o.label),
      datasets: [{
        label: 'Comerciantes',
        data: P16_OPTS.map(o => counts[o.key] || 0),
        backgroundColor: isRound ? P16_OPTS.map(o => o.color) : P16_OPTS.map(o => o.color + 'D9'),
        borderColor: isRound ? '#ffffff' : P16_OPTS.map(o => o.color),
        borderWidth: isRound ? 3 : 2,
        borderRadius: chartType === 'bar' ? 8 : 0
      }]
    },
    plugins: [alwaysShowDataLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis,
      cutout: chartType === 'doughnut' ? '60%' : undefined,
      layout: { padding: { right: indexAxis === 'y' ? 60 : 15, top: indexAxis === 'x' ? 25 : 10, bottom: 10 } },
      plugins: {
        legend: {
          display: isRound,
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 11, weight: 'bold' }, usePointStyle: true, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const raw = Number(ctx.raw) || 0;
              const pct = total16 > 0 ? ((raw / total16) * 100).toFixed(1) : '0';
              return ` ${raw} comerciantes (${pct}%)`;
            }
          }
        }
      },
      scales: isRound ? {} : {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' } } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' } }, beginAtZero: true }
      }
    }
  });

  // Tarjetas de desglose derecha
  if (cardsEl) {
    cardsEl.innerHTML = P16_OPTS.map(opt => {
      const cnt = counts[opt.key] || 0;
      const pct = total16 > 0 ? ((cnt / total16) * 100).toFixed(1) : '0.0';
      return `
        <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
          <div class="flex items-center justify-between text-xs mb-1">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color:${opt.color}"></span>
              <span class="font-bold text-gray-800 text-[11px]">${escHtml(opt.label)}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-gray-500">${cnt} com.</span>
              <span class="text-[11px] font-black ${opt.tc} ${opt.bg} px-1.5 py-0.5 rounded border ${opt.bc}">${pct}%</span>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div class="h-1.5 rounded-full transition-all duration-500" style="width:${Math.min(pct,100)}%;background-color:${opt.color}"></div>
          </div>
        </div>`;
    }).join('');
  }

  // Insight de formalizaciÃ³n
  if (insightEl) {
    const inscPct  = total16 > 0 ? ((counts['Estoy inscrito/a.'] / total16) * 100).toFixed(0) : 0;
    const noPct    = total16 > 0 ? ((counts['No estoy inscrito/a.'] / total16) * 100).toFixed(0) : 0;
    const tramPct  = total16 > 0 ? ((counts['Estoy realizando el trÃ¡mite.'] / total16) * 100).toFixed(0) : 0;
    const sabePct  = total16 > 0 ? ((counts['No sÃ© si estoy inscrito/a.'] / total16) * 100).toFixed(0) : 0;
    const sinFormal = Number(noPct) + Number(sabePct);
    if (sinFormal >= 60) {
      insightEl.innerHTML = `âš ï¸ Alerta: el <strong>${sinFormal}%</strong> de los comerciantes no estÃ¡ formalizado (${noPct}% no inscrito + ${sabePct}% no sabe). Se requiere intervenciÃ³n prioritaria en terreno.`;
    } else if (Number(inscPct) >= 50) {
      insightEl.innerHTML = `âœ… MayorÃ­a formalizada: el <strong>${inscPct}%</strong> estÃ¡ inscrito en el nuevo rÃ©gimen. El <strong>${tramPct}%</strong> estÃ¡ en proceso.`;
    } else {
      insightEl.innerHTML = `Panorama mixto: <strong>${inscPct}%</strong> inscrito, <strong>${noPct}%</strong> no inscrito, <strong>${tramPct}%</strong> en trÃ¡mite, <strong>${sabePct}%</strong> desconoce su situaciÃ³n.`;
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GRÃFICO 2: P17 â€“ BRECHA DE INFORMACIÃ“N PERCIBIDA
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let p17ChartInstance = null;

function renderP17Chart() {
  const canvas   = document.getElementById('p17-chart');
  const emptyEl  = document.getElementById('p17-chart-empty');
  const totalEl  = document.getElementById('p17-total-eval');
  const cardsEl  = document.getElementById('p17-breakdown-cards');
  const insightEl= document.getElementById('p17-insight-text');
  const gapBadge = document.getElementById('p17-gap-badge');

  if (!canvas) return;

  const responses = state.filteredResponses || [];

  // Opciones de P17 con colores funcionales
  const P17_OPTS = [
    { key: 'SÃ­, tengo suficiente informaciÃ³n.',            label: 'SÃ­, suficiente',       color: '#10b981', bg: 'bg-emerald-50', tc: 'text-emerald-700', bc: 'border-emerald-200' },
    { key: 'Tengo algo de informaciÃ³n, pero me faltan cosas por entender.', label: 'Algo, me faltan cosas', color: '#f59e0b', bg: 'bg-amber-50',   tc: 'text-amber-700',   bc: 'border-amber-200'   },
    { key: 'No, siento que me falta informaciÃ³n.',         label: 'No, me falta info',    color: '#ef4444', bg: 'bg-rose-50',    tc: 'text-rose-700',    bc: 'border-rose-200'   },
    { key: 'No podrÃ­a decirlo.',                          label: 'No podrÃ­a decirlo',     color: '#6366f1', bg: 'bg-indigo-50',  tc: 'text-indigo-700',  bc: 'border-indigo-200' },
  ];

  const counts = {};
  P17_OPTS.forEach(o => { counts[o.key] = 0; });
  let total17 = 0;

  responses.forEach(r => {
    const v = r.q17;
    if (!v) return;
    total17++;
    const matched = P17_OPTS.find(o => o.key === v || o.key.replace(/\.$/, '') === v.replace(/\.$/, ''));
    if (matched) counts[matched.key]++;
    else {
      // Matching semÃ¡ntico
      const vl = v.toLowerCase();
      if (vl.includes('suficiente'))          counts['SÃ­, tengo suficiente informaciÃ³n.']++;
      else if (vl.includes('algo') || vl.includes('faltan cosas')) counts['Tengo algo de informaciÃ³n, pero me faltan cosas por entender.']++;
      else if (vl.includes('me falta'))       counts['No, siento que me falta informaciÃ³n.']++;
      else                                    counts['No podrÃ­a decirlo.']++;
    }
  });

  if (totalEl) totalEl.textContent = `${total17} respuesta${total17 === 1 ? '' : 's'}`;

  if (p17ChartInstance) { p17ChartInstance.destroy(); p17ChartInstance = null; }

  if (total17 === 0) {
    if (emptyEl)  emptyEl.classList.remove('hidden');
    if (cardsEl)  cardsEl.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Sin datos para P17 con estos filtros.</p>';
    if (insightEl) insightEl.textContent = 'Sin datos suficientes para evaluar la brecha informativa.';
    if (gapBadge) { gapBadge.textContent = 'Sin datos'; gapBadge.className = 'text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200'; }
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  // Siempre horizontal bars para P17 (mÃ¡s claro para comparar textos largos)
  p17ChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: P17_OPTS.map(o => o.label),
      datasets: [{
        label: 'Respuestas',
        data: P17_OPTS.map(o => counts[o.key] || 0),
        backgroundColor: P17_OPTS.map(o => o.color + 'D9'),
        borderColor: P17_OPTS.map(o => o.color),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    plugins: [alwaysShowDataLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      layout: { padding: { right: 60, top: 5, bottom: 5 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const raw = Number(ctx.raw) || 0;
              const pct = total17 > 0 ? ((raw / total17) * 100).toFixed(1) : '0';
              return ` ${raw} respuestas (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' } }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10, weight: '600' } } }
      }
    }
  });

  // Tarjetas de desglose
  if (cardsEl) {
    cardsEl.innerHTML = P17_OPTS.map(opt => {
      const cnt = counts[opt.key] || 0;
      const pct = total17 > 0 ? ((cnt / total17) * 100).toFixed(1) : '0.0';
      return `
        <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
          <div class="flex items-center justify-between text-xs mb-1">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color:${opt.color}"></span>
              <span class="font-bold text-gray-800 text-[11px]">${escHtml(opt.label)}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-gray-500">${cnt} resp.</span>
              <span class="text-[11px] font-black ${opt.tc} ${opt.bg} px-1.5 py-0.5 rounded border ${opt.bc}">${pct}%</span>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div class="h-1.5 rounded-full transition-all duration-500" style="width:${Math.min(pct,100)}%;background-color:${opt.color}"></div>
          </div>
        </div>`;
    }).join('');
  }

  // Insight de brecha de informaciÃ³n
  const brechaPct = total17 > 0 ? (((counts['No, siento que me falta informaciÃ³n.'] + counts['Tengo algo de informaciÃ³n, pero me faltan cosas por entender.']) / total17) * 100).toFixed(0) : 0;
  const sufPct    = total17 > 0 ? ((counts['SÃ­, tengo suficiente informaciÃ³n.'] / total17) * 100).toFixed(0) : 0;
  if (gapBadge) {
    if (Number(brechaPct) >= 60) {
      gapBadge.textContent = `âš ï¸ Brecha crÃ­tica: ${brechaPct}%`;
      gapBadge.className   = 'text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200';
    } else if (Number(brechaPct) >= 35) {
      gapBadge.textContent = `ðŸŸ¡ Brecha moderada: ${brechaPct}%`;
      gapBadge.className   = 'text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200';
    } else {
      gapBadge.textContent = `âœ… Buen nivel: ${sufPct}% suficiente`;
      gapBadge.className   = 'text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200';
    }
  }
  if (insightEl) {
    if (Number(brechaPct) >= 60) {
      insightEl.innerHTML = `ðŸ”´ DÃ©ficit informativo alto: el <strong>${brechaPct}%</strong> de los comerciantes siente que le falta informaciÃ³n para entender la Ley N.Âº 21.745. Se requieren campaÃ±as informativas presenciales.`;
    } else if (Number(brechaPct) >= 35) {
      insightEl.innerHTML = `ðŸŸ¡ Brecha moderada: el <strong>${brechaPct}%</strong> reporta informaciÃ³n insuficiente. Fortalecer canales de comunicaciÃ³n de la municipalidad y el SII.`;
    } else {
      insightEl.innerHTML = `âœ… Nivel informativo favorable: el <strong>${sufPct}%</strong> de los encuestados se siente bien informado sobre la nueva ley.`;
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ANALÃTICA Y DIRECTRICES OPERATIVAS POR FERIA
// (Alimentado directamente por el filtro de Feria / Comuna)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let feriaChartInstance = null;

/** Helper para obtener la definiciÃ³n completa de cualquier pregunta (fija o dinÃ¡mica) */
function getQuestionDefinition(qid) {
  // 1. Buscar en secciones fijas
  for (const secKey of Object.keys(FIXED_QUESTIONS)) {
    const list = FIXED_QUESTIONS[secKey];
    if (Array.isArray(list)) {
      const found = list.find(q => q.id === qid);
      if (found) return found;
    }
  }
  // 2. Buscar en preguntas dinÃ¡micas de Firestore
  if (state.dynamicQuestions && state.dynamicQuestions.length > 0) {
    const rawId = qid.startsWith('dq_') ? qid.replace('dq_', '') : qid;
    const foundDyn = state.dynamicQuestions.find(q => q.id === rawId || `dq_${q.id}` === qid);
    if (foundDyn) {
      return {
        id: qid,
        badge: `Pregunta DinÃ¡mica #${foundDyn.orden || ''}`,
        text: foundDyn.titulo,
        options: Array.isArray(foundDyn.opciones) ? foundDyn.opciones : [],
        type: foundDyn.tipo || 'single'
      };
    }
  }
  // 3. Fallback genÃ©rico
  return {
    id: qid,
    badge: qid.toUpperCase(),
    text: qid,
    options: [],
    type: 'single'
  };
}

function renderFeriaDirectiveChart() {
  const canvas = document.getElementById('feria-directive-chart');
  const emptyEl = document.getElementById('feria-chart-empty');
  const feriaNameEl = document.getElementById('feria-active-name');
  const priorityBadgeEl = document.getElementById('feria-priority-badge');
  const totalCountEl = document.getElementById('feria-total-count');
  const statsContainer = document.getElementById('feria-stats-breakdown');
  const actionsContainer = document.getElementById('feria-directive-actions');
  const summaryEl = document.getElementById('feria-target-summary');
  const qTitleEl = document.getElementById('feria-question-title');
  const qSubEl   = document.getElementById('feria-question-subtitle');

  if (!canvas) return;

  const selectedComuna = val('filter-comuna');
  const selectedFeria  = val('filter-feria');
  const filterQ7       = val('filter-q7');
  const metric         = val('feria-metric-select') || 'q7';
  const chartTypeUI    = val('feria-chart-type') || 'horizontalBar';

  // 1. Actualizar etiqueta de la feria activa
  if (feriaNameEl) {
    if (selectedFeria) {
      feriaNameEl.textContent = selectedFeria;
    } else if (selectedComuna) {
      feriaNameEl.textContent = `Todas las ferias de ${selectedComuna}`;
    } else {
      feriaNameEl.textContent = 'Todas las ferias (Global)';
    }
  }

  // 2. DefiniciÃ³n y TÃ­tulos de la Pregunta
  const qDef = getQuestionDefinition(metric);
  if (qTitleEl) {
    const badgePrefix = qDef.badge ? `${qDef.badge}: ` : '';
    qTitleEl.textContent = `${badgePrefix}${qDef.text || metric}`;
  }
  if (qSubEl) {
    qSubEl.textContent = `GrÃ¡fico en base a las respuestas de feriantes segÃºn los filtros seleccionados`;
  }

  // 3. Filtrar las respuestas pertinentes segÃºn Comuna y Feria
  let feriaResponses = state.allResponses || [];
  if (selectedComuna) {
    const cNorm = selectedComuna.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    feriaResponses = feriaResponses.filter(r => {
      const valC = (r.q1 || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return valC === cNorm || valC.includes(cNorm);
    });
  }
  if (selectedFeria) {
    const fNorm = selectedFeria.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    feriaResponses = feriaResponses.filter(r => {
      const valF = (r.q2 || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return valF === fNorm || valF.includes(fNorm);
    });
  }

  // Si hay filtro de Estado de InscripciÃ³n activo y la mÃ©trica analizada NO es q7, aplicar tambiÃ©n el filtro de q7
  if (filterQ7 && metric !== 'q7') {
    const q7Norm = filterQ7.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    feriaResponses = feriaResponses.filter(r => {
      const valRaw = r.q7 || '';
      const valNorm = valRaw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const sec = (r.seccion || '').toUpperCase();
      if (valNorm === q7Norm) return true;
      if (q7Norm === 'si' || q7Norm.includes('inscrito')) return valNorm === 'si' || valNorm === 'inscrito' || sec === 'A';
      if (q7Norm === 'no' || q7Norm.includes('no inscrito')) return (valNorm === 'no' || valNorm === 'no inscrito' || sec === 'B') && !valNorm.includes('se') && !valNorm.includes('tramite');
      if (q7Norm.includes('tramite')) return valNorm.includes('tramite') || sec === 'C';
      if (q7Norm.includes('se') || q7Norm.includes('sabe')) return valNorm.includes('se') || valNorm.includes('sabe') || sec === 'D';
      return false;
    });
  }

  // Destruir instancia previa de Chart
  if (feriaChartInstance) {
    feriaChartInstance.destroy();
    feriaChartInstance = null;
  }

  const totalFeria = feriaResponses.length;

  if (totalFeria === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (totalCountEl) totalCountEl.textContent = '0 feriantes encuestados';
    if (statsContainer) statsContainer.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Sin feriantes encuestados para esta selecciÃ³n.</p>';
    if (actionsContainer) actionsContainer.innerHTML = '<p class="text-xs text-gray-400 py-2">Sin directrices disponibles.</p>';
    if (priorityBadgeEl) {
      priorityBadgeEl.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200';
      priorityBadgeEl.textContent = 'Sin datos';
    }
    if (summaryEl) summaryEl.textContent = 'Selecciona una feria con respuestas registradas para ver directrices operativas.';
    return;
  }

  // 4. Conteo de respuestas para la pregunta seleccionada
  const counts = {};
  // Inicializar con opciones predefinidas de la pregunta
  let baseOptions = [];
  if (Array.isArray(qDef.options) && qDef.options.length > 0) {
    baseOptions = qDef.options.map(opt => String(opt).replace(/[.]+$/, '').trim());
  } else if (metric === 'q1') {
    baseOptions = ['Huechuraba', 'Recoleta'];
  } else if (metric === 'q2') {
    const comunaFerias = selectedComuna ? (FERIAS[selectedComuna] || []) : [...(FERIAS['Huechuraba'] || []), ...(FERIAS['Recoleta'] || [])];
    baseOptions = comunaFerias;
  }

  baseOptions.forEach(opt => { counts[opt] = 0; });

  let validRespondents = 0; // personas que respondieron a esta pregunta
  let totalVotes = 0;       // total votos (importante para multi-opciÃ³n como q5)

  // Helper de normalizaciÃ³n y matching
  const matchOption = (rawStr) => {
    if (!rawStr) return null;
    const str = String(rawStr).trim();
    // 1. Coincidencia exacta
    if (counts[str] !== undefined) return str;
    // 2. Coincidencia sin punto final
    const clean = str.replace(/[.]+$/, '').trim();
    if (counts[clean] !== undefined) return clean;
    // 3. Coincidencia case-insensitive
    const lower = clean.toLowerCase();
    for (const key of Object.keys(counts)) {
      if (key.toLowerCase() === lower) return key;
    }
    return clean;
  };

  feriaResponses.forEach(r => {
    let ans = r[metric];
    if (ans === undefined && metric.startsWith('dq_')) {
      const rawDqId = metric.replace('dq_', '');
      ans = r[metric] !== undefined ? r[metric] : r[rawDqId];
    }
    const writeIn = r[metric + '_otro'];

    if (ans == null || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
      return;
    }

    validRespondents++;

    if (Array.isArray(ans)) {
      // Pregunta multi-opciÃ³n (ej. q5)
      ans.forEach(item => {
        if (!item) return;
        totalVotes++;
        let matched = matchOption(item);
        if (writeIn && (matched === 'Otro' || matched === 'Otro.')) {
          matched = `Otro: ${writeIn}`;
        }
        counts[matched] = (counts[matched] || 0) + 1;
      });
    } else {
      // Pregunta simple
      totalVotes++;
      let matched = matchOption(ans);
      if (writeIn && (matched === 'Otro' || matched === 'Otro.')) {
        matched = `Otro: ${writeIn}`;
      }
      counts[matched] = (counts[matched] || 0) + 1;
    }
  });

  if (totalCountEl) {
    if (validRespondents === totalFeria) {
      totalCountEl.textContent = `${totalFeria} feriante${totalFeria === 1 ? '' : 's'} encuestado${totalFeria === 1 ? '' : 's'}`;
    } else {
      totalCountEl.textContent = `${validRespondents} de ${totalFeria} encuestados respondieron`;
    }
  }

  // 5. Determinar etiquetas (labels) finales
  let labels = [];
  if (baseOptions.length > 0) {
    labels = [...baseOptions];
    // Agregar opciones no previstas que hayan recibido votos (ej. write-in 'Otro: ...')
    Object.keys(counts).forEach(k => {
      if (!labels.includes(k) && counts[k] > 0) {
        labels.push(k);
      }
    });
  } else {
    // Si no habÃ­a opciones predefinidas, ordenar las respuestas existentes por cantidad de votos
    labels = Object.keys(counts).filter(k => counts[k] > 0).sort((a, b) => counts[b] - counts[a]);
  }

  if (labels.length === 0 || validRespondents === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (statsContainer) statsContainer.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Sin respuestas registradas para esta pregunta bajo los filtros actuales.</p>';
    if (actionsContainer) actionsContainer.innerHTML = '<p class="text-xs text-gray-400 py-2">Sin datos disponibles para emitir directrices operativas.</p>';
    if (priorityBadgeEl) {
      priorityBadgeEl.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200';
      priorityBadgeEl.textContent = 'Sin respuestas';
    }
    if (summaryEl) summaryEl.textContent = 'NingÃºn comerciante de esta feria o filtro respondiÃ³ esta pregunta.';
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  // 6. Asignar Colores ArmÃ³nicos y SemÃ¡nticos
  const PALETTE = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
    '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
    '#e11d48', '#64748b'
  ];

  let colors = [];
  if (metric === 'q7') {
    colors = labels.map(l => {
      const lower = l.toLowerCase();
      if (lower.startsWith('sÃ­') || lower.startsWith('si')) return '#10b981'; // Verde
      if (lower.startsWith('no ') || lower === 'no') return '#ef4444'; // Rojo
      if (lower.includes('trÃ¡mite') || lower.includes('tramite')) return '#f59e0b'; // Amarillo
      return '#64748b'; // Slate
    });
  } else if (metric === 'q8') {
    colors = labels.map(l => {
      const lower = l.toLowerCase();
      if (lower.startsWith('sÃ­') || lower.startsWith('si')) return '#10b981';
      if (lower.includes('mÃ¡s o menos') || lower.includes('mas o menos')) return '#f59e0b';
      if (lower.startsWith('no ') || lower === 'no') return '#ef4444';
      return '#64748b';
    });
  } else if (metric === 'q6' || metric === 'q4') {
    colors = labels.map(l => {
      const lower = l.toLowerCase();
      if (lower.startsWith('sÃ­') || lower.startsWith('si')) return '#10b981';
      if (lower.startsWith('no ') || lower === 'no') return '#ef4444';
      return '#3b82f6';
    });
  } else {
    colors = labels.map((_, idx) => PALETTE[idx % PALETTE.length]);
  }

  // Denominador para porcentajes: base de feriantes vÃ¡lidos que respondieron
  const denom = validRespondents > 0 ? validRespondents : 1;
  const chartData = labels.map(l => counts[l] || 0);

  // 7. ConfiguraciÃ³n de GrÃ¡fico Chart.js
  let chartType = chartTypeUI;
  let indexAxis = 'x';
  if (chartTypeUI === 'horizontalBar') {
    chartType = 'bar';
    indexAxis = 'y';
  }
  const isRound = ['pie', 'doughnut'].includes(chartType);

  feriaChartInstance = new Chart(canvas.getContext('2d'), {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: 'Respuestas',
        data: chartData,
        backgroundColor: isRound ? colors : colors.map(c => c + 'D9'),
        borderColor: isRound ? '#ffffff' : colors,
        borderWidth: 2,
        borderRadius: chartType === 'bar' ? 6 : 0
      }]
    },
    plugins: [alwaysShowDataLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis,
      layout: {
        padding: {
          right: indexAxis === 'y' ? 60 : 15,
          top: indexAxis === 'x' ? 25 : 10,
          bottom: isRound ? 10 : 0
        }
      },
      plugins: {
        legend: {
          display: isRound,
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 11, weight: 'bold' }, usePointStyle: true, padding: 12 }
        },
        tooltip: {
          titleFont: { family: 'Inter', size: 12 },
          bodyFont:  { family: 'Inter', size: 12 },
          callbacks: {
            label(ctx) {
              const raw = Number(ctx.raw) || 0;
              const pct = denom > 0 ? ((raw / denom) * 100).toFixed(1) : '0';
              return ` ${raw} respuestas (${pct}%)`;
            }
          }
        }
      },
      scales: isRound ? {} : {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' } } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' } }, beginAtZero: true }
      }
    }
  });

  // 8. Desglose NumÃ©rico (% visible directamente en panel derecho)
  if (statsContainer) {
    statsContainer.innerHTML = labels.map((l, i) => {
      const cnt = counts[l] || 0;
      const pct = denom > 0 ? ((cnt / denom) * 100).toFixed(1) : '0.0';
      const col = colors[i] || '#3b82f6';
      return `
        <div class="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/80 px-1 rounded transition-colors">
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${col}"></span>
            <span class="font-medium text-gray-700 truncate" title="${escHtml(l)}">${escHtml(l)}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-gray-400 font-mono text-[11px]">${cnt} resp.</span>
            <span class="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-[11px] min-w-[46px] text-right">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 9. Identificar respuesta lÃ­der / mayoritaria
  let topLabel = '';
  let topCount = -1;
  labels.forEach(l => {
    const c = counts[l] || 0;
    if (c > topCount) {
      topCount = c;
      topLabel = l;
    }
  });
  const topPct = denom > 0 ? ((topCount / denom) * 100).toFixed(0) : 0;

  // 10. Directrices EspecÃ­ficas e Inteligentes segÃºn la Pregunta
  let priorityClass = '';
  let priorityLabel = '';
  let actions = [];
  let summaryText = '';

  if (metric === 'q7') {
    // Directrices de InscripciÃ³n Tributaria
    const noInscritos = (counts['No'] || 0) + (counts['No sÃ© si estoy inscrito'] || 0);
    const noPct = denom > 0 ? ((noInscritos / denom) * 100).toFixed(0) : 0;
    const enTramite = counts['Estoy realizando el trÃ¡mite'] || 0;
    const inscritos = counts['SÃ­'] || 0;
    const inscPct = denom > 0 ? ((inscritos / denom) * 100).toFixed(0) : 0;

    if (Number(noPct) >= 50) {
      priorityClass = 'bg-rose-100 text-rose-800 border-rose-300';
      priorityLabel = 'ðŸ”´ Prioridad Alta de IntervenciÃ³n';
      actions = [
        {
          icon: 'ðŸ“',
          title: 'Operativo Presencial de RegularizaciÃ³n',
          desc: `Desplegar mÃ³dulo de asistencia tributaria en esta feria durante su dÃ­a de funcionamiento para atender al ${noPct}% no formalizado.`
        },
        {
          icon: 'ðŸ“‹',
          title: 'AcompaÃ±amiento en TrÃ¡mite',
          desc: `Dar seguimiento a los ${enTramite} comerciantes en proceso para finalizar su registro en el nuevo rÃ©gimen.`
        },
        {
          icon: 'ðŸ“¢',
          title: 'CampaÃ±a Informativa Puesto a Puesto',
          desc: 'Entrega directa de instructivos sobre exenciones, beneficios y plazos del rÃ©gimen tributario.'
        }
      ];
      summaryText = `Alerta Operativa: El <strong>${noPct}%</strong> de los feriantes en este sector no estÃ¡ inscrito. Se sugiere priorizar esta feria en el calendario de operativos presenciales.`;
    } else if (Number(noPct) >= 25) {
      priorityClass = 'bg-amber-100 text-amber-800 border-amber-300';
      priorityLabel = 'ðŸŸ¡ Prioridad Media de AcompaÃ±amiento';
      actions = [
        {
          icon: 'ðŸ¤',
          title: 'Mesa de OrientaciÃ³n Quincenal',
          desc: 'Instalar punto de consulta rÃ¡pida con dirigentes de la feria para resolver dudas de emisiÃ³n de boletas.'
        },
        {
          icon: 'ðŸ’³',
          title: 'ArticulaciÃ³n con BancoEstado / POS',
          desc: 'Apoyar adopciÃ³n de terminales de pago compatibles con el nuevo rÃ©gimen simplificado.'
        }
      ];
      summaryText = `IntervenciÃ³n Moderada: Tasa de no inscripciÃ³n del <strong>${noPct}%</strong>. Se recomienda reforzar canales de consulta con dirigentes de la feria.`;
    } else {
      priorityClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      priorityLabel = 'ðŸŸ¢ Prioridad Baja (Feria Consolidada)';
      actions = [
        {
          icon: 'âœ…',
          title: 'Monitoreo PeriÃ³dico',
          desc: `La feria presenta un <strong>${inscPct}%</strong> de formalizaciÃ³n. Mantener seguimiento preventivo de nuevas renovaciones.`
        },
        {
          icon: 'ðŸ†',
          title: 'Modelo de Buenas PrÃ¡cticas',
          desc: 'Documentar el caso de Ã©xito de esta feria para replicar metodologÃ­as en otros sectores.'
        }
      ];
      summaryText = `Feria con Alto Cumplimiento: <strong>${inscPct}%</strong> de comerciantes formalizados. Mantener soporte preventivo.`;
    }
  } else if (metric === 'q8') {
    // Suficiencia de informaciÃ³n
    const insCount = (counts['No'] || 0) + (counts['MÃ¡s o menos'] || 0);
    const insPct = denom > 0 ? ((insCount / denom) * 100).toFixed(0) : 0;
    if (Number(insPct) >= 50) {
      priorityClass = 'bg-rose-100 text-rose-800 border-rose-300';
      priorityLabel = 'ðŸ”´ DÃ©ficit Informativo CrÃ­tico';
      actions = [
        {
          icon: 'ðŸ“¢',
          title: 'CampaÃ±a Informativa en Terreno',
          desc: `El ${insPct}% considera insuficiente la informaciÃ³n recibida. Desplegar monitores con cartillas simples explicativas.`
        },
        {
          icon: 'ðŸ‘¥',
          title: 'Asambleas con Dirigentes',
          desc: 'Reunirse con directivas de la feria para canalizar respuestas claras a dudas frecuentes sobre impuestos.'
        }
      ];
      summaryText = `El <strong>${insPct}%</strong> de los comerciantes seÃ±ala no haber recibido suficiente informaciÃ³n sobre el rÃ©gimen.`;
    } else {
      priorityClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      priorityLabel = 'ðŸŸ¢ Buen Nivel Informativo';
      actions = [
        {
          icon: 'â„¹ï¸',
          title: 'ConsolidaciÃ³n de Canales Oficiales',
          desc: 'Mantener comunicaciÃ³n continua mediante carteleras municipales y WhatsApp vecinal.'
        }
      ];
      summaryText = `EvaluaciÃ³n Positiva: La mayorÃ­a de los feriantes considera clara y oportuna la informaciÃ³n entregada.`;
    }
  } else if (metric === 'q6') {
    // AdopciÃ³n de Tarjeta
    const noTarj = counts['No'] || 0;
    const noTarjPct = denom > 0 ? ((noTarj / denom) * 100).toFixed(0) : 0;
    priorityClass = Number(noTarjPct) > 40 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300';
    priorityLabel = Number(noTarjPct) > 40 ? 'ðŸŸ¡ Brecha de BancarizaciÃ³n' : 'ðŸŸ¢ Alta AdopciÃ³n Digital';
    actions = [
      {
        icon: 'ðŸ’³',
        title: 'CampaÃ±a de Fomento de Medios ElectrÃ³nicos',
        desc: `Un ${noTarjPct}% no acepta tarjeta. Coordinar convenios con Transbank / CompraquÃ­ para subsidio o entrega de lectores POS.`
      },
      {
        icon: 'ðŸ“±',
        title: 'CapacitaciÃ³n en Pagos Digitales',
        desc: 'Talleres prÃ¡cticos sobre cÃ³digo QR, cuenta bancaria y comprobante de venta automÃ¡tico.'
      }
    ];
    summaryText = `BancarizaciÃ³n: ${100 - Number(noTarjPct)}% de aceptaciÃ³n de tarjeta en esta feria. Fomentar herramientas digitales para el resto.`;
  } else if (metric === 'q5') {
    // Fuentes de informaciÃ³n
    priorityClass = 'bg-indigo-100 text-indigo-800 border-indigo-300';
    priorityLabel = 'ðŸ“¡ Canales de ComunicaciÃ³n';
    actions = [
      {
        icon: 'ðŸŽ¯',
        title: `Canal Principal Detectado: ${escHtml(topLabel)}`,
        desc: `El canal con mayor llegada fue '${escHtml(topLabel)}' (${topPct}%). Reforzar este medio para anuncios y operativos municipales.`
      },
      {
        icon: 'ðŸ“£',
        title: 'DiversificaciÃ³n de Medios',
        desc: 'Combinar difusiÃ³n digital con volantes fÃ­sicos entregados por inspectores municipales durante la instalaciÃ³n.'
      }
    ];
    summaryText = `Canal con mayor impacto: <strong>${escHtml(topLabel)}</strong> con el ${topPct}% de menciones de los feriantes.`;
  } else {
    // Para cualquier otra pregunta (Sec. A, B, C, D, Dynamic Questions, etc.)
    if (Number(topPct) >= 50) {
      priorityClass = 'bg-rose-100 text-rose-800 border-rose-300';
      priorityLabel = `ðŸ”´ Tendencia Fuerte (${topPct}%)`;
    } else if (Number(topPct) >= 30) {
      priorityClass = 'bg-amber-100 text-amber-800 border-amber-300';
      priorityLabel = `ðŸŸ¡ Tendencia Marcada (${topPct}%)`;
    } else {
      priorityClass = 'bg-blue-100 text-blue-800 border-blue-300';
      priorityLabel = 'ðŸ“Š OpiniÃ³n Diversificada';
    }

    let subActionDesc = 'DiseÃ±ar planes especÃ­ficos de apoyo y regularizaciÃ³n territorial junto a la directiva de la feria.';
    if (metric.startsWith('a')) {
      subActionDesc = 'Medidas de soporte para comerciantes inscritos: capacitaciÃ³n contable, uso de mÃ¡quinas de pago y aclaraciÃ³n de dudas tributarias.';
    } else if (metric.startsWith('b')) {
      subActionDesc = 'Medidas para comerciantes no formalizados: eliminar barreras de entrada, aclarar exenciones y facilitar trÃ¡mite en terreno.';
    } else if (metric.startsWith('c')) {
      subActionDesc = 'Medidas para trÃ¡mites en curso: acompaÃ±amiento individual para subsanar requisitos o documentaciÃ³n faltante ante el SII.';
    } else if (metric.startsWith('d')) {
      subActionDesc = 'Medidas para estado de inscripciÃ³n dudoso: instalar punto de verificaciÃ³n rÃ¡pida con RUT para revisar situaciÃ³n tributaria.';
    }

    actions = [
      {
        icon: 'ðŸ“Œ',
        title: `Respuesta Predominante: ${escHtml(topLabel)}`,
        desc: `Un <strong>${topPct}%</strong> de los comerciantes respondiÃ³ '${escHtml(topLabel)}' (${topCount} de ${denom} respuestas).`
      },
      {
        icon: 'ðŸŽ¯',
        title: 'Plan de AcciÃ³n y Directriz Sugerida',
        desc: subActionDesc
      }
    ];
    summaryText = `AnÃ¡lisis focalizado: La opciÃ³n <strong>${escHtml(topLabel)}</strong> lidera con el <strong>${topPct}%</strong> en esta selecciÃ³n.`;
  }

  if (priorityBadgeEl) {
    priorityBadgeEl.className = `text-xs font-bold px-2.5 py-0.5 rounded-full border ${priorityClass}`;
    priorityBadgeEl.textContent = priorityLabel;
  }

  if (actionsContainer) {
    actionsContainer.innerHTML = actions.map(act => `
      <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
        <span class="text-base flex-shrink-0 mt-0.5">${act.icon}</span>
        <div>
          <h4 class="text-xs font-bold text-gray-800 leading-snug">${act.title}</h4>
          <p class="text-[11px] text-gray-600 mt-0.5 leading-relaxed">${act.desc}</p>
        </div>
      </div>
    `).join('');
  }

  if (summaryEl) {
    summaryEl.innerHTML = summaryText;
  }
}

// Compatibilidad con invocaciones previas
function renderChart() {
  renderQ8Chart();
  renderP17Chart();
  renderFeriaDirectiveChart();
}
function renderDistributionChart() {
  renderFeriaDirectiveChart();
}
function renderQuestionAnalyzer() {
  renderQ8Chart();
  renderP17Chart();
}

/** Renderiza la tabla de resumen territorial con P16 (formalizaciÃ³n) y P14 (POS) */
function renderSummaryBreakdownTable() {
  const tbody = document.getElementById('summary-breakdown-tbody');
  if (!tbody) return;

  const responses  = state.filteredResponses || [];
  const totalGlobal = responses.length;

  if (totalGlobal === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-400 text-xs">Sin registros para el desglose actual</td></tr>`;
    return;
  }

  // Helper de normalizaciÃ³n de q16
  const isInscrito = r => {
    const v16 = (r.q16 || '').toLowerCase();
    if (v16.includes('estoy inscrito')) return true;
    // Fallback legado
    const v7 = (r.q7 || '').trim();
    return v7 === 'SÃ­' || (r.seccion || '').toUpperCase() === 'A';
  };
  const hasPos = r => {
    const v = (r.q14 || '').trim().toLowerCase();
    return v === 'sÃ­.' || v === 'sÃ­' || v === 'si' || v === 'si.';
  };

  // AgrupaciÃ³n por feria (q2) dentro de cada comuna (q1)
  const summaryMap = {};
  responses.forEach(r => {
    const comuna = r.q1 || 'Sin definir';
    const feria  = r.q2 || 'Sin feria';
    const key    = `${comuna}:::${feria}`;
    if (!summaryMap[key]) summaryMap[key] = { comuna, feria, count: 0, formalizados: 0, posCount: 0 };
    summaryMap[key].count++;
    if (isInscrito(r)) summaryMap[key].formalizados++;
    if (hasPos(r))     summaryMap[key].posCount++;
  });

  const list = Object.values(summaryMap).sort((a, b) => b.count - a.count);

  tbody.innerHTML = list.map(item => {
    const pctMuestra     = ((item.count / totalGlobal) * 100).toFixed(1);
    const pctFormal      = item.count > 0 ? ((item.formalizados / item.count) * 100).toFixed(0) : 0;
    const pctPOS         = item.count > 0 ? ((item.posCount     / item.count) * 100).toFixed(0) : 0;
    const isRecoleta     = item.comuna.toLowerCase().includes('recoleta');
    const badgeComuna    = isRecoleta ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200';
    const formalBadge    = Number(pctFormal) >= 60 ? 'text-emerald-700 bg-emerald-50' : Number(pctFormal) >= 30 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50';
    const posBadge       = Number(pctPOS) >= 50 ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 bg-gray-50';

    return `
      <tr class="hover:bg-gray-50/80 transition-colors">
        <td class="px-4 py-3">
          <span class="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeComuna}">${escHtml(item.comuna)}</span>
        </td>
        <td class="px-4 py-3 font-semibold text-gray-800 text-xs sm:text-sm">${escHtml(item.feria)}</td>
        <td class="px-4 py-3 text-center font-extrabold text-gray-900">${item.count}</td>
        <td class="px-4 py-3 text-center">
          <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">${pctMuestra}%</span>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${formalBadge} border-current/20">
            ${item.formalizados} <span class="font-medium opacity-70">(${pctFormal}%)</span>
          </span>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${posBadge} border-current/20">
            ${item.posCount} <span class="font-medium opacity-70">(${pctPOS}%)</span>
          </span>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="w-20 sm:w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden flex-shrink-0">
              <div class="h-1.5 rounded-full transition-all duration-300 bg-brand-600" style="width:${Math.min(pctMuestra,100)}%"></div>
            </div>
            <span class="text-[11px] text-gray-500 font-semibold">${pctMuestra}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/** AÃ±ade opciones de preguntas dinÃ¡micas a los selectores de grÃ¡ficos */
function refreshChartQuestionSelect() {
  const sel = document.getElementById('chart-question');
  const distSel = document.getElementById('dist-chart-select');

  // Selector grÃ¡fico principal
  if (sel) {
    sel.querySelectorAll('[data-dq]').forEach(el => el.remove());
    state.dynamicQuestions.forEach(dq => {
      const opt = document.createElement('option');
      opt.value = `dq_${dq.id}`;
      opt.setAttribute('data-dq', '1');
      opt.textContent = `PD â€“ ${dq.titulo.slice(0, 40)}${dq.titulo.length > 40 ? 'â€¦' : ''}`;
      sel.appendChild(opt);
    });
  }

  // Selector del GrÃ¡fico de Directrices por Pregunta
  const feriaSel = document.getElementById('feria-metric-select');
  if (feriaSel) {
    feriaSel.querySelectorAll('[data-dq]').forEach(el => el.remove());
    if (state.dynamicQuestions && state.dynamicQuestions.length > 0) {
      const group = document.createElement('optgroup');
      group.label = 'Preguntas DinÃ¡micas / Agregadas';
      group.setAttribute('data-dq', '1');
      state.dynamicQuestions.forEach(dq => {
        const opt = document.createElement('option');
        opt.value = `dq_${dq.id}`;
        opt.setAttribute('data-dq', '1');
        opt.textContent = `PD #${dq.orden || ''}: ${dq.titulo.slice(0, 45)}${dq.titulo.length > 45 ? 'â€¦' : ''}`;
        group.appendChild(opt);
      });
      feriaSel.appendChild(group);
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GESTIÃ“N DE PREGUNTAS DINÃMICAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * LÃ³gica de reordenamiento automÃ¡tico de posiciones:
 * - Asigna la posiciÃ³n indicada (targetOrden, ej. 6).
 * - Las preguntas existentes a partir de esa posiciÃ³n se desplazan +1 (la 6 pasa a 7, la 7 a 8...).
 * - Reindexa toda la lista de forma consecutiva (1, 2, 3, 4, 5, 6, 7...) asegurando que no haya nÃºmeros duplicados.
 */
async function applyAutoReorder(targetId, targetOrden, payload) {
  const desiredPos = Math.max(1, parseInt(targetOrden, 10) || 1);

  // 1. Obtener las demÃ¡s preguntas ordenadas numÃ©ricamente
  const others = state.dynamicQuestions
    .filter(dq => dq.id !== targetId)
    .sort((a, b) => (Number(a.orden) || 999) - (Number(b.orden) || 999));

  // 2. Determinar Ã­ndice de inserciÃ³n (0-based)
  // Ej: si desiredPos = 6, Ã­ndice = 5
  const insertIndex = Math.min(desiredPos - 1, others.length);

  // 3. Crear el objeto objetivo
  const targetObj = {
    id: targetId,
    isTarget: true,
    data: payload
  };

  // Insertar: esto desplaza automÃ¡ticamente los elementos posteriores
  others.splice(insertIndex, 0, targetObj);

  // 4. Reindexar consecutivamente 1, 2, 3, 4, 5, 6, 7... sin duplicados
  for (let i = 0; i < others.length; i++) {
    const item = others[i];
    const newOrden = i + 1;

    if (item.isTarget) {
      if (item.id) {
        // Actualizar pregunta existente
        await updateDoc(doc(db, 'preguntas_dinamicas', item.id), {
          ...item.data,
          orden: newOrden,
          updatedAt: serverTimestamp()
        });
      } else {
        // Agregar nueva pregunta
        const newDocRef = await addDoc(collection(db, 'preguntas_dinamicas'), {
          ...item.data,
          orden: newOrden,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        item.id = newDocRef.id;
      }
    } else {
      // Si la pregunta existente requiere actualizaciÃ³n de posiciÃ³n para mantener orden consecutivo
      if (item.orden !== newOrden) {
        await updateDoc(doc(db, 'preguntas_dinamicas', item.id), {
          orden: newOrden,
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  // Sincronizar con el orden maestro de la encuesta
  syncMasterOrderWithDynamicQuestions();
  const targetKey = `dq_${targetObj.id}`;
  if (state.masterOrder.includes(targetKey)) {
    state.masterOrder = state.masterOrder.filter(k => k !== targetKey);
    const targetIdx = Math.min(desiredPos - 1, state.masterOrder.length - 1);
    state.masterOrder.splice(targetIdx, 0, targetKey);
  }
  try {
    await setDoc(doc(db, 'config', 'preguntas_fijas'), {
      masterOrder: state.masterOrder,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Error sincronizando masterOrder en config:', err);
  }
}

document.getElementById('question-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = val('edit-q-id');
  const titulo = document.getElementById('q-titulo').value.trim();
  const tipo   = val('q-tipo');
  const opText = document.getElementById('q-opciones').value;
  const orden  = parseInt(document.getElementById('q-orden').value) || 1;

  if (!titulo) { toast('Ingrese el tÃ­tulo de la pregunta.', 'error'); return; }

  const opciones = tipo !== 'text'
    ? opText.split('\n').map(o => o.trim()).filter(Boolean)
    : [];

  if (tipo !== 'text' && opciones.length < 2) {
    toast('Ingrese al menos 2 opciones de respuesta.', 'error');
    return;
  }

  const saveBtn = document.querySelector('#question-form button[type="submit"]');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const payload = { titulo, tipo, opciones };

    await applyAutoReorder(editId, orden, payload);

    if (editId) {
      toast(`Pregunta actualizada en posiciÃ³n ${orden} y lista reordenada consecutivamente.`, 'success');
    } else {
      toast(`Pregunta insertada en posiciÃ³n ${orden}. Las preguntas posteriores se desplazaron automÃ¡ticamente.`, 'success');
    }
    resetQuestionForm();
  } catch (err) {
    console.error('Error guardando pregunta con auto-reordenamiento:', err);
    toast('Error al guardar la pregunta: ' + (err.message || err), 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

function resetQuestionForm() {
  document.getElementById('edit-q-id').value      = '';
  document.getElementById('q-titulo').value       = '';
  document.getElementById('q-tipo').value         = 'single';
  document.getElementById('q-opciones').value     = '';
  // Sugerir la siguiente posiciÃ³n disponible
  const nextPos = state.dynamicQuestions ? (state.dynamicQuestions.length + 1) : 1;
  document.getElementById('q-orden').value        = nextPos.toString();
  document.getElementById('form-q-title').textContent = 'Agregar nueva pregunta dinÃ¡mica';
  document.getElementById('q-save-label').textContent = 'Guardar pregunta';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
  document.getElementById('opciones-section').style.display = '';
}

function cancelEdit() { resetQuestionForm(); }

function toggleOpciones() {
  const tipo = val('q-tipo');
  document.getElementById('opciones-section').style.display = tipo === 'text' ? 'none' : '';
}

function editDQ(dq) {
  document.getElementById('edit-q-id').value   = dq.id;
  document.getElementById('q-titulo').value    = dq.titulo;
  document.getElementById('q-tipo').value      = dq.tipo;
  document.getElementById('q-opciones').value  = (dq.opciones || []).join('\n');
  document.getElementById('q-orden').value     = dq.orden || 1;
  document.getElementById('form-q-title').textContent = 'Editar pregunta dinÃ¡mica';
  document.getElementById('q-save-label').textContent = 'Actualizar pregunta';
  document.getElementById('btn-cancel-edit').classList.remove('hidden');
  document.getElementById('opciones-section').style.display = dq.tipo === 'text' ? 'none' : '';

  showPanel('preguntas');
  document.getElementById('question-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteDQ(id) {
  if (!confirm('Â¿Eliminar esta pregunta? DejarÃ¡ de aparecer en la encuesta pÃºblica.')) return;
  try {
    await deleteDoc(doc(db, 'preguntas_dinamicas', id));

    // Reindexar automÃ¡ticamente las preguntas restantes para que queden consecutivas (1, 2, 3...)
    const remaining = state.dynamicQuestions
      .filter(dq => dq.id !== id)
      .sort((a, b) => (Number(a.orden) || 999) - (Number(b.orden) || 999));

    for (let i = 0; i < remaining.length; i++) {
      const newOrden = i + 1;
      if (remaining[i].orden !== newOrden) {
        await updateDoc(doc(db, 'preguntas_dinamicas', remaining[i].id), {
          orden: newOrden,
          updatedAt: serverTimestamp()
        });
      }
    }

    // Quitar del orden maestro y guardar
    state.masterOrder = state.masterOrder.filter(k => k !== `dq_${id}`);
    try {
      await setDoc(doc(db, 'config', 'preguntas_fijas'), {
        masterOrder: state.masterOrder,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Error actualizando masterOrder tras eliminar:', err);
    }

    toast('Pregunta eliminada y numeraciÃ³n reordenada consecutivamente.', 'success');
  } catch (err) {
    console.error('deleteDQ error:', err);
    toast('Error al eliminar la pregunta.', 'error');
  }
}

function renderDQList() {
  const container = document.getElementById('dq-list');
  if (!container) return;

  if (!state.dynamicQuestions.length) {
    container.innerHTML = `<p class="text-center text-slate-400 text-sm py-10">
      Sin preguntas dinÃ¡micas todavÃ­a. Agrega la primera desde el formulario.</p>`;
    return;
  }

  const typeLabel = { single:'Ãšnica', multi:'MÃºltiple', text:'Texto abierto' };
  const typeCls   = { single:'bg-blue-100 text-blue-700', multi:'bg-purple-100 text-purple-700', text:'bg-amber-100 text-amber-700' };

  container.innerHTML = state.dynamicQuestions.map(dq => `
    <div class="border border-slate-200 rounded-xl p-4 hover:border-brand-300 transition-colors">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <span class="text-xs font-bold text-slate-400">#${dq.orden}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${typeCls[dq.tipo] || 'bg-slate-100 text-slate-600'}">
              ${typeLabel[dq.tipo] || dq.tipo}
            </span>
          </div>
          <p class="text-sm font-semibold text-slate-700 leading-snug">${escHtml(dq.titulo)}</p>
          ${dq.opciones && dq.opciones.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-2">
              ${dq.opciones.slice(0, 3).map(o => `
                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs">${escHtml(o)}</span>
              `).join('')}
              ${dq.opciones.length > 3 ? `<span class="text-xs text-slate-400 self-center">+${dq.opciones.length - 3} mÃ¡s</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button data-edit-id="${dq.id}"
            class="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors dq-edit-btn"
            title="Editar">
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button data-delete-id="${dq.id}"
            class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors dq-del-btn"
            title="Eliminar">
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Delegation click for edit/delete
  container.onclick = (e) => {
    const editBtn = e.target.closest('.dq-edit-btn');
    const delBtn  = e.target.closest('.dq-del-btn');
    if (editBtn) {
      const dq = state.dynamicQuestions.find(q => q.id === editBtn.dataset.editId);
      if (dq) editDQ(dq);
    }
    if (delBtn) {
      deleteDQ(delBtn.dataset.deleteId);
    }
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GENERADOR DE CÃ“DIGO QR
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateQR() {
  const url = document.getElementById('qr-url').value.trim();
  if (!url) { toast('Ingrese la URL de la encuesta.', 'error'); return; }

  try {
    const canvas = document.getElementById('qr-canvas');
    await QRCode.toCanvas(canvas, url, {
      width: 260, margin: 2,
      color: { dark: '#065f46', light: '#ffffff' },
      errorCorrectionLevel: 'H'
    });
    document.getElementById('qr-result').classList.remove('hidden');
    toast('CÃ³digo QR generado exitosamente.', 'success');
  } catch (err) {
    console.error('Error QR:', err);
    toast('Error al generar el cÃ³digo QR.', 'error');
  }
}

function downloadQR() {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas) { toast('Primero genere el QR.', 'error'); return; }

  const link = document.createElement('a');
  link.download = 'qr-encuesta-ferias-libres.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('Imagen descargada.', 'success');
}

function printPoster() {
  const url = document.getElementById('qr-url').value.trim();
  const canvas = document.getElementById('qr-canvas');
  if (!url || !canvas.width) { toast('Primero genere el QR.', 'error'); return; }

  const imgData = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  if (!win) { toast('Active las ventanas emergentes para imprimir.', 'error'); return; }

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Afiche â€“ Encuesta Ferias Libres</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;
         min-height:100vh;background:#fff;padding:30px}
    .poster{max-width:480px;width:100%;text-align:center;border:3px solid #065f46;border-radius:20px;overflow:hidden}
    .header{background:linear-gradient(135deg,#065f46,#0d9488);padding:36px 24px;color:#fff}
    .header h1{font-size:26px;font-weight:800;line-height:1.2;margin-bottom:6px}
    .header p{font-size:14px;opacity:.85}
    .body{padding:32px 24px}
    .qr-wrap{display:inline-block;border:8px solid #ecfdf5;border-radius:16px;margin-bottom:20px;background:#fff;padding:12px}
    .instruction{font-size:20px;font-weight:700;color:#1e293b;margin-bottom:6px}
    .desc{font-size:13px;color:#64748b;line-height:1.5;margin-bottom:24px}
    .divider{height:1px;background:#e2e8f0;margin:20px 0}
    .footer{font-size:12px;color:#94a3b8}
    .footer strong{display:block;color:#475569;font-size:13px;margin-bottom:2px}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  <div class="poster">
    <div class="header">
      <h1>ðŸ“‹ Encuesta a comerciantes de ferias libres</h1>
      <p>Universidad de Santiago de Chile Â· Contador PÃºblico y Auditor</p>
    </div>
    <div class="body">
      <div class="qr-wrap"><img src="${imgData}" alt="QR Encuesta" width="240"></div>
      <p class="instruction">ðŸ“± Escanea el cÃ³digo QR</p>
      <p class="desc">y participa en nuestra encuesta acadÃ©mica sobre<br>
        el nuevo rÃ©gimen tributario para ferias libres.<br>
        <strong>Â¡Solo toma 3â€“5 minutos!</strong></p>
      <div class="divider"></div>
      <div class="footer">
        <strong>Universidad de Santiago de Chile</strong>
        Carrera de Contador PÃºblico y Auditor
        <br><br>
        Sus respuestas son anÃ³nimas y serÃ¡n utilizadas Ãºnicamente con fines acadÃ©micos.
      </div>
    </div>
  </div>
  <script>window.onload=()=>{window.print()}<\/script>
</body>
</html>`);
  win.document.close();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NAVEGACIÃ“N DE PANELES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function showPanel(name) {
  // Cerrar menÃº mÃ³vil si estÃ¡ abierto
  closeMobileMenu();

  // Actualizar paneles de contenido
  document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`panel-${name}`);
  if (target) target.classList.add('active');

  // Actualizar nav items
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${name}`);
  if (navBtn) navBtn.classList.add('active');

  // Actualizar tÃ­tulo
  const titles = {
    dashboard: 'Dashboard',
    'preguntas-fijas': 'Editar Preguntas',
    preguntas: 'Preguntas DinÃ¡micas',
    qr: 'CÃ³digo QR'
  };
  setText('panel-title', titles[name] || 'Panel');

  state.currentPanel = name;

  // Re-renderizar grÃ¡fico si volvemos al dashboard
  if (name === 'dashboard' && state.filteredResponses.length) {
    setTimeout(renderChart, 100);
  }

  // Renderizar preguntas si se abre ese panel
  if (name === 'preguntas-fijas') {
    showQuestionTab(currentFixedTab || 'flujo');
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MENÃš MÃ“VIL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function openMobileMenu() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EDICIÃ“N DE PREGUNTAS FIJAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function showQuestionTab(tab) {
  currentFixedTab = tab;

  // Actualizar botones de tab
  document.querySelectorAll('.q-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tab) {
      if (tab === 'flujo') {
        btn.className = 'q-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-brand-600 text-white shadow-sm flex items-center gap-2 transition-all active:scale-95';
      } else {
        btn.className = 'q-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 transition-colors';
      }
    } else {
      if (btn.dataset.tab === 'flujo') {
        btn.className = 'q-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-sm flex items-center gap-2 transition-all';
      } else {
        btn.className = 'q-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors';
      }
    }
  });

  const banner = document.getElementById('drag-hint-banner');
  if (banner) banner.style.display = tab === 'flujo' ? 'flex' : 'none';

  renderFixedQuestions(tab);
}

// â”€â”€ Variables y funciones de Drag & Drop nativo â”€â”€
let draggedCardEl = null;

function handleCardDragStart(e) {
  draggedCardEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.qid);
  setTimeout(() => this.classList.add('is-dragging'), 0);
}

function handleCardDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== draggedCardEl && this.classList.contains('q-flow-card')) {
    this.classList.add('drag-over');
  }
}

function handleCardDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleCardDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  if (draggedCardEl && this !== draggedCardEl && this.classList.contains('q-flow-card')) {
    const container = document.getElementById('fixed-questions-container');
    const allCards = Array.from(container.querySelectorAll('.q-flow-card'));
    const draggedIdx = allCards.indexOf(draggedCardEl);
    const targetIdx = allCards.indexOf(this);

    if (draggedIdx < targetIdx) {
      this.after(draggedCardEl);
    } else {
      this.before(draggedCardEl);
    }
    reindexFlowCards();
    draggedCardEl.classList.add('q-pulse-reorder');
    setTimeout(() => draggedCardEl?.classList.remove('q-pulse-reorder'), 800);
  }
}

function handleCardDragEnd(e) {
  this.classList.remove('is-dragging');
  document.querySelectorAll('.q-flow-card').forEach(c => c.classList.remove('drag-over'));
  draggedCardEl = null;
}

/**
 * Reindexa consecutivamente todas las tarjetas del flujo (#1, #2, #3, #4...)
 * Actualiza botones subir/bajar y actualiza state.masterOrder sin duplicados.
 */
function reindexFlowCards() {
  const container = document.getElementById('fixed-questions-container');
  if (!container) return;
  const cards = container.querySelectorAll('.q-flow-card');
  const count = cards.length;
  const newOrder = [];

  cards.forEach((card, idx) => {
    const qid = card.dataset.qid;
    newOrder.push(qid);

    // Actualizar badge numÃ©rico consecutivo (#1, #2, #3...)
    const badge = card.querySelector('.q-pos-badge');
    if (badge) badge.textContent = `#${idx + 1}`;

    // Actualizar botones de subir y bajar
    const btnUp = card.querySelector('.q-btn-up');
    const btnDown = card.querySelector('.q-btn-down');
    if (btnUp) {
      btnUp.disabled = idx === 0;
      btnUp.setAttribute('onclick', `window.__admin.moveQuestion(${idx}, -1)`);
    }
    if (btnDown) {
      btnDown.disabled = idx === count - 1;
      btnDown.setAttribute('onclick', `window.__admin.moveQuestion(${idx}, 1)`);
    }
  });

  state.masterOrder = newOrder;
}

/**
 * Mueve una pregunta una posiciÃ³n hacia arriba (-1) o hacia abajo (+1)
 */
function moveQuestion(index, direction) {
  const container = document.getElementById('fixed-questions-container');
  if (!container) return;
  const cards = Array.from(container.querySelectorAll('.q-flow-card'));
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= cards.length) return;

  const currentCard = cards[index];
  const targetCard = cards[targetIndex];

  if (direction < 0) {
    targetCard.before(currentCard);
  } else {
    targetCard.after(currentCard);
  }

  reindexFlowCards();
  currentCard.classList.add('q-pulse-reorder');
  setTimeout(() => currentCard.classList.remove('q-pulse-reorder'), 800);
}

function renderFixedQuestions(tab) {
  const container = document.getElementById('fixed-questions-container');
  if (!container) return;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // TAB 1: FLUJO COMPLETO / ORDENAR (Arrastrar y Soltar)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (tab === 'flujo') {
    syncMasterOrderWithDynamicQuestions();
    const typeLabels = { single: 'Ãšnica', multi: 'MÃºltiple', single_other: 'Ãšnica + Otro', text: 'Texto abierto' };
    const count = state.masterOrder.length;

    let html = state.masterOrder.map((qid, idx) => {
      // 1. Caso: Pregunta DinÃ¡mica
      if (qid.startsWith('dq_')) {
        const dqId = qid.slice(3);
        const dq = state.dynamicQuestions.find(d => d.id === dqId);
        if (!dq) return '';

        const optRows = (dq.opciones || []).map((opt, oIdx) => `
          <div class="flex items-center gap-2 group option-row" data-dqid="${dq.id}" data-idx="${oIdx}">
            <div class="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-purple-600">${String.fromCharCode(65 + oIdx)}</span>
            </div>
            <input type="text" value="${escHtml(opt)}" data-field="dq-option" data-dqid="${dq.id}" data-idx="${oIdx}"
              class="flex-1 px-3.5 py-2 rounded-xl border-2 border-gray-100 text-sm text-gray-700
                     focus:outline-none focus:border-purple-400 focus:bg-white transition-all bg-gray-50 hover:border-gray-200">
            <button type="button" onclick="window.__admin.removeDqOption('${dq.id}', ${oIdx})"
              class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500
                     hover:bg-red-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 text-lg font-bold">
              &times;
            </button>
          </div>`).join('');

        return `
        <div class="q-edit-card q-flow-card border-purple-200 bg-white shadow-sm mb-4" data-qid="${qid}" data-is-dq="1" draggable="true">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-gray-100">
            <div class="flex items-center gap-2.5">
              <div class="drag-handle p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors" title="Arrastrar para mover">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8h16M4 16h16"/>
                </svg>
              </div>
              <span class="q-pos-badge bg-purple-600 text-white font-extrabold px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm">#${idx + 1}</span>
              <span class="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">DinÃ¡mica / Agregada</span>
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">${typeLabels[dq.tipo] || dq.tipo}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" class="q-btn-up px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
                ${idx === 0 ? 'disabled' : ''} onclick="window.__admin.moveQuestion(${idx}, -1)" title="Subir una posiciÃ³n">
                â¬† Subir
              </button>
              <button type="button" class="q-btn-down px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
                ${idx === count - 1 ? 'disabled' : ''} onclick="window.__admin.moveQuestion(${idx}, 1)" title="Bajar una posiciÃ³n">
                â¬‡ Bajar
              </button>
              <button type="button" onclick="window.__admin.deleteDQ('${dq.id}')"
                class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all">
                ðŸ—‘ Eliminar
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">TÃ­tulo / Enunciado</label>
            <textarea rows="2" data-field="dq-titulo" data-dqid="${dq.id}"
              class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 text-sm text-gray-800 font-medium
                     focus:outline-none focus:border-purple-400 focus:bg-white transition-all resize-none bg-gray-50">${escHtml(dq.titulo)}</textarea>
          </div>

          ${dq.tipo !== 'text' ? `
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Alternativas de respuesta</label>
                <button type="button" onclick="window.__admin.addDqOption('${dq.id}')"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-100 text-purple-700
                         text-xs font-bold hover:bg-purple-200 active:scale-95 transition-all">
                  + Agregar opciÃ³n
                </button>
              </div>
              <div class="space-y-2" id="dq-options-list-${dq.id}">${optRows}</div>
            </div>
          ` : ''}
        </div>`;
      }

      // 2. Caso: Pregunta General Fija (q1..q8)
      const q = FIXED_QUESTIONS.general.find(item => item.id === qid);
      if (!q) return '';

      const optRows = (q.options || []).map((opt, oIdx) => `
        <div class="flex items-center gap-2 group option-row" data-qid="${q.id}" data-idx="${oIdx}">
          <div class="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-bold text-gray-500">${String.fromCharCode(65 + oIdx)}</span>
          </div>
          <input type="text" value="${escHtml(opt)}" data-field="option" data-qid="${q.id}" data-idx="${oIdx}"
            class="flex-1 px-3.5 py-2 rounded-xl border-2 border-gray-100 text-sm text-gray-700
                   focus:outline-none focus:border-brand-400 focus:bg-white transition-all bg-gray-50 hover:border-gray-200">
          <button type="button" onclick="window.__admin.removeOption('${q.id}', ${oIdx})"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500
                   hover:bg-red-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 text-lg font-bold">
            &times;
          </button>
        </div>`).join('');

      return `
      <div class="q-edit-card q-flow-card bg-white shadow-sm mb-4" data-qid="${q.id}" draggable="true">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <div class="drag-handle p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title="Arrastrar para mover">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8h16M4 16h16"/>
              </svg>
            </div>
            <span class="q-pos-badge bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm">#${idx + 1}</span>
            <span class="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">General (${q.badge})</span>
            <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">${typeLabels[q.type] || q.type}</span>
            ${q.id === 'q7' ? `<span class="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg flex items-center gap-1">âš¡ BifurcaciÃ³n (A/B/C/D)</span>` : ''}
            ${q.note ? `<span class="text-xs text-gray-400 italic">âš ï¸ ${escHtml(q.note)}</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" class="q-btn-up px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
              ${idx === 0 ? 'disabled' : ''} onclick="window.__admin.moveQuestion(${idx}, -1)" title="Subir una posiciÃ³n">
              â¬† Subir
            </button>
            <button type="button" class="q-btn-down px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
              ${idx === count - 1 ? 'disabled' : ''} onclick="window.__admin.moveQuestion(${idx}, 1)" title="Bajar una posiciÃ³n">
              â¬‡ Bajar
            </button>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Texto de la pregunta</label>
          <textarea rows="2" data-field="text" data-qid="${q.id}"
            class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 text-sm text-gray-800 font-medium
                   focus:outline-none focus:border-brand-400 focus:bg-white transition-all resize-none bg-gray-50">${escHtml(q.text)}</textarea>
        </div>

        ${q.options.length > 0 ? `
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Alternativas de respuesta</label>
              <button type="button" onclick="window.__admin.addOption('${q.id}')"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-50 text-brand-700
                       text-xs font-bold hover:bg-brand-100 active:scale-95 transition-all">
                + Agregar opciÃ³n
              </button>
            </div>
            <div class="space-y-2" id="options-list-${q.id}">${optRows}</div>
          </div>
        ` : ''}

        ${q.id === 'q7' ? `
          <div class="mt-4 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
            <span class="text-base">ðŸ”€</span>
            <div>
              <strong>BifurcaciÃ³n condicional:</strong> SegÃºn la respuesta dada en esta pregunta, el comerciante es dirigido a la <em>SecciÃ³n A (Inscritos)</em>, <em>SecciÃ³n B (No inscritos)</em>, <em>SecciÃ³n C (En trÃ¡mite)</em> o <em>SecciÃ³n D (No sabe)</em>. Puedes editar sus textos en las pestaÃ±as superiores.
            </div>
          </div>
        ` : ''}
      </div>`;
    }).join('');

    if (!html || !html.trim()) {
      container.innerHTML = `
        <div class="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
          <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-sm font-bold text-gray-700">No hay preguntas activas en la encuesta</p>
          <p class="text-xs text-gray-400 mt-1 mb-4">Todas las preguntas de la encuesta fueron eliminadas. Puedes crear nuevas preguntas cuando desees.</p>
          <button type="button" onclick="window.__admin.showPanel('preguntas')"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-all">
            + Crear nueva pregunta
          </button>
        </div>`;
      return;
    }

    container.innerHTML = html;

    // Conectar eventos nativos de Drag & Drop
    container.querySelectorAll('.q-flow-card').forEach(card => {
      card.addEventListener('dragstart', handleCardDragStart);
      card.addEventListener('dragover', handleCardDragOver);
      card.addEventListener('dragleave', handleCardDragLeave);
      card.addEventListener('drop', handleCardDrop);
      card.addEventListener('dragend', handleCardDragEnd);
    });

    return;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // TAB 2: PREGUNTAS DINÃMICAS SOLAMENTE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (tab === 'dinamicas') {
    if (!state.dynamicQuestions || !state.dynamicQuestions.length) {
      container.innerHTML = `
        <div class="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
          <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <p class="text-sm font-bold text-gray-700">AÃºn no hay preguntas dinÃ¡micas agregadas</p>
          <p class="text-xs text-gray-400 mt-1 mb-4">Puedes crear una nueva pregunta desde el panel "Preguntas DinÃ¡micas".</p>
          <button type="button" onclick="window.__admin.showPanel('preguntas')"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-all">
            + Ir a crear pregunta dinÃ¡mica
          </button>
        </div>`;
      return;
    }

    container.innerHTML = state.dynamicQuestions.map(dq => {
      const optRows = (dq.opciones || []).map((opt, idx) => `
        <div class="flex items-center gap-2 group option-row" data-dqid="${dq.id}" data-idx="${idx}">
          <div class="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-bold text-purple-600">${String.fromCharCode(65 + idx)}</span>
          </div>
          <input type="text" value="${escHtml(opt)}" data-field="dq-option" data-dqid="${dq.id}" data-idx="${idx}"
            class="flex-1 px-3.5 py-2 rounded-xl border-2 border-gray-100 text-sm text-gray-700
                   focus:outline-none focus:border-purple-400 focus:bg-white transition-all bg-gray-50 hover:border-gray-200">
          <button type="button" onclick="window.__admin.removeDqOption('${dq.id}', ${idx})"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500
                   hover:bg-red-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 text-lg font-bold">
            &times;
          </button>
        </div>`).join('');

      return `
      <div class="q-edit-card border-purple-200 bg-purple-50/10 mb-4" data-dqid="${dq.id}">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">DinÃ¡mica #${dq.orden || 1}</span>
            <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">${dq.tipo === 'multi' ? 'MÃºltiple' : dq.tipo === 'text' ? 'Texto' : 'Ãšnica'}</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.__admin.editDQ(${JSON.stringify(dq).replace(/"/g, '&quot;')})"
              class="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all">
              Editar en formulario
            </button>
            <button type="button" onclick="window.__admin.deleteDQ('${dq.id}')"
              class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all">
              Eliminar
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div class="sm:col-span-3">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">TÃ­tulo / Enunciado</label>
            <textarea rows="2" data-field="dq-titulo" data-dqid="${dq.id}"
              class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 text-sm text-gray-800 font-medium
                     focus:outline-none focus:border-purple-400 focus:bg-white transition-all resize-none bg-gray-50">${escHtml(dq.titulo)}</textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">PosiciÃ³n (Orden)</label>
            <input type="number" min="1" value="${dq.orden || 1}" data-field="dq-orden" data-dqid="${dq.id}"
              class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 text-sm text-gray-800 font-bold
                     focus:outline-none focus:border-purple-400 focus:bg-white transition-all bg-gray-50">
            <p class="text-[10px] text-gray-400 mt-1">1 = Primera pregunta en la encuesta</p>
          </div>
        </div>

        ${dq.tipo !== 'text' ? `
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Alternativas de respuesta</label>
              <button type="button" onclick="window.__admin.addDqOption('${dq.id}')"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-100 text-purple-700
                       text-xs font-bold hover:bg-purple-200 active:scale-95 transition-all">
                + Agregar opciÃ³n
              </button>
            </div>
            <div class="space-y-2" id="dq-options-list-${dq.id}">${optRows}</div>
          </div>
        ` : ''}
      </div>`;
    }).join('');
    return;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // TAB 3: SECCIONES FIJAS (general, secA, secB, secC, secD)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const questions = FIXED_QUESTIONS[tab] || [];
  const typeLabels = { single: 'Ãšnica', multi: 'MÃºltiple', single_other: 'Ãšnica + Otro', text: 'Texto abierto' };
  const typeCls = { single: 'bg-blue-50 text-blue-600', multi: 'bg-violet-50 text-violet-600', single_other: 'bg-amber-50 text-amber-600', text: 'bg-gray-100 text-gray-500' };

  container.innerHTML = questions.map(q => {
    const optRows = q.options.map((opt, idx) => `
      <div class="flex items-center gap-2 group option-row" data-qid="${q.id}" data-idx="${idx}">
        <div class="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
          <span class="text-xs font-bold text-gray-500">${String.fromCharCode(65 + idx)}</span>
        </div>
        <input type="text" value="${escHtml(opt)}" data-field="option" data-qid="${q.id}" data-idx="${idx}"
          class="flex-1 px-3.5 py-2 rounded-xl border-2 border-gray-100 text-sm text-gray-700
                 focus:outline-none focus:border-brand-400 focus:bg-white transition-all bg-gray-50 hover:border-gray-200">
        <button type="button" onclick="window.__admin.removeOption('${q.id}', ${idx})"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500
                 hover:bg-red-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 text-lg font-bold">
          &times;
        </button>
      </div>`).join('');

    return `
    <div class="q-edit-card" data-qid="${q.id}">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">${escHtml(q.badge)}</span>
        <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${typeCls[q.type] || 'bg-gray-100 text-gray-500'}">${typeLabels[q.type] || q.type}</span>
        ${q.note ? `<span class="text-xs text-gray-400 italic">&#9888; ${escHtml(q.note)}</span>` : ''}
      </div>
      <div class="mb-4">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Texto de la pregunta</label>
        <textarea rows="2" data-field="text" data-qid="${q.id}"
          class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 text-sm text-gray-800 font-medium
                 focus:outline-none focus:border-brand-400 focus:bg-white transition-all resize-none bg-gray-50">${escHtml(q.text)}</textarea>
      </div>
      ${q.options.length > 0 ? `
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Alternativas de respuesta</label>
            <button type="button" onclick="window.__admin.addOption('${q.id}')"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-50 text-brand-700
                     text-xs font-bold hover:bg-brand-100 active:scale-95 transition-all">
              + Agregar opciÃ³n
            </button>
          </div>
          <div class="space-y-2" id="options-list-${q.id}">${optRows}</div>
        </div>
      ` : ''}
    </div>`;
  }).join('');
}

async function saveAllFixedQuestions() {
  const container = document.getElementById('fixed-questions-container');
  if (!container) return;

  // 1. Guardar cambios desde el FLUJO COMPLETO (Arrastrar y Soltar)
  if (currentFixedTab === 'flujo') {
    const cards = Array.from(container.querySelectorAll('.q-flow-card'));
    if (!cards.length) return;

    const newOrder = [];
    const generalUpdates = {};
    const dqUpdates = [];

    cards.forEach((card, idx) => {
      const qid = card.dataset.qid;
      newOrder.push(qid);
      const position = idx + 1;

      if (qid.startsWith('dq_')) {
        const dqId = qid.slice(3);
        const titleEl = card.querySelector(`[data-field="dq-titulo"][data-dqid="${dqId}"]`);
        const title = titleEl ? titleEl.value.trim() : '';

        const options = [];
        card.querySelectorAll(`[data-field="dq-option"][data-dqid="${dqId}"]`).forEach(inp => {
          const val = inp.value.trim();
          if (val) options.push(val);
        });

        dqUpdates.push({ id: dqId, orden: position, titulo: title, opciones: options });
      } else {
        const textEl = card.querySelector(`[data-field="text"][data-qid="${qid}"]`);
        const text = textEl ? textEl.value.trim() : '';

        const options = [];
        card.querySelectorAll(`[data-field="option"][data-qid="${qid}"]`).forEach(inp => {
          const val = inp.value.trim();
          if (val) options.push(val);
        });

        generalUpdates[qid] = { text, options };

        const qObj = FIXED_QUESTIONS.general.find(item => item.id === qid);
        if (qObj) {
          if (text) qObj.text = text;
          if (options.length) qObj.options = options;
        }
      }
    });

    state.masterOrder = newOrder;

    try {
      // Guardar orden maestro y preguntas generales en config/preguntas_fijas
      const configRef = doc(db, 'config', 'preguntas_fijas');
      await setDoc(configRef, {
        masterOrder: newOrder,
        general: generalUpdates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Actualizar preguntas dinÃ¡micas en Firestore con su nuevo orden consecutivo
      for (const dq of dqUpdates) {
        await updateDoc(doc(db, 'preguntas_dinamicas', dq.id), {
          orden: dq.orden,
          ...(dq.titulo ? { titulo: dq.titulo } : {}),
          ...(dq.opciones ? { opciones: dq.opciones } : {}),
          updatedAt: serverTimestamp()
        });
      }

      toast('Â¡Orden de la encuesta y preguntas guardadas con Ã©xito!', 'success');
    } catch (err) {
      console.error('Error guardando orden y preguntas:', err);
      toast('Error al guardar: ' + (err.message || err), 'error');
    }
    return;
  }

  // 2. Guardar pestaÃ±a de dinÃ¡micas solamente
  if (currentFixedTab === 'dinamicas') {
    const cards = Array.from(container.querySelectorAll('.q-edit-card[data-dqid]'));
    const items = cards.map((card, originalIdx) => {
      const dqId = card.dataset.dqid;
      const titulo = card.querySelector('[data-field="dq-titulo"]')?.value.trim();
      const orden = parseInt(card.querySelector('[data-field="dq-orden"]')?.value || '1', 10);
      const opciones = [];
      card.querySelectorAll('[data-field="dq-option"]').forEach(inp => {
        const val = inp.value.trim();
        if (val) opciones.push(val);
      });
      return {
        dqId,
        titulo,
        desiredOrden: isNaN(orden) ? (originalIdx + 1) : orden,
        opciones,
        originalIdx
      };
    });

    items.sort((a, b) => a.desiredOrden - b.desiredOrden || a.originalIdx - b.originalIdx);

    let count = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const newOrden = i + 1;
        if (item.titulo && item.dqId) {
          const payload = {
            titulo: item.titulo,
            orden: newOrden,
            updatedAt: serverTimestamp()
          };
          if (item.opciones.length > 0) payload.opciones = item.opciones;
          await updateDoc(doc(db, 'preguntas_dinamicas', item.dqId), payload);
          count++;
        }
      }
      syncMasterOrderWithDynamicQuestions();
      await setDoc(doc(db, 'config', 'preguntas_fijas'), {
        masterOrder: state.masterOrder,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast(`Â¡${count} pregunta(s) dinÃ¡micas guardadas y reordenadas consecutivamente!`, 'success');
    } catch (err) {
      console.error('Error guardando preguntas dinÃ¡micas:', err);
      toast('Error al guardar preguntas dinÃ¡micas: ' + (err.message || err), 'error');
    }
    return;
  }

  // 3. Guardar secciones fijas individuales
  const updates = {};
  container.querySelectorAll('[data-field="text"]').forEach(ta => {
    const qid = ta.dataset.qid;
    if (!updates[qid]) updates[qid] = {};
    updates[qid].text = ta.value.trim();
  });
  const optGrp = {};
  container.querySelectorAll('[data-field="option"]').forEach(inp => {
    const qid = inp.dataset.qid;
    if (!optGrp[qid]) optGrp[qid] = [];
    const v = inp.value.trim();
    if (v) optGrp[qid].push(v);
  });
  Object.entries(optGrp).forEach(([qid, opts]) => {
    if (!updates[qid]) updates[qid] = {};
    if (qid === 'q1') {
      updates[qid].options = opts.map(opt => {
        const o = opt.toLowerCase().trim();
        if (o.includes('huechurab')) return 'Huechuraba';
        if (o.includes('recolet')) return 'Recoleta';
        return opt;
      });
    } else {
      updates[qid].options = opts;
    }
  });
  (FIXED_QUESTIONS[currentFixedTab] || []).forEach(q => {
    if (updates[q.id]) {
      if (updates[q.id].text) q.text = updates[q.id].text;
      if (updates[q.id].options) q.options = updates[q.id].options;
    }
  });
  try {
    const ref = doc(db, 'config', 'preguntas_fijas');
    await setDoc(ref, { [currentFixedTab]: updates, updatedAt: new Date().toISOString() }, { merge: true });
    toast('Â¡Preguntas guardadas con Ã©xito!', 'success');
  } catch (err) {
    console.error('saveAllFixedQuestions error:', err);
    toast('Error al guardar: ' + (err.message || err.code || err), 'error');
  }
}

function addOption(qid) {
  const list = document.getElementById('options-list-' + qid);
  if (!list) return;
  const idx = list.querySelectorAll('.option-row').length;
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 group option-row';
  row.dataset.qid = qid;
  row.dataset.idx = idx;
  row.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
      <span class="text-xs font-bold text-brand-500">${String.fromCharCode(65 + idx)}</span>
    </div>
    <input type="text" value="" placeholder="Nueva opci\u00f3n\u2026" data-field="option" data-qid="${qid}" data-idx="${idx}"
      class="flex-1 px-3.5 py-2 rounded-xl border-2 border-brand-300 text-sm text-gray-700
             focus:outline-none focus:border-brand-400 focus:bg-white transition-all bg-white">
    <button type="button" onclick="window.__admin.removeOption('${qid}', ${idx})"
      class="w-7 h-7 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50
             transition-all flex-shrink-0 text-lg font-bold">
      &times;
    </button>`;
  list.appendChild(row);
  row.querySelector('input').focus();
}

function removeOption(qid, idx) {
  const list = document.getElementById('options-list-' + qid);
  if (!list) return;
  const rows = list.querySelectorAll('.option-row');
  if (rows.length <= 1) { toast('Debe haber al menos una opci\u00f3n.', 'error'); return; }
  if (rows[idx]) rows[idx].remove();
  list.querySelectorAll('.option-row').forEach((row, i) => {
    row.dataset.idx = i;
    const lbl = row.querySelector('span'); if (lbl) lbl.textContent = String.fromCharCode(65 + i);
    const inp = row.querySelector('input'); if (inp) inp.dataset.idx = i;
    const btn = row.querySelector('button');
    if (btn) btn.setAttribute('onclick', "window.__admin.removeOption('" + qid + "'," + i + ")");
  });
}



function addDqOption(dqId) {
  const list = document.getElementById('dq-options-list-' + dqId);
  if (!list) return;
  const idx = list.querySelectorAll('.option-row').length;
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 group option-row';
  row.dataset.dqid = dqId;
  row.dataset.idx = idx;
  row.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
      <span class="text-xs font-bold text-purple-600">${String.fromCharCode(65 + idx)}</span>
    </div>
    <input type="text" value="" placeholder="Nueva opciÃ³nâ€¦" data-field="dq-option" data-dqid="${dqId}" data-idx="${idx}"
      class="flex-1 px-3.5 py-2 rounded-xl border-2 border-brand-300 text-sm text-gray-700
             focus:outline-none focus:border-purple-400 focus:bg-white transition-all bg-white">
    <button type="button" onclick="window.__admin.removeDqOption('${dqId}', ${idx})"
      class="w-7 h-7 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50
             transition-all flex-shrink-0 text-lg font-bold">
      &times;
    </button>`;
  list.appendChild(row);
  row.querySelector('input').focus();
}

function removeDqOption(dqId, idx) {
  const list = document.getElementById('dq-options-list-' + dqId);
  if (!list) return;
  const rows = list.querySelectorAll('.option-row');
  if (rows.length <= 1) { toast('Debe haber al menos una opciÃ³n.', 'error'); return; }
  if (rows[idx]) rows[idx].remove();
  list.querySelectorAll('.option-row').forEach((row, i) => {
    row.dataset.idx = i;
    const lbl = row.querySelector('span'); if (lbl) lbl.textContent = String.fromCharCode(65 + i);
    const inp = row.querySelector('input'); if (inp) inp.dataset.idx = i;
    const btn = row.querySelector('button');
    if (btn) btn.setAttribute('onclick', `window.__admin.removeDqOption('${dqId}', ${i})`);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EXPORTACIÃ“N A EXCEL (.xlsx)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function exportToExcel() {
  const responses = state.filteredResponses.length ? state.filteredResponses : state.allResponses;
  if (!responses || !responses.length) {
    toast('No hay respuestas registradas para exportar.', 'info');
    return;
  }

  // Mapear cada respuesta a un objeto plano con nombres de columnas claros y descriptivos
  const rows = responses.map((r, index) => {
    let fechaStr = r.fechaRespuesta || '';
    if (!fechaStr && r.timestamp) {
      if (typeof r.timestamp.toDate === 'function') {
        fechaStr = r.timestamp.toDate().toLocaleString('es-CL');
      } else if (r.timestamp.seconds) {
        fechaStr = new Date(r.timestamp.seconds * 1000).toLocaleString('es-CL');
      }
    }

    const row = {
      'NÂ°': index + 1,
      'ID Respuesta': r.id || '',
      'Fecha': fechaStr,
      'Hora': r.horaRespuesta || '',
      'Comuna (P1)': r.q1 || '',
      'Feria (P2)': r.q2_feria || (r.q2 ? r.q2.split('â€“')[0].trim() : ''),
      'DÃ­a (P2)': r.q2_dia || (r.q2 && r.q2.includes('â€“') ? r.q2.split('â€“')[1].trim() : ''),
      'Feria y DÃ­a (P2)': r.q2 || '',
      'Tiempo en feria (P3)': r.q3 || '',
      'DÃ­as a la semana (P4)': r.q4 || '',
      'QuÃ© vende (P5)': r.q5 || '',
      'P5 - Otro producto': r.q5_otro || '',
      'Ventas diarias aprox. (P6)': r.q6 || '',
      'TelÃ©fono con internet (P7)': r.q7 || '',
      'Â¿Conoce Ley 21.745? (P8)': r.q8 || '',
      'Fuentes de informaciÃ³n (P9)': Array.isArray(r.q9) ? r.q9.join('; ') : (r.q9 || ''),
      'P9 - Otra fuente': r.q9_otro || '',
      'Visita/charla municipal (P10)': r.q10 || '',
      'Permiso municipal (P11)': r.q11 || '',
      'TrÃ¡mite SII independiente (P12)': r.q12 || '',
      'Medios de pago (P13)': Array.isArray(r.q13) ? r.q13.join('; ') : (r.q13 || ''),
      'Â¿Recibe pagos con tarjeta? (P14)': r.q14 || '',
      'P14.1 - Ventas con tarjeta': r.q14_sub || '',
      'Â¿Sabe porcentaje impuesto? (P15)': r.q15 || '',
      'SituaciÃ³n actual Ley (P16)': r.q16 || '',
      'SecciÃ³n asignada': r.seccion ? `SecciÃ³n ${r.seccion}` : '',
      
      // Rama A (Inscritos)
      'A1 - Facilidad inscripciÃ³n': r.a1 || '',
      'A2 - Mayor dificultad': r.a2 || '',
      'A2 - Otra dificultad': r.a2_otro || '',
      'A3 - Cambios en su trabajo': r.a3 || '',
      'A4 - Mayor dificultad actual': r.a4 || '',
      'A4 - Otra dificultad': r.a4_otro || '',

      // Rama B (No inscritos)
      'B1 - RazÃ³n por la que no se inscribiÃ³': r.b1 || '',
      'B1 - Otra razÃ³n': r.b1_otro || '',
      'B2 - Â¿Le gustarÃ­a inscribirse?': r.b2 || '',
      'B3 - QuÃ© facilitarÃ­a su incorporaciÃ³n': r.b3 || '',
      'B3 - Otra necesidad': r.b3_otro || '',

      // Rama C (En trÃ¡mite)
      'C1 - SituaciÃ³n del trÃ¡mite': r.c1 || '',
      'C2 - Mayor dificultad en trÃ¡mite': r.c2 || '',
      'C2 - Otra dificultad': r.c2_otro || '',
      'C3 - Ayuda mÃ¡s Ãºtil': r.c3 || '',
      'C3 - Otra ayuda': r.c3_otro || '',

      // Rama D (No sabe)
      'D1 - RazÃ³n por la que no sabe': r.d1 || '',
      'D1 - Otra razÃ³n': r.d1_otro || '',
      'D2 - TrÃ¡mite relacionado': r.d2 || '',
      'D3 - Sabe dÃ³nde consultar': r.d3 || '',
      'D4 - Desea informaciÃ³n de su situaciÃ³n': r.d4 || '',

      // Bloque 5: Cierre
      'P17 - Â¿InformaciÃ³n suficiente?': r.q17 || '',
      'P18 - Â¿Desea mÃ¡s informaciÃ³n?': r.q18 || '',
      'P18 - Fuentes preferidas': Array.isArray(r.q18_fuente) ? r.q18_fuente.join('; ') : (r.q18_fuente || ''),
      'P18 - Otra fuente': r.q18_otro || ''
    };

    // AÃ±adir columnas de preguntas dinÃ¡micas
    (state.dynamicQuestions || []).forEach(dq => {
      const key = `dq_${dq.id}`;
      const colTitle = `DinÃ¡mica #${dq.orden || ''}: ${dq.titulo}`;
      const val = r[key];
      row[colTitle] = Array.isArray(val) ? val.join('; ') : (val || '');
    });

    return row;
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `respuestas_encuesta_ferias_${dateStr}.xlsx`;

  // 1. Exportar con SheetJS si estÃ¡ disponible
  if (typeof XLSX !== 'undefined') {
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Ajustar ancho automÃ¡tico de columnas
      const colWidths = Object.keys(rows[0] || {}).map(key => {
        const maxLen = Math.max(
          key.length,
          ...rows.map(r => String(r[key] || '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Respuestas");
      XLSX.writeFile(wb, fileName);
      toast(`Â¡Excel generado con ${rows.length} respuestas!`, 'success');
      return;
    } catch (err) {
      console.warn('Error con XLSX, usando fallback CSV:', err);
    }
  }

  // 2. Fallback CSV compatible con Excel (UTF-8 BOM con separador punto y coma)
  try {
    const headers = Object.keys(rows[0]);
    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'),
      ...rows.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `respuestas_encuesta_ferias_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`Â¡Archivo CSV descargado con ${rows.length} respuestas!`, 'success');
  } catch (err) {
    console.error('Error al exportar:', err);
    toast('Error al generar la exportaciÃ³n.', 'error');
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TOAST NOTIFICATIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toast(message, type = 'info') {
  const container = document.getElementById('admin-toast');
  if (!container) return;

  const bg = { success:'bg-brand-600', error:'bg-red-500', info:'bg-gray-700' }[type] || 'bg-gray-700';
  const icon = type === 'success'
    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>';

  const el = document.createElement('div');
  el.className = `pointer-events-auto ${bg} text-white px-5 py-3 rounded-xl shadow-xl
    text-sm font-semibold flex items-center gap-2.5 w-full
    transition-all duration-300`;
  el.style.animation = 'fadeIn .3s ease';
  el.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>
    <span>${message}</span>`;

  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UTILIDADES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// API GLOBAL (para atributos onclick en HTML)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

window.__admin = {
  logout,
  showPanel,
  applyFilters,
  renderQ8Chart,
  renderFeriaDirectiveChart,
  renderChart,
  renderDistributionChart,
  toggleOpciones,
  cancelEdit,
  generateQR,
  downloadQR,
  printPoster,
  openMobileMenu,
  closeMobileMenu,
  showQuestionTab,
  moveQuestion,
  saveAllFixedQuestions,
  addOption,
  removeOption,
  addDqOption,
  removeDqOption,
  editDQ,
  deleteDQ,
  exportToExcel
};


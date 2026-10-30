// ============================================================
// js/admin.js â€“ LÃ³gica Completa del Panel de AdministraciÃ³n
// Firebase Auth + Firestore + Chart.js + QRCode.js
// ============================================================

import { db, auth } from './config.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, onSnapshot, serverTimestamp
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ESTADO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const state = {
  allResponses:     [],
  filteredResponses:[],
  dynamicQuestions: [],
  chartInstance:    null,
  currentPanel:     'dashboard'
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
  document.getElementById('login-screen').style.display = which === 'login' ? 'flex' : 'none';
  document.getElementById('admin-panel').style.display  = which === 'admin'  ? 'flex'  : 'none';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LISTENERS EN TIEMPO REAL (Firestore)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  onSnapshot(dqQuery, (snap) => {
    state.dynamicQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDQList();
    refreshChartQuestionSelect();
  }, (err) => console.error('Listener preguntas_dinamicas:', err));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ESTADÃSTICAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function updateStats() {
  const total      = state.allResponses.length;
  const recoleta   = state.allResponses.filter(r => r.q1 === 'Recoleta').length;
  const huechuraba = state.allResponses.filter(r => r.q1 === 'Huechuraba').length;
  const inscritos  = state.allResponses.filter(r => r.q7 === 'SÃ­').length;

  setText('stat-total',      total);
  setText('stat-recoleta',   recoleta);
  setText('stat-huechuraba', huechuraba);
  setText('stat-inscritos',  inscritos);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FILTROS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function applyFilters() {
  const comuna = val('filter-comuna');
  const feria  = val('filter-feria');
  const q7     = val('filter-q7');

  let filtered = [...state.allResponses];
  if (comuna) filtered = filtered.filter(r => r.q1 === comuna);
  if (feria)  filtered = filtered.filter(r => r.q2 === feria);
  if (q7)     filtered = filtered.filter(r => r.q7 === q7);

  state.filteredResponses = filtered;

  // Actualizar dropdown de ferias segÃºn comuna
  updateFeriaSelect(comuna);

  // Actualizar tabla y grÃ¡fico
  renderTable();
  renderChart();

  const countEl = document.getElementById('table-count');
  if (countEl) countEl.textContent = `${filtered.length} de ${state.allResponses.length} respuestas`;
}

function updateFeriaSelect(selectedComuna) {
  const select = document.getElementById('filter-feria');
  if (!select) return;

  const current = select.value;
  select.innerHTML = '<option value="">Todas las ferias</option>';

  const ferias = selectedComuna
    ? (FERIAS[selectedComuna] || [])
    : [...(FERIAS.Recoleta || []), ...(FERIAS.Huechuraba || [])];

  ferias.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    if (f === current) opt.selected = true;
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

  const q7Badges = {
    'SÃ­':                          'bg-emerald-100 text-emerald-700',
    'No':                          'bg-red-100 text-red-700',
    'Estoy realizando el trÃ¡mite': 'bg-amber-100 text-amber-700',
    'No sÃ© si estoy inscrito':     'bg-slate-100 text-slate-600'
  };

  tbody.innerHTML = state.filteredResponses.map(r => {
    const badgeCls = q7Badges[r.q7] || 'bg-gray-100 text-gray-600';
    const feriaShort = r.q2 ? (r.q2.length > 24 ? r.q2.slice(0, 24) + 'â€¦' : r.q2) : 'â€“';
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">${r.fechaRespuesta || 'â€“'}</td>
        <td class="px-4 py-3 text-slate-700 font-semibold text-xs">${r.q1 || 'â€“'}</td>
        <td class="px-4 py-3 text-slate-600 text-xs" title="${r.q2 || ''}">${feriaShort}</td>
        <td class="px-4 py-3">
          <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeCls}">
            ${r.q7 || 'â€“'}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            ${r.seccion ? `SecciÃ³n ${r.seccion}` : 'â€“'}
          </span>
        </td>
        <td class="px-4 py-3 text-slate-600 text-xs">${r.q4 || 'â€“'}</td>
      </tr>`;
  }).join('');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GRÃFICO (Chart.js)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderChart() {
  const questionId = val('chart-question');
  const chartType  = val('chart-type') || 'bar';
  const emptyEl    = document.getElementById('chart-empty');
  const canvas     = document.getElementById('main-chart');

  if (!canvas) return;

  // Destruir grÃ¡fico anterior
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  // Conteo de respuestas por opciÃ³n
  const tally = {};
  (state.filteredResponses || []).forEach(r => {
    // El valor puede ser string o array (multi-select)
    let answer;
    if (questionId.startsWith('dq_')) {
      answer = r[questionId];
    } else {
      answer = r[questionId];
    }
    if (answer == null || answer === '') return;

    if (Array.isArray(answer)) {
      answer.forEach(a => { if (a) tally[a] = (tally[a] || 0) + 1; });
    } else {
      tally[answer] = (tally[answer] || 0) + 1;
    }
  });

  const labels = Object.keys(tally);
  const data   = Object.values(tally);

  if (!labels.length) {
    emptyEl && emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl && emptyEl.classList.add('hidden');

  // Tipo de grÃ¡fico + indexAxis para barras horizontales
  let type      = chartType;
  let indexAxis = 'x';
  if (chartType === 'horizontalBar') { type = 'bar'; indexAxis = 'y'; }

  const isRound = ['pie', 'doughnut'].includes(type);
  const isRadar = type === 'radar';

  const bgColors = labels.map((_, i) => PALETTE[i % PALETTE.length] + 'CC');
  const bdColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

  const ctx = canvas.getContext('2d');
  state.chartInstance = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        label: 'Respuestas',
        data,
        backgroundColor: (isRound || isRadar) ? bgColors : PALETTE[0] + 'CC',
        borderColor:     (isRound || isRadar) ? bdColors : PALETTE[0],
        borderWidth: 2,
        borderRadius: type === 'bar' ? 6 : 0,
        tension: 0.4,
        fill: type === 'line' ? false : undefined
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis,
      plugins: {
        legend: {
          display: isRound || isRadar,
          position: 'bottom',
          labels: {
            padding: 16,
            font: { family: 'Inter', size: 11 },
            usePointStyle: true
          }
        },
        tooltip: {
          titleFont: { family: 'Inter', size: 12 },
          bodyFont:  { family: 'Inter', size: 12 },
          callbacks: {
            label(ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const raw   = typeof ctx.parsed === 'object'
                ? (ctx.parsed.y ?? ctx.parsed.r ?? ctx.raw)
                : ctx.parsed;
              const pct   = total > 0 ? ((raw / total) * 100).toFixed(1) : 0;
              return ` ${raw} respuestas (${pct}%)`;
            }
          }
        }
      },
      scales: (isRound || isRadar) ? {} : {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10 } } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10 } }, beginAtZero: true }
      }
    }
  });
}

/** AÃ±ade opciones de preguntas dinÃ¡micas al selector del grÃ¡fico */
function refreshChartQuestionSelect() {
  const sel = document.getElementById('chart-question');
  if (!sel) return;

  // Eliminar opciones dinÃ¡micas anteriores
  sel.querySelectorAll('[data-dq]').forEach(el => el.remove());

  state.dynamicQuestions.forEach(dq => {
    const opt = document.createElement('option');
    opt.value = `dq_${dq.id}`;
    opt.setAttribute('data-dq', '1');
    opt.textContent = `PD â€“ ${dq.titulo.slice(0, 40)}${dq.titulo.length > 40 ? 'â€¦' : ''}`;
    sel.appendChild(opt);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GESTIÃ“N DE PREGUNTAS DINÃMICAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    const payload = { titulo, tipo, opciones, orden, updatedAt: serverTimestamp() };

    if (editId) {
      await updateDoc(doc(db, 'preguntas_dinamicas', editId), payload);
      toast('Pregunta actualizada y sincronizada con la encuesta.', 'success');
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, 'preguntas_dinamicas'), payload);
      toast('Pregunta agregada. Â¡Ya aparece en la encuesta pÃºblica!', 'success');
    }
    resetQuestionForm();
  } catch (err) {
    console.error('Error guardando pregunta:', err);
    toast('Error al guardar la pregunta.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

function resetQuestionForm() {
  document.getElementById('edit-q-id').value      = '';
  document.getElementById('q-titulo').value       = '';
  document.getElementById('q-tipo').value         = 'single';
  document.getElementById('q-opciones').value     = '';
  document.getElementById('q-orden').value        = '1';
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
    toast('Pregunta eliminada.', 'success');
  } catch {
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

  // Renderizar preguntas fijas si se abre ese panel
  if (name === 'preguntas-fijas') {
    renderFixedQuestions('general');
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

/** DefiniciÃ³n de todas las preguntas fijas editables */
const FIXED_QUESTIONS = {
  general: [
    { id: 'q1', badge: 'Pregunta 1', text: 'Â¿En quÃ© comuna se encuentra la feria donde trabaja actualmente?', options: ['Huechuraba', 'Recoleta'], type: 'single' },
    { id: 'q2', badge: 'Pregunta 2', text: 'Â¿En cuÃ¡l de las siguientes ferias libres trabaja actualmente?', options: [], type: 'single', note: 'Opciones dinÃ¡micas segÃºn comuna seleccionada' },
    { id: 'q3', badge: 'Pregunta 3', text: 'Â¿CuÃ¡nto tiempo lleva trabajando en la feria?', options: ['Menos de 5 aÃ±os.', 'Entre 5 y 10 aÃ±os.', 'MÃ¡s de 10 aÃ±os.'], type: 'single' },
    { id: 'q4', badge: 'Pregunta 4', text: 'Â¿Ha escuchado hablar del nuevo rÃ©gimen tributario para comerciantes de ferias libres?', options: ['SÃ­.', 'No.'], type: 'single' },
    { id: 'q5', badge: 'Pregunta 5', text: 'Â¿De dÃ³nde ha recibido informaciÃ³n sobre este nuevo rÃ©gimen?', options: ['SII.', 'Municipalidad.', 'Dirigentes de la feria u otros comerciantes.', 'Contador o asesor.', 'Redes sociales / noticias.', 'No he recibido informaciÃ³n.', 'Otro.'], type: 'multi' },
    { id: 'q6', badge: 'Pregunta 6', text: 'Â¿Actualmente acepta pagos con tarjeta mediante una mÃ¡quina o dispositivo de pago?', options: ['SÃ­.', 'No.'], type: 'single' },
    { id: 'q7', badge: 'Pregunta 7', text: 'Â¿EstÃ¡ inscrito en el nuevo rÃ©gimen tributario para ferias libres?', options: ['SÃ­', 'No', 'Estoy realizando el trÃ¡mite', 'No sÃ© si estoy inscrito'], type: 'single' },
    { id: 'q8', badge: 'Pregunta 8 â€“ Cierre', text: 'En general, Â¿considera que los comerciantes han recibido suficiente informaciÃ³n sobre este nuevo rÃ©gimen?', options: ['SÃ­', 'MÃ¡s o menos', 'No', 'No podrÃ­a decirlo'], type: 'single' }
  ],
  secA: [
    { id: 'a1', badge: 'SecciÃ³n A â€“ 1', text: 'Â¿QuÃ© tan fÃ¡cil o difÃ­cil fue inscribirse?', options: ['FÃ¡cil', 'Ni fÃ¡cil ni difÃ­cil', 'DifÃ­cil', 'Otra persona realizÃ³ el trÃ¡mite por mÃ­'], type: 'single' },
    { id: 'a2', badge: 'SecciÃ³n A â€“ 2', text: 'Â¿QuÃ© fue lo mÃ¡s difÃ­cil de incorporarse a este rÃ©gimen?', options: ['Entender cÃ³mo funciona la ley', 'Hacer el trÃ¡mite de inscripciÃ³n', 'Utilizar la mÃ¡quina para recibir pagos con tarjeta', 'Pagar las comisiones de la mÃ¡quina', 'No tuve dificultades', 'Otro'], type: 'single_other' },
    { id: 'a3', badge: 'SecciÃ³n A â€“ 3', text: 'Desde que se inscribiÃ³, Â¿ha cambiado algo en la forma en que trabaja?', options: ['SÃ­, comencÃ© a recibir pagos con tarjeta', 'SÃ­, realicÃ© otros cambios', 'No, sigo trabajando igual'], type: 'single' },
    { id: 'a4', badge: 'SecciÃ³n A â€“ 4', text: 'Actualmente, Â¿quÃ© es lo que mÃ¡s le cuesta del nuevo rÃ©gimen?', options: ['Entender cÃ³mo funciona el impuesto', 'Usar los medios de pago electrÃ³nicos', 'Los costos o comisiones', 'Cumplir con trÃ¡mites u obligaciones', 'No tengo dificultades', 'Otro'], type: 'single' }
  ],
  secB: [
    { id: 'b1', badge: 'SecciÃ³n B â€“ 1', text: 'Â¿CuÃ¡l es la principal razÃ³n por la que no se ha inscrito?', options: ['No conozco bien el rÃ©gimen', 'No sÃ© cÃ³mo inscribirme', 'Tengo dudas sobre los requisitos', 'Tengo dudas sobre los impuestos o costos', 'No cumplo con los requisitos', 'No me interesa inscribirme', 'Otro'], type: 'single_other' },
    { id: 'b2', badge: 'SecciÃ³n B â€“ 2', text: 'Â¿Le gustarÃ­a inscribirse en este rÃ©gimen?', options: ['SÃ­', 'No', 'No sÃ©'], type: 'single' },
    { id: 'b3', badge: 'SecciÃ³n B â€“ 3', text: 'Â¿QuÃ© necesitarÃ­a para facilitar su incorporaciÃ³n?', options: ['Que me expliquen mejor la ley', 'Ayuda para hacer el trÃ¡mite', 'InformaciÃ³n sobre los impuestos y costos', 'Nada, no necesito ayuda', 'Otro'], type: 'single_other' }
  ],
  secC: [
    { id: 'c1', badge: 'SecciÃ³n C â€“ 1', text: 'Â¿En quÃ© situaciÃ³n se encuentra su trÃ¡mite?', options: ['ReciÃ©n lo iniciÃ©', 'Estoy reuniendo antecedentes o requisitos', 'Estoy esperando finalizarlo', 'He tenido problemas para completarlo', 'No sÃ©'], type: 'single' },
    { id: 'c2', badge: 'SecciÃ³n C â€“ 2', text: 'Â¿CuÃ¡l ha sido su principal dificultad durante el trÃ¡mite?', options: ['No entiendo bien el proceso', 'Problemas con la plataforma o trÃ¡mite del SII', 'Me faltan antecedentes o requisitos', 'Necesito ayuda de otra persona', 'No he tenido dificultades', 'Otro'], type: 'single' },
    { id: 'c3', badge: 'SecciÃ³n C â€“ 3', text: 'Â¿QuÃ© ayuda le serÃ­a mÃ¡s Ãºtil para terminar el trÃ¡mite?', options: ['Que me expliquen los pasos', 'Ayuda directa para realizar el trÃ¡mite', 'InformaciÃ³n sobre impuestos y costos', 'No necesito ayuda', 'Otro'], type: 'single' }
  ],
  secD: [
    { id: 'd1', badge: 'SecciÃ³n D â€“ 1', text: 'Â¿Ha realizado algÃºn trÃ¡mite relacionado con este nuevo rÃ©gimen?', options: ['SÃ­', 'No', 'No recuerdo', 'No sÃ©'], type: 'single' },
    { id: 'd2', badge: 'SecciÃ³n D â€“ 2', text: 'Â¿Alguien le ha explicado cÃ³mo saber si estÃ¡ inscrito?', options: ['SÃ­', 'No'], type: 'single' },
    { id: 'd3', badge: 'SecciÃ³n D â€“ 3', text: 'Â¿Le gustarÃ­a recibir informaciÃ³n para revisar su situaciÃ³n?', options: ['SÃ­', 'No', 'No sÃ©'], type: 'single' }
  ]
};

let currentFixedTab = 'general';

function showQuestionTab(tab) {
  currentFixedTab = tab;

  // Actualizar botones de tab
  document.querySelectorAll('.q-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.className = 'q-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 transition-colors';
    } else {
      btn.className = 'q-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors';
    }
  });

  renderFixedQuestions(tab);
}

function renderFixedQuestions(tab) {
  const container = document.getElementById('fixed-questions-container');
  if (!container) return;

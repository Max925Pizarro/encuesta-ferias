// ============================================================
// js/survey.js – Cuestionario Completo y Flujo Condicional
// Encuesta a comerciantes de ferias libres – Ley N.º 21.745
// Contador Público y Auditor · USACH
// ============================================================

import { db } from './config.js';
import {
  collection, addDoc, doc, query, orderBy, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ──────────────────────────────────────────────────────────────
// DATOS ESTÁTICOS Y SUGERENCIAS
// ──────────────────────────────────────────────────────────────

const FERIAS_POR_COMUNA = {
  Recoleta: [
    { feria: 'Zapadores 393', dia: 'Martes' },
    { feria: 'Zapadores 392', dia: 'Martes' },
    { feria: 'Chacabuco Grande', dia: 'Miércoles' },
    { feria: 'Einstein', dia: 'Jueves' },
    { feria: 'El Guanaco', dia: 'Jueves' },
    { feria: 'San José', dia: 'Jueves' },
    { feria: 'Raquel', dia: 'Viernes' },
    { feria: 'Valdivieso', dia: 'Viernes' },
    { feria: 'Einstein Poniente', dia: 'Sábado' },
    { feria: 'N.º 9 Héroes de la Concepción', dia: 'Sábado' },
    { feria: 'El Guanaco', dia: 'Domingo' },
    { feria: 'La Serena', dia: 'Domingo' }
  ],
  Huechuraba: [
    { feria: 'Aguirre Luco (Feria Libre N.º 1)', dia: 'Martes' },
    { feria: 'Pablo Neruda (Feria Libre N.º 3)', dia: 'Miércoles' },
    { feria: 'Pablo Neruda (Feria Libre N.º 3)', dia: 'Sábado' },
    { feria: 'Salvador Allende (Feria Libre N.º 2)', dia: 'Domingo' }
  ]
};

// ──────────────────────────────────────────────────────────────
// DEFINICIÓN DE TODOS LOS PASOS DEL CUESTIONARIO
// ──────────────────────────────────────────────────────────────

const STEPS = {
  welcome: { id: 'welcome', type: 'welcome' },

  // ══════ BLOQUE 1: DATOS GENERALES Y PERFIL ══════
  q1: {
    id: 'q1', type: 'single',
    badge: 'Bloque 1 · Datos Generales',
    text: '¿En qué comuna se encuentra la feria donde trabaja actualmente?',
    options: ['Huechuraba', 'Recoleta']
  },

  q2: {
    id: 'q2', type: 'feria_dia',
    badge: 'Bloque 1 · Datos Generales',
    text: '¿En qué feria trabaja actualmente y qué día?',
    hint: 'Indique el nombre de la feria y el día de la semana en que trabaja.'
  },

  q3: {
    id: 'q3', type: 'single',
    badge: 'Bloque 1 · Perfil',
    text: '¿Cuánto tiempo lleva trabajando en ferias libres?',
    options: [
      'Menos de 5 años.',
      'Entre 5 y 10 años.',
      'Más de 10 años.'
    ]
  },

  q4: {
    id: 'q4', type: 'single',
    badge: 'Bloque 1 · Perfil',
    text: '¿Cuántos días a la semana trabaja en ferias libres?',
    options: [
      '1 día.',
      '2 días.',
      '3 días o más.'
    ]
  },

  q5: {
    id: 'q5', type: 'single_other',
    badge: 'Bloque 1 · Perfil',
    text: '¿Qué vende principalmente en la feria?',
    options: [
      'Frutas y verduras.',
      'Alimentos.',
      'Ropa o calzado.',
      'Artículos para el hogar.',
      'Otros productos:'
    ]
  },

  q6: {
    id: 'q6', type: 'single',
    badge: 'Bloque 1 · Perfil',
    text: 'Aproximadamente, ¿cuántas ventas realiza en un día normal de feria?',
    options: [
      'Menos de 10 ventas.',
      'Entre 10 y 30 ventas.',
      'Más de 30 ventas.',
      'No sabría estimarlo.'
    ]
  },

  q7: {
    id: 'q7', type: 'single',
    badge: 'Bloque 1 · Perfil',
    text: '¿Tiene un teléfono con internet que utilice habitualmente?',
    options: ['Sí.', 'No.']
  },

  // ══════ BLOQUE 2: CONOCIMIENTO Y MEDIOS DE PAGO ══════
  q8: {
    id: 'q8', type: 'single',
    badge: 'Bloque 2 · Conocimiento de la Ley',
    text: '¿Había escuchado hablar de la Ley N.º 21.745 para comerciantes de ferias libres??',
    options: [
      'Sí, y sé de qué se trata.',
      'Sí, pero sé poco sobre ella .',
      'No, nunca había escuchado hablar de ella.'
    ]
  },

  q9: {
    id: 'q9', type: 'multi',
    badge: 'Bloque 2 · Fuentes de Información',
    text: '¿De dónde ha recibido información sobre esta nueva ley?',
    hint: 'Puede seleccionar una o más alternativas.',
    options: [
      'SII.',
      'Municipalidad.',
      'Dirigentes de la feria u otros comerciantes.',
      'Contador o asesor.',
      'Redes sociales o noticias.',
      'No he recibido información.',
      'Otro.'
    ]
  },

  q10: {
    id: 'q10', type: 'single',
    badge: 'Bloque 2 · Información Municipal',
    text: '¿Ha recibido alguna visita, charla o información de la municipalidad sobre esta nueva ley?',
    options: ['Sí.', 'No.', 'No recuerdo.']
  },

  q11: {
    id: 'q11', type: 'single',
    badge: 'Bloque 2 · Situación Municipal',
    text: '¿Cuenta con permiso de la municipalidad para trabajar en la feria?',
    options: ['Sí.', 'No.', 'No sé.']
  },

  q12: {
    id: 'q12', type: 'single',
    badge: 'Bloque 2 · Trámite SII',
    text: '¿Alguna vez realizó un trámite en el SII para registrarse como comerciante o trabajador independiente?',
    options: ['Sí.', 'No.', 'No sé / no recuerdo.']
  },

  q13: {
    id: 'q13', type: 'multi',
    badge: 'Bloque 2 · Medios de Pago',
    text: '¿Qué medios de pago acepta actualmente en su puesto?',
    hint: 'Puede marcar todos los que utilice.',
    options: [
      'Efectivo.',
      'Tarjeta de débito o crédito.',
      'Transferencias bancarias.'
    ]
  },

  q14: {
    id: 'q14', type: 'single',
    badge: 'Bloque 2 · Pagos con Tarjeta',
    text: '¿Actualmente recibe pagos con tarjeta mediante una máquina o dispositivo de pago?',
    options: ['Sí.', 'No.']
  },

  // Condicional 1 (solo si q14 === 'Sí')
  q14_sub: {
    id: 'q14_sub', type: 'single',
    badge: 'Bloque 2 · Uso de Tarjeta',
    text: 'Aproximadamente, ¿qué parte de sus ventas se paga con tarjeta?',
    options: [
      'Pocas ventas.',
      'Más o menos la mitad.',
      'La mayoría.',
      'Casi todas.'
    ]
  },

  q15: {
    id: 'q15', type: 'single',
    badge: 'Bloque 2 · Impuesto Ley 21.745',
    text: '¿Sabe qué porcentaje de impuestos establece la nueva ley para las ventas realizadas mediante los medios de pagos electrónicos autorizados?',
    options: [
      'Sí, conozco el porcentaje.',
      'Tengo una idea, pero no estoy seguro/a.',
      'No lo sé.'
    ]
  },

  // ══════ BLOQUE 3: PREGUNTA CLAVE DE RAMIFICACIÓN ══════
  q16: {
    id: 'q16', type: 'single',
    badge: 'Bloque 3 · Situación Actual',
    text: '¿Cuál es su situación actual respecto de la nueva ley para comerciantes de ferias libres?',
    options: [
      'Estoy inscrito/a.',
      'No estoy inscrito/a.',
      'Estoy realizando el trámite.',
      'No sé si estoy inscrito/a.'
    ]
  },

  // ══════ BLOQUE 4: RAMA A (Inscritos) ══════
  a1: {
    id: 'a1', type: 'single', section: 'A',
    badge: 'Rama A · Comerciantes Inscritos',
    text: '¿Qué tan fácil o difícil fue inscribirse?',
    options: [
      'Fácil.',
      'Ni fácil ni difícil.',
      'Difícil.',
      'Otra persona realizó el trámite por mí.'
    ]
  },
  a2: {
    id: 'a2', type: 'single_other', section: 'A',
    badge: 'Rama A · Comerciantes Inscritos',
    text: '¿Cuál fue la principal dificultad que tuvo para incorporarse?',
    options: [
      'Entender cómo funciona la nueva ley.',
      'Realizar el trámite.',
      'Aprender a utilizar la máquina de pago.',
      'Pagar las comisiones o costos de la máquina.',
      'No tuve dificultades.',
      'Otro:'
    ]
  },
  a3: {
    id: 'a3', type: 'single', section: 'A',
    badge: 'Rama A · Comerciantes Inscritos',
    text: 'Desde que se inscribió, ¿ha cambiado algo en la forma en que trabaja?',
    options: [
      'Sí, comencé a recibir pagos con tarjeta.',
      'Sí, realicé otros cambios.',
      'No, sigo trabajando igual.'
    ]
  },
  a4: {
    id: 'a4', type: 'single_other', section: 'A',
    badge: 'Rama A · Comerciantes Inscritos',
    text: 'Actualmente, ¿qué es lo que más le cuesta del nuevo sistema?',
    options: [
      'Entender cómo funciona el impuesto.',
      'Usar los medios de pago electrónicos.',
      'Los costos o comisiones.',
      'Cumplir con trámites u obligaciones.',
      'No tengo dificultades.',
      'Otro.'
    ]
  },

  // ══════ BLOQUE 4: RAMA B (No inscritos) ══════
  b1: {
    id: 'b1', type: 'single_other', section: 'B',
    badge: 'Rama B · No Inscritos',
    text: '¿Cuál es la principal razón por la que no se ha inscrito?',
    options: [
      'No conozco bien la nueva ley.',
      'No sé cómo inscribirme.',
      'Tengo dudas sobre los requisitos.',
      'Tengo dudas sobre cuánto debería pagar.',
      'No cumplo algún requisito.',
      'No me interesa inscribirme.',
      'Otro:'
    ]
  },
  b2: {
    id: 'b2', type: 'single', section: 'B',
    badge: 'Rama B · No Inscritos',
    text: '¿Le gustaría inscribirse en este nuevo sistema?',
    options: ['Sí.', 'No.', 'No sé.']
  },
  b3: {
    id: 'b3', type: 'single_other', section: 'B',
    badge: 'Rama B · No Inscritos',
    text: '¿Qué sería lo más útil para facilitar su incorporación?',
    options: [
      'Que me expliquen mejor cómo funciona.',
      'Ayuda para hacer el trámite.',
      'Información sobre cuánto tendría que pagar.',
      'Ayuda para utilizar medios de pago con tarjeta.',
      'Nada, no necesito ayuda.',
      'Otro:'
    ]
  },

  // ══════ BLOQUE 4: RAMA C (En trámite) ══════
  c1: {
    id: 'c1', type: 'single', section: 'C',
    badge: 'Rama C · En Trámite',
    text: '¿En qué situación se encuentra su trámite?',
    options: [
      'Recién lo inicié.',
      'Estoy reuniendo antecedentes o requisitos.',
      'Estoy esperando finalizarlo.',
      'He tenido problemas para completarlo.',
      'No sé.'
    ]
  },
  c2: {
    id: 'c2', type: 'single_other', section: 'C',
    badge: 'Rama C · En Trámite',
    text: '¿Cuál ha sido su principal dificultad durante el trámite?',
    options: [
      'No entiendo bien el proceso.',
      'Problemas con la página o el trámite del SII.',
      'Me faltan antecedentes o requisitos.',
      'Necesito ayuda de otra persona.',
      'No he tenido dificultades.',
      'Otro.'
    ]
  },
  c3: {
    id: 'c3', type: 'single_other', section: 'C',
    badge: 'Rama C · En Trámite',
    text: '¿Qué ayuda le sería más útil para terminar el trámite?',
    options: [
      'Que me expliquen los pasos.',
      'Ayuda directa para hacer el trámite.',
      'Información sobre impuestos y costos.',
      'No necesito ayuda.',
      'Otro.'
    ]
  },

  // ══════ BLOQUE 4: RAMA D (No sabe) ══════
  d1: {
    id: 'd1', type: 'single_other', section: 'D',
    badge: 'Rama D · Situación Indeterminada',
    text: '¿Cuál cree que es la principal razón por la que no sabe si está inscrito/a?',
    options: [
      'No conozco bien cómo funciona la nueva ley.',
      'Otra persona realizó trámites por mí.',
      'He hecho trámites en el SII, pero no sé si corresponden a esta ley.',
      'No sé dónde revisar mi situación.',
      'Nunca he recibido información clara sobre este tema.',
      'No recuerdo.',
      'Otro:'
    ]
  },
  d2: {
    id: 'd2', type: 'single', section: 'D',
    badge: 'Rama D · Situación Indeterminada',
    text: '¿Ha realizado algún trámite relacionado con la nueva ley?',
    options: ['Sí.', 'No.', 'No recuerdo / no sé.']
  },
  d3: {
    id: 'd3', type: 'single', section: 'D',
    badge: 'Rama D · Situación Indeterminada',
    text: '¿Sabe dónde podría consultar si está inscrito/a?',
    options: ['Sí.', 'No.']
  },
  d4: {
    id: 'd4', type: 'single', section: 'D',
    badge: 'Rama D · Situación Indeterminada',
    text: '¿Le gustaría recibir información para revisar su situación?',
    options: ['Sí.', 'No.', 'No sé.']
  },

  // ══════ BLOQUE 5: CIERRE (Para todos) ══════
  q17: {
    id: 'q17', type: 'single',
    badge: 'Bloque 5 · Evaluación General',
    text: '¿Usted personalmente siente que tiene suficiente información para entender cómo funciona esta nueva ley?',
    options: [
      'Sí, tengo suficiente información.',
      'Tengo algo de información, pero me faltan cosas por entender.',
      'No, siento que me falta información.',
      'No podría decirlo.'
    ]
  },

  q18: {
    id: 'q18', type: 'q18_expandable',
    badge: 'Bloque 5 · Cierre',
    text: '¿Le gustaría recibir más información o ayuda sobre esta nueva ley?',
    options: ['Sí.', 'No.'],
    sourceOptions: [
      'SII.',
      'Municipalidad.',
      'Dirigentes de la feria.',
      'Contador o asesor.',
      'Otro:'
    ]
  },

  thanks: { id: 'thanks', type: 'thanks' }
};

// ──────────────────────────────────────────────────────────────
// ESTADO GLOBAL REACTIVO (STATE MANAGEMENT)
// ──────────────────────────────────────────────────────────────

const state = {
  stepSequence: [],       // Lista reactiva de IDs de pasos según respuestas
  currentIndex: 0,        // Índice en stepSequence
  answers: {},            // Diccionario de respuestas { [qid]: valor }
  dynamicQuestions: [],   // Preguntas dinámicas desde Firestore
  submitting: false       // Bandera de envío a Firestore
};

// ──────────────────────────────────────────────────────────────
// LÓGICA DE FLUJO DINÁMICO (CÓMPUTO DE SECUENCIA)
// ──────────────────────────────────────────────────────────────

function buildStepSequence() {
  const seq = ['welcome'];

  // Bloque 1
  seq.push('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7');

  // Bloque 2
  seq.push('q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14');

  // Lógica Condicional 1: Si responde Sí en q14, se muestra q14_sub
  const ansQ14 = String(state.answers.q14 || '').trim();
  if (ansQ14.startsWith('Sí')) {
    seq.push('q14_sub');
  } else if (ansQ14.startsWith('No')) {
    // Si responde NO, etiqueta automática
    state.answers.q14_sub = 'No utiliza pagos con tarjeta';
  }

  seq.push('q15', 'q16');

  // Lógica Condicional 2: Ramificación según q16
  const ansQ16 = String(state.answers.q16 || '').trim();
  if (ansQ16.includes('Estoy inscrito/a') || ansQ16.startsWith('A')) {
    seq.push('a1', 'a2', 'a3', 'a4');
  } else if (ansQ16.includes('No estoy inscrito/a') || ansQ16.startsWith('B')) {
    seq.push('b1', 'b2', 'b3');
  } else if (ansQ16.includes('realizando el trámite') || ansQ16.startsWith('C')) {
    seq.push('c1', 'c2', 'c3');
  } else if (ansQ16.includes('No sé si estoy inscrito/a') || ansQ16.startsWith('D')) {
    seq.push('d1', 'd2', 'd3', 'd4');
  }

  // Preguntas dinámicas activas añadidas desde el panel de administración (excluyendo la eliminada)
  const sortedDQs = [...state.dynamicQuestions]
    .filter(dq => dq.id !== '4bewFS5wfu0aWyABtuUX' && !String(dq.titulo || '').toLowerCase().includes('permiso o patente'))
    .sort((a, b) => {
      return (Number(a.orden) || 999) - (Number(b.orden) || 999);
    });
  sortedDQs.forEach(dq => seq.push(`dq_${dq.id}`));

  // Bloque 5: Cierre
  seq.push('q17', 'q18');

  // Pantalla final
  seq.push('thanks');

  return seq;
}

// ──────────────────────────────────────────────────────────────
// HELPERS DE ESCAPE HTML
// ──────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function isOtherOption(opt) {
  if (!opt || typeof opt !== 'string') return false;
  const s = opt.trim().toLowerCase();
  return s === 'otro' || s === 'otro.' || s === 'otro:' || s.startsWith('otro: ') || s.startsWith('otros productos:');
}

// ──────────────────────────────────────────────────────────────
// RESOLUCIÓN DE DEFINICIÓN DE PASO Y NUMERACIÓN
// ──────────────────────────────────────────────────────────────

function resolveDef(stepId) {
  if (stepId === 'welcome' || stepId === 'thanks') {
    return STEPS[stepId];
  }

  // Numeración secuencial limpia excluyendo welcome y thanks
  const activeQuestions = state.stepSequence.filter(s => s !== 'welcome' && s !== 'thanks');
  const qIndex = activeQuestions.indexOf(stepId);
  const qNum = qIndex >= 0 ? qIndex + 1 : '';

  if (stepId.startsWith('dq_')) {
    const id = stepId.slice(3);
    const dq = state.dynamicQuestions.find(q => q.id === id);
    if (!dq) return null;

    return {
      id: stepId,
      type: dq.tipo === 'multi' ? 'multi' : dq.tipo === 'text' ? 'text' : 'single',
      badge: `Pregunta ${qNum} · Dinámica`,
      text: dq.titulo,
      options: dq.opciones || []
    };
  }

  const def = STEPS[stepId];
  if (!def) return null;

  return {
    ...def,
    qNum: qNum,
    displayBadge: def.badge ? `${def.badge} (#${qNum})` : `Pregunta ${qNum}`
  };
}

// ──────────────────────────────────────────────────────────────
// RENDERIZADO DE PASOS
// ──────────────────────────────────────────────────────────────

function render(stepId) {
  const container = document.getElementById('step-container');
  if (!container) return;

  const def = resolveDef(stepId);
  if (!def) {
    console.warn('Paso no encontrado:', stepId);
    return;
  }

  updateProgress(def);

  let html = '';
  switch (def.type) {
    case 'welcome':         html = renderWelcome();          break;
    case 'feria_dia':       html = renderFeriaDia(def);      break;
    case 'single':          html = renderSingle(def);        break;
    case 'single_other':    html = renderSingleOther(def);   break;
    case 'multi':           html = renderMulti(def);         break;
    case 'multi_other':     html = renderMultiOther(def);    break;
    case 'q18_expandable':  html = renderQ18Expandable(def); break;
    case 'thanks':          html = renderThanks();           break;
    default:                html = renderSingle(def);
  }

  container.innerHTML = `<div class="step-animate">${html}</div>`;
  updateNavFooter(def);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Pantalla de Bienvenida ──
function renderWelcome() {
  return `
    <div class="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="bg-gradient-to-br from-brand-700 to-teal-600 p-4 sm:p-7 text-white text-center">
        <div class="inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 mb-2 sm:mb-3 shadow-inner">
          <svg class="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
        <h2 class="text-lg sm:text-2xl font-extrabold mb-0.5">Encuesta a comerciantes de ferias libres</h2>
        <p class="text-brand-200 text-xs sm:text-sm">Investigación sobre la Ley N.º 21.745 · USACH</p>
      </div>

      <div class="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <p class="text-slate-700 text-xs sm:text-sm leading-relaxed">
          Somos estudiantes de la carrera de <strong>Contador Público y Auditor</strong> de la
          <strong>Universidad de Santiago de Chile</strong> y estamos realizando una investigación académica sobre la
          implementación del nuevo régimen tributario para comerciantes de ferias libres establecido por la
          <strong>Ley N.º 21.745</strong>.
        </p>
        <p class="text-slate-700 text-xs sm:text-sm leading-relaxed">
          El objetivo es conocer el nivel de información, incorporación al régimen y las
          principales dificultades u oportunidades experimentadas por los comerciantes durante este proceso.
        </p>

        <div class="flex gap-2.5 sm:gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-3.5">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <p class="text-amber-800 text-xs sm:text-sm font-medium leading-relaxed">
            Sus respuestas son <strong>completamente anónimas</strong> y serán utilizadas única y exclusivamente con fines académicos.
          </p>
        </div>

        <div class="flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm pt-0.5">
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Tiempo estimado: 3 a 5 minutos</span>
        </div>
      </div>

      <div class="px-4 pb-4 sm:px-6 sm:pb-6">
        <button onclick="window.__survey.nextStep()"
          class="w-full py-3 sm:py-3.5 rounded-xl bg-brand-600 text-white font-bold text-sm sm:text-base
                 hover:bg-brand-700 active:scale-95 transition-all duration-150
                 shadow-sm shadow-brand-800/20 flex items-center justify-center gap-2">
          Comenzar encuesta
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>`;
}

// ── Pregunta 2: Feria y Día (Campos de texto con sugerencias rápidas) ──
function renderFeriaDia(def) {
  const comunaSel = state.answers.q1 || '';
  const feriaVal = escAttr(state.answers.q2_feria || '');
  const diaVal = escAttr(state.answers.q2_dia || '');

  // Sugerencias según la comuna elegida en la pregunta 1
  let suggestionsHtml = '';
  const feriasSugeridas = FERIAS_POR_COMUNA[comunaSel] || [];
  if (feriasSugeridas.length > 0) {
    const pills = feriasSugeridas.map(item => `
      <button type="button"
        onclick="window.__survey.setFeriaDia('${escAttr(item.feria)}', '${escAttr(item.dia)}')"
        class="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 active:scale-95 transition-all">
        <span class="font-semibold">${esc(item.feria)}</span>
        <span class="text-emerald-500 font-normal">(${esc(item.dia)})</span>
      </button>
    `).join('');

    suggestionsHtml = `
      <div class="mt-3 pt-3 border-t border-slate-100">
        <p class="text-[11px] sm:text-xs font-semibold text-slate-500 mb-2">
          Sugerencias para comuna de <strong>${esc(comunaSel)}</strong> (toque para autocompletar):
        </p>
        <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          ${pills}
        </div>
      </div>
    `;
  }

  const innerHtml = `
    <div class="space-y-3.5">
      <div>
        <label for="q2-feria-input" class="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
          Feria: <span class="text-rose-500">*</span>
        </label>
        <input type="text" id="q2-feria-input" data-field="q2_feria" value="${feriaVal}"
          placeholder="Nombre o ubicación de la feria (ej: Zapadores, Pablo Neruda...)"
          class="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-800 rounded-xl
                 border-2 border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white transition-all bg-slate-50">
      </div>

      <div>
        <label for="q2-dia-input" class="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
          Día: <span class="text-rose-500">*</span>
        </label>
        <input type="text" id="q2-dia-input" data-field="q2_dia" value="${diaVal}"
          placeholder="Día de la semana en que trabaja (ej: Martes, Domingo...)"
          class="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-800 rounded-xl
                 border-2 border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white transition-all bg-slate-50">
      </div>

      ${suggestionsHtml}
    </div>
  `;

  return questionCard(def, innerHtml, def.hint);
}

// ── Selección única ──
function renderSingle(def) {
  const opts = def.options || [];
  const current = state.answers[def.id] || '';

  const optHtml = opts.map((opt, i) => {
    const sel = current === opt;
    return `
      <label for="${def.id}-opt-${i}" class="option-card${sel ? ' selected' : ''}">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="radio-dot${sel ? ' checked' : ''}"></div>
          <input type="radio" id="${def.id}-opt-${i}" name="${def.id}"
                 value="${escAttr(opt)}" ${sel ? 'checked' : ''} class="sr-only">
          <span class="text-slate-700 font-medium text-xs sm:text-base leading-snug">${esc(opt)}</span>
        </div>
      </label>`;
  }).join('');

  return questionCard(def, optHtml, def.hint);
}

// ── Selección única con opción "Otro" (campo libre) ──
function renderSingleOther(def) {
  const opts = def.options || [];
  const current = state.answers[def.id] || '';
  const otherVal = state.answers[`${def.id}_otro`] || '';

  const optHtml = opts.map((opt, i) => {
    const sel = current === opt;
    const isOther = isOtherOption(opt);

    return `
      <label for="${def.id}-opt-${i}" class="option-card${sel ? ' selected' : ''}">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="radio-dot${sel ? ' checked' : ''}"></div>
          <input type="radio" id="${def.id}-opt-${i}" name="${def.id}"
                 value="${escAttr(opt)}" ${sel ? 'checked' : ''} class="sr-only">
          <span class="text-slate-700 font-medium text-xs sm:text-base leading-snug">${esc(opt)}</span>
        </div>
        ${isOther && sel ? `
          <div class="mt-2.5 ml-6 sm:ml-8">
            <input type="text"
                   data-otro-for="${def.id}"
                   value="${escAttr(otherVal)}"
                   placeholder="Especifique aquí…"
                   class="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-800 rounded-lg sm:rounded-xl
                          border-2 border-brand-300 focus:outline-none focus:border-brand-600 bg-white
                          transition-colors shadow-inner">
          </div>` : ''}
      </label>`;
  }).join('');

  return questionCard(def, optHtml, def.hint);
}

// ── Selección múltiple ──
function renderMulti(def) {
  const opts = def.options || [];
  const current = Array.isArray(state.answers[def.id]) ? state.answers[def.id] : [];

  const optHtml = opts.map((opt, i) => {
    const sel = current.includes(opt);
    return `
      <label for="${def.id}-opt-${i}" class="option-card${sel ? ' selected' : ''}">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="check-box${sel ? ' checked' : ''}"></div>
          <input type="checkbox" id="${def.id}-opt-${i}" name="${def.id}"
                 value="${escAttr(opt)}" ${sel ? 'checked' : ''} class="sr-only">
          <span class="text-slate-700 font-medium text-xs sm:text-base leading-snug">${esc(opt)}</span>
        </div>
      </label>`;
  }).join('');

  return questionCard(def, optHtml, def.hint);
}

// ── Selección múltiple con opción "Otro" (campo libre) ──
function renderMultiOther(def) {
  const opts = def.options || [];
  const current = Array.isArray(state.answers[def.id]) ? state.answers[def.id] : [];
  const otherVal = state.answers[`${def.id}_otro`] || '';

  const optHtml = opts.map((opt, i) => {
    const sel = current.includes(opt);
    const isOther = isOtherOption(opt);

    return `
      <label for="${def.id}-opt-${i}" class="option-card${sel ? ' selected' : ''}">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="check-box${sel ? ' checked' : ''}"></div>
          <input type="checkbox" id="${def.id}-opt-${i}" name="${def.id}"
                 value="${escAttr(opt)}" ${sel ? 'checked' : ''} class="sr-only">
          <span class="text-slate-700 font-medium text-xs sm:text-base leading-snug">${esc(opt)}</span>
        </div>
        ${isOther && sel ? `
          <div class="mt-2.5 ml-6 sm:ml-8">
            <input type="text"
                   data-otro-for="${def.id}"
                   value="${escAttr(otherVal)}"
                   placeholder="Especifique aquí…"
                   class="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-800 rounded-lg sm:rounded-xl
                          border-2 border-brand-300 focus:outline-none focus:border-brand-600 bg-white
                          transition-colors shadow-inner">
          </div>` : ''}
      </label>`;
  }).join('');

  return questionCard(def, optHtml, def.hint);
}

// ── Pregunta 18 Expandible (Si responde Sí, despliega fuentes) ──
function renderQ18Expandable(def) {
  const currentVal = state.answers.q18 || '';
  const isYes = currentVal === 'Sí.';
  const currentSources = Array.isArray(state.answers.q18_fuente) ? state.answers.q18_fuente : [];
  const otherVal = state.answers.q18_otro || '';

  const mainOptions = def.options.map((opt, i) => {
    const sel = currentVal === opt;
    return `
      <label for="q18-opt-${i}" class="option-card${sel ? ' selected' : ''}">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="radio-dot${sel ? ' checked' : ''}"></div>
          <input type="radio" id="q18-opt-${i}" name="q18"
                 value="${escAttr(opt)}" ${sel ? 'checked' : ''} class="sr-only">
          <span class="text-slate-700 font-bold text-xs sm:text-base leading-snug">${esc(opt)}</span>
        </div>
      </label>`;
  }).join('');

  let sourcesSectionHtml = '';
  if (isYes) {
    const sourceCheckboxes = def.sourceOptions.map((opt, i) => {
      const sel = currentSources.includes(opt);
      const isOther = isOtherOption(opt);

      return `
        <label for="q18_fuente-opt-${i}" class="option-card${sel ? ' selected' : ''} bg-white cursor-pointer">
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="check-box${sel ? ' checked' : ''}"></div>
            <input type="checkbox" id="q18_fuente-opt-${i}" name="q18_fuente"
                   value="${escAttr(opt)}" ${sel ? 'checked' : ''} class="sr-only">
            <span class="text-slate-700 font-medium text-xs sm:text-sm select-none">${esc(opt)}</span>
          </div>
          ${isOther && sel ? `
            <div class="mt-2 ml-6 sm:ml-8">
              <input type="text"
                     data-q18-otro="true"
                     value="${escAttr(otherVal)}"
                     placeholder="Especifique de quién…"
                     class="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs text-slate-800 rounded-lg
                            border-2 border-brand-300 focus:outline-none focus:border-brand-600 bg-white">
            </div>` : ''}
        </label>`;
    }).join('');

    sourcesSectionHtml = `
      <div class="mt-4 p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl animate-fadeIn space-y-2.5">
        <div class="flex items-center gap-1.5 text-emerald-900 font-bold text-xs sm:text-sm">
          <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>¿De dónde le gustaría recibir la informacion?</span>
        </div>
        <p class="text-[11px] sm:text-xs text-emerald-700">Seleccione una o más opciones:</p>
        <div class="space-y-2">
          ${sourceCheckboxes}
        </div>
      </div>
    `;
  }

  const innerHtml = `
    <div class="space-y-2">
      ${mainOptions}
      ${sourcesSectionHtml}
    </div>
  `;

  return questionCard(def, innerHtml);
}

// ── Plantilla Base de Tarjeta de Pregunta ──
function questionCard(def, innerHtml, hint = '') {
  const badgeText = def.displayBadge || def.badge || '';
  const isSection = def.section ? true : false;
  const sectionColors = {
    A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    B: 'bg-blue-100 text-blue-800 border-blue-200',
    C: 'bg-amber-100 text-amber-800 border-amber-200',
    D: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return `
    <div class="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="px-3.5 pt-3.5 pb-2.5 sm:px-6 sm:pt-6 sm:pb-4 border-b border-slate-50">
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
          ${badgeText ? `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold
                         ${isSection ? sectionColors[def.section] : 'bg-brand-100 text-brand-800'}">
              ${esc(badgeText)}
            </span>` : ''}
        </div>
        <h2 class="text-sm sm:text-xl font-bold text-slate-800 leading-snug">
          ${esc(def.text)}
        </h2>
        ${hint ? `<p class="text-slate-400 text-[11px] sm:text-xs mt-1 sm:mt-1.5">${esc(hint)}</p>` : ''}
      </div>
      <div class="p-3.5 sm:p-6 space-y-2 sm:space-y-3">
        ${innerHtml}
      </div>
    </div>`;
}

// ── Pantalla de Agradecimiento Final ──
function renderThanks() {
  return `
    <div class="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-center">
      <div class="bg-gradient-to-br from-brand-700 to-teal-600 p-6 sm:p-10 text-white">
        <div class="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full shadow-lg mb-3 sm:mb-4">
          <svg class="w-8 h-8 sm:w-11 sm:h-11 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl sm:text-3xl font-extrabold mb-1">¡Muchas gracias!</h2>
        <p class="text-brand-200 text-xs sm:text-sm">Su encuesta ha sido enviada con éxito</p>
      </div>
      <div class="p-5 sm:p-8 space-y-4 sm:space-y-5">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
          <p class="text-amber-900 text-xs sm:text-base font-semibold leading-relaxed">
            "Muchas gracias por su tiempo. Sus respuestas son anónimas y serán utilizadas únicamente con fines académicos."
          </p>
        </div>
        <div class="text-slate-500 text-xs sm:text-sm space-y-1">
          <p class="font-bold text-slate-700">Universidad de Santiago de Chile</p>
          <p>Carrera de Contador Público y Auditor</p>
          <p class="text-[11px] text-slate-400">Investigación sobre la Ley N.º 21.745 para Ferias Libres</p>
        </div>
      </div>
    </div>`;
}

// ──────────────────────────────────────────────────────────────
// BARRA DE PROGRESO Y NAVEGACIÓN
// ──────────────────────────────────────────────────────────────

function updateProgress(def) {
  const progressSection = document.getElementById('progress-section');
  if (!progressSection) return;

  if (def.type === 'welcome' || def.type === 'thanks') {
    progressSection.classList.add('hidden');
    return;
  }

  progressSection.classList.remove('hidden');

  const seq = state.stepSequence.filter(id => id !== 'welcome' && id !== 'thanks');
  const idx = seq.indexOf(def.id);
  const total = seq.length;
  const pct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0;

  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  const stepLabel = document.getElementById('step-label');

  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
  if (stepLabel) stepLabel.textContent = `Pregunta ${idx + 1} de ${total}`;
}

function updateNavFooter(def) {
  const footer = document.getElementById('nav-footer');
  const btnPrev = document.getElementById('btn-prev');
  const btnNextLabel = document.getElementById('btn-next-label');
  const btnNextIcon = document.getElementById('btn-next-icon');
  if (!footer) return;

  if (def.type === 'welcome' || def.type === 'thanks') {
    footer.classList.add('hidden');
    return;
  }

  footer.classList.remove('hidden');

  if (btnPrev) {
    btnPrev.style.display = state.currentIndex <= 1 ? 'none' : 'flex';
  }

  const isLast = state.currentIndex === state.stepSequence.length - 2;
  if (btnNextLabel) {
    btnNextLabel.textContent = isLast ? 'Enviar encuesta' : 'Siguiente';
  }
  if (btnNextIcon) {
    btnNextIcon.innerHTML = isLast
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>`;
  }
}

// ──────────────────────────────────────────────────────────────
// ACCIONES DE NAVEGACIÓN
// ──────────────────────────────────────────────────────────────

function nextStep() {
  if (state.submitting) return;

  const currentId = state.stepSequence[state.currentIndex];
  const def = resolveDef(currentId);

  if (!validate(currentId, def)) return;

  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.stepSequence.length) return;

  const nextId = state.stepSequence[nextIndex];

  if (nextId === 'thanks') {
    submitSurvey();
    return;
  }

  state.currentIndex = nextIndex;
  render(nextId);
}

function prevStep() {
  if (state.currentIndex <= 1) return;
  state.currentIndex--;
  render(state.stepSequence[state.currentIndex]);
}

// Helper para autocompletar feria y día desde las sugerencias
function setFeriaDia(feria, dia) {
  state.answers.q2_feria = feria;
  state.answers.q2_dia = dia;
  state.answers.q2 = `${feria} – ${dia}`;

  const feriaInput = document.getElementById('q2-feria-input');
  const diaInput = document.getElementById('q2-dia-input');
  if (feriaInput) feriaInput.value = feria;
  if (diaInput) diaInput.value = dia;

  toast(`Seleccionada: ${feria} (${dia})`, 'success');
}

// ──────────────────────────────────────────────────────────────
// VALIDACIÓN ESTRICTA DE PASOS
// ──────────────────────────────────────────────────────────────

function validate(stepId, def) {
  if (!def || def.type === 'welcome' || def.type === 'thanks') return true;

  // Validación de Pregunta 2 (Feria y Día)
  if (def.type === 'feria_dia') {
    const f = String(state.answers.q2_feria || '').trim();
    const d = String(state.answers.q2_dia || '').trim();
    if (!f) {
      toast('Por favor ingrese el nombre de la feria.', 'error');
      const inEl = document.getElementById('q2-feria-input');
      if (inEl) inEl.focus();
      return false;
    }
    if (!d) {
      toast('Por favor ingrese el día en que trabaja en la feria.', 'error');
      const inEl = document.getElementById('q2-dia-input');
      if (inEl) inEl.focus();
      return false;
    }
    state.answers.q2 = `${f} – ${d}`;
    return true;
  }

  // Validación de selección múltiple (q9, q13)
  if (def.type === 'multi' || def.type === 'multi_other') {
    const ans = state.answers[stepId];
    if (!Array.isArray(ans) || ans.length === 0) {
      toast('Por favor seleccione al menos una opción.', 'error');
      return false;
    }
    if (def.type === 'multi_other') {
      const hasOther = ans.some(opt => isOtherOption(opt));
      if (hasOther && !String(state.answers[`${stepId}_otro`] || '').trim()) {
        toast('Por favor especifique en el campo de texto de "Otro".', 'error');
        return false;
      }
    }
    return true;
  }

  // Validación de selección única con "Otro" (q5, a2, a4, b1, b3, c2, c3, d1)
  if (def.type === 'single_other') {
    const ans = state.answers[stepId];
    if (!ans) {
      toast('Por favor seleccione una opción para continuar.', 'error');
      return false;
    }
    if (isOtherOption(ans) && !String(state.answers[`${stepId}_otro`] || '').trim()) {
      toast('Por favor especifique en el campo de texto.', 'error');
      return false;
    }
    return true;
  }

  // Validación de pregunta expandible (q18)
  if (def.type === 'q18_expandable') {
    const ans = state.answers.q18;
    if (!ans) {
      toast('Por favor responda si le gustaría recibir más información.', 'error');
      return false;
    }
    if (ans === 'Sí.') {
      const fuentes = state.answers.q18_fuente;
      if (!Array.isArray(fuentes) || fuentes.length === 0) {
        toast('Por favor elija de dónde le gustaría recibir la información.', 'error');
        return false;
      }
      if (fuentes.some(f => isOtherOption(f)) && !String(state.answers.q18_otro || '').trim()) {
        toast('Por favor especifique de quién le gustaría recibir información.', 'error');
        return false;
      }
    }
    return true;
  }

  // Validación estándar de selección única
  if (!state.answers[stepId]) {
    toast('Por favor seleccione una opción para continuar.', 'error');
    return false;
  }

  return true;
}

// ──────────────────────────────────────────────────────────────
// DELEGACIÓN DE EVENTOS EN EL CONTENEDOR
// ──────────────────────────────────────────────────────────────

function setupEventDelegation() {
  const container = document.getElementById('step-container');
  if (!container) return;

  // Manejo de cambios en radios y checkboxes
  container.addEventListener('change', (e) => {
    const t = e.target;

    // Caso: Radio buttons
    if (t.type === 'radio') {
      const prevVal = state.answers[t.name];
      state.answers[t.name] = t.value;

      // Si cambia la comuna en q1, limpiar q2 para que las sugerencias coincidan
      if (t.name === 'q1' && prevVal !== t.value) {
        delete state.answers.q2_feria;
        delete state.answers.q2_dia;
        delete state.answers.q2;
      }

      // Si cambia q14 (recibe pagos con tarjeta) o q16 (situación respecto a la ley)
      if (t.name === 'q14' || t.name === 'q16') {
        const currentId = state.stepSequence[state.currentIndex];
        state.stepSequence = buildStepSequence();
        const newIdx = state.stepSequence.indexOf(currentId);
        if (newIdx >= 0) state.currentIndex = newIdx;
      }

      // Si cambia q18 (desplegar/ocultar fuentes de información)
      if (t.name === 'q18') {
        render('q18');
        return;
      }

      updateOptionStyles(t.name, t.value, 'single', false, t);

      // Si seleccionó Otro, enfocar el campo de texto
      if (isOtherOption(t.value)) {
        render(state.stepSequence[state.currentIndex]);
        setTimeout(() => {
          const textIn = container.querySelector(`[data-otro-for="${t.name}"]`);
          if (textIn) textIn.focus();
        }, 50);
      }
    }

    // Caso: Checkboxes para preguntas múltiples
    if (t.type === 'checkbox') {
      if (!Array.isArray(state.answers[t.name])) {
        state.answers[t.name] = [];
      }
      if (t.checked) {
        if (!state.answers[t.name].includes(t.value)) {
          state.answers[t.name].push(t.value);
        }
      } else {
        state.answers[t.name] = state.answers[t.name].filter(v => v !== t.value);
      }

      // Si es q18_fuente y marcó Otro, re-renderizar para mostrar input
      if (t.name === 'q18_fuente' && isOtherOption(t.value)) {
        render('q18');
        return;
      }

      // Si es multi_other y marcó Otro, re-renderizar para mostrar input
      if (isOtherOption(t.value)) {
        render(state.stepSequence[state.currentIndex]);
        return;
      }

      updateOptionStyles(t.name, t.value, 'multi', t.checked, t);
    }
  });

  // Manejo de inputs de texto en tiempo real
  container.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.field === 'q2_feria') {
      state.answers.q2_feria = t.value;
      state.answers.q2 = `${t.value} – ${state.answers.q2_dia || ''}`;
    }
    if (t.dataset.field === 'q2_dia') {
      state.answers.q2_dia = t.value;
      state.answers.q2 = `${state.answers.q2_feria || ''} – ${t.value}`;
    }
    if (t.dataset.otroFor) {
      state.answers[`${t.dataset.otroFor}_otro`] = t.value;
    }
    if (t.dataset.q18Otro) {
      state.answers.q18_otro = t.value;
    }
    if (t.dataset.textFor) {
      state.answers[t.dataset.textFor] = t.value;
    }
  });
}

function updateOptionStyles(name, value, type, isChecked = false, targetInput = null) {
  const container = document.getElementById('step-container');
  if (!container) return;

  if (targetInput) {
    const directLabel = targetInput.closest('label');
    if (directLabel) {
      if (type === 'single') {
        const group = container.querySelectorAll(`input[name="${name}"][type="radio"]`);
        group.forEach(r => {
          const l = r.closest('label');
          if (l) {
            l.classList.toggle('selected', r.checked);
            const dot = l.querySelector('.radio-dot');
            if (dot) dot.classList.toggle('checked', r.checked);
          }
        });
        return;
      } else {
        directLabel.classList.toggle('selected', targetInput.checked);
        const box = directLabel.querySelector('.check-box');
        if (box) box.classList.toggle('checked', targetInput.checked);
        return;
      }
    }
  }

  const inputs = container.querySelectorAll(`input[name="${name}"]`);
  inputs.forEach(input => {
    const label = input.closest('label');
    if (!label) return;

    if (type === 'single') {
      const selected = input.value === value;
      label.classList.toggle('selected', selected);
      const dot = label.querySelector('.radio-dot');
      if (dot) dot.classList.toggle('checked', selected);
    } else {
      if (input.value === value) {
        label.classList.toggle('selected', isChecked);
        const box = label.querySelector('.check-box');
        if (box) box.classList.toggle('checked', isChecked);
      }
    }
  });
}

// ──────────────────────────────────────────────────────────────
// ENVÍO DE DATOS A FIRESTORE
// ──────────────────────────────────────────────────────────────

async function submitSurvey() {
  if (state.submitting) return;
  state.submitting = true;

  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.disabled = true;
    btnNext.innerHTML = `
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span>Enviando respuestas…</span>`;
  }

  try {
    // Determinar sección asignada según q16
    let seccion = null;
    const ansQ16 = String(state.answers.q16 || '').trim();
    if (ansQ16.includes('Estoy inscrito/a') || ansQ16.startsWith('A')) seccion = 'A';
    else if (ansQ16.includes('No estoy inscrito/a') || ansQ16.startsWith('B')) seccion = 'B';
    else if (ansQ16.includes('realizando el trámite') || ansQ16.startsWith('C')) seccion = 'C';
    else if (ansQ16.includes('No sé si estoy inscrito/a') || ansQ16.startsWith('D')) seccion = 'D';

    // Etiqueta automática si q14 fue No
    if (String(state.answers.q14 || '').trim().startsWith('No')) {
      state.answers.q14_sub = 'No utiliza pagos con tarjeta';
    }

    const payload = {
      ...state.answers,
      seccion: seccion,
      timestamp: serverTimestamp(),
      fechaRespuesta: new Date().toLocaleDateString('es-CL'),
      horaRespuesta: new Date().toLocaleTimeString('es-CL')
    };

    await addDoc(collection(db, 'respuestas'), payload);

    state.currentIndex = state.stepSequence.indexOf('thanks');
    render('thanks');

  } catch (err) {
    console.error('Error al enviar encuesta:', err);
    toast('Error al enviar la encuesta. Por favor verifique su conexión e intente nuevamente.', 'error');
    state.submitting = false;
    if (btnNext) {
      btnNext.disabled = false;
      updateNavFooter(resolveDef(state.stepSequence[state.currentIndex]));
    }
  }
}

// ──────────────────────────────────────────────────────────────
// PREGUNTAS DINÁMICAS DESDE FIRESTORE (TIEMPO REAL)
// ──────────────────────────────────────────────────────────────

function listenDynamicQuestions() {
  try {
    const q = query(collection(db, 'preguntas_dinamicas'), orderBy('orden', 'asc'));

    onSnapshot(q, (snap) => {
      // Filtrar la pregunta dinámica eliminada (y cualquier duplicado de patente municipal)
      state.dynamicQuestions = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(dq => dq.id !== '4bewFS5wfu0aWyABtuUX' && !String(dq.titulo || '').toLowerCase().includes('permiso o patente'));
      const currentId = state.stepSequence[state.currentIndex];
      state.stepSequence = buildStepSequence();
      const newIdx = state.stepSequence.indexOf(currentId);
      if (newIdx >= 0) state.currentIndex = newIdx;
    }, (err) => {
      console.warn('Error escuchando preguntas_dinamicas:', err);
    });
  } catch (e) {
    console.warn(e);
  }
}

// ──────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────────

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = { error: 'bg-red-500', success: 'bg-emerald-600', info: 'bg-slate-800' };
  const div = document.createElement('div');
  div.className = `toast pointer-events-auto ${colors[type] || 'bg-slate-800'}
    text-white px-5 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold
    flex items-center gap-2.5 w-full transition-opacity duration-300`;
  div.innerHTML = `
    <svg class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${type === 'error'
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
    </svg>
    <span>${message}</span>`;

  container.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, 3500);
}

// ──────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────────────────────

function init() {
  // Exponer API para botones inline y navegación
  window.__survey = { nextStep, prevStep, setFeriaDia };

  // Secuencia inicial
  state.stepSequence = buildStepSequence();

  // Configurar listeners
  setupEventDelegation();

  // Renderizar bienvenida inmediatamente
  render('welcome');

  // Sincronizar preguntas dinámicas
  listenDynamicQuestions();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

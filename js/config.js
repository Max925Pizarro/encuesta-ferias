// ============================================================
// js/config.js – Configuración e Inicialización de Firebase
// ============================================================
// 🔧 INSTRUCCIONES:
//    1. Ve a Firebase Console → Configuración del proyecto → Tus apps
//    2. Copia el bloque firebaseConfig de tu app web
//    3. Reemplaza los valores a continuación
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

/**
 * 🔑 REEMPLAZA AQUÍ TUS CREDENCIALES DE FIREBASE
 * Las encuentras en:
 *   Firebase Console → Configuración del proyecto (⚙) → Tus apps → Configuración del SDK
 */
export const firebaseConfig = {
  apiKey:            "AIzaSyDY53_KpaqBQZ6U9JL2zMMAyFcKNJ9_Zwc",
  authDomain:        "encuesta-ferias-usach.firebaseapp.com",
  projectId:         "encuesta-ferias-usach",
  storageBucket:     "encuesta-ferias-usach.firebasestorage.app",
  messagingSenderId: "837814818846",
  appId:             "1:837814818846:web:632e6a22cac66ca8d3f60f",
  measurementId:     "G-HBNXQE8DWQ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar instancias de Firestore y Auth
export const db   = getFirestore(app);
export const auth = getAuth(app);

# Encuesta a Comerciantes de Ferias Libres
Plataforma Web Progresiva — Universidad de Santiago de Chile
Carrera de Contador Publico y Auditor

---

## Estructura del Proyecto

```
encuesta-ferias/
├── index.html          <- Encuesta publica (acceso via QR)
├── admin.html          <- Panel de administracion (acceso restringido)
├── firebase.json       <- Configuracion Firebase Hosting + Firestore rules
├── firestore.rules     <- Reglas de seguridad de Firestore
├── .firebaserc         <- Alias del proyecto Firebase
├── README.md           <- Este archivo
└── js/
    ├── config.js       <- CREDENCIALES de Firebase (EDITAR PRIMERO)
    ├── survey.js       <- Logica completa de la encuesta
    └── admin.js        <- Logica del panel de administracion
```

---

## Configuracion en 5 Pasos

### Paso 1 — Crear el Proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Haz clic en "Anadir proyecto" y ponle un nombre (ej: encuesta-ferias-usach)
3. Desactiva Google Analytics si no lo necesitas → Crear proyecto

### Paso 2 — Habilitar los Servicios

**Authentication:**
1. En el menu lateral: Authentication → Comenzar
2. Pestana "Sign-in method" → habilitar "Correo electronico/contrasena"
3. Ve a Users → Anadir usuario y crea los dos usuarios:
   - Correo: Constanza.garrido.i@usach.cl | Contrasena: admin123
   - Correo: Anais.flores@usach.cl       | Contrasena: admin123

**Firestore Database:**
1. En el menu: Firestore Database → Crear base de datos
2. Selecciona "Iniciar en modo de produccion"
3. Elige la region (recomendado: southamerica-east1 para Chile)

### Paso 3 — Obtener las Credenciales

1. En el menu: Configuracion del proyecto (engranaje) → pestana "General"
2. Desplazate hasta "Tus apps" → haz clic en el icono Web (</>)
3. Registra la app (apodo: encuesta-web)
4. Copia el bloque firebaseConfig que aparece

### Paso 4 — Pegar las Credenciales

Abre js/config.js y reemplaza los valores:

```javascript
export const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "tu-proyecto.firebaseapp.com",
  projectId:         "tu-proyecto",
  storageBucket:     "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

Abre .firebaserc y reemplaza:
```json
{ "projects": { "default": "tu-proyecto" } }
```

### Paso 5 — Desplegar en Firebase Hosting

```bash
# Instalar Firebase CLI (solo la primera vez)
npm install -g firebase-tools

# Autenticarse
firebase login

# Desplegar hosting + reglas de Firestore
firebase deploy
```

Al terminar veras la URL publica:
  Hosting URL: https://tu-proyecto.web.app

---

## URLs de la Plataforma

| Pagina                              | URL                                              |
|-------------------------------------|--------------------------------------------------|
| Encuesta publica (para comerciantes)| https://tu-proyecto.web.app/index.html           |
| Panel de administracion             | https://tu-proyecto.web.app/admin.html           |

El codigo QR debe apuntar a /index.html.
Puedes generarlo directamente desde el panel admin → seccion "Codigo QR".

---

## Funcionalidades

### Encuesta Publica (index.html)
- Formulario en pasos con barra de progreso animada
- Filtrado de ferias segun comuna seleccionada (Recoleta / Huechuraba)
- Logica condicional: Secciones A, B, C o D segun respuesta en P7
- Seleccion multiple (P5), campo "Otro" con texto libre en secciones
- Sincronizacion en tiempo real con preguntas dinamicas de Firestore
- Envio a coleccion "respuestas" en Firestore con serverTimestamp()
- Disenio responsivo optimizado para smartphones (uso con QR)

### Panel Administrativo (admin.html)
- Login con Firebase Auth — solo correos autorizados
- Dashboard con metricas en tiempo real (total, por comuna, inscritos)
- Graficos personalizables con Chart.js (6 tipos de grafico)
- Filtros globales por comuna, feria y estado de inscripcion
- Tabla de respuestas individuales con etiquetas de color
- CRUD de preguntas dinamicas (sincronizacion inmediata con la encuesta)
- Generador de codigo QR con descarga PNG e impresion de afiche listo

---

## Colecciones en Firestore

### Coleccion: respuestas
Cada documento es una respuesta enviada por un comerciante.

Campos principales:
- q1            : string    — Comuna seleccionada
- q2            : string    — Feria seleccionada
- q3            : string    — Tiempo trabajando en la feria
- q4            : string    — Escucho del nuevo regimen
- q5            : array     — Fuentes de informacion (seleccion multiple)
- q6            : string    — Acepta pagos con tarjeta
- q7            : string    — Estado de inscripcion al regimen
- seccion       : string    — Seccion asignada (A / B / C / D)
- a1 .. a4      : string    — Respuestas Seccion A (inscritos)
- b1 .. b3      : string    — Respuestas Seccion B (no inscritos)
- c1 .. c3      : string    — Respuestas Seccion C (en tramite)
- d1 .. d3      : string    — Respuestas Seccion D (no sabe)
- q8            : string    — Pregunta de cierre general
- timestamp     : timestamp — Fecha/hora exacta (Firestore)
- fechaRespuesta: string    — Fecha legible (ej: 13-10-2026)

### Coleccion: preguntas_dinamicas
Preguntas agregadas desde el panel admin.

Campos:
- titulo    : string    — Enunciado de la pregunta
- tipo      : string    — "single" / "multi" / "text"
- opciones  : array     — Lista de opciones de respuesta
- orden     : number    — Posicion en el formulario (1, 2, 3...)
- createdAt : timestamp — Fecha de creacion
- updatedAt : timestamp — Ultima modificacion

---

## Seguridad (firestore.rules)

- respuestas       : Escritura publica. Lectura/edicion solo para admins autenticados.
- preguntas_dinamicas : Lectura publica (necesaria para la encuesta). Escritura solo admins.

Los admins autorizados son los mismos correos registrados en Firebase Auth.

---

## Tecnologias Utilizadas

| Tecnologia          | Version  | Uso                              |
|---------------------|----------|----------------------------------|
| Firebase SDK        | v10.12.2 | Auth + Firestore (ESM via CDN)   |
| Tailwind CSS        | CDN      | Estilos responsivos              |
| Chart.js            | v4.4.3   | Graficos del dashboard           |
| QRCode.js           | v1.5.3   | Generacion de codigos QR         |
| Inter (Google Fonts)| —        | Tipografia moderna               |

---

## Prueba Local (sin desplegar)

Por restricciones CORS con ES Modules y Firebase, usa un servidor local:

```bash
npx serve .
# Luego abre: http://localhost:3000
```

O con Python:
```bash
python -m http.server 8080
# Luego abre: http://localhost:8080
```

---

## Preguntas Frecuentes

P: El login falla con "Acceso denegado" aunque el correo es correcto.
R: Asegurate de que el usuario exista en Firebase Authentication
   (Authentication → Users) y que la contrasena sea la correcta.

P: Las preguntas dinamicas no aparecen en la encuesta.
R: Verifica que la coleccion se llame exactamente "preguntas_dinamicas"
   (sin tildes, con guion bajo) en Firestore.

P: El grafico del dashboard no muestra datos.
R: Necesitas al menos una respuesta enviada. Prueba la encuesta primero
   desde index.html y luego recarga el panel admin.

---

Proyecto para la carrera de Contador Publico y Auditor — USACH, 2026

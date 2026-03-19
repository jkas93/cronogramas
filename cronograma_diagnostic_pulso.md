# 🔬 Diagnóstico Completo: Sistema de Cronograma + Curva S — Golden Tower ERP

---

## 1. Resumen Ejecutivo del Sistema Analizado

El sistema de **Cronograma** y **Curva S** está integrado dentro de un monorepo ERP de construcción llamado **Golden Tower**. La funcionalidad principal reside en **un único componente monolítico de 1266 líneas** que fusiona: Gantt interactivo, Curva S (planned vs real), registro de avance con evidencia fotográfica, galería de historial, y gestión CRUD de tareas jerárquicas.

---

## 2. Arquitectura y Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| **Next.js** | 16.1.5 | Framework React (App Router, `"use client"`) |
| **React** | 19.2.0 | UI reactiva |
| **Tailwind CSS** | 4.1.18 | Estilos (clases inline extensivas) |
| **lucide-react** | 0.563.0 | Iconografía: `Plus`, `Check`, `Clock`, `Trash2`, [Edit](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#354-367), `ClipboardCheck`, [Activity](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/schemas/index.ts#49-50), `Upload`, `X`, `AlertTriangle` |
| **Firebase (Client SDK)** | 12.9.0 | Auth, Firestore (no usado directo en Gantt), **Storage** (upload fotos) |
| **Zod** (vía `@erp/shared`) | — | Validaciones en schemas compartidos |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| **NestJS** | 11.0.1 | API REST |
| **firebase-admin** | 13.6.1 | Firestore (base de datos), Custom Claims (roles) |
| **Zod** | (shared) | Validación de DTOs (`ProgressLogSchema`, `PurchaseSchema`) |

### Base de Datos (Firestore)
```
projects/{projectId}                  ← Documento del proyecto
    └── tasks/{taskId}                ← Subcollection de tareas
    └── progress_logs/{logId}         ← Subcollection de reportes de avance
```

---

## 3. Modelos de Datos Críticos

### [ProjectTask](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/types/index.ts#29-41) (types/index.ts)
```typescript
interface ProjectTask {
    id: string;
    projectId: string;
    parentId: string | null;       // Jerarquía padre-hijo
    title: string;
    description?: string;
    type: TaskType;                // ITEM | SUB_ITEM | AREA | ACTIVITY
    startDate: string;             // ISO "YYYY-MM-DD"
    endDate: string;               // ISO "YYYY-MM-DD"
    progress: number;              // 0-100
    order: number;                 // Posición visual
}
```

### `TaskType` (Enum)
```typescript
enum TaskType {
    ITEM = "ITEM",
    SUB_ITEM = "SUB_ITEM",
    AREA = "AREA",          // Contenedor visual (barra delgada azul)
    ACTIVITY = "ACTIVITY",
}
```

### [ProgressLog](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/schemas/index.ts#62-63) (schemas/index.ts)
```typescript
// Zod schema — validated server-side
{
    taskId: string,
    projectId: string,
    date: string,                   // "YYYY-MM-DD"
    progressPercentage: number,     // 0-100
    notes?: string,
    recordedBy?: string,            // UID del supervisor
    photoUrls?: string[],           // Max 3 fotos por reporte
    // Auto-added: id, createdAt
}
```

### [Project](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/types/index.ts#42-51)
```typescript
interface Project {
    id: string;
    name: string;
    description: string;
    status: "ACTIVE" | "PAUSED" | "COMPLETED";
    coordinatorId: string;
    supervisorId: string | null;
    createdAt: string;
}
```

### [Purchase](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/schemas/index.ts#104-105) (vinculado al costo por tarea)
```typescript
{
    projectId: string,
    taskId?: string,          // Vinculación a tarea específica
    description: string,
    provider: string,
    amount: number,           // Monto
    currency: "USD" | "PEN",
    status: "PENDIENTE" | "APROBADO" | "PAGADO" | "RECIBIDO",
    invoiceNumber?: string,
    date: string,
}
```

---

## 4. Funcionalidades Detalladas

### 4.1 Diagrama de Gantt

| Funcionalidad | Descripción | Estado |
|---|---|---|
| **Timeline** | Ventana fija de **120 días** desde offset configurable. Header con meses + días individuales | ✅ |
| **dayWidth** | Constante `40px` por día | ✅ |
| **Tareas jerárquicas** | Árbol recursivo con `parentId`. Indentación visual con `depth * 1rem` y símbolo `└` | ✅ |
| **Barras Gantt** | Posicionamiento absoluto via CSS `left` y `width` calculados en px | ✅ |
| **Drag & Move** | Arrastre horizontal para mover tareas completas (optimistic update + PATCH) | ✅ |
| **Resize** | Handles invisibles de 6px en bordes izq/der para redimensionar duración | ✅ |
| **Marcador HOY** | Línea roja vertical con etiqueta "HOY" | ✅ |
| **Tooltip en hover** | Título + rango de fechas | ✅ |
| **Barra de progreso** | Overlay blanco semitransparente al `{progress}%` del ancho | ✅ |
| **Diferenciación visual** | AREA: barra delgada h-3 azul. Completada: verde. En progreso: primary/60 | ✅ |
| **Panel lateral sticky** | Columna fija de 320px con nombre, %, costo, duración | ✅ |
| **Costo por tarea** | Suma `purchases` vinculadas, mostrado como `S/ {amount}` | ✅ |
| **Grid de fines de semana** | Sáb/Dom con fondo diferenciado `bg-white/5` | ✅ |

**Variables de estado del Gantt:**
```typescript
chartStartOffset: string          // Fecha ISO offset de inicio de regleta
dayWidth: 40                      // Constante (px/día)
totalDays: 120                    // Ventana fija
interaction: { taskId, type: 'MOVE'|'RESIZE_START'|'RESIZE_END', initialX, initialStart, initialEnd }
```

### 4.2 Curva S

| Funcionalidad | Descripción |
|---|---|
| **Datos planificados** | Interpolación lineal por tarea: `elapsed/duration * 100`, promediado sobre todas las leaf tasks |
| **Datos reales** | Último [ProgressLog](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/schemas/index.ts#62-63) por tarea en/antes del día. Promedio de todas las leaf tasks |
| **Renderizado** | SVG puro con `<path>`, gradientes lineales (`linearGradient`), sin librería de charts |
| **SVG ViewBox** | `0 0 {days*40} 200` — mapeo directo planned/real × 2 al eje Y invertido |
| **Curva Planificada** | Línea punteada dorada `#D4AF37`, strokeDasharray="4 4", opacity 0.4 |
| **Curva Real** | Línea sólida verde `#22c55e`, strokeWidth=3, con `drop-shadow` glow |
| **Relleno** | Gradientes bajo cada curva (planned: dorado 5%→0%, real: verde 15%→0%) |
| **Punto de hoy** | Doble círculo animado (verde=real, azul=planned) en posición "today" |
| **Grid horizontal** | 5 líneas horizontales (0, 50, 100, 150, 200 en SVG = 100%, 75%, 50%, 25%, 0%) |
| **Eje Y** | Labels estáticos: 100%, 75%, 50%, 25%, 0% |
| **Eje X** | Labels de meses bajo el SVG |
| **Métricas header** | Meta Plan % y Avance Real % del día actual |
| **Línea HOY** | Trazo rojo punteado vertical |
| **Toggle** | Botón "Curva S Planificada" con estado `showSCurve` (existe pero no controla visibilidad real de la sección) |

**Algoritmo de la Curva S — [generateSCurveData()](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#439-485):**
```
Para cada día del timeline (120 días):
    Para cada tarea hoja (type ≠ AREA):
        PLANNED: si día < inicio → 0; si día >= fin → 100; else → (elapsed/duration)*100
        REAL: obtener último ProgressLog donde log.date <= día actual, usar su progressPercentage
    Retornar: { day, planned: promedio, real: promedio, x: index * dayWidth }
```

### 4.3 Registro de Avance (Progress Logging)

| Aspecto | Detalle |
|---|---|
| **Acceso** | Solo `SUPERVISOR` puede registrar avance |
| **Modal** | Botones rápidos (25%, 50%, 75%, 100%), fecha, ajuste manual %, notas de campo |
| **Evidencia obligatoria** | Si `progressPercentage > 0`, se **exige** foto |
| **Upload** | Firebase Storage → `progress_logs/{projectId}/{taskId}/{timestamp}_{filename}` |
| **Backend batch** | Crea [ProgressLog](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/schemas/index.ts#62-63) en subcollection + actualiza `task.progress` en mismo batch |

### 4.4 Galería de Evidencias (Evidence Gallery)

| Aspecto | Detalle |
|---|---|
| **Vista** | Timeline vertical con puntos azules, fecha, % avance, notas, grid de imágenes |
| **Filtro** | Filtrado por `taskId` del task seleccionado |
| **Ordenamiento** | Descendiente por fecha (más reciente primero) |

### 4.5 CRUD de Tareas

| Operación | Endpoint | Roles |
|---|---|---|
| CREATE | `POST /projects/:id/tasks` | GERENTE, PMO, COORDINADOR, SUPERVISOR |
| READ | `GET /projects/:id/tasks` | Todos con acceso al proyecto |
| UPDATE | `PATCH /projects/:id/tasks/:taskId` | GERENTE, PMO, COORDINADOR, SUPERVISOR |
| DELETE | `DELETE /projects/:id/tasks/:taskId` | GERENTE, PMO, COORDINADOR, SUPERVISOR |

**Subtask instantáneo:** [handleInstantAddSubtask()](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#308-343) crea una tarea hija con título "Nueva Actividad", 7 días de duración, heredando la fecha del padre.

### 4.6 Catálogo Maestro de Actividades

Páginas separada en `/dashboard/catalog` que permite crear/buscar/eliminar **plantillas de actividad** con: nombre, categoría (PRELIMINARES, ESTRUCTURA, etc.), duración estimada. Se pueden seleccionar desde el modal de nueva tarea.

---

## 5. Sistema de Control de Acceso (RBAC)

| Rol | Crear Tarea | Editar Tarea | Drag/Resize | Registrar Avance | Ver S-Curve |
|---|---|---|---|---|---|
| GERENTE | ✅ | ✅ | ✅ | ❌ | ✅ |
| PMO | ✅ | ✅ | ✅ | ❌ | ✅ |
| COORDINADOR | ✅ | ✅ | ✅ | ❌ | ✅ |
| SUPERVISOR | ✅ | ✅ | ✅ | ✅ | ✅ |
| RRHH | ❌ (Redirigido) | ❌ | ❌ | ❌ | ❌ |

---

## 6. Estética y Sistema de Diseño

| Aspecto | Implementación |
|---|---|
| **Tema** | Dark mode en vista Gantt (`bg-black`, `bg-gray-900`), Light mode en listado de proyectos |
| **Glass morphism** | `glass` / `glass-card` classes + `backdrop-blur-sm/md/xl` |
| **Bordes redondeados** | `rounded-[2rem]` y `rounded-[2.5rem]` para paneles principales |
| **Color primario** | `primary` (dorado `#D4AF37` aprox.) — definido en Tailwind config |
| **Animaciones** | `animate-in fade-in slide-in-from-bottom-4`, `animate-pulse`, `animate-spin` |
| **Shadows** | `shadow-2xl`, `shadow-lg shadow-primary/20`, `shadow-green-500/20` |
| **Tipografía** | tracking-tighter, tracking-widest, font-mono para datos, uppercase para labels |
| **Scrollbar** | `custom-scrollbar` para área de scroll |
| **Transiciones** | `transition-all duration-300/700`, `cubic-bezier(0.4, 0, 0.2, 1)` en barras |

---

## 7. Infraestructura Integrada Necesaria

| Componente | Archivo | Función |
|---|---|---|
| [useAuth](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/hooks/useAuth.tsx#53-54) | [hooks/useAuth.tsx](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/hooks/useAuth.tsx) | Context de Firebase Auth + role from custom claims |
| [useToast](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/hooks/useToast.tsx#71-78) | [hooks/useToast.tsx](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/hooks/useToast.tsx) | Sistema de notificaciones toast |
| [clientApp.ts](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/lib/firebase/clientApp.ts) | [lib/firebase/clientApp.ts](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/lib/firebase/clientApp.ts) | Inicialización Firebase (Auth, Firestore, Storage) |
| `FirebaseAuthGuard` | API guard | Valida Bearer token Firebase |
| `RolesGuard` + `@Roles()` | API guard + decorator | RBAC server-side |
| `ZodValidationPipe` | API pipe | Validación con Zod schemas |
| `FirebaseService` | API service | Singleton admin SDK |

---

## 8. Debilidades y Deuda Técnica Detectada

| Problema | Severidad | Detalle |
|---|---|---|
| **Componente monolítico** | 🔴 Alta | 1266 líneas en un solo archivo — mezcla Gantt, S-Curve, 3 modales, CRUD |
| **No usa librería de charts** | 🟡 Media | SVG manual para la Curva S — difícil de mantener y escalar |
| **S-Curve recalculada en cada render** | 🔴 Alta | [generateSCurveData()](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#439-485) itera sobre `days × tasks × logs` sin memoización |
| **Toggle showSCurve sin efecto real** | 🟡 Media | El estado existe pero la sección S-Curve se muestra siempre |
| **dayWidth hardcodeado** | 🟡 Media | `40px` fijo — no hay zoom ni escalas configurables |
| **120 días fijo** | 🟡 Media | `totalDays = 120` — no se adapta a proyectos más largos |
| **Sin inline editing** | 🟡 Media | Edición via modal — no hay edición directa en la tabla |
| **Gallery no muestra fotos reales** | 🔴 Alta | El grid de imágenes muestra placeholders — `photoUrls` se guardan pero no se renderizan |
| **Sin dependencias entre tareas** | 🔴 Alta | No hay relaciones FS/FF/SS/SF ni liens |
| **Sin exportación/reportes** | 🟡 Media | No hay PDF, Excel ni impresión del cronograma |
| **Sin ruta crítica** | 🔴 Alta | No se calcula CPM (Critical Path Method) |

---

---

# 🎯 PROMPT PULSO — Proyecto Standalone de Cronograma y Curva S

---

## PROPÓSITO (P)

Eres un ingeniero de software senior full-stack especializado en aplicaciones web de gestión de proyectos de construcción. Tu misión es construir un **proyecto web completo y autónomo** (standalone) que implemente exclusivamente un **sistema de Cronograma de tipo Gantt interactivo + Diagrama de Curva S** para seguimiento de obras civiles. Este proyecto se separará de un ERP monolítico (Golden Tower ERP) y debe funcionar de forma totalmente independiente, con su propio frontend, backend y base de datos.

**Contexto del dominio:**
- Sector: Construcción civil — gestión de cronogramas de obra
- Usuarios: Gerente de Proyecto, PMO, Coordinador, Supervisor de campo
- Criticidad: Herramienta operativa diaria para seguimiento de avance real vs planificado

---

## USO (U)

### Funcionalidades Mandatorias del Producto

#### A. Gestión de Proyectos (CRUD básico)
1. Crear proyecto con: nombre, descripción, estado (ACTIVO/PAUSADO/COMPLETADO), coordinador, supervisor
2. Listar proyectos filtrados por rol (RBAC)
3. Navegar al cronograma de un proyecto

#### B. Cronograma Gantt Interactivo
1. **Timeline configurable** con offset de inicio y ventana de visualización ajustable (no fija en 120 días — permitir zoom: semanas, meses, trimestres)
2. **Header doble**: fila de meses + fila de días individuales, con diferenciación visual de fines de semana
3. **Tareas jerárquicas** con soporte de N niveles de profundidad:
   - Tipos: `AREA` (contenedor), `ITEM` (tarea ejecutable), `ACTIVITY` (sub-actividad)
   - Indentación visual, símbolo de jerarquía, colapsado/expandido de ramas
4. **Barras Gantt**:
   - Posicionamiento absoluto pixel-perfect basado en fechas
   - Fill de progreso superpuesto (overlay semitransparente)
   - Diferenciación visual: AREA (barra delgada azul), En progreso (color primario), Completada (verde)
   - Tooltip en hover con título, fechas, duración
5. **Drag & Drop**: mover tareas completas arrastrando la barra horizontalmente
6. **Resize**: handles en los bordes para redimensionar fecha inicio/fin
7. **Marcador "HOY"**: línea vertical roja con etiqueta pulsante
8. **Grid vertical** alineado a cada día
9. **Panel lateral sticky** (frozen column): nombre jerárquico, progreso %, costo (si hay), duración en días
10. **CRUD de tareas**: crear, editar (modal o inline), eliminar, reordenar
11. **Subtask instantáneo**: botón "+" que crea sub-tarea hija con defaults automáticos
12. **Catálogo de actividades maestras**: base de plantillas reutilizables con nombre, categoría (PRELIMINARES, ESTRUCTURA, ALBAÑILERÍA, ACABADOS, INSTALACIONES, EXTERIORES, OTROS) y duración estimada

#### C. Curva S (S-Curve)
1. **Curva planificada** (dashed line dorada):
   - Interpolación lineal: progreso planificado = [(días_transcurridos / duración_total) × 100](file:///c:/Users/Kevin%20Avalos/webs/gestion/packages/shared/types/index.ts#14-21) por tarea hoja
   - Promedio ponderado de todas las tareas hoja del proyecto
2. **Curva real** (línea sólida verde con glow):
   - Construida **exclusivamente** desde registros de avance (ProgressLogs)
   - Para cada día, usar el último log registrado en/antes de esa fecha
   - Promedio de todas las tareas hoja
3. **Renderizado profesional** usando una librería de gráficos moderna (ej. Recharts, Chart.js, o similar) — NO SVG manual
4. **Elementos visuales**:
   - Gradientes bajo las curvas (planned: dorado sutil, real: verde sutil)
   - Grid horizontal con etiquetas Y (0%, 25%, 50%, 75%, 100%)
   - Etiquetas X de meses
   - Línea vertical "HOY" punteada roja
   - Punto animado en posición actual (planned + real)
   - Métricas en header: "Meta Plan %" y "Avance Real %" del día actual
5. **Interactividad**: hover sobre la curva para ver el dato exacto de cada día

#### D. Registro de Avance (Progress Logging)
1. Modal dedicado para registro diario de campo
2. Campos: fecha, porcentaje de avance (botones rápidos 25/50/75/100 + input manual), notas
3. **Evidencia fotográfica obligatoria** cuando progreso > 0%:
   - Upload de imágenes a cloud storage
   - Preview del archivo antes de enviar
4. Backend: operación batch (crear log + actualizar task.progress en una transacción atómica)
5. Solo el rol `SUPERVISOR` puede registrar avance

#### E. Galería/Historial de Avances
1. Modal con timeline vertical (estilo timeline de eventos)
2. Para cada registro: fecha, porcentaje, notas, fotos reales (corregir el bug del sistema original donde las fotos no se renderizan)
3. Ordenamiento cronológico descendente
4. Grid de fotos clicable para vista ampliada

#### F. Reportes y Exportación (NUEVO — no existente en el original)
1. **Exportar cronograma a PDF** con diseño profesional
2. **Exportar Curva S a imagen** (PNG/SVG)
3. **Reporte ejecutivo**: resumen del proyecto con % avance global, desviación plan vs real, tareas críticas

#### G. Control de Acceso (RBAC)
| Rol | Gestión Proyecto | CRUD Tareas | Drag/Resize | Registrar Avance | Ver Reportes |
|---|---|---|---|---|---|
| GERENTE | ✅ Crear/Editar | ✅ | ✅ | ❌ | ✅ |
| PMO | ✅ Editar | ✅ | ✅ | ❌ | ✅ |
| COORDINADOR | 🔒 Solo asignados | ✅ | ✅ | ❌ | ✅ |
| SUPERVISOR | 🔒 Solo asignados | ✅ | ✅ | ✅ | ✅ |

---

## LENGUAJE (L)

### Stack Tecnológico Obligatorio

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | SSR/CSR híbrido, routing filesystem |
| **UI Library** | React 18/19 | Compatible con Next.js |
| **Estilos** | Tailwind CSS 3/4 | Consistencia con el sistema original |
| **Iconos** | lucide-react | Misma librería del sistema original |
| **Charts** | Recharts o Tremor | Para Curva S profesional — reemplazar SVG manual |
| **State** | React hooks (useState, useEffect, useMemo) | Simplicidad, evitar over-engineering |
| **Backend** | NestJS 10/11 | REST API con guards, pipes, modules |
| **Base de datos** | Firebase Firestore | Modelo de subcollecciones ya validado |
| **Auth** | Firebase Auth + Custom Claims | Para roles RBAC |
| **Storage** | Firebase Storage | Upload de fotos de evidencia |
| **Validación** | Zod | Schemas compartidos client/server |
| **Monorepo** | Turborepo | Frontend + Backend + Shared package |

### Estructura de Carpetas del Proyecto

```
cronograma-curva-s/
├── apps/
│   ├── web/                         # Next.js frontend
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx         # Listado de proyectos
│   │   │       ├── projects/
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx # Cronograma + Curva S
│   │   │       └── catalog/
│   │   │           └── page.tsx     # Catálogo maestro
│   │   ├── components/
│   │   │   ├── gantt/
│   │   │   │   ├── GanttChart.tsx
│   │   │   │   ├── GanttHeader.tsx
│   │   │   │   ├── GanttTaskRow.tsx
│   │   │   │   ├── GanttBar.tsx
│   │   │   │   ├── TodayMarker.tsx
│   │   │   │   └── TimelineControls.tsx
│   │   │   ├── scurve/
│   │   │   │   ├── SCurveChart.tsx
│   │   │   │   └── SCurveMetrics.tsx
│   │   │   ├── modals/
│   │   │   │   ├── TaskModal.tsx
│   │   │   │   ├── ProgressModal.tsx
│   │   │   │   └── EvidenceGallery.tsx
│   │   │   └── shared/
│   │   │       ├── Toast.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx
│   │   │   ├── useToast.tsx
│   │   │   ├── useGanttInteraction.ts
│   │   │   └── useProjectData.ts
│   │   └── lib/
│   │       └── firebase/
│   │           └── clientApp.ts
│   └── api/                         # NestJS backend
│       └── src/
│           ├── projects/
│           │   ├── projects.controller.ts
│           │   ├── projects.service.ts
│           │   └── projects.module.ts
│           ├── progress-logs/
│           │   ├── progress-logs.controller.ts
│           │   ├── progress-logs.service.ts
│           │   └── progress-logs.module.ts
│           ├── activities/
│           │   ├── activities.controller.ts
│           │   └── activities.service.ts
│           ├── auth/
│           │   ├── firebase-auth.guard.ts
│           │   ├── roles.guard.ts
│           │   └── roles.decorator.ts
│           └── firebase/
│               └── firebase.service.ts
└── packages/
    └── shared/
        ├── types/index.ts           # ProjectTask, Project, TaskType, etc.
        └── schemas/index.ts         # ProgressLogSchema, ProjectSchema, etc.
```

### Modelos de Datos a Implementar

```typescript
// types/index.ts
export enum UserRole {
    GERENTE = "GERENTE",
    PMO = "PMO",
    COORDINADOR = "COORDINADOR",
    SUPERVISOR = "SUPERVISOR",
}

export enum TaskType {
    AREA = "AREA",
    ITEM = "ITEM",
    ACTIVITY = "ACTIVITY",
}

export interface ProjectTask {
    id: string;
    projectId: string;
    parentId: string | null;
    title: string;
    description?: string;
    type: TaskType;
    startDate: string;     // YYYY-MM-DD
    endDate: string;       // YYYY-MM-DD
    progress: number;      // 0-100
    order: number;
    collapsed?: boolean;   // NUEVO: para colapsar sub-ramas
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: "ACTIVE" | "PAUSED" | "COMPLETED";
    coordinatorId: string;
    supervisorId: string | null;
    createdAt: string;
}

// schemas/index.ts (Zod)
export const ProgressLogSchema = z.object({
    taskId: z.string().min(1),
    projectId: z.string().min(1),
    date: z.string().min(1),
    progressPercentage: z.coerce.number().min(0).max(100),
    notes: z.string().optional(),
    recordedBy: z.string().optional(),
    photoUrls: z.array(z.string()).max(3).optional(),
});
```

### API Endpoints

```
POST   /projects                        → Crear proyecto
GET    /projects                        → Listar proyectos (filtrado RBAC)
GET    /projects/:id                    → Detalle proyecto
PATCH  /projects/:id                    → Actualizar proyecto

POST   /projects/:id/tasks             → Crear tarea
GET    /projects/:id/tasks             → Listar tareas (ordenadas por order)
PATCH  /projects/:id/tasks/:taskId     → Actualizar tarea (fechas, progreso, título)
DELETE /projects/:id/tasks/:taskId     → Eliminar tarea

POST   /projects/:id/progress-logs     → Crear reporte de avance (SUPERVISOR only)
GET    /projects/:id/progress-logs     → Todos los logs del proyecto
GET    /projects/:id/progress-logs/task/:taskId → Logs de una tarea

GET    /activities                      → Listar catálogo
POST   /activities                      → Crear actividad maestro
DELETE /activities/:id                  → Eliminar del catálogo
```

---

## SESGO (S)

### Principios de Diseño NO Negociables

1. **Componentización**: Descomponer el Gantt monolítico en componentes discretos (`GanttChart`, `GanttHeader`, `GanttTaskRow`, `GanttBar`, `SCurveChart`, etc.). Máximo ~200 líneas por componente.

2. **Memoización**: Usar `useMemo` para [generateSCurveData()](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#439-485), [getHierarchicalTasks()](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#421-429), y [generateTimelineHeader()](file:///c:/Users/Kevin%20Avalos/webs/gestion/apps/web/app/dashboard/projects/%5Bid%5D/page.tsx#398-420). Estas funciones son computacionalmente costosas.

3. **Galería de fotos funcional**: Los `photoUrls` guardados en los progress logs **deben renderizarse como imágenes reales** — no como placeholders.

4. **dayWidth dinámico**: Implementar zoom al menos en 3 niveles (diario=40px, semanal=10px, mensual=5px).

5. **Estética dark premium**: Mantener la estética del sistema original:
   - Tema oscuro con glass morphism (backdrop-blur + border-white/10)
   - `rounded-[2rem]` para paneles
   - Color primario dorado (#D4AF37)
   - Sombras coloreadas (`shadow-primary/20`, `shadow-green-500/20`)
   - Micro-animaciones en todas las transiciones
   - Tipografía mono para datos numéricos
   - Labels uppercase + tracking-widest

6. **Curva S con librería**: Usar Recharts (o equivalente) en lugar de SVG manual, pero mantener la misma estética de gradientes y colores.

7. **Mobile-first para registro de avance**: El modal de registro de avance debe ser usable en dispositivos móviles (los supervisores están en campo).

---

## OBJETIVO (O)

### Entregables Finales

1. **Proyecto standalone funcional** con monorepo Turborepo
2. **Frontend Next.js** con todas las vistas descritas
3. **Backend NestJS** con RBAC completo
4. **Base de datos Firestore** con reglas de seguridad
5. **Documentación** de setup (`.env.example`, README con instrucciones)
6. **Componentes reutilizables** que se puedan integrar en otro ERP o sistema

### Criterios de Éxito

- ✅ Un usuario SUPERVISOR puede registrar avance diario con foto y ver la Curva S actualizarse al instante
- ✅ Un usuario GERENTE puede arrastrar y redimensionar barras del Gantt con feedback visual inmediato
- ✅ La Curva S muestra con precisión la desviación plan vs real en cualquier punto temporal
- ✅ El cronograma soporta proyectos de hasta 365 días con 200+ tareas sin degradación visible de rendimiento
- ✅ La galería de evidencias muestra fotos reales subidas por los supervisores
- ✅ El diseño es visualmente indistinguible de una herramienta comercial premium (glassmorphism dark theme, animaciones suaves, tipografía cuidada)

---

> **INSTRUCCIÓN FINAL**: Construye este proyecto módulo por módulo, comenzando por el package `shared` (types + schemas), luego el backend (NestJS + Firestore), y finalmente el frontend (Next.js). En el frontend, construye primero el sistema de autenticación, luego el Gantt descompuesto en componentes, luego la Curva S con Recharts, y finalmente los modales y la galería. Cada componente debe ser autocontenido, tipado, y documentado con JSDoc.

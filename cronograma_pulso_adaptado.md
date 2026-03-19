# 🎯 PROMPT PULSO — Mejora del Sistema de Cronograma + Curva S (Proyecto Existente)

---

## PROPÓSITO (P)

Eres un ingeniero de software senior full-stack especializado en aplicaciones web de gestión de proyectos de construcción. Tu misión es **mejorar y completar un proyecto web existente** que implementa un **sistema de Cronograma tipo Gantt interactivo + Diagrama de Curva S** para seguimiento de obras civiles. El proyecto ya está en marcha y tiene una base funcional; tu trabajo es llevarlo a nivel profesional, corrigiendo debilidades, completando funcionalidades faltantes y optimizando la experiencia del usuario.

**Contexto del dominio:**
- Sector: Construcción civil — gestión de cronogramas de obra
- Usuarios: Propietario del proyecto, Administradores (equipo de gestión), Editores (personal de campo), Visores (clientes o stakeholders)
- Criticidad: Herramienta operativa diaria para seguimiento de avance real vs planificado

**Estado actual del proyecto:**
El proyecto ya cuenta con:
- ✅ Autenticación con Supabase Auth (login, register, sesiones SSR)
- ✅ CRUD básico de proyectos con roles (owner, admin, editor, viewer)
- ✅ Gantt interactivo con **dhtmlx-gantt** (creación de Partidas → Ítems → Actividades)
- ✅ Curva S con **Recharts** (planificada vs real, SPI, desviación)
- ✅ Registro de avance diario por actividad
- ✅ Sistema de alertas automáticas (retrasos, desviaciones)
- ✅ Compartir proyecto via token (ruta `/share/[token]`)
- ✅ Base de datos PostgreSQL con RLS en todas las tablas
- ✅ Estética dark premium con glassmorphism

---

## USO (U)

### Funcionalidades a MEJORAR (ya existentes pero incompletas)

#### A. Diagrama de Gantt — `GanttView.tsx` (239 líneas)
1. **Mejorar configuración visual de dhtmlx-gantt**:
   - Aplicar theme dark personalizado que coincida con el sistema de diseño (actualmente usa estilos default de dhtmlx)
   - Configurar escalas de tiempo múltiples (día/semana/mes/trimestre) con selector de zoom
   - Mostrar barras de progreso reales por actividad (actualmente `progress: 0` hardcodeado)
   - Colorear barras según tipo: Partida (verde esmeralda), Ítem (azul índigo), Actividad (violeta)
   - Agregar marcador "HOY" como línea vertical roja
2. **Mejorar sincronización con Supabase**:
   - Implementar optimistic updates con rollback en caso de error
   - Agregar feedback visual (toast) al crear/editar/eliminar tareas desde el Gantt
   - Sincronizar el campo `progress` desde `daily_progress` al renderizar el Gantt
3. **Agregar funcionalidad de drag & resize**:
   - Confirmar que drag horizontal (mover) y resize (bordes) persisten correctamente en la BD
   - Prevenir edición para usuarios con rol `viewer`
4. **Panel lateral mejorado**:
   - Columna editable para `weight` (ponderación) directamente en la tabla del Gantt
   - Mostrar progreso acumulado por actividad
   - Indicador visual de actividades retrasadas (fondo rojo sutil)

#### B. Curva S — `SCurveChart.tsx` (194 líneas) + `scurve.ts` (199 líneas)
1. **Mejorar visualización**:
   - Agregar línea vertical "HOY" punteada roja en el gráfico
   - Agregar puntos animados en la posición actual (planned + actual) en el día de hoy
   - Tooltip enriquecido: mostrar fecha, % planificado, % real, desviación, y nombre del día
   - Agregar botón para alternar entre vista de Curva S y vista tabular de datos
2. **Métricas adicionales**:
   - Agregar indicador visual del SPI (gauge o termómetro) con colores semáforo
   - Mostrar "Días de retraso estimados" basado en la desviación
   - Agregar mini-sparkline de tendencia de los últimos 7 días

#### C. Registro de Avance Diario — `DailyProgressForm.tsx` (204 líneas)
1. **Mejorar UX del formulario**:
   - Agregar botones rápidos de porcentaje: 25%, 50%, 75%, 100%
   - Mostrar progreso acumulado actual de la actividad seleccionada antes de registrar
   - Validación: no permitir registrar progreso > 100% acumulado
   - Agregar confirmación visual más prominente (animación de check)
2. **Evidencia fotográfica** (NUEVO — funcionalidad del prompt base):
   - Upload de hasta 3 fotos por registro usando Supabase Storage
   - Preview de imágenes antes de enviar
   - Compresión client-side antes del upload
   - Guardar URLs en campo `photo_urls` del registro de avance
3. **Historial de avances por actividad**:
   - Timeline visual con todos los registros anteriores de la actividad seleccionada
   - Mostrar fotos, notas, fecha, porcentaje en cada entrada
   - Permitir ver fotos en vista ampliada (lightbox)

#### D. Sistema de Alertas — `AlertBanner.tsx` + `alerts.ts` (122 líneas)
1. **Mejorar la visualización**:
   - Diseñar panel de alertas con filtros (por severidad, por tipo, leídas/no leídas)
   - Agregar badge de alertas no leídas en la barra lateral
   - Notificación toast automática al entrar al proyecto si hay alertas críticas
2. **Disparar alertas automáticamente**:
   - Ejecutar `evaluateAlerts()` al registrar avance diario
   - Guardar alertas nuevas automáticamente vía server action

### Funcionalidades NUEVAS a implementar

#### E. Exportación y Reportes
1. **Exportar Curva S a imagen** (PNG): capturar el gráfico de Recharts como imagen descargable
2. **Exportar cronograma a PDF**: layout profesional con tabla de actividades, progreso, fechas
3. **Reporte ejecutivo**: resumen en una página con % avance global, SPI, desviación, actividades críticas

#### F. Compartir Proyecto (mejorar ruta existente `/share/[token]`)
1. Vista pública read-only del Gantt + Curva S para stakeholders externos
2. Sin necesidad de login
3. Datos actualizados en tiempo real

#### G. Mejoras de UX General
1. **Loading states**: skeletons profesionales en cada sección mientras cargan datos
2. **Empty states**: diseños ilustrados cuando no hay datos (ya parcialmente implementado)
3. **Responsive**: sidebar colapsable en móvil, Gantt con scroll horizontal táctil
4. **Keyboard shortcuts**: atajos para acciones frecuentes (Nueva partida, Registrar avance)
5. **Breadcrumbs**: navegación contextual Dashboard → Proyecto → [Tab activo]

---

## LENGUAJE (L)

### Stack Tecnológico del Proyecto (NO CAMBIAR)

| Capa | Tecnología | Versión | Uso Actual |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.7 | SSR + CSR híbrido, route groups `(protected)` |
| **UI** | React | 19.2.3 | Componentes client/server |
| **Estilos** | Tailwind CSS | 4 | Sistema de diseño dark premium con tokens custom |
| **Gantt** | dhtmlx-gantt | 9.1.3 | Diagrama de Gantt interactivo con CRUD |
| **Charts** | Recharts | 3.8.0 | Curva S (AreaChart con gradientes) |
| **Fechas** | date-fns | 4.1.0 | Cálculos de intervalos, formateo |
| **IDs** | uuid | 13.0.0 | Generación de IDs únicos |
| **Base de datos** | Supabase (PostgreSQL) | — | Tablas con RLS, queries directas |
| **Auth** | Supabase Auth | via @supabase/ssr | Login email+password, sesiones SSR, middleware |
| **Storage** | Supabase Storage | — | Para evidencia fotográfica (a implementar) |

### Estructura Actual del Proyecto

```
cronograma/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Landing page
│   │   ├── globals.css                   # Sistema de diseño (tokens, utilities)
│   │   ├── login/page.tsx                # Login
│   │   ├── register/page.tsx             # Registro
│   │   ├── auth/                         # Auth callbacks (signout, etc.)
│   │   ├── share/                        # Ruta pública /share/[token]
│   │   └── (protected)/
│   │       ├── layout.tsx                # Layout con sidebar + auth guard
│   │       ├── dashboard/page.tsx        # Listado de proyectos
│   │       └── projects/[id]/page.tsx    # Vista de proyecto (tabs)
│   ├── components/
│   │   ├── gantt/
│   │   │   └── GanttView.tsx             # Gantt con dhtmlx-gantt (239 líneas)
│   │   ├── charts/
│   │   │   └── SCurveChart.tsx           # Curva S con Recharts (194 líneas)
│   │   ├── project/
│   │   │   ├── ProjectTabs.tsx           # Tabs: Gantt | Curva S | Avance | Alertas
│   │   │   └── DailyProgressForm.tsx     # Formulario de avance diario (204 líneas)
│   │   ├── alerts/
│   │   │   └── AlertBanner.tsx           # Panel de alertas
│   │   └── dashboard/
│   │       └── NewProjectButton.tsx      # Modal crear proyecto
│   └── lib/
│       ├── types.ts                      # Interfaces TypeScript (146 líneas)
│       ├── scurve.ts                     # Algoritmo Curva S + SPI (199 líneas)
│       ├── alerts.ts                     # Motor de alertas (122 líneas)
│       └── supabase/
│           ├── client.ts                 # Supabase browser client
│           ├── server.ts                 # Supabase server client (cookies)
│           └── middleware.ts             # Session refresh middleware
├── supabase/
│   ├── schema.sql                        # DDL completo (8 tablas, triggers, índices)
│   └── rls.sql                           # Policies RLS para todas las tablas
├── package.json
├── next.config.ts
├── tailwind / postcss configs
└── .env.local                            # NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
```

### Base de Datos Existente (PostgreSQL / Supabase)

```sql
-- Tablas principales:
profiles          — Extiende auth.users (id, full_name, avatar_url)
projects          — Proyectos (id, name, description, start_date, end_date, owner_id, share_token)
project_members   — Miembros (project_id, user_id, role: admin|editor|viewer)
partidas          — Agrupación nivel 1 (id, project_id, name, sort_order)
items             — Agrupación nivel 2 (id, partida_id, name, sort_order)
activities        — Tareas Gantt (id, item_id, name, start_date, end_date, weight, sort_order)
daily_progress    — Avance diario (id, activity_id, date, progress_percent, notes, created_by) — UNIQUE(activity_id, date)
alerts            — Alertas auto (id, project_id, activity_id, type, message, severity, is_read)
```

### Modelos TypeScript Existentes (`types.ts`)

```typescript
// Interfaces principales ya definidas:
Profile, Project, ProjectMember, Partida, Item, Activity,
DailyProgress, Alert, GanttTask, GanttLink

// Tipos extendidos (joins):
ActivityWithProgress, ItemWithActivities, PartidaWithItems, ProjectWithDetails

// Tipos de Curva S:
SCurvePoint { date, planned, actual, deviation }
SCurveData  { points, totalWeight, currentPlanned, currentActual, spiIndex }
```

### Cambios de Schema Necesarios

```sql
-- Agregar campo para fotos en daily_progress:
ALTER TABLE daily_progress ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

-- Crear bucket de storage para evidencias:
-- (Configurar desde Supabase Dashboard)
-- Bucket: "evidence"
-- Path: {project_id}/{activity_id}/{date}_{filename}
```

### Sistema de Roles Actual

| Rol | Crear Proyecto | CRUD Tareas (Gantt) | Registrar Avance | Ver Curva S | Ver Alertas |
|---|---|---|---|---|---|
| **owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin** | ❌ (invitado) | ✅ | ✅ | ✅ | ✅ |
| **editor** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **viewer** | ❌ | ❌ (solo lectura) | ❌ | ✅ | ✅ |

---

## SESGO (S)

### Principios de Diseño NO Negociables

1. **Respetar el stack existente**: No introducir Firebase, NestJS, ni monorepo Turborepo. El proyecto usa **Supabase directo** desde Next.js (server components + client components). Mantener esta arquitectura.

2. **Mantener dhtmlx-gantt**: La librería dhtmlx-gantt ya está integrada y funcional. No reemplazarla con SVG manual ni otra librería. Mejora su configuración y estilos para que se integre visualmente con el tema dark.

3. **Mantener Recharts para la Curva S**: Ya está integrado y funcionando. Mejorar la visualización sin cambiar de librería.

4. **Estética dark premium existente**: El proyecto ya tiene un sistema de diseño consistente con:
   - Tema oscuro con glass morphism (`glass-card`, `backdrop-blur`)
   - Tokens de color: `primary` (índigo/violeta), `accent` (verde), `danger` (rojo), `warning` (ámbar), `surface` (grises oscuros)
   - Gradientes sutiles, bordes `border-primary-500/10`
   - Transiciones suaves en todos los interactive elements
   - **Mantener esta estética en todos los cambios y adiciones**

5. **Arquitectura de archivos**: Seguir el pattern existente:
   - Server Components para fetch de datos en `page.tsx`
   - Client Components con `'use client'` para interactividad
   - Supabase server client en server components, browser client en client components
   - Lógica de negocio en `lib/` (como `scurve.ts`, `alerts.ts`)

6. **Memoización**: Usar `useMemo` para cálculos costosos. Ya implementado en `SCurveChart.tsx` para flatten de actividades y cálculo de S-Curve. Aplicar el mismo patrón en nuevas funcionalidades.

7. **Componentes ≤ 250 líneas**: Los componentes actuales están bien dimensionados (GanttView: 239, SCurveChart: 194, DailyProgressForm: 204). Mantener este estándar.

8. **Mobile-first para registro de avance**: El formulario de avance diario debe ser usable en dispositivos móviles — los supervisores están en campo.

9. **No romper RLS**: Todas las queries deben respetar las policies de Row Level Security existentes. No usar `service_role` key desde el frontend.

---

## OBJETIVO (O)

### Entregables por Prioridad

#### 🔴 Prioridad Alta
1. Gantt con theme dark integrado + barras de progreso reales + marcador HOY
2. Evidencia fotográfica en registro de avance (Supabase Storage)
3. Galería/historial de avances con fotos reales por actividad
4. Alertas automáticas al registrar avance

#### 🟡 Prioridad Media
5. Curva S mejorada (línea HOY, puntos animados, tooltip enriquecido)
6. Exportar Curva S a PNG
7. Panel de alertas con filtros
8. Loading skeletons profesionales

#### 🟢 Prioridad Baja
9. Exportar cronograma a PDF
10. Reporte ejecutivo
11. Responsive completo (sidebar colapsable, Gantt táctil)
12. Keyboard shortcuts

### Criterios de Éxito

- ✅ El Gantt muestra barras con progreso real calculado desde `daily_progress` y se ve visualmente integrado con el tema dark
- ✅ Un editor puede registrar avance diario con foto y ver la Curva S actualizarse al refrescar
- ✅ La galería de evidencias muestra fotos reales subidas por los usuarios
- ✅ Las alertas se generan automáticamente cuando hay desviaciones significativas
- ✅ La Curva S muestra con precisión la desviación plan vs real con indicadores visuales claros
- ✅ El sistema soporta proyectos de hasta 365 días con 100+ actividades sin degradación visible
- ✅ El diseño mantiene la coherencia estética premium dark en todas las vistas nuevas y mejoradas

---

> **INSTRUCCIÓN FINAL**: Trabaja módulo por módulo sobre el proyecto existente. Comienza por las mejoras de **Prioridad Alta** en orden. Para cada cambio: (1) identifica el archivo afectado, (2) explica qué vas a cambiar y por qué, (3) implementa el cambio, (4) verifica que no rompe funcionalidad existente. Respeta el stack, la estructura de archivos, los patterns de código, y el sistema de diseño existente. No reescribas componentes desde cero — mejóralos incrementalmente.

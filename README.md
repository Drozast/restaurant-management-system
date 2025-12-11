# 🍽️ Sistema Mise en Place para Restaurantes

Sistema digital de Mise en Place para restaurantes que transforma la preparación, organización y operación diaria del personal de cocina.

## 🎯 ¿Qué es Mise en Place?

**Mise en Place** (del francés "poner en su lugar") es la filosofía fundamental de cocina profesional que consiste en tener todo preparado, organizado y en su lugar antes del servicio.

Este sistema digitaliza y optimiza ese proceso, ayudando a:
- ✅ Preparar todo antes del servicio
- ✅ Verificar inventarios y stock
- ✅ Organizar tareas del turno
- ✅ Mantener todo listo y bajo control
- ✅ Mejorar la eficiencia operativa

## ✨ Características Principales

### 📋 Checklist de Mise en Place Digital
- Lista de tareas pre-servicio (AM/PM)
- Verificación de preparaciones
- Control de calidad paso a paso
- Timestamps de completado
- Responsabilidades claras por turno

### 📦 Control de Inventario en Tiempo Real
- Verificar stock antes del servicio
- Alertas de ingredientes bajos/críticos
- Lista de compras automática
- Sistema de reposición con autorización
- Historial de movimientos

### 🍕 Gestión de Recetas y Preparaciones
- Recetas estandarizadas
- Ingredientes y cantidades exactas
- Cálculo automático de necesidades
- Variantes y personalizaciones

### 👥 Organización de Turnos
- Turnos AM/PM con responsabilidades claras
- Apertura: verificar inventario y preparaciones
- Cierre: checklist de limpieza y orden
- Handoff entre turnos
- Registro de incidencias

### 💰 Registro de Ventas
- Descuento automático de inventario
- Saber qué se vendió y cuándo
- Preparar según demanda histórica
- Ajustar mise en place basado en tendencias

### 🎮 Gamificación del Trabajo
- Puntos por tareas completadas correctamente
- Reconocimiento al mejor preparador
- Badges por consistencia y calidad
- Motivación del equipo
- Leaderboard semanal

### 📊 Reportes y Analíticas
- ¿Qué se está usando más?
- ¿Qué hay que preparar más?
- Tendencias de consumo
- Eficiencia del equipo
- Exportación a Excel/PDF

### 🔄 Actualizaciones en Tiempo Real
- Todo el equipo ve los cambios al instante
- WebSockets para sincronización
- Notificaciones de bajo stock
- Alertas de tareas críticas

## 🎓 Filosofía: De lo Manual a lo Digital

### Antes (Manual)
- ❌ Listas de papel que se pierden
- ❌ Inventarios mentales imprecisos
- ❌ Comunicación verbal entre turnos
- ❌ Olvidos de preparaciones
- ❌ Stock que se acaba sin aviso

### Ahora (Digital)
- ✅ Checklist digital siempre disponible
- ✅ Inventario exacto en tiempo real
- ✅ Traspaso de turno documentado
- ✅ Alertas automáticas de pendientes
- ✅ Lista de compras generada automáticamente

## 🚀 Tecnologías

### Frontend
- React + TypeScript
- TailwindCSS - UI moderna
- Socket.IO - Tiempo real
- Zustand - Estado global
- Recharts - Visualizaciones

### Backend
- Node.js + Express
- SQLite - Base de datos
- Socket.IO - WebSockets
- Bcrypt - Seguridad
- Cron Jobs - Automatización

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Navegador moderno
- Red local (WiFi recomendado)

## ⚙️ Instalación Rápida

### 1. Clonar e instalar

```bash
git clone https://github.com/Drozast/restaurant-management-system.git mi-restaurante
cd mi-restaurante
npm install
```

### 2. Configurar tu restaurante

```bash
cp config.template.json config.json
```

Edita `config.json`:

```json
{
  "business": {
    "name": "Pizzería El Horno",
    "type": "pizzeria"
  },
  "admin": {
    "rut": "12345678-9",
    "name": "Chef Principal",
    "password": "1234"
  }
}
```

### 3. Iniciar

```bash
npm run dev
```

Abre: http://localhost:3000

## 👨‍🍳 Flujo de Trabajo Diario

### 🌅 Turno AM (Mañana)

1. **Login** - Empleado inicia sesión
2. **Abrir Turno AM** - Sistema muestra:
   - Estado actual del inventario
   - Ingredientes críticos
   - Tareas pendientes del turno anterior
3. **Checklist Mise en Place**:
   - ☑️ Verificar stock de ingredientes
   - ☑️ Preparar masas del día
   - ☑️ Cortar vegetales
   - ☑️ Preparar salsas
   - ☑️ Verificar temperaturas
   - ☑️ Organizar estación de trabajo
4. **Durante el Servicio**:
   - Registrar ventas
   - Restockear según necesidad
   - Ver alertas de bajo stock
5. **Cierre de Turno**:
   - Completar checklist de cierre
   - Registrar incidencias
   - Handoff a turno PM

### 🌆 Turno PM (Tarde/Noche)

1. **Recibir Turno** - Ver notas del turno anterior
2. **Verificar Mise en Place** - Todo listo para servicio
3. **Servicio** - Registrar ventas
4. **Cierre del Día**:
   - Limpieza y orden
   - Inventario final
   - Lista de compras para mañana
   - Cerrar turno

### 📊 Semanal (Chef/Admin)

- Revisar reportes de ventas
- Analizar consumo de ingredientes
- Calcular premios del equipo
- Ajustar recetas según tendencias
- Planificar compras

## 🎮 Sistema de Puntos y Motivación

### ¿Por qué gamificación en cocina?

Un equipo motivado es más:
- ✅ Consistente en calidad
- ✅ Rápido en preparación
- ✅ Cuidadoso con el inventario
- ✅ Comprometido con el orden

### Cómo funciona

**Gana puntos por:**
- Completar mise en place a tiempo
- Cumplir checklist completo
- No desperdiciar inventario
- Consistencia semanal
- Puntualidad en turnos

**Niveles y badges:**
- 🌱 Novato (0-500 pts)
- ⭐ Dedicado (500-1000 pts)
- 🏆 Experto (1000-2000 pts)
- 👑 Maestro (2000-5000 pts)
- 💎 Leyenda (5000+ pts)

**Premios semanales automáticos:**
- Sistema calcula puntos cada sábado
- Reconocimiento al mejor del equipo
- Notificaciones de logros desbloqueados

## 🔧 Configuración por Tipo de Negocio

### Pizzería
```json
{
  "business": { "type": "pizzeria" },
  "inventory": {
    "categories": ["masas", "proteínas", "quesos", "vegetales", "salsas"]
  }
}
```

### Restaurante
```json
{
  "business": { "type": "restaurant" },
  "inventory": {
    "categories": ["proteínas", "vegetales", "lácteos", "granos", "especias"]
  }
}
```

### Café/Bakery
```json
{
  "business": { "type": "cafe" },
  "inventory": {
    "categories": ["harinas", "lácteos", "café", "endulzantes", "especias"]
  }
}
```

## 💡 Beneficios Clave

### Para el Chef/Dueño
- 📊 Visibilidad total de la operación
- 💰 Control de costos e inventario
- 📈 Datos para tomar decisiones
- 👥 Equipo más organizado
- 🎯 Menos desperdicios

### Para el Equipo
- ✅ Saber exactamente qué hacer
- 🎮 Reconocimiento por buen trabajo
- 📱 Herramienta fácil de usar
- 👥 Mejor coordinación
- 🏆 Motivación y metas claras

### Para la Operación
- ⚡ Servicio más rápido
- 🎯 Mayor consistencia
- 📦 Nunca quedarse sin stock
- 🔄 Mejor comunicación entre turnos
- 📊 Todo documentado y medible

## 🔐 Seguridad

- ✅ Contraseñas encriptadas (bcrypt)
- ✅ Rate limiting en login
- ✅ Autorización por roles (Chef/Empleado)
- ✅ Restock requiere aprobación de admin
- ✅ Backup automático diario

## 📱 Uso en Tablet/Móvil

Responsive design optimizado para:
- 📱 Smartphones (empleados en cocina)
- 📱 Tablets (estación de trabajo)
- 💻 Desktop (administración)

## 📄 Licencia

Propietario. Todos los derechos reservados.

---

**"Everything in its place, a place for everything"** 
**"Todo en su lugar, un lugar para todo"** 🍽️

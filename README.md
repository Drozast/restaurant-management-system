# 🍽️ Sistema de Gestión para Restaurantes

Sistema integral de gestión para restaurantes con control de inventario, ventas, turnos, gamificación y analíticas en tiempo real.

## ✨ Características Principales

### 📦 Gestión de Inventario
- Control de stock en tiempo real
- Alertas automáticas de bajo inventario
- Sistema de restock con autorización
- Historial de movimientos
- Lista de compras automática

### 🍕 Gestión de Recetas
- Biblioteca de recetas personalizable
- Cálculo automático de ingredientes necesarios
- Costos por receta
- Variantes y personalizaciones

### 💰 Ventas y Reportes
- Registro de ventas en tiempo real
- Reportes diarios, semanales y mensuales
- Análisis de productos más vendidos
- Exportación a Excel y PDF
- Dashboard con métricas clave

### 👥 Gestión de Turnos
- Turnos AM/PM configurables
- Checklist de tareas por turno
- Mise en place digital
- Historial de cumplimiento

### 🎮 Sistema de Gamificación
- Puntos por tareas completadas
- Niveles y experiencia
- Badges y logros
- Leaderboard semanal
- Premios automáticos
- Notificaciones en tiempo real

### 📊 Analíticas
- Gráficos interactivos con Recharts
- Tendencias de ventas
- Rendimiento de empleados
- Distribución de inventario
- Frecuencia de reposición

### 🔄 Tiempo Real
- WebSockets para actualizaciones instantáneas
- Notificaciones push
- Sincronización automática entre dispositivos

## 🚀 Tecnologías

### Frontend
- React + TypeScript
- Vite - Build tool
- TailwindCSS - Estilos
- Zustand - State management
- Socket.IO Client - WebSockets
- Recharts - Gráficos
- React Hot Toast - Notificaciones

### Backend
- Node.js + TypeScript
- Express - API REST
- Better-SQLite3 - Base de datos
- Socket.IO - WebSockets
- Bcrypt - Encriptación
- Node-Cron - Tareas programadas
- XLSX + jsPDF - Exportaciones

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Puertos 3000 (frontend) y 3001 (backend) disponibles

## ⚙️ Instalación

### 1. Clonar el repositorio

\`\`\`bash
git clone https://github.com/tu-usuario/restaurant-management-system.git
cd restaurant-management-system
\`\`\`

### 2. Instalar dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Configurar el negocio

Copia el archivo de configuración:

\`\`\`bash
cp config.template.json config.json
\`\`\`

Edita \`config.json\` con los datos de tu negocio.

### 4. Iniciar en desarrollo

\`\`\`bash
npm run dev
\`\`\`

Abre tu navegador en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 5. Build para producción

\`\`\`bash
npm run build
npm start
\`\`\`

## 👤 Credenciales por Defecto

Después de la instalación:

- **RUT**: 11111111-1
- **Contraseña**: 1111

## 🔧 Configuración

### Variables de Entorno

Crea un archivo \`.env\`:

\`\`\`env
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
DB_PATH=./data/restaurant.db
\`\`\`

### Cron Jobs Automáticos

- **Premios semanales**: Sábados 23:00
- **Limpieza de datos**: Primer día del mes 02:00
- **Backup automático**: Diario 03:00

## 🐳 Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## 📦 Estructura

\`\`\`
restaurant-management-system/
├── src/                    # Frontend React
│   ├── components/        # Componentes
│   ├── pages/            # Páginas
│   ├── hooks/            # Custom hooks
│   ├── lib/              # API client
│   └── store/            # State management
├── server/                # Backend Node.js
│   ├── database/         # BD y migraciones
│   ├── routes/           # API routes
│   ├── jobs/             # Cron jobs
│   ├── middleware/       # Middlewares
│   └── utils/            # Utilidades
├── data/                  # Base de datos SQLite
├── config.json           # Configuración
└── package.json
\`\`\`

## 🔐 Seguridad

- ✅ Contraseñas encriptadas con bcrypt
- ✅ Rate limiting en login (5 intentos/15 min)
- ✅ CORS configurado
- ✅ Validación de entrada
- ✅ Autorización por roles
- ✅ Backup automático

## 📄 Licencia

Propietario. Todos los derechos reservados.

---

**Desarrollado para optimizar la gestión de restaurantes** 🍽️

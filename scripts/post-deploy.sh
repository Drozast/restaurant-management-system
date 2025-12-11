#!/bin/sh

# Post-deploy script para inicializar la base de datos en producción
# Compatible con Alpine Linux (sh en lugar de bash)

echo "🔍 Verificando si la base de datos necesita inicialización..."

# Crear directorio data si no existe
mkdir -p data

# Verificar si existen recetas en la base de datos
if [ -f "data/pizza.db" ]; then
  RECIPE_COUNT=$(sqlite3 data/pizza.db "SELECT COUNT(*) FROM recipes WHERE type='pizza';" 2>/dev/null || echo "0")
else
  RECIPE_COUNT=0
fi

if [ "$RECIPE_COUNT" -lt 30 ]; then
  echo "📦 Base de datos vacía o incompleta ($RECIPE_COUNT pizzas). Ejecutando seed..."
  npm run seed
  echo "✅ Seed completado."
else
  echo "✅ Base de datos ya tiene $RECIPE_COUNT pizzas. No se necesita seed."
fi

echo "🚀 Aplicación lista para usar."

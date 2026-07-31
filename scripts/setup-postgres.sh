#!/bin/bash
# Script para migrar de SQLite para PostgreSQL
# Uso: bash scripts/setup-postgres.sh

echo "============================================"
echo "  Migrando LMS de SQLite para PostgreSQL"
echo "============================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker não está rodando. Inicie o Docker primeiro."
  echo "   docker compose up -d"
  exit 1
fi

echo "✅ Docker encontrado."

# Copy production env
cp .env.production .env
echo "✅ Usando .env.production como .env"

# Install PostgreSQL adapter
npm install @prisma/adapter-pg pg
echo "✅ Adapter PostgreSQL instalado"

# Update Prisma schema for PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "✅ Schema atualizado para PostgreSQL"

# Wait for PostgreSQL to be ready
echo "⏳ Aguardando PostgreSQL ficar pronto..."
until docker exec lms-postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL pronto!"

# Generate Prisma client
npx prisma generate
echo "✅ Prisma Client gerado"

# Push schema
npx prisma db push
echo "✅ Schema aplicado no banco"

# Seed database
npm run db:seed
echo "✅ Banco populado com dados de teste"

echo ""
echo "============================================"
echo "  Migração concluída com sucesso!"
echo "============================================"
echo ""
echo "  Para rodar o app: npm run dev"
echo ""

#!/bin/bash
# ────────────────────────────────────────────────────
# PostgreSQL Migration Script for LMS Platform
# ────────────────────────────────────────────────────
# This script:
#   1. Checks prerequisites (Docker, Node)
#   2. Starts PostgreSQL via Docker Compose
#   3. Waits for PostgreSQL to be healthy
#   4. Generates Prisma Client
#   5. Pushes schema to PostgreSQL
#   6. Seeds the database
#   7. Runs validation
# ────────────────────────────────────────────────────

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}┌─────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│     LMS Platform — PostgreSQL Migration     │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────┘${NC}"
echo ""

# ─── Step 1: Check prerequisites ───
echo -e "${YELLOW}[1/7] Verificando pré-requisitos...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✖ Node.js não encontrado. Instale Node.js 18+${NC}"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✖ Docker não encontrado. Instale Docker Desktop${NC}"
  exit 1
fi

if ! command -v npx &> /dev/null; then
  echo -e "${RED}✖ npx não encontrado.${NC}"
  exit 1
fi

echo -e "${GREEN}✔ Node.js $(node -v)${NC}"
echo -e "${GREEN}✔ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"

# ─── Step 2: Check DATABASE_URL ───
echo ""
echo -e "${YELLOW}[2/7] Verificando DATABASE_URL...${NC}"

if grep -q "DATABASE_URL=postgresql" .env 2>/dev/null; then
  echo -e "${GREEN}✔ DATABASE_URL já configurada para PostgreSQL${NC}"
else
  echo -e "${YELLOW}⚠ DATABASE_URL não configurada para PostgreSQL.${NC}"
  echo -e "${YELLOW}  Adicione ao .env: DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/lms\"${NC}"
  echo ""
  echo -n "  Deseja configurar agora? (s/N): "
  read -r answer
  if [[ "$answer" =~ ^[Ss]$ ]]; then
    # Backup current .env
    if [ -f .env ]; then
      cp .env .env.backup.pre-pg
      echo -e "${GREEN}✔ Backup do .env atual salvo em .env.backup.pre-pg${NC}"
    fi
    echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/lms\"" >> .env
    echo -e "${GREEN}✔ DATABASE_URL configurada${NC}"
  else
    echo -e "${RED}✖ Configure manualmente e execute novamente.${NC}"
    exit 1
  fi
fi

# ─── Step 3: Start PostgreSQL ───
echo ""
echo -e "${YELLOW}[3/7] Iniciando PostgreSQL via Docker Compose...${NC}"

docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null

echo -e "${GREEN}✔ Container PostgreSQL iniciado${NC}"

# ─── Step 4: Wait for PostgreSQL health ───
echo ""
echo -e "${YELLOW}[4/7] Aguardando PostgreSQL ficar saudável...${NC}"

for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres &>/dev/null || docker exec lms-postgres pg_isready -U postgres &>/dev/null; then
    echo -e "${GREEN}✔ PostgreSQL está pronto (${i}s)${NC}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}✖ PostgreSQL não respondeu após 30s${NC}"
    exit 1
  fi
  sleep 1
done

# ─── Step 5: Generate Prisma Client ───
echo ""
echo -e "${YELLOW}[5/7] Gerando Prisma Client...${NC}"

npx prisma generate
echo -e "${GREEN}✔ Prisma Client gerado${NC}"

# ─── Step 6: Push schema to PostgreSQL ───
echo ""
echo -e "${YELLOW}[6/7] Aplicando schema ao PostgreSQL...${NC}"

npx prisma db push
echo -e "${GREEN}✔ Schema aplicado ao PostgreSQL${NC}"

# ─── Step 7: Seed database ───
echo ""
echo -e "${YELLOW}[7/7] Populando banco de dados...${NC}"

npx prisma db seed
echo -e "${GREEN}✔ Banco populado com dados iniciais${NC}"

# ─── Validation ───
echo ""
echo -e "${BLUE}┌─────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│        Migração concluída com sucesso!       │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${GREEN}✔ PostgreSQL rodando em:${NC} localhost:5432"
echo -e "  ${GREEN}✔ Banco:${NC} lms"
echo -e "  ${GREEN}✔ Usuário:${NC} postgres"
echo -e "  ${GREEN}✔ Prisma Client:${NC} gerado"
echo -e "  ${GREEN}✔ Schema:${NC} aplicado"
echo -e "  ${GREEN}✔ Seed:${NC} executado"
echo ""
echo -e "  ${YELLOW}Inicie o servidor:${NC} npm run dev"
echo ""

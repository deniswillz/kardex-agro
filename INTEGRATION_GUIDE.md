# Guia de Integração - Kardex Agro

Este guia detalha o passo a passo para deploy do Kardex Agro com GitHub, Supabase e Vercel.

---

## 📦 1. Configuração do GitHub

### 1.1. Criar Repositório
1. Acesse [github.com](https://github.com) e faça login
2. Clique em **"New Repository"** (botão verde no canto superior)
3. Preencha:
   - **Nome**: `kardex-agro`
   - **Descrição**: `Sistema de gestão de estoque Kardex para Agrosystem`
   - **Visibilidade**: Private (recomendado)
4. **NÃO** marque "Add README" ou "Add .gitignore" (já temos no projeto)
5. Clique em **"Create repository"**

### 1.2. Subir Código para o GitHub
Abra o terminal na pasta do projeto e execute:

```bash
# Inicializa o repositório Git (se ainda não iniciado)
git init

# Adiciona todos os arquivos
git add .

# Faz o primeiro commit
git commit -m "Initial commit - Kardex Agro"

# Adiciona o repositório remoto (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/kardex-agro.git

# Envia para o GitHub
git push -u origin main
```

> **Nota**: Se pedir autenticação, use seu Personal Access Token do GitHub (não a senha).

---

## ☁️ 2. Configuração do Supabase

### 2.1. Criar Projeto
1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Nome**: `kardex-agro`
   - **Senha do banco**: Crie uma senha forte e **ANOTE-A**
   - **Região**: South America (São Paulo) - `sa-east-1`
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para criação

### 2.2. Obter Credenciais
Após o projeto ser criado:
1. Vá em **Settings** → **API**
2. Anote:
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

### 2.3. Criar Tabelas
Vá em **SQL Editor** e execute o seguinte script:

```sql
-- Tabela de Transações (Kardex)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('MOVIMENTACAO', 'CONTAGEM')),
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'UN',
  min_stock NUMERIC DEFAULT 0,
  warehouse TEXT NOT NULL,
  destination_warehouse TEXT,
  address TEXT,
  responsible TEXT,
  photos TEXT[],
  timestamp BIGINT NOT NULL,
  updated_at BIGINT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  password TEXT,
  profile TEXT NOT NULL CHECK (profile IN ('ADMIN', 'OPERADOR', 'AUDITOR')),
  last_login BIGINT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Sessões de Inventário
CREATE TABLE IF NOT EXISTS inventory_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  closed_at BIGINT,
  status TEXT NOT NULL CHECK (status IN ('ABERTO', 'FINALIZADO')),
  items JSONB DEFAULT '[]'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(code);
CREATE INDEX IF NOT EXISTS idx_transactions_warehouse ON transactions(warehouse);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Usuário admin padrão
INSERT INTO users (name, profile, active) 
VALUES ('Administrador Agrosystem', 'ADMIN', true)
ON CONFLICT DO NOTHING;
```

### 2.4. Configurar RLS (Row Level Security) - Opcional
Para ambiente de produção, ative RLS:

```sql
-- Habilita RLS em todas as tabelas
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_sessions ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso público (para MVP sem auth)
CREATE POLICY "Acesso público temporário" ON transactions FOR ALL USING (true);
CREATE POLICY "Acesso público temporário" ON users FOR ALL USING (true);
CREATE POLICY "Acesso público temporário" ON inventory_sessions FOR ALL USING (true);
```

> **Importante**: Em produção, substitua por políticas baseadas em autenticação.

---

## 🚀 3. Deploy na Vercel

### 3.1. Conectar com GitHub
1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `kardex-agro`
4. Clique em **"Import"**

### 3.2. Configurar Build
Na tela de configuração:
- **Framework Preset**: `Vite`
- **Root Directory**: `./` (deixe padrão)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3. Adicionar Variáveis de Ambiente
Em **Environment Variables**, adicione:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

### 3.4. Deploy
1. Clique em **"Deploy"**
2. Aguarde ~2 minutos
3. Sua aplicação estará disponível em `https://kardex-agro.vercel.app` (ou similar)

---

## 🔧 4. Atualizar Código para Usar Supabase

Para integrar o Supabase no código, crie um arquivo `services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Funções de sincronização
export const syncTransactions = async (transactions: any[]) => {
  const { error } = await supabase
    .from('transactions')
    .upsert(transactions, { onConflict: 'id' });
  
  if (error) console.error('Erro ao sincronizar:', error);
  return !error;
};

export const loadTransactionsFromCloud = async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error('Erro ao carregar:', error);
    return null;
  }
  return data;
};
```

### 4.1. Instalar Dependência
```bash
npm install @supabase/supabase-js
```

### 4.2. Criar arquivo .env.local
```env
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## ✅ 5. Verificação Final

### Checklist de Deploy
- [ ] Repositório criado no GitHub
- [ ] Código enviado via `git push`
- [ ] Projeto Supabase criado
- [ ] Tabelas criadas via SQL Editor
- [ ] Credenciais anotadas (URL + Key)
- [ ] Projeto Vercel conectado ao GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy concluído com sucesso
- [ ] Aplicação acessível via URL Vercel

### Testando a Integração
1. Acesse a URL do Vercel
2. Crie uma movimentação de teste
3. Verifique no Supabase: **Table Editor** → **transactions**
4. Confirme que o registro aparece

---

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Erro 401 ao salvar | Verifique a `anon key` e se RLS está desabilitado |
| Build falha na Vercel | Confira se `npm run build` funciona localmente |
| Variáveis não carregam | Prefixe com `VITE_` e reinicie o dev server |
| Dados não aparecem | Verifique o nome das colunas (snake_case vs camelCase) |

---

**Pronto!** Seu Kardex Agro está configurado com persistência em nuvem e deploy automático.

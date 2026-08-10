# Meu Financeiro — GitHub Pages + Supabase

## Supabase
1. Crie um projeto em https://supabase.com/
2. SQL Editor → execute `supabase/schema.sql`.
3. Crie sua conta pelo site.
4. Em Table Editor → profiles, copie seu UUID.
5. No SQL Editor execute: `select public.seed_categories('SEU_UUID');`
6. Project Settings → API: copie Project URL e chave pública.
7. Cole em `js/config.js`.

Nunca publique a `service_role`.

## GitHub Pages
1. Crie um repositório, por exemplo `meu-financeiro`.
2. Envie `index.html`, `css/`, `js/`, `supabase/`.
3. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. Salve. O endereço será `https://SEU-USUARIO.github.io/meu-financeiro/`.

## Recursos
- Login/cadastro
- Dashboard mensal
- Entradas e despesas
- Cartões e limites
- Parcelamento automático das linhas de lançamento
- Contas recorrentes
- Metas
- Contas/patrimônio
- Relatório mensal
- Excel
- PDF
- RLS por usuário

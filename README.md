# Meu Financeiro — versão corrigida

Correções incluídas:
- URL e chave pública do Supabase configuradas.
- Corrigido conflito entre variáveis JavaScript e IDs HTML (`goals` e `cats`), que fazia o painel quebrar após a autenticação.
- Login com mensagens de erro mais claras.
- Tratamento de sessão do Supabase.
- Tratamento básico de erros de conexão.

## Publicação no GitHub
1. Extraia este ZIP.
2. Substitua os arquivos do repositório pelos arquivos desta versão.
3. Faça commit/push.
4. Aguarde o GitHub Pages/serviço de hospedagem atualizar.

A chave `sb_publishable_...` é uma chave pública do Supabase e é apropriada para uso no frontend. A segurança dos dados deve continuar sendo feita pelas políticas RLS do banco.

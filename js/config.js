/*

* ============================================================
* CONFIGURAÇÃO SUPABASE
* ============================================================
  */

(function () {

const SUPABASE_URL =
"https://sndpfgxqwsvacsimpszk.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZHBmZ3hxd3N2YWNzaW1wc3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMTA1MzQsImV4cCI6MjEwMTg4NjUzNH0.GzvW1gLVSRD00yhZ1JeP9Vqp53Zl6vcyBEHBESW_M44";

/*

* Verificação da biblioteca
  */

if (
!window.supabase ||
typeof window.supabase.createClient !== "function"
) {

console.error(
  "Supabase JS não foi carregado corretamente."
);

return;

}

/*

* Cria UMA única instância do cliente.
  */

window.db = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY,
{
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true
}
}
);

/*

* Mantém também as configurações disponíveis
* para diagnóstico.
  */

window.SUPABASE_URL = SUPABASE_URL;

console.log(
"Supabase conectado:",
SUPABASE_URL
);

})();

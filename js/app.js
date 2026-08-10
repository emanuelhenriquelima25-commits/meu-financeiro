/* =========================================================
MEU FINANCEIRO
APP.JS COMPLETO
========================================================= */

/* =========================================================
SUPABASE
========================================================= */

const SUPABASE_URL =
"https://sndpfgxqwsvacsimpszk.supabase.co";

const SUPABASE_ANON_KEY =
"sb_publishable_xFvJISqAURUFO7u0ns93Kg_mg-bOv7g";

const sb = supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

/* =========================================================
VARIÁVEIS
========================================================= */

let user = null;

let cats = [];
let accounts = [];
let cards = [];
let recurring = [];
let goals = [];
let txs = [];

let flowChart = null;
let catChart = null;

let editingTx = false;

/* =========================================================
HELPERS
========================================================= */

const $ = id =>
document.getElementById(id);

const today =
new Date().toISOString().slice(0, 10);

const thisMonth =
today.slice(0, 7);

const money = n =>
Number(n || 0).toLocaleString(
"pt-BR",
{
style: "currency",
currency: "BRL"
}
);

const esc = s =>
String(s ?? "").replace(
/[&<>"']/g,
m =>
({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[m]
);

function msg(id, text) {

const el = $(id);

if (el) {
el.textContent = text || "";
}

}

/* =========================================================
INICIALIZAÇÃO
========================================================= */

document.addEventListener(
"DOMContentLoaded",
async () => {

console.log(
  "Meu Financeiro iniciando..."
);


/* Datas */

if ($("dashMonth")) {
  $("dashMonth").value =
    thisMonth;
}

if ($("reportMonth")) {
  $("reportMonth").value =
    thisMonth;
}

if ($("txDate")) {
  $("txDate").value =
    today;
}


/* Formulários */

$("loginForm").onsubmit =
  login;

$("signupForm").onsubmit =
  signup;

$("txForm").onsubmit =
  saveTx;

$("cardForm").onsubmit =
  saveCard;

$("recForm").onsubmit =
  saveRec;

$("goalForm").onsubmit =
  saveGoal;

$("accountForm").onsubmit =
  saveAccount;


/* Botões */

$("logout").onclick =
  logout;

$("txCancelEdit").onclick =
  cancelEdit;


/* Filtros */

$("dashMonth").onchange =
  dashboard;

$("reportMonth").onchange =
  report;


/* Exportação */

$("excel").onclick =
  excel;

$("pdf").onclick =
  pdf;


/* Navegação */

document
  .querySelectorAll(
    "nav button"
  )
  .forEach(button => {

    button.onclick = () =>
      page(
        button.dataset.page
      );

  });


/* =====================================================
   VERIFICAR SESSÃO
===================================================== */

try {

  const result =
    await sb.auth.getSession();

  console.log(
    "Sessão:",
    result.data?.session
      ? "encontrada"
      : "não encontrada"
  );


  if (
    result.data &&
    result.data.session
  ) {

    await start(
      result.data.session.user
    );

  } else {

    loginView();

  }

} catch (error) {

  console.error(
    "Erro ao verificar sessão:",
    error
  );

  loginView();

}


/* =====================================================
   OBSERVAR LOGIN / LOGOUT
===================================================== */

sb.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    console.log(
      "Auth:",
      event
    );


    if (session?.user) {

      await start(
        session.user
      );

    } else {

      user = null;

      loginView();

    }

  }
);

}
);

/* =========================================================
LOGIN VIEW
========================================================= */

function loginView() {

const login =
$("loginView");

const app =
$("app");

if (login) {

login.classList.remove(
  "hidden"
);

}

if (app) {

app.classList.add(
  "hidden"
);

}

}

/* =========================================================
APP VIEW
========================================================= */

function appView() {

const login =
$("loginView");

const app =
$("app");

if (login) {

login.classList.add(
  "hidden"
);

}

if (app) {

app.classList.remove(
  "hidden"
);

}

}

/* =========================================================
LOGIN
========================================================= */

async function login(e) {

e.preventDefault();

msg(
"authMsg",
"Entrando..."
);

const email =
$("loginEmail")
.value
.trim();

const password =
$("loginPassword")
.value;

try {

const result =
  await sb.auth.signInWithPassword({
    email,
    password
  });


if (result.error) {

  console.error(
    "Erro login:",
    result.error
  );

  msg(
    "authMsg",
    result.error.message
  );

  return;

}


msg(
  "authMsg",
  "Login realizado. Carregando..."
);


if (result.data?.user) {

  await start(
    result.data.user
  );

}

} catch (error) {

console.error(
  error
);

msg(
  "authMsg",
  "Erro ao entrar. Tente novamente."
);

}

}

/* =========================================================
CADASTRO
========================================================= */

async function signup(e) {

e.preventDefault();

msg(
"authMsg",
"Criando conta..."
);

const name =
$("signupName")
.value
.trim();

const email =
$("signupEmail")
.value
.trim();

const password =
$("signupPassword")
.value;

try {

const result =
  await sb.auth.signUp({

    email,

    password,

    options: {

      data: {
        name
      }

    }

  });


if (result.error) {

  msg(
    "authMsg",
    result.error.message
  );

  return;

}


if (
  result.data?.session &&
  result.data?.user
) {

  await start(
    result.data.user
  );

} else {

  msg(
    "authMsg",
    "Conta criada. Verifique seu e-mail para confirmar o cadastro."
  );

}

} catch (error) {

console.error(
  error
);

msg(
  "authMsg",
  "Erro ao criar conta."
);

}

}

/* =========================================================
LOGOUT
========================================================= */

async function logout() {

try {

await sb.auth.signOut();

} catch (error) {

console.error(
  error
);

}

}

/* =========================================================
START
========================================================= */

async function start(u) {

if (!u?.id) {

loginView();

return;

}

user = u;

/*
IMPORTANTE:

 Primeiro mostramos o aplicativo.
 Assim, se alguma tabela tiver problema
 de RLS, o usuário NÃO fica preso
 na tela de login.

*/

appView();

$("userName").textContent =
u.user_metadata?.name ||
u.email ||
"Usuário";

/* =====================================================
PERFIL
===================================================== */

try {

const profile =
  await sb
    .from("profiles")
    .select("*")
    .eq("id", u.id)
    .maybeSingle();


if (
  !profile.error &&
  profile.data?.name
) {

  $("userName").textContent =
    profile.data.name;

}

} catch (error) {

console.warn(
  "Não foi possível carregar perfil:",
  error
);

}

/* =====================================================
CARREGAR DADOS
===================================================== */

try {

await load();

} catch (error) {

console.error(
  "Erro ao carregar dados:",
  error
);

}

page(
"dashboard"
);

}

/* =========================================================
LOAD
========================================================= */

async function load() {

if (!user?.id) {
return;
}

const [
categoriesResult,
accountsResult,
cardsResult,
recurringResult,
goalsResult,
transactionsResult
] = await Promise.all([

sb
  .from("categories")
  .select("*")
  .order("name"),

sb
  .from("accounts")
  .select("*")
  .order("name"),

sb
  .from("cards")
  .select("*")
  .order("name"),

sb
  .from("recurring")
  .select(
    "*,categories(name)"
  )
  .order("description"),

sb
  .from("goals")
  .select("*")
  .order(
    "created_at",
    {
      ascending: false
    }
  ),

sb
  .from("transactions")
  .select(
    "*,categories(name),accounts(name),cards(name)"
  )
  .order(
    "transaction_date",
    {
      ascending: false
    }
  )
  .limit(3000)

]);

/* =====================================================
DADOS
===================================================== */

cats =
categoriesResult.data || [];

accounts =
accountsResult.data || [];

cards =
cardsResult.data || [];

recurring =
recurringResult.data || [];

goals =
goalsResult.data || [];

txs =
transactionsResult.data || [];

/* =====================================================
ERROS
===================================================== */

if (categoriesResult.error) {

console.error(
  "Categorias:",
  categoriesResult.error
);

}

if (accountsResult.error) {

console.error(
  "Contas:",
  accountsResult.error
);

}

if (cardsResult.error) {

console.error(
  "Cartões:",
  cardsResult.error
);

}

if (recurringResult.error) {

console.error(
  "Recorrentes:",
  recurringResult.error
);

}

if (goalsResult.error) {

console.error(
  "Metas:",
  goalsResult.error
);

}

if (transactionsResult.error) {

console.error(
  "Transações:",
  transactionsResult.error
);

}

/* =====================================================
CRIAR CATEGORIAS
===================================================== */

if (
cats.length === 0 &&
!categoriesResult.error
) {

try {

  const seed =
    await sb.rpc(
      "seed_categories",
      {
        p_user: user.id
      }
    );


  if (!seed.error) {

    const reload =
      await sb
        .from("categories")
        .select("*")
        .order("name");


    cats =
      reload.data || [];

  }

} catch (error) {

  console.warn(
    "Seed categorias:",
    error
  );

}

}

fill();

render();

}

/* =========================================================
PREENCHER SELECTS
========================================================= */

function fill() {

$("txCat").innerHTML =
'<option value="">Selecione uma categoria</option>' +
cats
.map(
c =>
"<option value="${c.id}"> ${esc(c.name)} </option>"
)
.join("");

$("recCat").innerHTML =
'<option value="">Selecione uma categoria</option>' +
cats
.map(
c =>
"<option value="${c.id}"> ${esc(c.name)} </option>"
)
.join("");

$("txAccount").innerHTML =
'<option value="">Selecione uma conta</option>' +
accounts
.map(
a =>
"<option value="${a.id}"> ${esc(a.name)} </option>"
)
.join("");

$("txCard").innerHTML =
'<option value="">Nenhum</option>' +
cards
.map(
c =>
"<option value="${c.id}"> ${esc(c.name)} </option>"
)
.join("");

}

/* =========================================================
SALVAR LANÇAMENTO
========================================================= */

async function saveTx(e) {

e.preventDefault();

if (!user?.id) {

msg(
  "txMsg",
  "Usuário não autenticado."
);

return;

}

/* =====================================================
MODO EDIÇÃO
===================================================== */

if (editingTx) {

await updateTx();

return;

}

const categoryId =
$("txCat").value || null;

const accountId =
$("txAccount").value || null;

const cardId =
$("txCard").value || null;

if (!categoryId) {

msg(
  "txMsg",
  "Selecione uma categoria."
);

return;

}

if (!accountId) {

msg(
  "txMsg",
  "Selecione uma conta."
);

return;

}

const amount =
Number(
$("txAmount").value
);

if (
!amount ||
amount <= 0
) {

msg(
  "txMsg",
  "Informe um valor válido."
);

return;

}

const description =
$("txDesc")
.value
.trim();

if (!description) {

msg(
  "txMsg",
  "Informe uma descrição."
);

return;

}

const totalInstallments =
Math.max(
1,
Number(
$("txInstall").value
) || 1
);

const groupId =
crypto.randomUUID();

const base = {

user_id:
  user.id,

type:
  $("txType").value,

amount,

category_id:
  categoryId,

account_id:
  accountId,

card_id:
  cardId,

status:
  $("txStatus").value,

description,

notes:
  $("txNotes")
    .value
    .trim() || null,

group_id:
  groupId

};

const rows = [];

for (
let i = 0;
i < totalInstallments;
i++
) {

const date =
  new Date(
    $("txDate").value +
    "T12:00:00"
  );


date.setMonth(
  date.getMonth() + i
);


rows.push({

  ...base,

  transaction_date:
    date
      .toISOString()
      .slice(0, 10),

  installment_number:
    i + 1,

  installment_total:
    totalInstallments

});

}

msg(
"txMsg",
"Salvando..."
);

const result =
await sb
.from("transactions")
.insert(rows);

if (result.error) {

console.error(
  result.error
);

msg(
  "txMsg",
  result.error.message
);

return;

}

msg(
"txMsg",
"Lançamento salvo com sucesso!"
);

$("txForm").reset();

$("txDate").value =
today;

$("txInstall").value =
1;

await load();

}

/* =========================================================
EDITAR LANÇAMENTO
========================================================= */

async function editTx(id) {

const tx =
txs.find(
t => t.id === id
);

if (!tx) {

alert(
  "Lançamento não encontrado."
);

return;

}

editingTx = true;

$("txId").value =
tx.id;

$("txType").value =
tx.type || "saida";

$("txAmount").value =
tx.amount;

$("txDate").value =
tx.transaction_date;

$("txCat").value =
tx.category_id || "";

$("txAccount").value =
tx.account_id || "";

$("txCard").value =
tx.card_id || "";

$("txStatus").value =
tx.status || "pago";

$("txDesc").value =
tx.description || "";

$("txInstall").value =
tx.installment_total || 1;

$("txNotes").value =
tx.notes || "";

$("txSaveButton").textContent =
"Salvar alterações";

$("txCancelEdit")
.classList
.remove("hidden");

msg(
"txMsg",
"Editando lançamento..."
);

page(
"lancamentos"
);

window.scrollTo({
top: 0,
behavior: "smooth"
});

}

/* =========================================================
ATUALIZAR LANÇAMENTO
========================================================= */

async function updateTx() {

const id =
$("txId").value;

if (!id) {

cancelEdit();

return;

}

const categoryId =
$("txCat").value || null;

const accountId =
$("txAccount").value || null;

if (!categoryId) {

msg(
  "txMsg",
  "Selecione uma categoria."
);

return;

}

if (!accountId) {

msg(
  "txMsg",
  "Selecione uma conta."
);

return;

}

const amount =
Number(
$("txAmount").value
);

if (
!amount ||
amount <= 0
) {

msg(
  "txMsg",
  "Informe um valor válido."
);

return;

}

msg(
"txMsg",
"Salvando alterações..."
);

const result =
await sb
.from("transactions")
.update({

    type:
      $("txType").value,

    amount,

    transaction_date:
      $("txDate").value,

    category_id:
      categoryId,

    account_id:
      accountId,

    card_id:
      $("txCard").value || null,

    status:
      $("txStatus").value,

    description:
      $("txDesc")
        .value
        .trim(),

    notes:
      $("txNotes")
        .value
        .trim() || null

  })
  .eq(
    "id",
    id
  )
  .eq(
    "user_id",
    user.id
  );

if (result.error) {

console.error(
  "Erro ao editar:",
  result.error
);

msg(
  "txMsg",
  result.error.message
);

return;

}

msg(
"txMsg",
"Lançamento alterado com sucesso!"
);

cancelEdit(
false
);

await load();

}

/* =========================================================
CANCELAR EDIÇÃO
========================================================= */

function cancelEdit(
showMessage = true
) {

editingTx =
false;

$("txId").value =
"";

$("txForm").reset();

$("txDate").value =
today;

$("txInstall").value =
1;

$("txSaveButton").textContent =
"Salvar lançamento";

$("txCancelEdit")
.classList
.add("hidden");

if (showMessage) {

msg(
  "txMsg",
  ""
);

}

}

/* =========================================================
EXCLUIR LANÇAMENTO
========================================================= */

async function deleteTx(id) {

const tx =
txs.find(
t => t.id === id
);

if (!tx) {

alert(
  "Lançamento não encontrado."
);

return;

}

const isInstallment =
Number(
tx.installment_total
) > 1;

let question =
"Excluir o lançamento "${tx.description}" de ${money(tx.amount)}?";

if (isInstallment) {

question +=
  "\n\nEste lançamento faz parte de um parcelamento.";

}

const confirmed =
confirm(
question
);

if (!confirmed) {
return;
}

try {

let result;


/*
   Se for parcela, excluímos somente
   a parcela selecionada.
*/

result =
  await sb
    .from("transactions")
    .delete()
    .eq(
      "id",
      id
    )
    .eq(
      "user_id",
      user.id
    );


if (result.error) {

  console.error(
    "Erro ao excluir:",
    result.error
  );

  alert(
    result.error.message
  );

  return;

}


await load();


alert(
  "Lançamento excluído com sucesso."
);

} catch (error) {

console.error(
  error
);

alert(
  "Erro ao excluir lançamento."
);

}

}

/* =========================================================
CARTÃO
========================================================= */

async function saveCard(e) {

e.preventDefault();

const result =
await sb
.from("cards")
.insert({

    user_id:
      user.id,

    name:
      $("cardName")
        .value
        .trim(),

    limit_amount:
      Number(
        $("cardLimit").value
      ),

    closing_day:
      Number(
        $("cardClose").value
      ),

    due_day:
      Number(
        $("cardDue").value
      )

  });

if (result.error) {

msg(
  "cardMsg",
  result.error.message
);

return;

}

msg(
"cardMsg",
"Cartão cadastrado com sucesso!"
);

$("cardForm").reset();

await load();

}

/* =========================================================
RECORRENTE
========================================================= */

async function saveRec(e) {

e.preventDefault();

const categoryId =
$("recCat").value || null;

if (!categoryId) {

msg(
  "recMsg",
  "Selecione uma categoria."
);

return;

}

const result =
await sb
.from("recurring")
.insert({

    user_id:
      user.id,

    description:
      $("recDesc")
        .value
        .trim(),

    amount:
      Number(
        $("recAmount").value
      ),

    category_id:
      categoryId,

    due_day:
      Number(
        $("recDay").value
      ),

    start_date:
      $("recStart").value,

    end_date:
      $("recEnd").value ||
      null

  });

if (result.error) {

msg(
  "recMsg",
  result.error.message
);

return;

}

msg(
"recMsg",
"Cadastrado com sucesso!"
);

$("recForm").reset();

await load();

}

/* =========================================================
META
========================================================= */

async function saveGoal(e) {

e.preventDefault();

const result =
await sb
.from("goals")
.insert({

    user_id:
      user.id,

    name:
      $("goalName")
        .value
        .trim(),

    target_amount:
      Number(
        $("goalTarget").value
      ),

    current_amount:
      Number(
        $("goalCurrent").value
      ) || 0,

    deadline:
      $("goalDate").value ||
      null

  });

if (result.error) {

msg(
  "goalMsg",
  result.error.message
);

return;

}

msg(
"goalMsg",
"Meta cadastrada com sucesso!"
);

$("goalForm").reset();

await load();

}

/* =========================================================
CONTA
========================================================= */

async function saveAccount(e) {

e.preventDefault();

const result =
await sb
.from("accounts")
.insert({

    user_id:
      user.id,

    name:
      $("accountName")
        .value
        .trim(),

    type:
      $("accountType").value,

    initial_balance:
      Number(
        $("accountInitial").value
      ) || 0

  });

if (result.error) {

msg(
  "accountMsg",
  result.error.message
);

return;

}

msg(
"accountMsg",
"Conta cadastrada com sucesso!"
);

$("accountForm").reset();

await load();

}

/* =========================================================
RENDER
========================================================= */

function render() {

/* =====================================================
LANÇAMENTOS
===================================================== */

$("txBody").innerHTML =
txs
.slice(0, 300)
.map(t => `

    <tr>

      <td>
        ${esc(t.transaction_date)}
      </td>

      <td>
        ${esc(t.type)}
      </td>

      <td>
        ${esc(t.description)}
      </td>

      <td>
        ${esc(
          t.categories?.name ||
          "-"
        )}
      </td>

      <td>
        ${money(t.amount)}
      </td>

      <td>
        ${esc(t.status)}
      </td>

      <td>

        ${
          Number(t.installment_total) > 1
            ? `${t.installment_number}/${t.installment_total}`
            : "-"
        }

      </td>

      <td>

        <button
          type="button"
          class="secondary"
          onclick="editTx('${t.id}')"
        >
          ✏️ Editar
        </button>

        <button
          type="button"
          class="danger"
          onclick="deleteTx('${t.id}')"
        >
          🗑️ Excluir
        </button>

      </td>

    </tr>

  `)
  .join("");

/* =====================================================
CARTÕES
===================================================== */

$("cardBody").innerHTML =
cards
.map(card => {

    const used =
      txs
        .filter(
          t =>
            t.card_id === card.id &&
            t.type === "saida" &&
            t.transaction_date.startsWith(
              thisMonth
            )
        )
        .reduce(
          (sum, t) =>
            sum +
            Number(t.amount),
          0
        );


    return `

      <tr>

        <td>
          ${esc(card.name)}
        </td>

        <td>
          ${money(card.limit_amount)}
        </td>

        <td>
          ${money(used)}
        </td>

        <td>
          ${money(
            Math.max(
              0,
              Number(
                card.limit_amount
              ) - used
            )
          )}
        </td>

        <td>
          ${card.closing_day}
        </td>

        <td>
          ${card.due_day}
        </td>

      </tr>

    `;

  })
  .join("");

/* =====================================================
RECORRENTES
===================================================== */

$("recBody").innerHTML =
recurring
.map(r => `

    <tr>

      <td>
        ${esc(r.description)}
      </td>

      <td>
        ${money(r.amount)}
      </td>

      <td>
        ${esc(
          r.categories?.name ||
          "-"
        )}
      </td>

      <td>
        ${r.due_day}
      </td>

      <td>
        ${esc(r.start_date)}
      </td>

      <td>
        ${esc(r.end_date || "-")}
      </td>

    </tr>

  `)
  .join("");

/* =====================================================
METAS
===================================================== */

$("goals").innerHTML =
goalsData();

/* =====================================================
CONTAS
===================================================== */

$("accountBody").innerHTML =
accounts
.map(account => {

    const movement =
      txs
        .filter(
          t =>
            t.account_id ===
            account.id
        )
        .reduce(
          (sum, t) =>
            sum +
            (
              t.type === "entrada"
                ? 1
                : -1
            ) *
            Number(t.amount),
          0
        );


    return `

      <tr>

        <td>
          ${esc(account.name)}
        </td>

        <td>
          ${esc(account.type)}
        </td>

        <td>
          ${money(
            account.initial_balance
          )}
        </td>

        <td>
          ${money(movement)}
        </td>

        <td>
          ${money(
            Number(
              account.initial_balance
            ) +
            movement
          )}
        </td>

      </tr>

    `;

  })
  .join("");

dashboard();

report();

}

/* =========================================================
METAS
========================================================= */

function goalsData() {

return goals
.map(goal => {

  const target =
    Number(
      goal.target_amount
    ) || 0;


  const current =
    Number(
      goal.current_amount
    ) || 0;


  const percentage =
    target > 0
      ? Math.min(
          100,
          current /
          target *
          100
        )
      : 0;


  return `

    <div class="goal">

      <h3>
        ${esc(goal.name)}
      </h3>

      <b>
        ${money(current)}
        /
        ${money(target)}
      </b>


      <div class="progress">

        <div
          style="width:${percentage}%"
        ></div>

      </div>


      ${percentage.toFixed(1)}%

      ${
        goal.deadline
          ? " · prazo " +
            esc(goal.deadline)
          : ""
      }

    </div>

  `;

})
.join("");

}

/* =========================================================
DASHBOARD
========================================================= */

function dashboard() {

if (!$("dashMonth")) {
return;
}

const month =
$("dashMonth").value ||
thisMonth;

const rows =
txs.filter(
t =>
t.transaction_date
?.startsWith(month)
);

const entries =
rows
.filter(
t =>
t.type === "entrada"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount),
0
);

const exits =
rows
.filter(
t =>
t.type === "saida"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount),
0
);

const pending =
txs
.filter(
t =>
t.type === "saida" &&
t.status === "pendente" &&
t.transaction_date >= today
)
.reduce(
(sum, t) =>
sum +
Number(t.amount),
0
);

$("inTotal").textContent =
money(entries);

$("outTotal").textContent =
money(exits);

$("result").textContent =
money(
entries -
exits
);

$("available").textContent =
money(
entries -
exits -
pending
);

/* FLUXO */

const daily = {};

rows.forEach(t => {

daily[
  t.transaction_date
] =
  (
    daily[
      t.transaction_date
    ] || 0
  ) +
  (
    t.type === "entrada"
      ? Number(t.amount)
      : -Number(t.amount)
  );

});

/* CATEGORIAS */

const categoryTotals = {};

rows
.filter(
t =>
t.type === "saida"
)
.forEach(t => {

  const name =
    t.categories?.name ||
    "Outros";


  categoryTotals[name] =
    (
      categoryTotals[name] ||
      0
    ) +
    Number(t.amount);

});

/* GRÁFICO */

if (
typeof Chart !==
"undefined"
) {

flowChart?.destroy();


flowChart =
  new Chart(
    $("flow"),
    {

      type: "line",

      data: {

        labels:
          Object.keys(daily),

        datasets: [{

          label:
            "Resultado",

          data:
            Object.values(
              daily
            )

        }]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false

      }

    }
  );


catChart?.destroy();


catChart =
  new Chart(
    $("cats"),
    {

      type: "doughnut",

      data: {

        labels:
          Object.keys(
            categoryTotals
          ),

        datasets: [{

          data:
            Object.values(
              categoryTotals
            )

        }]

      },

      options: {

        responsive: true

      }

    }
  );

}

/* PENDÊNCIAS */

$("due").innerHTML =
txs
.filter(
t =>
t.type === "saida" &&
t.status === "pendente"
)
.slice(0, 5)
.map(t => `

    <p>

      ${esc(t.transaction_date)}
      ·
      ${esc(t.description)}

      <br>

      <b>
        ${money(t.amount)}
      </b>

    </p>

  `)
  .join("") ||
  "Nenhuma.";

/* CARTÕES */

$("cardDash").innerHTML =
cards
.map(card => {

    const total =
      txs
        .filter(
          t =>
            t.card_id ===
              card.id &&
            t.type ===
              "saida" &&
            t.transaction_date
              ?.startsWith(month)
        )
        .reduce(
          (sum, t) =>
            sum +
            Number(t.amount),
          0
        );


    return `

      <p>

        ${esc(card.name)}
        ·
        ${money(total)}

      </p>

    `;

  })
  .join("") ||
  "Nenhum.";

/* METAS */

$("goalDash").innerHTML =
goals
.slice(0, 5)
.map(goal => {

    const target =
      Number(
        goal.target_amount
      ) || 0;


    const current =
      Number(
        goal.current_amount
      ) || 0;


    const percentage =
      target > 0
        ? current /
          target *
          100
        : 0;


    return `

      <p>

        ${esc(goal.name)}
        ·
        ${percentage.toFixed(0)}%

      </p>

    `;

  })
  .join("") ||
  "Nenhuma.";

}

/* =========================================================
RELATÓRIO
========================================================= */

function report() {

if (!$("reportMonth")) {
return;
}

const month =
$("reportMonth").value ||
thisMonth;

const rows =
txs.filter(
t =>
t.transaction_date
?.startsWith(month)
);

const entries =
rows
.filter(
t =>
t.type === "entrada"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount),
0
);

const exits =
rows
.filter(
t =>
t.type === "saida"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount),
0
);

$("summary").innerHTML = `

<p>

  Entradas:
  <b>${money(entries)}</b>

  ·

  Saídas:
  <b>${money(exits)}</b>

  ·

  Resultado:
  <b>${money(
    entries -
    exits
  )}</b>

</p>

`;

$("reportBody").innerHTML =
rows
.map(t => `

    <tr>

      <td>
        ${esc(
          t.transaction_date
        )}
      </td>

      <td>
        ${esc(t.type)}
      </td>

      <td>
        ${esc(t.description)}
      </td>

      <td>
        ${esc(
          t.categories?.name ||
          "-"
        )}
      </td>

      <td>
        ${money(t.amount)}
      </td>

      <td>
        ${esc(t.status)}
      </td>

    </tr>

  `)
  .join("");

}

/* =========================================================
EXCEL
========================================================= */

function excel() {

const month =
$("reportMonth").value ||
thisMonth;

const rows =
txs
.filter(
t =>
t.transaction_date
?.startsWith(month)
)
.map(t => ({

    Data:
      t.transaction_date,

    Tipo:
      t.type,

    Descrição:
      t.description,

    Categoria:
      t.categories?.name ||
      "",

    Conta:
      t.accounts?.name ||
      "",

    Cartão:
      t.cards?.name ||
      "",

    Valor:
      Number(t.amount),

    Status:
      t.status,

    Parcela:
      Number(
        t.installment_total
      ) > 1
        ? `${t.installment_number}/${t.installment_total}`
        : ""

  }));

const worksheet =
XLSX.utils.json_to_sheet(
rows
);

const workbook =
XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
workbook,
worksheet,
"Financeiro"
);

XLSX.writeFile(
workbook,
"financeiro-${month}.xlsx"
);

}

/* =========================================================
PDF
========================================================= */

function pdf() {

const month =
$("reportMonth").value ||
thisMonth;

const rows =
txs.filter(
t =>
t.transaction_date &&
t.transaction_date
.startsWith(month)
);

const entries =
rows
.filter(
t =>
t.type === "entrada"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount || 0),
0
);

const exits =
rows
.filter(
t =>
t.type === "saida"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount || 0),
0
);

const result =
entries -
exits;

const pending =
rows
.filter(
t =>
t.type === "saida" &&
t.status === "pendente"
)
.reduce(
(sum, t) =>
sum +
Number(t.amount || 0),
0
);

const formatMoney =
value =>
Number(value || 0)
.toLocaleString(
"pt-BR",
{
style: "currency",
currency: "BRL"
}
);

const formatDate =
value => {

  if (!value) {
    return "-";
  }


  const parts =
    value.split("-");


  if (
    parts.length !== 3
  ) {
    return value;
  }


  return `${parts[2]}/${parts[1]}/${parts[0]}`;

};

const monthName =
new Date(
"${month}-01T12:00:00"
).toLocaleDateString(
"pt-BR",
{
month: "long",
year: "numeric"
}
);

const JsPDF =
window.jspdf.jsPDF;

const doc =
new JsPDF();

doc.setFontSize(20);

doc.text(
"MEU FINANCEIRO",
15,
20
);

doc.setFontSize(11);

doc.text(
"Relatório: ${monthName}",
15,
29
);

doc.text(
"Entradas: ${formatMoney(entries)}",
15,
42
);

doc.text(
"Saídas: ${formatMoney(exits)}",
15,
50
);

doc.text(
"Resultado: ${formatMoney(result)}",
15,
58
);

doc.text(
"Pendências: ${formatMoney(pending)}",
15,
66
);

let y = 80;

doc.setFontSize(8);

rows.forEach(
(t, index) => {

  if (y > 280) {

    doc.addPage();

    y = 20;

  }


  const line =
    `${formatDate(t.transaction_date)} | ` +
    `${t.type} | ` +
    `${String(t.description || "").slice(0, 28)} | ` +
    `${formatMoney(t.amount)} | ` +
    `${t.status}`;


  doc.text(
    line,
    10,
    y
  );


  y += 7;

}

);

doc.save(
"meu-financeiro-${month}.pdf"
);

}

/* =========================================================
NAVEGAÇÃO
========================================================= */

function page(p) {

document
.querySelectorAll(".page")
.forEach(
section =>
section.classList.add(
"hidden"
)
);

const selected =
$(p);

if (selected) {

selected.classList.remove(
  "hidden"
);

}

}

/* =========================================================
DISPONIBILIZAR FUNÇÕES PARA OS BOTÕES
========================================================= */

window.editTx =
editTx;

window.deleteTx =
deleteTx;

window.page =
page;

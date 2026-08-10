/* =========================================================
   MEU FINANCEIRO
   APP.JS COMPLETO
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const sb = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
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


/* =========================================================
   UTILITÁRIOS
========================================================= */

const $ = id =>
  document.getElementById(id);


const today =
  new Date()
    .toISOString()
    .slice(0, 10);


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
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m])
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

    $("dashMonth").value =
      thisMonth;

    $("reportMonth").value =
      thisMonth;

    $("txDate").value =
      today;


    $("loginForm").onsubmit =
      login;

    $("signupForm").onsubmit =
      signup;


    $("logout").onclick =
      async () => {

        await sb.auth.signOut();

      };


    $("txForm").onsubmit =
      saveTx;

    $("txCancelButton").onclick =
      cancelEdit;


    $("cardForm").onsubmit =
      saveCard;

    $("recForm").onsubmit =
      saveRec;

    $("goalForm").onsubmit =
      saveGoal;

    $("accountForm").onsubmit =
      saveAccount;


    $("dashMonth").onchange =
      dashboard;

    $("reportMonth").onchange =
      report;


    $("excel").onclick =
      excel;

    $("pdf").onclick =
      pdf;


    document
      .querySelectorAll("nav button")
      .forEach(button => {

        button.onclick =
          () =>
            page(
              button.dataset.page
            );

      });


    const sessionResult =
      await sb.auth.getSession();


    const session =
      sessionResult.data.session;


    if (session) {

      await start(
        session.user
      );

    } else {

      loginView();

    }


    sb.auth.onAuthStateChange(
      async (
        event,
        session
      ) => {

        if (session) {

          await start(
            session.user
          );

        } else {

          loginView();

        }

      }
    );

  }
);


/* =========================================================
   LOGIN
========================================================= */

function loginView() {

  $("loginView")
    .classList
    .remove("hidden");

  $("app")
    .classList
    .add("hidden");

}


/* =========================================================
   LOGIN
========================================================= */

async function login(e) {

  e.preventDefault();

  msg(
    "authMsg",
    ""
  );


  const email =
    $("loginEmail")
      .value
      .trim();


  const password =
    $("loginPassword")
      .value;


  const result =
    await sb.auth
      .signInWithPassword({
        email,
        password
      });


  if (result.error) {

    msg(
      "authMsg",
      result.error.message
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
    ""
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


  const result =
    await sb.auth
      .signUp({

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


  msg(
    "authMsg",
    "Conta criada com sucesso. Faça login para continuar."
  );

}


/* =========================================================
   INÍCIO DO USUÁRIO
========================================================= */

async function start(u) {

  if (!u || !u.id) {

    loginView();

    return;

  }


  user = u;


  const profile =
    await sb
      .from("profiles")
      .select("*")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();


  $("userName").textContent =
    profile.data?.name ||
    user.email ||
    "Usuário";


  $("loginView")
    .classList
    .add("hidden");


  $("app")
    .classList
    .remove("hidden");


  await load();


  page("dashboard");

}


/* =========================================================
   CARREGAR DADOS
========================================================= */

async function load() {

  if (!user || !user.id) {

    console.error(
      "Usuário não autenticado."
    );

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


  if (categoriesResult.error)
    console.error(
      "Erro categorias:",
      categoriesResult.error
    );


  if (accountsResult.error)
    console.error(
      "Erro contas:",
      accountsResult.error
    );


  if (cardsResult.error)
    console.error(
      "Erro cartões:",
      cardsResult.error
    );


  if (recurringResult.error)
    console.error(
      "Erro recorrentes:",
      recurringResult.error
    );


  if (goalsResult.error)
    console.error(
      "Erro metas:",
      goalsResult.error
    );


  if (transactionsResult.error)
    console.error(
      "Erro lançamentos:",
      transactionsResult.error
    );


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
     CATEGORIAS PADRÃO
  ===================================================== */

  if (cats.length === 0) {

    const seedResult =
      await sb.rpc(
        "seed_categories",
        {
          p_user: user.id
        }
      );


    if (seedResult.error) {

      console.error(
        "Erro ao criar categorias:",
        seedResult.error
      );

    } else {

      const reload =
        await sb
          .from("categories")
          .select("*")
          .order("name");


      if (!reload.error) {

        cats =
          reload.data || [];

      }

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
          `
          <option value="${c.id}">
            ${esc(c.name)}
          </option>
          `
      )
      .join("");


  $("recCat").innerHTML =
    '<option value="">Selecione uma categoria</option>' +

    cats
      .map(
        c =>
          `
          <option value="${c.id}">
            ${esc(c.name)}
          </option>
          `
      )
      .join("");


  $("txAccount").innerHTML =
    '<option value="">Selecione uma conta</option>' +

    accounts
      .map(
        a =>
          `
          <option value="${a.id}">
            ${esc(a.name)}
          </option>
          `
      )
      .join("");


  $("txCard").innerHTML =
    '<option value="">Nenhum</option>' +

    cards
      .map(
        c =>
          `
          <option value="${c.id}">
            ${esc(c.name)}
          </option>
          `
      )
      .join("");

}


/* =========================================================
   SALVAR OU ATUALIZAR LANÇAMENTO
========================================================= */

async function saveTx(e) {

  e.preventDefault();


  msg(
    "txMsg",
    ""
  );


  if (!user || !user.id) {

    msg(
      "txMsg",
      "Usuário não autenticado."
    );

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


  if (!amount || amount <= 0) {

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


  /* =====================================================
     VERIFICA SE É EDIÇÃO
  ===================================================== */

  const editId =
    $("txEditId").value;


  if (editId) {

    await updateTx(
      editId,
      {
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
          cardId,

        status:
          $("txStatus").value,

        description,

        notes:
          $("txNotes")
            .value
            .trim() || null
      }
    );


    return;

  }


  /* =====================================================
     NOVO LANÇAMENTO
  ===================================================== */

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

    transaction_date:
      $("txDate").value,

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
    "Lançamento salvo com sucesso."
  );


  resetTxForm();


  await load();

}


/* =========================================================
   ATUALIZAR LANÇAMENTO
========================================================= */

async function updateTx(
  id,
  data
) {

  const result =
    await sb
      .from("transactions")
      .update(data)
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
      "Erro ao atualizar:",
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
    "Lançamento atualizado com sucesso."
  );


  resetTxForm();


  await load();

}


/* =========================================================
   EDITAR LANÇAMENTO
========================================================= */

function editTx(id) {

  const tx =
    txs.find(
      t => String(t.id) === String(id)
    );


  if (!tx) {

    alert(
      "Lançamento não encontrado."
    );

    return;

  }


  $("txEditId").value =
    tx.id;


  $("txType").value =
    tx.type || "saida";


  $("txAmount").value =
    Number(tx.amount || 0);


  $("txDate").value =
    tx.transaction_date || today;


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


  $("txNotes").value =
    tx.notes || "";


  $("txInstall").value =
    tx.installment_total || 1;


  $("txSaveButton").textContent =
    "Atualizar lançamento";


  $("txCancelButton")
    .classList
    .remove("hidden");


  page("lancamentos");


  $("txAmount").focus();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   CANCELAR EDIÇÃO
========================================================= */

function cancelEdit() {

  resetTxForm();


  msg(
    "txMsg",
    "Edição cancelada."
  );

}


/* =========================================================
   LIMPAR FORMULÁRIO
========================================================= */

function resetTxForm() {

  $("txForm").reset();


  $("txEditId").value =
    "";


  $("txDate").value =
    today;


  $("txInstall").value =
    1;


  $("txSaveButton").textContent =
    "Salvar";


  $("txCancelButton")
    .classList
    .add("hidden");

}


/* =========================================================
   EXCLUIR LANÇAMENTO
========================================================= */

async function deleteTx(id) {

  const tx =
    txs.find(
      t => String(t.id) === String(id)
    );


  if (!tx) {

    alert(
      "Lançamento não encontrado."
    );

    return;

  }


  const parcel =
    tx.installment_total > 1
      ? `\nParcela: ${tx.installment_number}/${tx.installment_total}`
      : "";


  const confirmed =
    confirm(
      `Deseja realmente excluir este lançamento?\n\n` +

      `${tx.description || "Sem descrição"}\n` +

      `${money(tx.amount)}` +

      parcel +

      `\n\nEssa ação não poderá ser desfeita.`
    );


  if (!confirmed) {
    return;
  }


  const result =
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
      "Não foi possível excluir:\n" +
      result.error.message
    );

    return;

  }


  if (
    $("txEditId").value ===
    String(id)
  ) {

    resetTxForm();

  }


  await load();

}


/* =========================================================
   CARTÃO
========================================================= */

async function saveCard(e) {

  e.preventDefault();


  msg(
    "cardMsg",
    ""
  );


  if (!user || !user.id) {

    msg(
      "cardMsg",
      "Usuário não autenticado."
    );

    return;

  }


  const name =
    $("cardName")
      .value
      .trim();


  const limit =
    Number(
      $("cardLimit").value
    );


  const closing =
    Number(
      $("cardClose").value
    );


  const due =
    Number(
      $("cardDue").value
    );


  if (!name) {

    msg(
      "cardMsg",
      "Informe o nome do cartão."
    );

    return;

  }


  const result =
    await sb
      .from("cards")
      .insert({

        user_id:
          user.id,

        name,

        limit_amount:
          limit,

        closing_day:
          closing,

        due_day:
          due

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
    "Cartão cadastrado com sucesso."
  );


  $("cardForm").reset();


  await load();

}


/* =========================================================
   RECORRENTE
========================================================= */

async function saveRec(e) {

  e.preventDefault();


  msg(
    "recMsg",
    ""
  );


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
    "Cadastrado com sucesso."
  );


  $("recForm").reset();


  await load();

}


/* =========================================================
   METAS
========================================================= */

async function saveGoal(e) {

  e.preventDefault();


  msg(
    "goalMsg",
    ""
  );


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
    "Meta cadastrada com sucesso."
  );


  $("goalForm").reset();


  await load();

}


/* =========================================================
   CONTA
========================================================= */

async function saveAccount(e) {

  e.preventDefault();


  msg(
    "accountMsg",
    ""
  );


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
          $("accountType")
            .value,

        initial_balance:
          Number(
            $("accountInitial")
              .value
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
    "Conta cadastrada com sucesso."
  );


  $("accountForm").reset();


  await load();

}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function render() {


  /* =====================================================
     LANÇAMENTOS
  ===================================================== */

  $("txBody").innerHTML =
    txs
      .slice(0, 200)
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
              t.installment_total > 1
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
                t.transaction_date
                  .startsWith(
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
              ${money(
                card.limit_amount
              )}
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
            ${esc(
              r.end_date ||
              "-"
            )}
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
                  t.type ===
                  "entrada"
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
                ) + movement
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
              style="
                width:${percentage}%;
              "
            ></div>

          </div>


          ${percentage.toFixed(1)}%


          ${
            goal.deadline
              ? " · prazo " +
                goal.deadline
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

  const month =
    $("dashMonth").value ||
    thisMonth;


  const rows =
    txs.filter(
      t =>
        t.transaction_date
          .startsWith(month)
    );


  const entries =
    rows
      .filter(
        t =>
          t.type ===
          "entrada"
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
          t.type ===
          "saida"
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
          t.type ===
            "saida" &&
          t.status ===
            "pendente" &&
          t.transaction_date >=
            today
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
      entries - exits
    );


  $("available").textContent =
    money(
      entries -
      exits -
      pending
    );


  /* =====================================================
     FLUXO
  ===================================================== */

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
        t.type ===
        "entrada"
          ? Number(t.amount)
          : -Number(t.amount)
      );

  });


  /* =====================================================
     CATEGORIAS
  ===================================================== */

  const categoryTotals =
    {};


  rows
    .filter(
      t =>
        t.type ===
        "saida"
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


  /* =====================================================
     GRÁFICO FLUXO
  ===================================================== */

  flowChart?.destroy();


  flowChart =
    new Chart(
      $("flow"),
      {

        type: "line",

        data: {

          labels:
            Object.keys(
              daily
            ),

          datasets: [{

            label:
              "Resultado",

            data:
              Object.values(
                daily
              )

          }]

        }

      }
    );


  /* =====================================================
     GRÁFICO CATEGORIAS
  ===================================================== */

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

        }

      }
    );


  /* =====================================================
     PENDÊNCIAS
  ===================================================== */

  $("due").innerHTML =
    txs
      .filter(
        t =>
          t.type ===
            "saida" &&
          t.status ===
            "pendente"
      )
      .slice(0, 5)
      .map(
        t => `

          <p>

            ${esc(
              t.transaction_date
            )}

            ·

            ${esc(
              t.description
            )}

            <br>

            <b>
              ${money(
                t.amount
              )}
            </b>

          </p>

        `
      )
      .join("") ||
    "Nenhuma.";


  /* =====================================================
     CARTÕES
  ===================================================== */

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
                  .startsWith(
                    month
                  )
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


  /* =====================================================
     METAS
  ===================================================== */

  $("goalDash").innerHTML =
    goals
      .slice(0, 5)
      .map(goal => {

        const target =
          Number(
            goal.target_amount
          );


        const current =
          Number(
            goal.current_amount
          );


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

  const month =
    $("reportMonth").value ||
    thisMonth;


  const rows =
    txs.filter(
      t =>
        t.transaction_date
          .startsWith(month)
    );


  const entries =
    rows
      .filter(
        t =>
          t.type ===
          "entrada"
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
          t.type ===
          "saida"
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
      <b>
        ${money(entries)}
      </b>

      ·

      Saídas:
      <b>
        ${money(exits)}
      </b>

      ·

      Resultado:
      <b>
        ${money(
          entries - exits
        )}
      </b>

    </p>

  `;


  $("reportBody").innerHTML =
    rows
      .map(
        t => `

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
              ${esc(
                t.description
              )}
            </td>

            <td>
              ${esc(
                t.categories?.name ||
                "-"
              )}
            </td>

            <td>
              ${money(
                t.amount
              )}
            </td>

            <td>
              ${esc(
                t.status
              )}
            </td>

          </tr>

        `
      )
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
            .startsWith(month)
      )
      .map(
        t => ({

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
            t.installment_total > 1
              ? `${t.installment_number}/${t.installment_total}`
              : ""

        })
      );


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
    `financeiro-${month}.xlsx`
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
          t.type ===
          "entrada"
      )
      .reduce(
        (sum, t) =>
          sum +
          Number(
            t.amount || 0
          ),
        0
      );


  const exits =
    rows
      .filter(
        t =>
          t.type ===
          "saida"
      )
      .reduce(
        (sum, t) =>
          sum +
          Number(
            t.amount || 0
          ),
        0
      );


  const result =
    entries - exits;


  const pending =
    rows
      .filter(
        t =>
          t.type ===
            "saida" &&
          t.status ===
            "pendente"
      )
      .reduce(
        (sum, t) =>
          sum +
          Number(
            t.amount || 0
          ),
        0
      );


  const categoryTotals =
    {};


  rows
    .filter(
      t =>
        t.type ===
        "saida"
    )
    .forEach(t => {

      const category =
        t.categories?.name ||
        "Sem categoria";


      categoryTotals[
        category
      ] =
        (
          categoryTotals[
            category
          ] || 0
        ) +
        Number(
          t.amount || 0
        );

    });


  const categoryRanking =
    Object.entries(
      categoryTotals
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );


  const largestCategory =
    categoryRanking.length
      ? categoryRanking[0]
      : null;


  const formatMoney =
    value =>
      Number(
        value || 0
      ).toLocaleString(
        "pt-BR",
        {
          style:
            "currency",
          currency:
            "BRL"
        }
      );


  const formatDate =
    value => {

      if (!value)
        return "-";


      const parts =
        value.split("-");


      if (
        parts.length !== 3
      )
        return value;


      return `${parts[2]}/${parts[1]}/${parts[0]}`;

    };


  const monthName =
    new Date(
      `${month}-01T12:00:00`
    ).toLocaleDateString(
      "pt-BR",
      {
        month:
          "long",
        year:
          "numeric"
      }
    );


  const JsPDF =
    window.jspdf.jsPDF;


  const doc =
    new JsPDF({
      orientation:
        "portrait",
      unit:
        "mm",
      format:
        "a4"
    });


  const pageWidth =
    doc.internal
      .pageSize
      .getWidth();


  const pageHeight =
    doc.internal
      .pageSize
      .getHeight();


  let y = 0;


  /* =====================================================
     CABEÇALHO
  ===================================================== */

  doc.setFillColor(
    8,
    13,
    30
  );


  doc.rect(
    0,
    0,
    pageWidth,
    43,
    "F"
  );


  doc.setTextColor(
    255,
    255,
    255
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(22);


  doc.text(
    "MEU FINANCEIRO",
    16,
    17
  );


  doc.setFontSize(10);


  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.setTextColor(
    165,
    180,
    252
  );


  doc.text(
    "RELATÓRIO FINANCEIRO",
    16,
    25
  );


  doc.setTextColor(
    255,
    255,
    255
  );


  doc.setFontSize(11);


  doc.text(
    monthName
      .toUpperCase(),
    pageWidth - 16,
    17,
    {
      align:
        "right"
    }
  );


  doc.setFontSize(8);


  doc.setTextColor(
    148,
    163,
    184
  );


  doc.text(
    `Gerado em ${formatDate(today)}`,
    pageWidth - 16,
    25,
    {
      align:
        "right"
    }
  );


  y = 53;


  /* =====================================================
     VISÃO GERAL
  ===================================================== */

  doc.setTextColor(
    15,
    23,
    42
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(15);


  doc.text(
    "Visão geral",
    16,
    y
  );


  y += 9;


  const cardGap = 5;


  const cardWidth =
    (
      pageWidth -
      32 -
      cardGap * 2
    ) / 3;


  const cardHeight = 25;


  const summaryCards = [

    {
      title:
        "ENTRADAS",

      value:
        formatMoney(
          entries
        ),

      color:
        [16, 185, 129]
    },


    {
      title:
        "SAÍDAS",

      value:
        formatMoney(
          exits
        ),

      color:
        [244, 63, 94]
    },


    {
      title:
        "RESULTADO",

      value:
        formatMoney(
          result
        ),

      color:
        result >= 0
          ? [99, 102, 241]
          : [244, 63, 94]
    }

  ];


  summaryCards.forEach(
    (card, index) => {

      const x =
        16 +
        index *
        (
          cardWidth +
          cardGap
        );


      doc.setFillColor(
        248,
        250,
        252
      );


      doc.roundedRect(
        x,
        y,
        cardWidth,
        cardHeight,
        3,
        3,
        "F"
      );


      doc.setFillColor(
        ...card.color
      );


      doc.roundedRect(
        x,
        y,
        2,
        cardHeight,
        1,
        1,
        "F"
      );


      doc.setTextColor(
        100,
        116,
        139
      );


      doc.setFontSize(7);


      doc.setFont(
        "helvetica",
        "bold"
      );


      doc.text(
        card.title,
        x + 7,
        y + 8
      );


      doc.setTextColor(
        15,
        23,
        42
      );


      doc.setFontSize(12);


      doc.text(
        card.value,
        x + 7,
        y + 18
      );

    }
  );


  y += 35;


  /* =====================================================
     RESUMO SECUNDÁRIO
  ===================================================== */

  doc.setFillColor(
    248,
    250,
    252
  );


  doc.roundedRect(
    16,
    y,
    pageWidth - 32,
    25,
    3,
    3,
    "F"
  );


  doc.setTextColor(
    71,
    85,
    105
  );


  doc.setFontSize(8);


  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.text(
    `LANÇAMENTOS: ${rows.length}`,
    23,
    y + 9
  );


  doc.text(
    `PENDÊNCIAS: ${formatMoney(pending)}`,
    23,
    y + 17
  );


  const categoryText =
    largestCategory
      ? `MAIOR CATEGORIA: ${largestCategory[0]}`
      : "MAIOR CATEGORIA: -";


  doc.text(
    categoryText,
    pageWidth / 2 + 5,
    y + 9
  );


  const average =
    rows.length
      ? (
          entries +
          exits
        ) / rows.length
      : 0;


  doc.text(
    `MÉDIA POR LANÇAMENTO: ${formatMoney(average)}`,
    pageWidth / 2 + 5,
    y + 17
  );


  y += 35;


  /* =====================================================
     CATEGORIAS
  ===================================================== */

  doc.setTextColor(
    15,
    23,
    42
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(13);


  doc.text(
    "Despesas por categoria",
    16,
    y
  );


  y += 7;


  if (
    categoryRanking.length ===
    0
  ) {

    doc.setFont(
      "helvetica",
      "normal"
    );


    doc.setFontSize(9);


    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Nenhuma despesa registrada neste período.",
      16,
      y + 7
    );


    y += 16;

  } else {

    categoryRanking
      .slice(0, 6)
      .forEach(
        ([name, value]) => {

          const percentage =
            exits > 0
              ? value / exits
              : 0;


          doc.setFont(
            "helvetica",
            "normal"
          );


          doc.setFontSize(8);


          doc.setTextColor(
            51,
            65,
            85
          );


          doc.text(
            String(name)
              .slice(0, 25),
            16,
            y + 5
          );


          doc.text(
            formatMoney(value),
            pageWidth - 16,
            y + 5,
            {
              align:
                "right"
            }
          );


          const barWidth =
            pageWidth - 80;


          const filled =
            barWidth *
            percentage;


          doc.setFillColor(
            226,
            232,
            240
          );


          doc.roundedRect(
            55,
            y + 1,
            barWidth,
            4,
            2,
            2,
            "F"
          );


          doc.setFillColor(
            99,
            102,
            241
          );


          if (filled > 0) {

            doc.roundedRect(
              55,
              y + 1,
              Math.max(
                2,
                filled
              ),
              4,
              2,
              2,
              "F"
            );

          }


          doc.setTextColor(
            100,
            116,
            139
          );


          doc.setFontSize(7);


          doc.text(
            `${(
              percentage *
              100
            ).toFixed(1)}%`,
            pageWidth - 16,
            y + 11,
            {
              align:
                "right"
            }
          );


          y += 15;

        }
      );

  }


  /* =====================================================
     PÁGINA DE LANÇAMENTOS
  ===================================================== */

  doc.addPage();


  y = 18;


  doc.setFillColor(
    8,
    13,
    30
  );


  doc.rect(
    0,
    0,
    pageWidth,
    28,
    "F"
  );


  doc.setTextColor(
    255,
    255,
    255
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(15);


  doc.text(
    "MEU FINANCEIRO",
    16,
    12
  );


  doc.setFontSize(9);


  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.setTextColor(
    165,
    180,
    252
  );


  doc.text(
    `LANÇAMENTOS — ${monthName.toUpperCase()}`,
    16,
    20
  );


  y = 38;


  const columns = [
    "Data",
    "Tipo",
    "Descrição",
    "Categoria",
    "Conta",
    "Valor",
    "Status"
  ];


  const widths = [
    19,
    17,
    40,
    32,
    28,
    27,
    22
  ];


  function drawTableHeader() {

    let x = 10;


    doc.setFillColor(
      15,
      23,
      42
    );


    doc.rect(
      10,
      y,
      pageWidth - 20,
      9,
      "F"
    );


    doc.setFont(
      "helvetica",
      "bold"
    );


    doc.setFontSize(7);


    doc.setTextColor(
      255,
      255,
      255
    );


    columns.forEach(
      (column, index) => {

        doc.text(
          column.toUpperCase(),
          x + 2,
          y + 6
        );


        x +=
          widths[index];

      }
    );


    y += 9;

  }


  drawTableHeader();


  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.setFontSize(7);


  if (
    rows.length === 0
  ) {

    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Nenhum lançamento encontrado.",
      14,
      y + 10
    );

  } else {

    rows.forEach(
      (t, index) => {

        if (
          y >
          pageHeight - 20
        ) {

          doc.addPage();

          y = 18;

          drawTableHeader();

        }


        if (
          index % 2 === 0
        ) {

          doc.setFillColor(
            248,
            250,
            252
          );


          doc.rect(
            10,
            y,
            pageWidth - 20,
            9,
            "F"
          );

        }


        const values = [

          formatDate(
            t.transaction_date
          ),

          t.type ===
          "entrada"
            ? "Entrada"
            : "Saída",

          String(
            t.description ||
            "-"
          ).slice(0, 22),

          String(
            t.categories?.name ||
            "-"
          ).slice(0, 18),

          String(
            t.accounts?.name ||
            "-"
          ).slice(0, 15),

          formatMoney(
            t.amount
          ),

          String(
            t.status ||
            "-"
          ).slice(0, 11)

        ];


        let x = 10;


        values.forEach(
          (
            value,
            colIndex
          ) => {

            if (
              colIndex === 5
            ) {

              doc.text(
                value,
                x +
                  widths[
                    colIndex
                  ] -
                  2,
                y + 6,
                {
                  align:
                    "right"
                }
              );

            } else {

              doc.text(
                value,
                x + 2,
                y + 6
              );

            }


            x +=
              widths[
                colIndex
              ];

          }
        );


        y += 9;

      }
    );

  }


  /* =====================================================
     RODAPÉ
  ===================================================== */

  const totalPages =
    doc.internal
      .getNumberOfPages();


  for (
    let p = 1;
    p <= totalPages;
    p++
  ) {

    doc.setPage(p);


    doc.setDrawColor(
      226,
      232,
      240
    );


    doc.line(
      12,
      pageHeight - 12,
      pageWidth - 12,
      pageHeight - 12
    );


    doc.setFont(
      "helvetica",
      "normal"
    );


    doc.setFontSize(7);


    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Meu Financeiro • Relatório gerado automaticamente",
      12,
      pageHeight - 7
    );


    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - 12,
      pageHeight - 7,
      {
        align:
          "right"
      }
    );

  }


  doc.save(
    `meu-financeiro-${month}.pdf`
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
        section
          .classList
          .add("hidden")
    );


  const selected =
    $(p);


  if (selected) {

    selected
      .classList
      .remove("hidden");

  }

    }        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m])
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

document.addEventListener("DOMContentLoaded", async () => {

  $("dashMonth").value = thisMonth;
  $("reportMonth").value = thisMonth;
  $("txDate").value = today;

  $("loginForm").onsubmit = login;
  $("signupForm").onsubmit = signup;

  $("logout").onclick = async () => {
    await sb.auth.signOut();
  };

  $("txForm").onsubmit = saveTx;
  $("cardForm").onsubmit = saveCard;
  $("recForm").onsubmit = saveRec;
  $("goalForm").onsubmit = saveGoal;
  $("accountForm").onsubmit = saveAccount;

  $("dashMonth").onchange = dashboard;
  $("reportMonth").onchange = report;

  $("excel").onclick = excel;
  $("pdf").onclick = pdf;

  document.querySelectorAll("nav button").forEach(button => {

    button.onclick = () => {
      page(button.dataset.page);
    };

  });


  const sessionResult =
    await sb.auth.getSession();

  const session =
    sessionResult.data.session;


  if (session) {

    await start(session.user);

  } else {

    loginView();

  }


  sb.auth.onAuthStateChange(
    async (event, session) => {

      if (session) {

        await start(session.user);

      } else {

        loginView();

      }

    }
  );

});


/* =========================================================
   LOGIN
========================================================= */

function loginView() {

  $("loginView").classList.remove("hidden");

  $("app").classList.add("hidden");

}


async function login(e) {

  e.preventDefault();

  msg("authMsg", "");

  const email =
    $("loginEmail").value.trim();

  const password =
    $("loginPassword").value;


  const result =
    await sb.auth.signInWithPassword({
      email,
      password
    });


  if (result.error) {

    msg(
      "authMsg",
      result.error.message
    );

  }

}


/* =========================================================
   CADASTRO
========================================================= */

async function signup(e) {

  e.preventDefault();

  msg("authMsg", "");

  const name =
    $("signupName").value.trim();

  const email =
    $("signupEmail").value.trim();

  const password =
    $("signupPassword").value;


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


  msg(
    "authMsg",
    "Conta criada com sucesso. Faça login para continuar."
  );

}


/* =========================================================
   INÍCIO DO USUÁRIO
========================================================= */

async function start(u) {

  if (!u || !u.id) {

    loginView();

    return;
  }


  user = u;


  const profile =
    await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();


  $("userName").textContent =
    profile.data?.name ||
    user.email ||
    "Usuário";


  $("loginView").classList.add("hidden");

  $("app").classList.remove("hidden");


  await load();

  page("dashboard");

}


/* =========================================================
   CARREGAR DADOS
========================================================= */

async function load() {

  if (!user || !user.id) {

    console.error(
      "Usuário não autenticado."
    );

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
      .select("*,categories(name)")
      .order("description"),


    sb
      .from("goals")
      .select("*")
      .order("created_at", {
        ascending: false
      }),


    sb
      .from("transactions")
      .select(
        "*,categories(name),accounts(name),cards(name)"
      )
      .order("transaction_date", {
        ascending: false
      })
      .limit(3000)

  ]);


  if (categoriesResult.error) {

    console.error(
      "Erro ao carregar categorias:",
      categoriesResult.error
    );

  }


  if (accountsResult.error) {

    console.error(
      "Erro ao carregar contas:",
      accountsResult.error
    );

  }


  if (cardsResult.error) {

    console.error(
      "Erro ao carregar cartões:",
      cardsResult.error
    );

  }


  if (recurringResult.error) {

    console.error(
      "Erro ao carregar recorrentes:",
      recurringResult.error
    );

  }


  if (goalsResult.error) {

    console.error(
      "Erro ao carregar metas:",
      goalsResult.error
    );

  }


  if (transactionsResult.error) {

    console.error(
      "Erro ao carregar lançamentos:",
      transactionsResult.error
    );

  }


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


  /* =======================================================
     CRIAR CATEGORIAS PADRÃO
  ======================================================= */

  if (cats.length === 0) {

    console.log(
      "Nenhuma categoria encontrada. Criando categorias padrão..."
    );


    const seedResult =
      await sb.rpc(
        "seed_categories",
        {
          p_user: user.id
        }
      );


    if (seedResult.error) {

      console.error(
        "Erro ao criar categorias:",
        seedResult.error
      );

    } else {

      const categoriesReload =
        await sb
          .from("categories")
          .select("*")
          .order("name");


      if (categoriesReload.error) {

        console.error(
          "Erro ao recarregar categorias:",
          categoriesReload.error
        );

      } else {

        cats =
          categoriesReload.data || [];

      }

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
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`
      )
      .join("");


  $("recCat").innerHTML =
    '<option value="">Selecione uma categoria</option>' +

    cats
      .map(
        c =>
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`
      )
      .join("");


  $("txAccount").innerHTML =
    '<option value="">Selecione uma conta</option>' +

    accounts
      .map(
        a =>
          `<option value="${a.id}">
            ${esc(a.name)}
          </option>`
      )
      .join("");


  $("txCard").innerHTML =
    '<option value="">Nenhum</option>' +

    cards
      .map(
        c =>
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`
      )
      .join("");

}


/* =========================================================
   SALVAR / ALTERAR LANÇAMENTO
========================================================= */

async function saveTx(e) {

  e.preventDefault();

  msg("txMsg", "");


  if (!user || !user.id) {

    msg(
      "txMsg",
      "Usuário não autenticado."
    );

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
    Number($("txAmount").value);


  if (!amount || amount <= 0) {

    msg(
      "txMsg",
      "Informe um valor válido."
    );

    return;
  }


  const description =
    $("txDesc").value.trim();


  if (!description) {

    msg(
      "txMsg",
      "Informe uma descrição."
    );

    return;
  }


  /* =======================================================
     ALTERAR LANÇAMENTO
  ======================================================= */

  if (editingTxId) {

    const updateData = {

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
        cardId,

      status:
        $("txStatus").value,

      description,

      notes:
        $("txNotes").value.trim() || null

    };


    const result =
      await sb
        .from("transactions")
        .update(updateData)
        .eq("id", editingTxId)
        .eq("user_id", user.id);


    if (result.error) {

      console.error(
        "Erro ao alterar lançamento:",
        result.error
      );

      msg(
        "txMsg",
        "Erro ao alterar: " +
        result.error.message
      );

      return;
    }


    editingTxId = null;


    $("txSaveBtn").textContent =
      "Salvar";


    $("txForm").reset();

    $("txDate").value =
      today;

    $("txInstall").value =
      1;


    msg(
      "txMsg",
      "Lançamento alterado com sucesso."
    );


    await load();

    return;
  }


  /* =======================================================
     NOVO LANÇAMENTO
  ======================================================= */

  const totalInstallments =
    Math.max(
      1,
      Number($("txInstall").value) || 1
    );


  const groupId =
    crypto.randomUUID();


  const base = {

    user_id:
      user.id,

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
      cardId,

    status:
      $("txStatus").value,

    description,

    notes:
      $("txNotes").value.trim() || null,

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
        date.toISOString().slice(0, 10),

      installment_number:
        i + 1,

      installment_total:
        totalInstallments

    });

  }


  const result =
    await sb
      .from("transactions")
      .insert(rows);


  if (result.error) {

    console.error(
      "Erro ao salvar lançamento:",
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
    "Lançamento salvo com sucesso."
  );


  $("txForm").reset();

  $("txDate").value =
    today;

  $("txInstall").value =
    1;


  await load();

}


/* =========================================================
   ALTERAR LANÇAMENTO
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


  editingTxId =
    id;


  $("txType").value =
    tx.type || "saida";

  $("txAmount").value =
    tx.amount || "";

  $("txDate").value =
    tx.transaction_date || today;

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


  $("txSaveBtn").textContent =
    "💾 Atualizar";


  msg(
    "txMsg",
    "Editando lançamento. Altere os dados e clique em Atualizar."
  );


  page("lancamentos");


  $("txAmount").focus();

}


/* =========================================================
   CANCELAR EDIÇÃO
========================================================= */

function cancelEditTx() {

  editingTxId = null;


  $("txForm").reset();

  $("txDate").value =
    today;

  $("txInstall").value =
    1;


  $("txSaveBtn").textContent =
    "Salvar";


  msg(
    "txMsg",
    ""
  );

}


/* =========================================================
   EXCLUIR LANÇAMENTO
========================================================= */

async function deleteTx(id) {

  if (!user || !user.id) {

    alert(
      "Usuário não autenticado."
    );

    return;
  }


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


  const confirmDelete =
    confirm(
      `Deseja realmente excluir este lançamento?\n\n` +

      `Descrição: ${tx.description}\n` +

      `Valor: ${money(tx.amount)}\n` +

      `Data: ${tx.transaction_date}`
    );


  if (!confirmDelete) {
    return;
  }


  const result =
    await sb
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);


  if (result.error) {

    console.error(
      "Erro ao excluir lançamento:",
      result.error
    );

    alert(
      "Erro ao excluir lançamento:\n" +
      result.error.message
    );

    return;
  }


  if (editingTxId === id) {

    cancelEditTx();

  }


  msg(
    "txMsg",
    "Lançamento excluído com sucesso."
  );


  await load();

}


/* =========================================================
   CARTÃO
========================================================= */

async function saveCard(e) {

  e.preventDefault();

  msg("cardMsg", "");


  if (!user || !user.id) {

    msg(
      "cardMsg",
      "Usuário não autenticado."
    );

    return;
  }


  const name =
    $("cardName").value.trim();

  const limit =
    Number($("cardLimit").value);

  const closing =
    Number($("cardClose").value);

  const due =
    Number($("cardDue").value);


  if (!name) {

    msg(
      "cardMsg",
      "Informe o nome do cartão."
    );

    return;
  }


  const result =
    await sb
      .from("cards")
      .insert({

        user_id:
          user.id,

        name,

        limit_amount:
          limit,

        closing_day:
          closing,

        due_day:
          due

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
    "Cartão cadastrado com sucesso."
  );


  $("cardForm").reset();

  await load();

}


/* =========================================================
   RECORRENTE
========================================================= */

async function saveRec(e) {

  e.preventDefault();

  msg("recMsg", "");


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
          $("recDesc").value.trim(),

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
          $("recEnd").value || null

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
    "Cadastrado com sucesso."
  );


  $("recForm").reset();

  await load();

}


/* =========================================================
   METAS
========================================================= */

async function saveGoal(e) {

  e.preventDefault();

  msg("goalMsg", "");


  const result =
    await sb
      .from("goals")
      .insert({

        user_id:
          user.id,

        name:
          $("goalName").value.trim(),

        target_amount:
          Number(
            $("goalTarget").value
          ),

        current_amount:
          Number(
            $("goalCurrent").value
          ) || 0,

        deadline:
          $("goalDate").value || null

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
    "Meta cadastrada com sucesso."
  );


  $("goalForm").reset();

  await load();

}


/* =========================================================
   CONTA
========================================================= */

async function saveAccount(e) {

  e.preventDefault();

  msg("accountMsg", "");


  const result =
    await sb
      .from("accounts")
      .insert({

        user_id:
          user.id,

        name:
          $("accountName").value.trim(),

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
    "Conta cadastrada com sucesso."
  );


  $("accountForm").reset();

  await load();

}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function render() {

  /* =======================================================
     LANÇAMENTOS
  ======================================================= */

  $("txBody").innerHTML =
    txs
      .slice(0, 200)
      .map(t => `

        <tr>

          <td>
            ${t.transaction_date}
          </td>

          <td>
            ${esc(t.type)}
          </td>

          <td>
            ${esc(t.description)}
          </td>

          <td>
            ${esc(t.categories?.name || "-")}
          </td>

          <td>
            ${money(t.amount)}
          </td>

          <td>
            ${esc(t.status)}
          </td>

          <td>
            ${
              t.installment_total > 1
                ? `${t.installment_number}/${t.installment_total}`
                : "-"
            }
          </td>

          <td>

            <button
              type="button"
              class="secondary"
              onclick="editTx('${t.id}')"
              title="Alterar lançamento"
            >
              ✏️
            </button>

            <button
              type="button"
              class="danger"
              onclick="deleteTx('${t.id}')"
              title="Excluir lançamento"
            >
              🗑️
            </button>

          </td>

        </tr>

      `)
      .join("");


  /* =======================================================
     CARTÕES
  ======================================================= */

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
                sum + Number(t.amount),
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
                  Number(card.limit_amount) -
                  used
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


  /* =======================================================
     RECORRENTES
  ======================================================= */

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
            ${esc(r.categories?.name || "-")}
          </td>

          <td>
            ${r.due_day}
          </td>

          <td>
            ${r.start_date}
          </td>

          <td>
            ${r.end_date || "-"}
          </td>

        </tr>

      `)
      .join("");


  /* =======================================================
     METAS
  ======================================================= */

  $("goals").innerHTML =
    goalsData();


  /* =======================================================
     CONTAS
  ======================================================= */

  $("accountBody").innerHTML =
    accounts
      .map(account => {

        const movement =
          txs
            .filter(
              t =>
                t.account_id === account.id
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
              current / target * 100
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
                goal.deadline
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

  const month =
    $("dashMonth").value ||
    thisMonth;


  const rows =
    txs.filter(
      t =>
        t.transaction_date.startsWith(
          month
        )
    );


  const entries =
    rows
      .filter(
        t =>
          t.type === "entrada"
      )
      .reduce(
        (sum, t) =>
          sum + Number(t.amount),
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
          sum + Number(t.amount),
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
          sum + Number(t.amount),
        0
      );


  $("inTotal").textContent =
    money(entries);

  $("outTotal").textContent =
    money(exits);

  $("result").textContent =
    money(
      entries - exits
    );

  $("available").textContent =
    money(
      entries -
      exits -
      pending
    );


  /* =======================================================
     FLUXO
  ======================================================= */

  const daily = {};


  rows.forEach(t => {

    daily[t.transaction_date] =
      (
        daily[t.transaction_date] ||
        0
      ) +
      (
        t.type === "entrada"
          ? Number(t.amount)
          : -Number(t.amount)
      );

  });


  /* =======================================================
     CATEGORIAS
  ======================================================= */

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


  /* =======================================================
     GRÁFICO FLUXO
  ======================================================= */

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
              Object.values(daily)

          }]

        }

      }
    );


  /* =======================================================
     GRÁFICO CATEGORIAS
  ======================================================= */

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

        }

      }
    );


  /* =======================================================
     PENDÊNCIAS
  ======================================================= */

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

          ${t.transaction_date}
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


  /* =======================================================
     CARTÕES
  ======================================================= */

  $("cardDash").innerHTML =
    cards
      .map(card => {

        const total =
          txs
            .filter(
              t =>
                t.card_id === card.id &&
                t.type === "saida" &&
                t.transaction_date.startsWith(
                  month
                )
            )
            .reduce(
              (sum, t) =>
                sum + Number(t.amount),
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


  /* =======================================================
     METAS
  ======================================================= */

  $("goalDash").innerHTML =
    goals
      .slice(0, 5)
      .map(goal => {

        const target =
          Number(
            goal.target_amount
          );

        const current =
          Number(
            goal.current_amount
          );


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

  const month =
    $("reportMonth").value ||
    thisMonth;


  const rows =
    txs.filter(
      t =>
        t.transaction_date.startsWith(
          month
        )
    );


  const entries =
    rows
      .filter(
        t =>
          t.type === "entrada"
      )
      .reduce(
        (sum, t) =>
          sum + Number(t.amount),
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
          sum + Number(t.amount),
        0
      );


  $("summary").innerHTML = `

    <p>

      Entradas
      <b>
        ${money(entries)}
      </b>

      ·

      Saídas
      <b>
        ${money(exits)}
      </b>

      ·

      Resultado
      <b>
        ${money(entries - exits)}
      </b>

    </p>

  `;


  $("reportBody").innerHTML =
    rows
      .map(t => `

        <tr>

          <td>
            ${t.transaction_date}
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
          t.transaction_date.startsWith(
            month
          )
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
          t.installment_total > 1
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
    `financeiro-${month}.xlsx`
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
        t.transaction_date.startsWith(
          month
        )
    );


  const entries =
    rows
      .filter(
        t =>
          t.type === "entrada"
      )
      .reduce(
        (sum, t) =>
          sum + Number(
            t.amount || 0
          ),
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
          sum + Number(
            t.amount || 0
          ),
        0
      );


  const result =
    entries - exits;


  const pending =
    rows
      .filter(
        t =>
          t.type === "saida" &&
          t.status === "pendente"
      )
      .reduce(
        (sum, t) =>
          sum + Number(
            t.amount || 0
          ),
        0
      );


  const categoryTotals = {};


  rows
    .filter(
      t =>
        t.type === "saida"
    )
    .forEach(t => {

      const category =
        t.categories?.name ||
        "Sem categoria";


      categoryTotals[category] =
        (
          categoryTotals[category] ||
          0
        ) +
        Number(t.amount || 0);

    });


  const categoryRanking =
    Object.entries(
      categoryTotals
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );


  const largestCategory =
    categoryRanking.length
      ? categoryRanking[0]
      : null;


  const formatMoney =
    value =>
      Number(
        value || 0
      ).toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      );


  const formatDate =
    value => {

      if (!value)
        return "-";


      const parts =
        value.split("-");


      if (parts.length !== 3)
        return value;


      return `${parts[2]}/${parts[1]}/${parts[0]}`;

    };


  const monthName =
    new Date(
      `${month}-01T12:00:00`
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
    new JsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });


  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();


  let y = 0;


  /* =======================================================
     CABEÇALHO
  ======================================================= */

  doc.setFillColor(
    8,
    13,
    30
  );


  doc.rect(
    0,
    0,
    pageWidth,
    43,
    "F"
  );


  doc.setTextColor(
    255,
    255,
    255
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(22);


  doc.text(
    "MEU FINANCEIRO",
    16,
    17
  );


  doc.setFontSize(10);

  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.setTextColor(
    165,
    180,
    252
  );


  doc.text(
    "RELATÓRIO FINANCEIRO",
    16,
    25
  );


  doc.setTextColor(
    255,
    255,
    255
  );


  doc.setFontSize(11);


  doc.text(
    monthName.toUpperCase(),
    pageWidth - 16,
    17,
    {
      align: "right"
    }
  );


  doc.setFontSize(8);


  doc.setTextColor(
    148,
    163,
    184
  );


  doc.text(
    `Gerado em ${formatDate(today)}`,
    pageWidth - 16,
    25,
    {
      align: "right"
    }
  );


  y = 53;


  /* =======================================================
     VISÃO GERAL
  ======================================================= */

  doc.setTextColor(
    15,
    23,
    42
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(15);


  doc.text(
    "Visão geral",
    16,
    y
  );


  y += 9;


  const cardGap = 5;

  const cardWidth =
    (
      pageWidth -
      32 -
      cardGap * 2
    ) / 3;


  const cardHeight = 25;


  const summaryCards = [

    {
      title: "ENTRADAS",

      value:
        formatMoney(entries),

      color:
        [16, 185, 129]
    },

    {
      title: "SAÍDAS",

      value:
        formatMoney(exits),

      color:
        [244, 63, 94]
    },

    {
      title: "RESULTADO",

      value:
        formatMoney(result),

      color:
        result >= 0
          ? [99, 102, 241]
          : [244, 63, 94]
    }

  ];


  summaryCards.forEach(
    (card, index) => {

      const x =
        16 +
        index *
        (
          cardWidth +
          cardGap
        );


      doc.setFillColor(
        248,
        250,
        252
      );


      doc.roundedRect(
        x,
        y,
        cardWidth,
        cardHeight,
        3,
        3,
        "F"
      );


      doc.setFillColor(
        ...card.color
      );


      doc.roundedRect(
        x,
        y,
        2,
        cardHeight,
        1,
        1,
        "F"
      );


      doc.setTextColor(
        100,
        116,
        139
      );


      doc.setFontSize(7);

      doc.setFont(
        "helvetica",
        "bold"
      );


      doc.text(
        card.title,
        x + 7,
        y + 8
      );


      doc.setTextColor(
        15,
        23,
        42
      );


      doc.setFontSize(12);


      doc.text(
        card.value,
        x + 7,
        y + 18
      );

    }
  );


  y += 35;


  /* =======================================================
     RESUMO SECUNDÁRIO
  ======================================================= */

  doc.setFillColor(
    248,
    250,
    252
  );


  doc.roundedRect(
    16,
    y,
    pageWidth - 32,
    25,
    3,
    3,
    "F"
  );


  doc.setTextColor(
    71,
    85,
    105
  );


  doc.setFontSize(8);


  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.text(
    `LANÇAMENTOS: ${rows.length}`,
    23,
    y + 9
  );


  doc.text(
    `PENDÊNCIAS: ${formatMoney(pending)}`,
    23,
    y + 17
  );


  const categoryText =
    largestCategory
      ? `MAIOR CATEGORIA: ${largestCategory[0]}`
      : "MAIOR CATEGORIA: -";


  doc.text(
    categoryText,
    pageWidth / 2 + 5,
    y + 9
  );


  const average =
    rows.length
      ? (entries + exits) /
        rows.length
      : 0;


  doc.text(
    `MÉDIA POR LANÇAMENTO: ${formatMoney(average)}`,
    pageWidth / 2 + 5,
    y + 17
  );


  y += 35;


  /* =======================================================
     CATEGORIAS
  ======================================================= */

  doc.setTextColor(
    15,
    23,
    42
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(13);


  doc.text(
    "Despesas por categoria",
    16,
    y
  );


  y += 7;


  if (categoryRanking.length === 0) {

    doc.setFont(
      "helvetica",
      "normal"
    );


    doc.setFontSize(9);


    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Nenhuma despesa registrada neste período.",
      16,
      y + 7
    );


    y += 16;

  } else {

    categoryRanking
      .slice(0, 6)
      .forEach(
        ([name, value]) => {

          const percentage =
            exits > 0
              ? value / exits
              : 0;


          doc.setFont(
            "helvetica",
            "normal"
          );


          doc.setFontSize(8);


          doc.setTextColor(
            51,
            65,
            85
          );


          doc.text(
            String(name).slice(
              0,
              25
            ),
            16,
            y + 5
          );


          doc.text(
            formatMoney(value),
            pageWidth - 16,
            y + 5,
            {
              align: "right"
            }
          );


          const barWidth =
            pageWidth - 80;


          const filled =
            barWidth *
            percentage;


          doc.setFillColor(
            226,
            232,
            240
          );


          doc.roundedRect(
            55,
            y + 1,
            barWidth,
            4,
            2,
            2,
            "F"
          );


          doc.setFillColor(
            99,
            102,
            241
          );


          if (filled > 0) {

            doc.roundedRect(
              55,
              y + 1,
              Math.max(
                2,
                filled
              ),
              4,
              2,
              2,
              "F"
            );

          }


          doc.setTextColor(
            100,
            116,
            139
          );


          doc.setFontSize(7);


          doc.text(
            `${(
              percentage * 100
            ).toFixed(1)}%`,
            pageWidth - 16,
            y + 11,
            {
              align: "right"
            }
          );


          y += 15;

        }
      );

  }


  /* =======================================================
     NOVA PÁGINA
  ======================================================= */

  doc.addPage();


  y = 18;


  doc.setFillColor(
    8,
    13,
    30
  );


  doc.rect(
    0,
    0,
    pageWidth,
    28,
    "F"
  );


  doc.setTextColor(
    255,
    255,
    255
  );


  doc.setFont(
    "helvetica",
    "bold"
  );


  doc.setFontSize(15);


  doc.text(
    "MEU FINANCEIRO",
    16,
    12
  );


  doc.setFontSize(9);

  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.setTextColor(
    165,
    180,
    252
  );


  doc.text(
    `LANÇAMENTOS — ${monthName.toUpperCase()}`,
    16,
    20
  );


  y = 38;


  /* =======================================================
     TABELA PDF
  ======================================================= */

  const columns = [
    "Data",
    "Tipo",
    "Descrição",
    "Categoria",
    "Conta",
    "Valor",
    "Status"
  ];


  const widths = [
    19,
    17,
    40,
    32,
    28,
    27,
    22
  ];


  function drawTableHeader() {

    let x = 10;


    doc.setFillColor(
      15,
      23,
      42
    );


    doc.rect(
      10,
      y,
      pageWidth - 20,
      9,
      "F"
    );


    doc.setFont(
      "helvetica",
      "bold"
    );


    doc.setFontSize(7);


    doc.setTextColor(
      255,
      255,
      255
    );


    columns.forEach(
      (column, index) => {

        doc.text(
          column.toUpperCase(),
          x + 2,
          y + 6
        );


        x +=
          widths[index];

      }
    );


    y += 9;

  }


  drawTableHeader();


  doc.setFont(
    "helvetica",
    "normal"
  );


  doc.setFontSize(7);


  if (rows.length === 0) {

    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Nenhum lançamento encontrado.",
      14,
      y + 10
    );

  } else {

    rows.forEach(
      (t, index) => {

        if (
          y >
          pageHeight - 20
        ) {

          doc.addPage();

          y = 18;

          drawTableHeader();

        }


        if (
          index % 2 === 0
        ) {

          doc.setFillColor(
            248,
            250,
            252
          );


          doc.rect(
            10,
            y,
            pageWidth - 20,
            9,
            "F"
          );

        }


        const values = [

          formatDate(
            t.transaction_date
          ),

          t.type === "entrada"
            ? "Entrada"
            : "Saída",

          String(
            t.description || "-"
          ).slice(0, 22),

          String(
            t.categories?.name || "-"
          ).slice(0, 18),

          String(
            t.accounts?.name || "-"
          ).slice(0, 15),

          formatMoney(
            t.amount
          ),

          String(
            t.status || "-"
          ).slice(0, 11)

        ];


        let x = 10;


        values.forEach(
          (value, colIndex) => {

            if (
              colIndex === 5
            ) {

              doc.text(
                value,
                x +
                widths[colIndex] -
                2,
                y + 6,
                {
                  align: "right"
                }
              );

            } else {

              doc.text(
                value,
                x + 2,
                y + 6
              );

            }


            x +=
              widths[colIndex];

          }
        );


        y += 9;

      }
    );

  }


  /* =======================================================
     RODAPÉ
  ======================================================= */

  const totalPages =
    doc.internal.getNumberOfPages();


  for (
    let currentPage = 1;
    currentPage <= totalPages;
    currentPage++
  ) {

    doc.setPage(
      currentPage
    );


    doc.setDrawColor(
      226,
      232,
      240
    );


    doc.line(
      12,
      pageHeight - 12,
      pageWidth - 12,
      pageHeight - 12
    );


    doc.setFont(
      "helvetica",
      "normal"
    );


    doc.setFontSize(7);


    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Meu Financeiro • Relatório gerado automaticamente",
      12,
      pageHeight - 7
    );


    doc.text(
      `Página ${currentPage} de ${totalPages}`,
      pageWidth - 12,
      pageHeight - 7,
      {
        align: "right"
      }
    );

  }


  doc.save(
    `meu-financeiro-${month}.pdf`
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

}    }[m])
  );

function msg(id, text) {
  const el = $(id);
  if (el) el.textContent = text || "";
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  $("dashMonth").value = thisMonth;
  $("reportMonth").value = thisMonth;
  $("txDate").value = today;

  $("loginForm").onsubmit = login;
  $("signupForm").onsubmit = signup;

  $("logout").onclick = async () => {
    await sb.auth.signOut();
  };

  $("txForm").onsubmit = saveTx;
  $("cardForm").onsubmit = saveCard;
  $("recForm").onsubmit = saveRec;
  $("goalForm").onsubmit = saveGoal;
  $("accountForm").onsubmit = saveAccount;

  $("dashMonth").onchange = dashboard;
  $("reportMonth").onchange = report;

  $("excel").onclick = excel;
  $("pdf").onclick = pdf;

  document.querySelectorAll("nav button").forEach(button => {
    button.onclick = () => page(button.dataset.page);
  });

  const sessionResult = await sb.auth.getSession();

  const session = sessionResult.data.session;

  if (session) {
    await start(session.user);
  } else {
    loginView();
  }

  sb.auth.onAuthStateChange(async (event, session) => {

    if (session) {
      await start(session.user);
    } else {
      loginView();
    }

  });

});


/* =========================================================
   LOGIN / LOGOUT
========================================================= */

function loginView() {

  $("loginView").classList.remove("hidden");
  $("app").classList.add("hidden");

}


async function login(e) {

  e.preventDefault();

  msg("authMsg", "");

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const result = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (result.error) {
    msg("authMsg", result.error.message);
  }

}


async function signup(e) {

  e.preventDefault();

  msg("authMsg", "");

  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  const result = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      }
    }
  });

  if (result.error) {

    msg("authMsg", result.error.message);
    return;

  }

  msg(
    "authMsg",
    "Conta criada com sucesso. Faça login para continuar."
  );

}


/* =========================================================
   INÍCIO DO USUÁRIO
========================================================= */

async function start(u) {

  if (!u || !u.id) {
    loginView();
    return;
  }

  user = u;

  const profile = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  $("userName").textContent =
    profile.data?.name || user.email || "Usuário";

  $("loginView").classList.add("hidden");
  $("app").classList.remove("hidden");

  await load();

  page("dashboard");

}


/* =========================================================
   CARREGAR DADOS
========================================================= */

async function load() {

  if (!user || !user.id) {
    console.error("Usuário não autenticado.");
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
      .select("*,categories(name)")
      .order("description"),

    sb
      .from("goals")
      .select("*")
      .order("created_at", {
        ascending: false
      }),

    sb
      .from("transactions")
      .select(
        "*,categories(name),accounts(name),cards(name)"
      )
      .order("transaction_date", {
        ascending: false
      })
      .limit(3000)

  ]);


  /* ============================
     VERIFICAÇÃO DE ERROS
  ============================ */

  if (categoriesResult.error) {
    console.error(
      "Erro ao carregar categorias:",
      categoriesResult.error
    );
  }

  if (accountsResult.error) {
    console.error(
      "Erro ao carregar contas:",
      accountsResult.error
    );
  }

  if (cardsResult.error) {
    console.error(
      "Erro ao carregar cartões:",
      cardsResult.error
    );
  }

  if (recurringResult.error) {
    console.error(
      "Erro ao carregar recorrentes:",
      recurringResult.error
    );
  }

  if (goalsResult.error) {
    console.error(
      "Erro ao carregar metas:",
      goalsResult.error
    );
  }

  if (transactionsResult.error) {
    console.error(
      "Erro ao carregar lançamentos:",
      transactionsResult.error
    );
  }


  /* ============================
     DADOS
  ============================ */

  cats = categoriesResult.data || [];
  accounts = accountsResult.data || [];
  cards = cardsResult.data || [];
  recurring = recurringResult.data || [];
  goals = goalsResult.data || [];
  txs = transactionsResult.data || [];


  /* ========================================================
     SE NÃO EXISTIREM CATEGORIAS,
     CRIA AUTOMATICAMENTE
  ======================================================== */

  if (cats.length === 0) {

    console.log(
      "Nenhuma categoria encontrada. Criando categorias padrão..."
    );

    const seedResult = await sb.rpc(
      "seed_categories",
      {
        p_user: user.id
      }
    );

    if (seedResult.error) {

      console.error(
        "Erro ao criar categorias:",
        seedResult.error
      );

    } else {

      const categoriesReload = await sb
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesReload.error) {

        console.error(
          "Erro ao recarregar categorias:",
          categoriesReload.error
        );

      } else {

        cats = categoriesReload.data || [];

      }

    }

  }


  fill();
  render();

}


/* =========================================================
   PREENCHER SELECTS
========================================================= */

function fill() {

  /* CATEGORIAS */

  $("txCat").innerHTML =
    '<option value="">Selecione uma categoria</option>' +
    cats
      .map(
        c =>
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`
      )
      .join("");


  /* CATEGORIAS DAS RECORRENTES */

  $("recCat").innerHTML =
    '<option value="">Selecione uma categoria</option>' +
    cats
      .map(
        c =>
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`
      )
      .join("");


  /* CONTAS */

  $("txAccount").innerHTML =
    '<option value="">Selecione uma conta</option>' +
    accounts
      .map(
        a =>
          `<option value="${a.id}">
            ${esc(a.name)}
          </option>`
      )
      .join("");


  /* CARTÕES */

  $("txCard").innerHTML =
    '<option value="">Nenhum</option>' +
    cards
      .map(
        c =>
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`
      )
      .join("");

}


/* =========================================================
   SALVAR LANÇAMENTO
========================================================= */

async function saveTx(e) {

  e.preventDefault();

  msg("txMsg", "");


  if (!user || !user.id) {

    msg(
      "txMsg",
      "Usuário não autenticado."
    );

    return;
  }


  /* ============================
     UUIDs
  ============================ */

  const categoryId =
    $("txCat").value || null;

  const accountId =
    $("txAccount").value || null;

  const cardId =
    $("txCard").value || null;


  /* ============================
     VALIDAÇÕES
  ============================ */

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
    Number($("txAmount").value);

  if (!amount || amount <= 0) {

    msg(
      "txMsg",
      "Informe um valor válido."
    );

    return;
  }


  const description =
    $("txDesc").value.trim();

  if (!description) {

    msg(
      "txMsg",
      "Informe uma descrição."
    );

    return;
  }


  /* ============================
     PARCELAS
  ============================ */

  const totalInstallments =
    Math.max(
      1,
      Number($("txInstall").value) || 1
    );


  const groupId =
    crypto.randomUUID();


  /* ============================
     LANÇAMENTO BASE
  ============================ */

  const base = {

    user_id: user.id,

    type: $("txType").value,

    amount,

    transaction_date:
      $("txDate").value,

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
      $("txNotes").value.trim() || null,

    group_id:
      groupId

  };


  /* ============================
     GERAR PARCELAS
  ============================ */

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
        date.toISOString().slice(0, 10),

      installment_number:
        i + 1,

      installment_total:
        totalInstallments

    });

  }


  /* ============================
     SALVAR NO SUPABASE
  ============================ */

  const result = await sb
    .from("transactions")
    .insert(rows);


  if (result.error) {

    console.error(
      "Erro ao salvar lançamento:",
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
    "Lançamento salvo com sucesso."
  );


  /* ============================
     LIMPAR FORMULÁRIO
  ============================ */

  $("txForm").reset();

  $("txDate").value = today;

  $("txInstall").value = 1;


  /* ============================
     ATUALIZAR SISTEMA
  ============================ */

  await load();

}


/* =========================================================
   CARTÃO
========================================================= */

async function saveCard(e) {

  e.preventDefault();

  msg("cardMsg", "");


  if (!user || !user.id) {

    msg(
      "cardMsg",
      "Usuário não autenticado."
    );

    return;
  }


  const name =
    $("cardName").value.trim();

  const limit =
    Number($("cardLimit").value);

  const closing =
    Number($("cardClose").value);

  const due =
    Number($("cardDue").value);


  if (!name) {

    msg(
      "cardMsg",
      "Informe o nome do cartão."
    );

    return;
  }


  const result = await sb
    .from("cards")
    .insert({

      user_id: user.id,

      name,

      limit_amount: limit,

      closing_day: closing,

      due_day: due

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
    "Cartão cadastrado com sucesso."
  );


  $("cardForm").reset();

  await load();

}


/* =========================================================
   RECORRENTE
========================================================= */

async function saveRec(e) {

  e.preventDefault();

  msg("recMsg", "");


  const categoryId =
    $("recCat").value || null;


  if (!categoryId) {

    msg(
      "recMsg",
      "Selecione uma categoria."
    );

    return;
  }


  const result = await sb
    .from("recurring")
    .insert({

      user_id: user.id,

      description:
        $("recDesc").value.trim(),

      amount:
        Number($("recAmount").value),

      category_id:
        categoryId,

      due_day:
        Number($("recDay").value),

      start_date:
        $("recStart").value,

      end_date:
        $("recEnd").value || null

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
    "Cadastrado com sucesso."
  );


  $("recForm").reset();

  await load();

}


/* =========================================================
   METAS
========================================================= */

async function saveGoal(e) {

  e.preventDefault();

  msg("goalMsg", "");


  const result = await sb
    .from("goals")
    .insert({

      user_id: user.id,

      name:
        $("goalName").value.trim(),

      target_amount:
        Number($("goalTarget").value),

      current_amount:
        Number($("goalCurrent").value) || 0,

      deadline:
        $("goalDate").value || null

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
    "Meta cadastrada com sucesso."
  );


  $("goalForm").reset();

  await load();

}


/* =========================================================
   CONTA
========================================================= */

async function saveAccount(e) {

  e.preventDefault();

  msg("accountMsg", "");


  const result = await sb
    .from("accounts")
    .insert({

      user_id: user.id,

      name:
        $("accountName").value.trim(),

      type:
        $("accountType").value,

      initial_balance:
        Number($("accountInitial").value) || 0

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
    "Conta cadastrada com sucesso."
  );


  $("accountForm").reset();

  await load();

}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function render() {

  $("txBody").innerHTML =
    txs
      .slice(0, 200)
      .map(t => `

        <tr>

          <td>
            ${t.transaction_date}
          </td>

          <td>
            ${esc(t.type)}
          </td>

          <td>
            ${esc(t.description)}
          </td>

          <td>
            ${esc(t.categories?.name || "-")}
          </td>

          <td>
            ${money(t.amount)}
          </td>

          <td>
            ${esc(t.status)}
          </td>

          <td>
            ${
              t.installment_total > 1
                ? `${t.installment_number}/${t.installment_total}`
                : "-"
            }
          </td>

        </tr>

      `)
      .join("");


  /* CARTÕES */

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
                sum + Number(t.amount),
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
                  Number(card.limit_amount) - used
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


  /* RECORRENTES */

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
            ${esc(r.categories?.name || "-")}
          </td>

          <td>
            ${r.due_day}
          </td>

          <td>
            ${r.start_date}
          </td>

          <td>
            ${r.end_date || "-"}
          </td>

        </tr>

      `)
      .join("");


  /* METAS */

  $("goals").innerHTML =
    goalsData();


  /* CONTAS */

  $("accountBody").innerHTML =
    accounts
      .map(account => {

        const movement =
          txs
            .filter(
              t =>
                t.account_id === account.id
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
              ${money(account.initial_balance)}
            </td>

            <td>
              ${money(movement)}
            </td>

            <td>
              ${money(
                Number(account.initial_balance) +
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
        Number(goal.target_amount) || 0;

      const current =
        Number(goal.current_amount) || 0;

      const percentage =
        target > 0
          ? Math.min(
              100,
              current / target * 100
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
              ? " · prazo " + goal.deadline
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

  const month =
    $("dashMonth").value ||
    thisMonth;


  const rows =
    txs.filter(
      t =>
        t.transaction_date.startsWith(
          month
        )
    );


  const entries =
    rows
      .filter(t => t.type === "entrada")
      .reduce(
        (sum, t) =>
          sum + Number(t.amount),
        0
      );


  const exits =
    rows
      .filter(t => t.type === "saida")
      .reduce(
        (sum, t) =>
          sum + Number(t.amount),
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
          sum + Number(t.amount),
        0
      );


  $("inTotal").textContent =
    money(entries);

  $("outTotal").textContent =
    money(exits);

  $("result").textContent =
    money(entries - exits);

  $("available").textContent =
    money(
      entries -
      exits -
      pending
    );


  /* FLUXO */

  const daily = {};

  rows.forEach(t => {

    daily[t.transaction_date] =
      (
        daily[t.transaction_date] || 0
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
    .filter(t => t.type === "saida")
    .forEach(t => {

      const name =
        t.categories?.name ||
        "Outros";

      categoryTotals[name] =
        (
          categoryTotals[name] || 0
        ) +
        Number(t.amount);

    });


  /* GRÁFICO FLUXO */

  flowChart?.destroy();

  flowChart =
    new Chart($("flow"), {

      type: "line",

      data: {

        labels:
          Object.keys(daily),

        datasets: [{

          label: "Resultado",

          data:
            Object.values(daily)

        }]

      }

    });


  /* GRÁFICO CATEGORIAS */

  catChart?.destroy();

  catChart =
    new Chart($("cats"), {

      type: "doughnut",

      data: {

        labels:
          Object.keys(categoryTotals),

        datasets: [{

          data:
            Object.values(categoryTotals)

        }]

      }

    });


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

          ${t.transaction_date}
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
                t.card_id === card.id &&
                t.type === "saida" &&
                t.transaction_date.startsWith(month)
            )
            .reduce(
              (sum, t) =>
                sum + Number(t.amount),
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
          Number(goal.target_amount);

        const current =
          Number(goal.current_amount);

        const percentage =
          target > 0
            ? current / target * 100
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

  const month =
    $("reportMonth").value ||
    thisMonth;


  const rows =
    txs.filter(
      t =>
        t.transaction_date.startsWith(
          month
        )
    );


  const entries =
    rows
      .filter(t => t.type === "entrada")
      .reduce(
        (sum, t) =>
          sum + Number(t.amount),
        0
      );


  const exits =
    rows
      .filter(t => t.type === "saida")
      .reduce(
        (sum, t) =>
          sum + Number(t.amount),
        0
      );


  $("summary").innerHTML = `

    <p>

      Entradas
      <b>${money(entries)}</b>

      ·

      Saídas
      <b>${money(exits)}</b>

      ·

      Resultado
      <b>${money(entries - exits)}</b>

    </p>

  `;


  $("reportBody").innerHTML =
    rows
      .map(t => `

        <tr>

          <td>
            ${t.transaction_date}
          </td>

          <td>
            ${esc(t.type)}
          </td>

          <td>
            ${esc(t.description)}
          </td>

          <td>
            ${esc(t.categories?.name || "-")}
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
          t.transaction_date.startsWith(
            month
          )
      )
      .map(t => ({

        Data:
          t.transaction_date,

        Tipo:
          t.type,

        Descrição:
          t.description,

        Categoria:
          t.categories?.name || "",

        Conta:
          t.accounts?.name || "",

        Cartão:
          t.cards?.name || "",

        Valor:
          Number(t.amount),

        Status:
          t.status,

        Parcela:
          t.installment_total > 1
            ? `${t.installment_number}/${t.installment_total}`
            : ""

      }));


  const worksheet =
    XLSX.utils.json_to_sheet(rows);

  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Financeiro"
  );


  XLSX.writeFile(
    workbook,
    `financeiro-${month}.xlsx`
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
        t.transaction_date.startsWith(month)
    );

  /* =====================================================
     DADOS DO RELATÓRIO
  ===================================================== */

  const entries =
    rows
      .filter(t => t.type === "entrada")
      .reduce(
        (sum, t) =>
          sum + Number(t.amount || 0),
        0
      );

  const exits =
    rows
      .filter(t => t.type === "saida")
      .reduce(
        (sum, t) =>
          sum + Number(t.amount || 0),
        0
      );

  const result =
    entries - exits;

  const pending =
    rows
      .filter(
        t =>
          t.type === "saida" &&
          t.status === "pendente"
      )
      .reduce(
        (sum, t) =>
          sum + Number(t.amount || 0),
        0
      );


  /* =====================================================
     CATEGORIAS
  ===================================================== */

  const categoryTotals = {};

  rows
    .filter(t => t.type === "saida")
    .forEach(t => {

      const category =
        t.categories?.name ||
        "Sem categoria";

      categoryTotals[category] =
        (
          categoryTotals[category] || 0
        ) +
        Number(t.amount || 0);

    });


  const categoryRanking =
    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1]);


  const largestCategory =
    categoryRanking.length
      ? categoryRanking[0]
      : null;


  /* =====================================================
     FORMATAÇÃO
  ===================================================== */

  const formatMoney =
    value =>
      Number(value || 0).toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      );


  const formatDate =
    value => {

      if (!value) return "-";

      const parts =
        value.split("-");

      if (parts.length !== 3)
        return value;

      return `${parts[2]}/${parts[1]}/${parts[0]}`;

    };


  const monthName =
    new Date(
      `${month}-01T12:00:00`
    ).toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric"
      }
    );


  /* =====================================================
     PDF
  ===================================================== */

  const JsPDF =
    window.jspdf.jsPDF;

  const doc =
    new JsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });


  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();


  let y = 0;


  /* =====================================================
     CABEÇALHO
  ===================================================== */

  doc.setFillColor(
    8,
    13,
    30
  );

  doc.rect(
    0,
    0,
    pageWidth,
    43,
    "F"
  );


  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(22);

  doc.text(
    "MEU FINANCEIRO",
    16,
    17
  );


  doc.setFontSize(10);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setTextColor(
    165,
    180,
    252
  );

  doc.text(
    "RELATÓRIO FINANCEIRO",
    16,
    25
  );


  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFontSize(11);

  doc.text(
    monthName.toUpperCase(),
    pageWidth - 16,
    17,
    {
      align: "right"
    }
  );


  doc.setFontSize(8);

  doc.setTextColor(
    148,
    163,
    184
  );

  doc.text(
    `Gerado em ${formatDate(today)}`,
    pageWidth - 16,
    25,
    {
      align: "right"
    }
  );


  y = 53;


  /* =====================================================
     TÍTULO
  ===================================================== */

  doc.setTextColor(
    15,
    23,
    42
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(15);

  doc.text(
    "Visão geral",
    16,
    y
  );


  y += 9;


  /* =====================================================
     CARDS DE RESUMO
  ===================================================== */

  const cardGap = 5;

  const cardWidth =
    (pageWidth - 32 - cardGap * 2) / 3;

  const cardHeight = 25;


  const summaryCards = [

    {
      title: "ENTRADAS",
      value: formatMoney(entries),
      color: [16, 185, 129]
    },

    {
      title: "SAÍDAS",
      value: formatMoney(exits),
      color: [244, 63, 94]
    },

    {
      title: "RESULTADO",
      value: formatMoney(result),
      color:
        result >= 0
          ? [99, 102, 241]
          : [244, 63, 94]
    }

  ];


  summaryCards.forEach(
    (card, index) => {

      const x =
        16 +
        index *
        (cardWidth + cardGap);


      doc.setFillColor(
        248,
        250,
        252
      );

      doc.roundedRect(
        x,
        y,
        cardWidth,
        cardHeight,
        3,
        3,
        "F"
      );


      doc.setFillColor(
        ...card.color
      );

      doc.roundedRect(
        x,
        y,
        2,
        cardHeight,
        1,
        1,
        "F"
      );


      doc.setTextColor(
        100,
        116,
        139
      );

      doc.setFontSize(7);

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        card.title,
        x + 7,
        y + 8
      );


      doc.setTextColor(
        15,
        23,
        42
      );

      doc.setFontSize(12);

      doc.text(
        card.value,
        x + 7,
        y + 18
      );

    }
  );


  y += 35;


  /* =====================================================
     RESUMO SECUNDÁRIO
  ===================================================== */

  doc.setFillColor(
    248,
    250,
    252
  );

  doc.roundedRect(
    16,
    y,
    pageWidth - 32,
    25,
    3,
    3,
    "F"
  );


  doc.setTextColor(
    71,
    85,
    105
  );

  doc.setFontSize(8);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `LANÇAMENTOS: ${rows.length}`,
    23,
    y + 9
  );

  doc.text(
    `PENDÊNCIAS: ${formatMoney(pending)}`,
    23,
    y + 17
  );


  const categoryText =
    largestCategory
      ? `MAIOR CATEGORIA: ${largestCategory[0]}`
      : "MAIOR CATEGORIA: -";


  doc.text(
    categoryText,
    pageWidth / 2 + 5,
    y + 9
  );


  const average =
    rows.length
      ? (entries + exits) / rows.length
      : 0;


  doc.text(
    `MÉDIA POR LANÇAMENTO: ${formatMoney(average)}`,
    pageWidth / 2 + 5,
    y + 17
  );


  y += 35;


  /* =====================================================
     ANÁLISE POR CATEGORIA
  ===================================================== */

  doc.setTextColor(
    15,
    23,
    42
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(13);

  doc.text(
    "Despesas por categoria",
    16,
    y
  );


  y += 7;


  if (categoryRanking.length === 0) {

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      100,
      116,
      139
    );

    doc.text(
      "Nenhuma despesa registrada neste período.",
      16,
      y + 7
    );

    y += 16;

  } else {

    categoryRanking
      .slice(0, 6)
      .forEach(
        ([name, value]) => {

          const percentage =
            exits > 0
              ? value / exits
              : 0;


          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(8);

          doc.setTextColor(
            51,
            65,
            85
          );

          doc.text(
            String(name).slice(0, 25),
            16,
            y + 5
          );


          doc.text(
            formatMoney(value),
            pageWidth - 16,
            y + 5,
            {
              align: "right"
            }
          );


          const barWidth =
            pageWidth - 80;

          const filled =
            barWidth * percentage;


          doc.setFillColor(
            226,
            232,
            240
          );

          doc.roundedRect(
            55,
            y + 1,
            barWidth,
            4,
            2,
            2,
            "F"
          );


          doc.setFillColor(
            99,
            102,
            241
          );

          if (filled > 0) {

            doc.roundedRect(
              55,
              y + 1,
              Math.max(
                2,
                filled
              ),
              4,
              2,
              2,
              "F"
            );

          }


          doc.setTextColor(
            100,
            116,
            139
          );

          doc.setFontSize(7);

          doc.text(
            `${(percentage * 100).toFixed(1)}%`,
            pageWidth - 16,
            y + 11,
            {
              align: "right"
            }
          );


          y += 15;

        }
      );

  }


  y += 5;


  /* =====================================================
     NOVA PÁGINA — LANÇAMENTOS
  ===================================================== */

  doc.addPage();


  y = 18;


  doc.setFillColor(
    8,
    13,
    30
  );

  doc.rect(
    0,
    0,
    pageWidth,
    28,
    "F"
  );


  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(15);

  doc.text(
    "MEU FINANCEIRO",
    16,
    12
  );


  doc.setFontSize(9);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setTextColor(
    165,
    180,
    252
  );

  doc.text(
    `LANÇAMENTOS — ${monthName.toUpperCase()}`,
    16,
    20
  );


  y = 38;


  /* =====================================================
     TABELA
  ===================================================== */

  const columns = [
    "Data",
    "Tipo",
    "Descrição",
    "Categoria",
    "Conta",
    "Valor",
    "Status"
  ];


  const widths = [
    19,
    17,
    40,
    32,
    28,
    27,
    22
  ];


  function drawTableHeader() {

    let x = 10;

    doc.setFillColor(
      15,
      23,
      42
    );

    doc.rect(
      10,
      y,
      pageWidth - 20,
      9,
      "F"
    );


    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(7);

    doc.setTextColor(
      255,
      255,
      255
    );


    columns.forEach(
      (column, index) => {

        doc.text(
          column.toUpperCase(),
          x + 2,
          y + 6
        );

        x += widths[index];

      }
    );


    y += 9;

  }


  drawTableHeader();


  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);


  if (rows.length === 0) {

    doc.setTextColor(
      100,
      116,
      139
    );

    doc.text(
      "Nenhum lançamento encontrado.",
      14,
      y + 10
    );

  } else {

    rows.forEach(
      (t, index) => {

        if (
          y >
          pageHeight - 20
        ) {

          doc.addPage();

          y = 18;

          drawTableHeader();

        }


        if (index % 2 === 0) {

          doc.setFillColor(
            248,
            250,
            252
          );

          doc.rect(
            10,
            y,
            pageWidth - 20,
            9,
            "F"
          );

        }


        const values = [

          formatDate(
            t.transaction_date
          ),

          t.type === "entrada"
            ? "Entrada"
            : "Saída",

          String(
            t.description || "-"
          ).slice(0, 22),

          String(
            t.categories?.name || "-"
          ).slice(0, 18),

          String(
            t.accounts?.name || "-"
          ).slice(0, 15),

          formatMoney(
            t.amount
          ),

          String(
            t.status || "-"
          ).slice(0, 11)

        ];


        let x = 10;


        values.forEach(
          (value, colIndex) => {

            if (
              colIndex === 5
            ) {

              doc.text(
                value,
                x + widths[colIndex] - 2,
                y + 6,
                {
                  align: "right"
                }
              );

            } else {

              doc.text(
                value,
                x + 2,
                y + 6
              );

            }


            x +=
              widths[colIndex];

          }
        );


        y += 9;

      }
    );

  }


  /* =====================================================
     RODAPÉ EM TODAS AS PÁGINAS
  ===================================================== */

  const totalPages =
    doc.internal.getNumberOfPages();


  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {

    doc.setPage(page);


    doc.setDrawColor(
      226,
      232,
      240
    );

    doc.line(
      12,
      pageHeight - 12,
      pageWidth - 12,
      pageHeight - 12
    );


    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.setTextColor(
      100,
      116,
      139
    );


    doc.text(
      "Meu Financeiro • Relatório gerado automaticamente",
      12,
      pageHeight - 7
    );


    doc.text(
      `Página ${page} de ${totalPages}`,
      pageWidth - 12,
      pageHeight - 7,
      {
        align: "right"
      }
    );

  }


  /* =====================================================
     SALVAR
  ===================================================== */

  doc.save(
    `meu-financeiro-${month}.pdf`
  );

}

/* =========================================================
   NAVEGAÇÃO
========================================================= */

function page(p) {

  document
    .querySelectorAll(".page")
    .forEach(section =>
      section.classList.add("hidden")
    );


  const selected =
    $(p);

  if (selected) {
    selected.classList.remove("hidden");
  }

}

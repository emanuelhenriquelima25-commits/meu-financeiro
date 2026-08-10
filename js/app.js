const sb = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

let user = null;
let cats = [];
let accounts = [];
let cards = [];
let recurring = [];
let goals = [];
let txs = [];

let flowChart = null;
let catChart = null;

const $ = id => document.getElementById(id);

const today = new Date().toISOString().slice(0, 10);
const thisMonth = today.slice(0, 7);

const money = n =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
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


  const JsPDF =
    window.jspdf.jsPDF;

  const doc =
    new JsPDF();


  doc.text(
    "Relatório Financeiro Pessoal",
    14,
    18
  );


  doc.setFontSize(10);


  doc.text(
    `Mês: ${month}`,
    14,
    27
  );


  doc.text(
    `Entradas: ${money(entries)}  Saídas: ${money(exits)}  Resultado: ${money(entries - exits)}`,
    14,
    36
  );


  let y = 47;


  rows.forEach(t => {

    if (y > 285) {

      doc.addPage();

      y = 15;

    }


    doc.text(
      `${t.transaction_date} | ${t.type} | ${String(t.description).slice(0, 25)} | ${money(t.amount)}`,
      14,
      y
    );


    y += 6;

  });


  doc.save(
    `financeiro-${month}.pdf`
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

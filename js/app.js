/*
=========================================================
MEU FINANCEIRO
APP.JS
=========================================================
*/


/* ======================================================
   CONFIGURAÇÃO
====================================================== */

const db = window.db;

if (!db) {
  console.error("Supabase não inicializado.");
}


/* ======================================================
   ESTADO
====================================================== */

let currentUser = null;
let transactions = [];
let accounts = [];
let cards = [];
let goals = [];
let recurring = [];
let categories = [];

let flowChart = null;
let catsChart = null;


/* ======================================================
   HELPERS
====================================================== */

const $ = id => document.getElementById(id);

function money(value) {

  return Number(value || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


function todayISO() {

  return new Date()
    .toISOString()
    .slice(0, 10);

}


function currentMonth() {

  return new Date()
    .toISOString()
    .slice(0, 7);

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function showMessage(id, message, error = false) {

  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.style.color = error ? "#c62828" : "#2e7d32";

}


function showLogin() {

  $("loginView")?.classList.remove("hidden");
  $("app")?.classList.add("hidden");

}


function showApp() {

  $("loginView")?.classList.add("hidden");
  $("app")?.classList.remove("hidden");

}


function getMonthRange(month) {

  const start = `${month}-01`;

  const [year, mon] = month
    .split("-")
    .map(Number);

  const lastDay = new Date(
    year,
    mon,
    0
  ).getDate();

  const end =
    `${month}-${String(lastDay).padStart(2, "0")}`;

  return {
    start,
    end
  };

}


/* ======================================================
   LOGIN
====================================================== */

async function initAuth() {

  if (!db) return;

  try {

    const {
      data,
      error
    } = await db.auth.getSession();

    if (error) {
      console.error(error);
      showLogin();
      return;
    }

    if (data?.session?.user) {

      currentUser =
        data.session.user;

      await enterApplication();

    } else {

      showLogin();

    }

  } catch (error) {

    console.error(
      "Erro ao verificar sessão:",
      error
    );

    showLogin();

  }


  db.auth.onAuthStateChange(
    async (event, session) => {

      console.log(
        "Auth:",
        event
      );

      if (session?.user) {

        currentUser =
          session.user;

        await enterApplication();

      } else {

        currentUser = null;

        showLogin();

      }

    }
  );

}


/* ======================================================
   LOGIN
====================================================== */

async function login(event) {

  event.preventDefault();

  const email =
    $("loginEmail").value.trim();

  const password =
    $("loginPassword").value;

  showMessage(
    "authMsg",
    "Entrando..."
  );

  try {

    const {
      data,
      error
    } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {

      console.error(error);

      showMessage(
        "authMsg",
        traduzAuthError(error),
        true
      );

      return;

    }

    if (!data?.session) {

      showMessage(
        "authMsg",
        "Login realizado, mas a sessão não foi criada.",
        true
      );

      return;

    }

    currentUser =
      data.user;

    await enterApplication();

  } catch (error) {

    console.error(error);

    showMessage(
      "authMsg",
      error.message || "Erro ao entrar.",
      true
    );

  }

}


/* ======================================================
   CADASTRO
====================================================== */

async function signup(event) {

  event.preventDefault();

  const name =
    $("signupName").value.trim();

  const email =
    $("signupEmail").value.trim();

  const password =
    $("signupPassword").value;

  showMessage(
    "authMsg",
    "Criando conta..."
  );

  try {

    const {
      data,
      error
    } = await db.auth.signUp({

      email,
      password,

      options: {
        data: {
          name
        }
      }

    });


    if (error) {

      console.error(error);

      showMessage(
        "authMsg",
        traduzAuthError(error),
        true
      );

      return;

    }


    /*
      Caso a confirmação de e-mail
      esteja desligada no Supabase,
      a sessão já estará disponível.
    */

    if (data?.session) {

      currentUser =
        data.user;

      await enterApplication();

      return;

    }


    showMessage(
      "authMsg",
      "Conta criada. Verifique seu e-mail para confirmar o cadastro."
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "authMsg",
      error.message || "Erro ao criar conta.",
      true
    );

  }

}


/* ======================================================
   TRADUÇÃO DE ERROS DO AUTH
====================================================== */

function traduzAuthError(error) {

  const message =
    String(error?.message || "");

  if (
    message.toLowerCase().includes(
      "invalid login credentials"
    )
  ) {

    return "E-mail ou senha incorretos.";

  }

  if (
    message.toLowerCase().includes(
      "email not confirmed"
    )
  ) {

    return "Seu e-mail ainda não foi confirmado.";

  }

  if (
    message.toLowerCase().includes(
      "user already registered"
    )
  ) {

    return "Este e-mail já está cadastrado.";

  }

  if (
    message.toLowerCase().includes(
      "password should be at least"
    )
  ) {

    return "A senha precisa ter pelo menos 6 caracteres.";

  }

  return message || "Não foi possível realizar a operação.";

}


/* ======================================================
   ENTRAR NA APLICAÇÃO
====================================================== */

async function enterApplication() {

  showApp();

  $("userName").textContent =
    currentUser?.user_metadata?.name ||
    currentUser?.email ||
    "";

  if (!$("dashMonth").value) {
    $("dashMonth").value =
      currentMonth();
  }

  if (!$("reportMonth").value) {
    $("reportMonth").value =
      currentMonth();
  }

  if (!$("txDate").value) {
    $("txDate").value =
      todayISO();
  }

  await loadAll();

}


/* ======================================================
   LOGOUT
====================================================== */

async function logout() {

  try {

    await db.auth.signOut();

    currentUser = null;

    showLogin();

  } catch (error) {

    console.error(
      "Erro ao sair:",
      error
    );

  }

}


/* ======================================================
   LOAD GERAL
====================================================== */

async function loadAll() {

  await Promise.all([
    loadCategories(),
    loadAccounts(),
    loadCards(),
    loadTransactions(),
    loadGoals(),
    loadRecurring()
  ]);

  populateSelects();

  renderTransactions();
  renderAccounts();
  renderCards();
  renderGoals();
  renderRecurring();

  updateDashboard();

}


/* ======================================================
   CATEGORIAS
====================================================== */

async function loadCategories() {

  try {

    const {
      data,
      error
    } = await db
      .from("categories")
      .select("*")
      .order("name");

    if (error) {

      console.warn(
        "Categorias:",
        error.message
      );

      categories = [];

      return;

    }

    categories = data || [];

  } catch (error) {

    console.warn(error);

    categories = [];

  }

}


/* ======================================================
   CONTAS
====================================================== */

async function loadAccounts() {

  const {
    data,
    error
  } = await db
    .from("accounts")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("name");

  if (error) {

    console.error(error);

    accounts = [];

    return;

  }

  accounts = data || [];

}


/* ======================================================
   CARTÕES
====================================================== */

async function loadCards() {

  const {
    data,
    error
  } = await db
    .from("cards")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("name");

  if (error) {

    console.error(error);

    cards = [];

    return;

  }

  cards = data || [];

}


/* ======================================================
   LANÇAMENTOS
====================================================== */

async function loadTransactions() {

  const {
    data,
    error
  } = await db
    .from("transactions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("date", {
      ascending: false
    });

  if (error) {

    console.error(error);

    transactions = [];

    return;

  }

  transactions = data || [];

}


/* ======================================================
   METAS
====================================================== */

async function loadGoals() {

  const {
    data,
    error
  } = await db
    .from("goals")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(error);

    goals = [];

    return;

  }

  goals = data || [];

}


/* ======================================================
   RECORRENTES
====================================================== */

async function loadRecurring() {

  const {
    data,
    error
  } = await db
    .from("recurring")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("description");

  if (error) {

    console.error(error);

    recurring = [];

    return;

  }

  recurring = data || [];

}


/* ======================================================
   SELECTS
====================================================== */

function populateSelects() {

  const catSelect =
    $("txCat");

  const recCat =
    $("recCat");

  const accountSelect =
    $("txAccount");

  const cardSelect =
    $("txCard");


  if (catSelect) {

    catSelect.innerHTML =
      `<option value="">Selecione</option>`;

    categories.forEach(category => {

      catSelect.innerHTML += `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(
            category.name ||
            category.nome ||
            ""
          )}
        </option>
      `;

    });

  }


  if (recCat) {

    recCat.innerHTML =
      `<option value="">Selecione</option>`;

    categories.forEach(category => {

      recCat.innerHTML += `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(
            category.name ||
            category.nome ||
            ""
          )}
        </option>
      `;

    });

  }


  if (accountSelect) {

    accountSelect.innerHTML =
      `<option value="">Selecione</option>`;

    accounts.forEach(account => {

      accountSelect.innerHTML += `
        <option value="${escapeHTML(account.id)}">
          ${escapeHTML(account.name)}
        </option>
      `;

    });

  }


  if (cardSelect) {

    cardSelect.innerHTML =
      `<option value="">Nenhum</option>`;

    cards.forEach(card => {

      cardSelect.innerHTML += `
        <option value="${escapeHTML(card.id)}">
          ${escapeHTML(card.name)}
        </option>
      `;

    });

  }

}


/* ======================================================
   LANÇAMENTO - SALVAR / EDITAR
====================================================== */

async function saveTransaction(event) {

  event.preventDefault();

  if (!currentUser) {

    showMessage(
      "txMsg",
      "Faça login novamente.",
      true
    );

    return;

  }


  const id =
    $("txId").value.trim();


  const payload = {

    user_id:
      currentUser.id,

    type:
      $("txType").value,

    amount:
      Number($("txAmount").value),

    date:
      $("txDate").value,

    category_id:
      $("txCat").value || null,

    account_id:
      $("txAccount").value || null,

    card_id:
      $("txCard").value || null,

    status:
      $("txStatus").value,

    description:
      $("txDesc").value.trim(),

    installments:
      Number($("txInstall").value || 1),

    notes:
      $("txNotes").value.trim()

  };


  if (
    !payload.amount ||
    payload.amount < 0
  ) {

    showMessage(
      "txMsg",
      "Informe um valor válido.",
      true
    );

    return;

  }


  const button =
    $("txSaveButton");

  button.disabled = true;


  try {

    let result;


    if (id) {

      /*
      ================================================
      EDITAR
      ================================================
      */

      result = await db
        .from("transactions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", currentUser.id);


    } else {

      /*
      ================================================
      NOVO
      ================================================
      */

      result = await db
        .from("transactions")
        .insert(payload);

    }


    if (result.error) {

      console.error(
        result.error
      );

      showMessage(
        "txMsg",
        result.error.message,
        true
      );

      return;

    }


    showMessage(
      "txMsg",
      id
        ? "Lançamento atualizado com sucesso!"
        : "Lançamento salvo com sucesso!"
    );


    resetTransactionForm();

    await loadTransactions();

    renderTransactions();

    updateDashboard();


  } catch (error) {

    console.error(error);

    showMessage(
      "txMsg",
      error.message || "Erro ao salvar lançamento.",
      true
    );

  } finally {

    button.disabled = false;

  }

}


/* ======================================================
   EDITAR LANÇAMENTO
====================================================== */

function editTransaction(id) {

  const tx =
    transactions.find(
      item => String(item.id) === String(id)
    );

  if (!tx) {

    alert(
      "Lançamento não encontrado."
    );

    return;

  }


  $("txId").value =
    tx.id;

  $("txType").value =
    tx.type || "saida";

  $("txAmount").value =
    tx.amount ?? "";

  $("txDate").value =
    tx.date || "";

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
    tx.installments || 1;

  $("txNotes").value =
    tx.notes || "";


  $("txSaveButton").textContent =
    "💾 Atualizar lançamento";

  $("txCancelEdit")
    .classList.remove("hidden");


  document
    .getElementById("lancamentos")
    ?.scrollIntoView({
      behavior: "smooth"
    });

}


/* ======================================================
   CANCELAR EDIÇÃO
====================================================== */

function resetTransactionForm() {

  $("txForm").reset();

  $("txId").value = "";

  $("txDate").value =
    todayISO();

  $("txInstall").value =
    1;

  $("txSaveButton").textContent =
    "Salvar lançamento";

  $("txCancelEdit")
    .classList.add("hidden");

}


/* ======================================================
   EXCLUIR LANÇAMENTO
====================================================== */

async function deleteTransaction(id) {

  const tx =
    transactions.find(
      item => String(item.id) === String(id)
    );

  if (!tx) return;


  const confirmed =
    confirm(
      `Excluir o lançamento "${tx.description || ""}" de ${money(tx.amount)}?`
    );


  if (!confirmed) return;


  try {

    const {
      error
    } = await db
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);


    if (error) {

      console.error(error);

      alert(
        "Não foi possível excluir:\n\n" +
        error.message
      );

      return;

    }


    await loadTransactions();

    renderTransactions();

    updateDashboard();

  } catch (error) {

    console.error(error);

    alert(
      "Erro ao excluir lançamento."
    );

  }

}


/* ======================================================
   RENDER LANÇAMENTOS
====================================================== */

function renderTransactions() {

  const body =
    $("txBody");

  if (!body) return;


  if (!transactions.length) {

    body.innerHTML = `
      <tr>
        <td colspan="8">
          Nenhum lançamento encontrado.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    transactions.map(tx => {

      const category =
        categories.find(
          c =>
            String(c.id) ===
            String(tx.category_id)
        );


      const installment =
        tx.installments &&
        Number(tx.installments) > 1
          ? `${tx.installments}x`
          : "1x";


      return `
        <tr>

          <td>
            ${escapeHTML(tx.date)}
          </td>

          <td>
            ${tx.type === "entrada"
              ? "Entrada"
              : "Saída"}
          </td>

          <td>
            ${escapeHTML(
              tx.description
            )}
          </td>

          <td>
            ${escapeHTML(
              category?.name ||
              category?.nome ||
              "-"
            )}
          </td>

          <td>
            ${money(tx.amount)}
          </td>

          <td>
            ${tx.status === "pendente"
              ? "Pendente"
              : "Pago/Recebido"}
          </td>

          <td>
            ${installment}
          </td>

          <td>

            <button
              type="button"
              class="secondary"
              onclick="editTransaction('${tx.id}')"
            >
              ✏️ Editar
            </button>

            <button
              type="button"
              class="danger"
              onclick="deleteTransaction('${tx.id}')"
            >
              🗑️ Excluir
            </button>

          </td>

        </tr>
      `;

    }).join("");

}


/* ======================================================
   CONTAS
====================================================== */

async function saveAccount(event) {

  event.preventDefault();

  try {

    const {
      error
    } = await db
      .from("accounts")
      .insert({

        user_id:
          currentUser.id,

        name:
          $("accountName").value.trim(),

        type:
          $("accountType").value,

        initial_balance:
          Number(
            $("accountInitial").value || 0
          )

      });


    if (error) {

      showMessage(
        "accountMsg",
        error.message,
        true
      );

      return;

    }


    showMessage(
      "accountMsg",
      "Conta cadastrada!"
    );

    $("accountForm").reset();

    $("accountInitial").value =
      "0";

    await loadAccounts();

    populateSelects();

    renderAccounts();

    updateDashboard();


  } catch (error) {

    console.error(error);

  }

}


function renderAccounts() {

  const body =
    $("accountBody");

  if (!body) return;


  body.innerHTML =
    accounts.map(account => {

      const movements =
        transactions
          .filter(
            tx =>
              String(tx.account_id) ===
              String(account.id)
          )
          .reduce(
            (total, tx) => {

              const amount =
                Number(tx.amount || 0);

              return tx.type === "entrada"
                ? total + amount
                : total - amount;

            },
            0
          );


      const initial =
        Number(
          account.initial_balance || 0
        );

      const current =
        initial + movements;


      return `
        <tr>

          <td>
            ${escapeHTML(account.name)}
          </td>

          <td>
            ${escapeHTML(account.type)}
          </td>

          <td>
            ${money(initial)}
          </td>

          <td>
            ${money(movements)}
          </td>

          <td>
            <strong>
              ${money(current)}
            </strong>
          </td>

        </tr>
      `;

    }).join("");

}


/* ======================================================
   CARTÕES
====================================================== */

async function saveCard(event) {

  event.preventDefault();

  try {

    const {
      error
    } = await db
      .from("cards")
      .insert({

        user_id:
          currentUser.id,

        name:
          $("cardName").value.trim(),

        limit:
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


    if (error) {

      showMessage(
        "cardMsg",
        error.message,
        true
      );

      return;

    }


    showMessage(
      "cardMsg",
      "Cartão cadastrado!"
    );

    $("cardForm").reset();

    await loadCards();

    populateSelects();

    renderCards();

    updateDashboard();


  } catch (error) {

    console.error(error);

  }

}


function renderCards() {

  const body =
    $("cardBody");

  if (!body) return;


  body.innerHTML =
    cards.map(card => {

      const used =
        transactions
          .filter(
            tx =>
              String(tx.card_id) ===
              String(card.id) &&
              tx.type === "saida"
          )
          .reduce(
            (sum, tx) =>
              sum +
              Number(tx.amount || 0),
            0
          );


      const limit =
        Number(
          card.limit || 0
        );

      const available =
        limit - used;


      return `
        <tr>

          <td>
            ${escapeHTML(card.name)}
          </td>

          <td>
            ${money(limit)}
          </td>

          <td>
            ${money(used)}
          </td>

          <td>
            ${money(available)}
          </td>

          <td>
            ${escapeHTML(
              card.closing_day ?? "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              card.due_day ?? "-"
            )}
          </td>

        </tr>
      `;

    }).join("");

}


/* ======================================================
   RECORRENTES
====================================================== */

async function saveRecurring(event) {

  event.preventDefault();

  try {

    const {
      error
    } = await db
      .from("recurring")
      .insert({

        user_id:
          currentUser.id,

        description:
          $("recDesc").value.trim(),

        amount:
          Number(
            $("recAmount").value
          ),

        category_id:
          $("recCat").value || null,

        day:
          Number(
            $("recDay").value
          ),

        start_date:
          $("recStart").value,

        end_date:
          $("recEnd").value || null

      });


    if (error) {

      showMessage(
        "recMsg",
        error.message,
        true
      );

      return;

    }


    showMessage(
      "recMsg",
      "Conta recorrente cadastrada!"
    );

    $("recForm").reset();

    await loadRecurring();

    renderRecurring();


  } catch (error) {

    console.error(error);

  }

}


function renderRecurring() {

  const body =
    $("recBody");

  if (!body) return;


  body.innerHTML =
    recurring.map(item => {

      const category =
        categories.find(
          c =>
            String(c.id) ===
            String(item.category_id)
        );


      return `
        <tr>

          <td>
            ${escapeHTML(item.description)}
          </td>

          <td>
            ${money(item.amount)}
          </td>

          <td>
            ${escapeHTML(
              category?.name ||
              category?.nome ||
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(item.day)}
          </td>

          <td>
            ${escapeHTML(item.start_date)}
          </td>

          <td>
            ${escapeHTML(item.end_date || "-")}
          </td>

        </tr>
      `;

    }).join("");

}


/* ======================================================
   METAS
====================================================== */

async function saveGoal(event) {

  event.preventDefault();

  try {

    const {
      error
    } = await db
      .from("goals")
      .insert({

        user_id:
          currentUser.id,

        name:
          $("goalName").value.trim(),

        target:
          Number(
            $("goalTarget").value
          ),

        current:
          Number(
            $("goalCurrent").value || 0
          ),

        target_date:
          $("goalDate").value || null

      });


    if (error) {

      showMessage(
        "goalMsg",
        error.message,
        true
      );

      return;

    }


    showMessage(
      "goalMsg",
      "Meta cadastrada!"
    );

    $("goalForm").reset();

    $("goalCurrent").value =
      "0";

    await loadGoals();

    renderGoals();

    updateDashboard();


  } catch (error) {

    console.error(error);

  }

}


function renderGoals() {

  const container =
    $("goals");

  if (!container) return;


  container.innerHTML =
    goals.map(goal => {

      const target =
        Number(
          goal.target || 0
        );

      const current =
        Number(
          goal.current || 0
        );

      const percentage =
        target > 0
          ? Math.min(
              100,
              (current / target) * 100
            )
          : 0;


      return `
        <div class="card">

          <h3>
            ${escapeHTML(goal.name)}
          </h3>

          <p>
            ${money(current)}
            de
            ${money(target)}
          </p>

          <progress
            value="${percentage}"
            max="100"
            style="width:100%"
          ></progress>

          <strong>
            ${percentage.toFixed(1)}%
          </strong>

          <p>
            Prazo:
            ${escapeHTML(
              goal.target_date || "-"
            )}
          </p>

        </div>
      `;

    }).join("");

}


/* ======================================================
   DASHBOARD
====================================================== */

function updateDashboard() {

  const month =
    $("dashMonth")?.value ||
    currentMonth();

  const filtered =
    transactions.filter(
      tx =>
        String(tx.date || "")
          .startsWith(month)
    );


  const entries =
    filtered
      .filter(
        tx =>
          tx.type === "entrada"
      )
      .reduce(
        (sum, tx) =>
          sum +
          Number(tx.amount || 0),
        0
      );


  const exits =
    filtered
      .filter(
        tx =>
          tx.type === "saida"
      )
      .reduce(
        (sum, tx) =>
          sum +
          Number(tx.amount || 0),
        0
      );


  const result =
    entries - exits;


  const available =
    accounts.reduce(
      (sum, account) => {

        const movement =
          transactions
            .filter(
              tx =>
                String(tx.account_id) ===
                String(account.id)
            )
            .reduce(
              (total, tx) => {

                const value =
                  Number(
                    tx.amount || 0
                  );

                return tx.type === "entrada"
                  ? total + value
                  : total - value;

              },
              0
            );

        return sum +
          Number(
            account.initial_balance || 0
          ) +
          movement;

      },
      0
    );


  $("inTotal").textContent =
    money(entries);

  $("outTotal").textContent =
    money(exits);

  $("result").textContent =
    money(result);

  $("available").textContent =
    money(available);


  renderCharts(filtered);

  renderPending();

  renderCardDashboard();

  renderGoalDashboard();

}


/* ======================================================
   GRÁFICOS
====================================================== */

function renderCharts(data) {

  if (
    typeof Chart === "undefined"
  ) return;


  const flowCanvas =
    $("flow");

  const catsCanvas =
    $("cats");


  if (!flowCanvas || !catsCanvas)
    return;


  const days = {};

  data.forEach(tx => {

    const day =
      String(tx.date)
        .slice(-2);

    if (!days[day]) {

      days[day] = {
        entrada: 0,
        saida: 0
      };

    }


    const amount =
      Number(tx.amount || 0);


    if (tx.type === "entrada")
      days[day].entrada += amount;

    else
      days[day].saida += amount;

  });


  const labels =
    Object.keys(days).sort();


  if (flowChart)
    flowChart.destroy();


  flowChart =
    new Chart(
      flowCanvas,
      {
        type: "line",

        data: {

          labels,

          datasets: [

            {
              label: "Entradas",

              data:
                labels.map(
                  d => days[d].entrada
                )
            },

            {
              label: "Saídas",

              data:
                labels.map(
                  d => days[d].saida
                )
            }

          ]

        },

        options: {
          responsive: true
        }

      }
    );


  const categoriesTotals = {};


  data
    .filter(
      tx =>
        tx.type === "saida"
    )
    .forEach(tx => {

      const category =
        categories.find(
          c =>
            String(c.id) ===
            String(tx.category_id)
        );


      const name =
        category?.name ||
        category?.nome ||
        "Sem categoria";


      categoriesTotals[name] =
        (
          categoriesTotals[name] ||
          0
        ) +
        Number(tx.amount || 0);

    });


  if (catsChart)
    catsChart.destroy();


  catsChart =
    new Chart(
      catsCanvas,
      {
        type: "doughnut",

        data: {

          labels:
            Object.keys(
              categoriesTotals
            ),

          datasets: [
            {
              data:
                Object.values(
                  categoriesTotals
                )
            }
          ]

        },

        options: {
          responsive: true
        }

      }
    );

}


/* ======================================================
   PENDÊNCIAS
====================================================== */

function renderPending() {

  const container =
    $("due");

  if (!container) return;


  const pending =
    transactions.filter(
      tx =>
        tx.status === "pendente"
    );


  if (!pending.length) {

    container.innerHTML =
      "<p>Nenhuma conta pendente.</p>";

    return;

  }


  container.innerHTML =
    pending
      .slice(0, 10)
      .map(
        tx => `
          <p>
            <strong>
              ${escapeHTML(tx.description)}
            </strong>
            <br>
            ${escapeHTML(tx.date)}
            -
            ${money(tx.amount)}
          </p>
        `
      )
      .join("");

}


/* ======================================================
   DASHBOARD CARTÕES
====================================================== */

function renderCardDashboard() {

  const container =
    $("cardDash");

  if (!container) return;


  if (!cards.length) {

    container.innerHTML =
      "<p>Nenhum cartão cadastrado.</p>";

    return;

  }


  container.innerHTML =
    cards.map(card => {

      const used =
        transactions
          .filter(
            tx =>
              String(tx.card_id) ===
              String(card.id) &&
              tx.type === "saida"
          )
          .reduce(
            (sum, tx) =>
              sum +
              Number(tx.amount || 0),
            0
          );


      const limit =
        Number(card.limit || 0);


      return `
        <p>
          <strong>
            ${escapeHTML(card.name)}
          </strong>
          <br>
          Usado:
          ${money(used)}
          /
          ${money(limit)}
        </p>
      `;

    }).join("");

}


/* ======================================================
   DASHBOARD METAS
====================================================== */

function renderGoalDashboard() {

  const container =
    $("goalDash");

  if (!container) return;


  if (!goals.length) {

    container.innerHTML =
      "<p>Nenhuma meta cadastrada.</p>";

    return;

  }


  container.innerHTML =
    goals
      .slice(0, 5)
      .map(goal => {

        const target =
          Number(
            goal.target || 0
          );

        const current =
          Number(
            goal.current || 0
          );

        const percent =
          target > 0
            ? Math.min(
                100,
                current / target * 100
              )
            : 0;


        return `
          <p>
            <strong>
              ${escapeHTML(goal.name)}
            </strong>
            <br>
            ${percent.toFixed(0)}%
          </p>
        `;

      })
      .join("");

}


/* ======================================================
   RELATÓRIO
====================================================== */

function renderReport() {

  const month =
    $("reportMonth").value ||
    currentMonth();


  const filtered =
    transactions.filter(
      tx =>
        String(tx.date || "")
          .startsWith(month)
    );


  const body =
    $("reportBody");

  if (!body) return;


  body.innerHTML =
    filtered.map(tx => {

      const category =
        categories.find(
          c =>
            String(c.id) ===
            String(tx.category_id)
        );


      return `
        <tr>

          <td>
            ${escapeHTML(tx.date)}
          </td>

          <td>
            ${tx.type === "entrada"
              ? "Entrada"
              : "Saída"}
          </td>

          <td>
            ${escapeHTML(tx.description)}
          </td>

          <td>
            ${escapeHTML(
              category?.name ||
              category?.nome ||
              "-"
            )}
          </td>

          <td>
            ${money(tx.amount)}
          </td>

          <td>
            ${escapeHTML(tx.status)}
          </td>

        </tr>
      `;

    }).join("");


  const entries =
    filtered
      .filter(
        tx =>
          tx.type === "entrada"
      )
      .reduce(
        (sum, tx) =>
          sum +
          Number(tx.amount || 0),
        0
      );


  const exits =
    filtered
      .filter(
        tx =>
          tx.type === "saida"
      )
      .reduce(
        (sum, tx) =>
          sum +
          Number(tx.amount || 0),
        0
      );


  $("summary").innerHTML = `
    <p>
      <strong>Entradas:</strong>
      ${money(entries)}
    </p>

    <p>
      <strong>Saídas:</strong>
      ${money(exits)}
    </p>

    <p>
      <strong>Resultado:</strong>
      ${money(entries - exits)}
    </p>
  `;

}


/* ======================================================
   EXPORTAR EXCEL
====================================================== */

function exportExcel() {

  if (
    typeof XLSX === "undefined"
  ) {

    alert(
      "Biblioteca Excel não carregada."
    );

    return;

  }


  const month =
    $("reportMonth").value ||
    currentMonth();


  const data =
    transactions
      .filter(
        tx =>
          String(tx.date || "")
            .startsWith(month)
      )
      .map(tx => {

        const category =
          categories.find(
            c =>
              String(c.id) ===
              String(tx.category_id)
          );


        return {

          Data:
            tx.date,

          Tipo:
            tx.type,

          Descrição:
            tx.description,

          Categoria:
            category?.name ||
            category?.nome ||
            "",

          Valor:
            Number(tx.amount || 0),

          Status:
            tx.status

        };

      });


  const worksheet =
    XLSX.utils.json_to_sheet(data);


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


/* ======================================================
   PDF
====================================================== */

function exportPDF() {

  if (
    !window.jspdf?.jsPDF
  ) {

    alert(
      "Biblioteca PDF não carregada."
    );

    return;

  }


  const month =
    $("reportMonth").value ||
    currentMonth();


  const filtered =
    transactions.filter(
      tx =>
        String(tx.date || "")
          .startsWith(month)
    );


  const {
    jsPDF
  } = window.jspdf;


  const doc =
    new jsPDF();


  doc.setFontSize(18);

  doc.text(
    "Meu Financeiro",
    20,
    20
  );


  doc.setFontSize(11);

  doc.text(
    `Relatório: ${month}`,
    20,
    30
  );


  let y = 45;


  filtered.forEach(tx => {

    const line =
      `${tx.date} | ${tx.type} | ${tx.description} | ${money(tx.amount)}`;

    doc.text(
      line.substring(0, 110),
      20,
      y
    );

    y += 7;


    if (y > 280) {

      doc.addPage();

      y = 20;

    }

  });


  doc.save(
    `financeiro-${month}.pdf`
  );

}


/* ======================================================
   NAVEGAÇÃO
====================================================== */

function setupNavigation() {

  document
    .querySelectorAll(
      "nav button[data-page]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const page =
            button.dataset.page;


          document
            .querySelectorAll(".page")
            .forEach(section => {

              section.classList.add(
                "hidden"
              );

            });


          $(page)
            ?.classList
            .remove("hidden");


          if (page === "dashboard") {

            updateDashboard();

          }


          if (page === "relatorios") {

            renderReport();

          }

        }
      );

    });

}


/* ======================================================
   EVENTOS
====================================================== */

function setupEvents() {

  $("loginForm")
    ?.addEventListener(
      "submit",
      login
    );


  $("signupForm")
    ?.addEventListener(
      "submit",
      signup
    );


  $("logout")
    ?.addEventListener(
      "click",
      logout
    );


  $("txForm")
    ?.addEventListener(
      "submit",
      saveTransaction
    );


  $("txCancelEdit")
    ?.addEventListener(
      "click",
      resetTransactionForm
    );


  $("cardForm")
    ?.addEventListener(
      "submit",
      saveCard
    );


  $("recForm")
    ?.addEventListener(
      "submit",
      saveRecurring
    );


  $("goalForm")
    ?.addEventListener(
      "submit",
      saveGoal
    );


  $("accountForm")
    ?.addEventListener(
      "submit",
      saveAccount
    );


  $("dashMonth")
    ?.addEventListener(
      "change",
      updateDashboard
    );


  $("reportMonth")
    ?.addEventListener(
      "change",
      renderReport
    );


  $("excel")
    ?.addEventListener(
      "click",
      exportExcel
    );


  $("pdf")
    ?.addEventListener(
      "click",
      exportPDF
    );


  setupNavigation();

}


/* ======================================================
   INICIALIZAÇÃO
====================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupEvents();

    if (!db) {

      showMessage(
        "authMsg",
        "Erro: configuração do Supabase não carregada.",
        true
      );

      return;

    }

    await initAuth();

  }
);


/* ======================================================
   FUNÇÕES GLOBAIS DOS BOTÕES
====================================================== */

window.editTransaction =
  editTransaction;

window.deleteTransaction =
  deleteTransaction;

window.resetTransactionForm =
  resetTransactionForm;

import { api } from "./api.js";
import {
  badgeClass,
  badgeLabel,
  drawLineChart,
  escapeHtml,
  formatCurrency,
  formatDate,
  parseHashRoute,
  starRow,
  toneOptions,
  truncate,
} from "./utils.js";

const appRoot = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");

const state = {
  authMode: "login",
  route: "dashboard",
  query: new URLSearchParams(),
  user: null,
  dashboard: null,
  reviews: [],
  settings: null,
  agency: null,
  subscription: null,
  googleConnection: null,
  integrations: null,
  reviewsFilter: {
    status: "all",
    sort: "newest",
    search: "",
  },
  modal: null,
  busy: {},
};

function setBusy(key, value) {
  if (value) {
    state.busy[key] = true;
  } else {
    delete state.busy[key];
  }
  render();
}

function showToast(message, variant = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = message;
  toastRoot.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 220);
  }, 3000);
}

function updateRouteFromHash() {
  const { route, params } = parseHashRoute(window.location.hash);
  state.route = route;
  state.query = params;
}

function navigate(route) {
  window.location.hash = route;
}

async function bootstrapSession() {
  try {
    const payload = await api("/api/bootstrap");
    Object.assign(state, payload);
    if (!window.location.hash) {
      navigate("dashboard");
    } else {
      updateRouteFromHash();
    }
    handleHashFlags();
  } catch (error) {
    if (error.status !== 401) {
      showToast(error.message, "error");
    }
  }
  render();
}

function handleHashFlags() {
  if (state.query.get("google-connected")) {
    showToast("Conta Google conectada com sucesso.");
  }
  if (state.query.get("google-auth")) {
    showToast("Login com Google concluido.");
  }
}

async function refreshBootstrap() {
  const payload = await api("/api/bootstrap");
  Object.assign(state, payload);
  render();
}

function getPendingReviewsCount() {
  return state.reviews.filter((review) => review.status === "pending").length;
}

function getSelectedReview() {
  if (!state.modal || state.modal.type !== "review") {
    return null;
  }
  return state.reviews.find((review) => review.id === state.modal.reviewId) || null;
}

function getSelectedLocationTitles() {
  if (!state.googleConnection) {
    return [];
  }
  return (state.googleConnection.availableLocations || [])
    .filter((location) => state.googleConnection.selectedLocationIds?.includes(location.id))
    .map((location) => location.title);
}

function renderAuthView() {
  const isLogin = state.authMode === "login";
  return `
    <section class="auth-shell">
      <div class="auth-brand">
        <div class="brand-mark">RB</div>
        <div>
          <p class="eyebrow">MVP SaaS</p>
          <h1>Reputation Boost IA</h1>
          <p class="auth-copy">
            Automatize respostas a reviews, acompanhe reputacao em tempo real e mantenha a voz da marca consistente em cada localidade.
          </p>
        </div>
        <div class="auth-feature-list">
          <article class="feature-chip">
            <span>01</span>
            <div>
              <strong>Respostas com IA</strong>
              <p>Gere respostas com contexto, tom de voz e SEO local.</p>
            </div>
          </article>
          <article class="feature-chip">
            <span>02</span>
            <div>
              <strong>Google Business Profile</strong>
              <p>Conecte locais, centralize reviews e publique replies.</p>
            </div>
          </article>
          <article class="feature-chip">
            <span>03</span>
            <div>
              <strong>Modo Agencia</strong>
              <p>Gerencie varias contas com configuracoes e cobranca centralizadas.</p>
            </div>
          </article>
        </div>
      </div>
      <div class="auth-panel">
        <div class="auth-tabs">
          <button class="${isLogin ? "active" : ""}" data-action="switch-auth" data-mode="login">Login</button>
          <button class="${!isLogin ? "active" : ""}" data-action="switch-auth" data-mode="register">Cadastro</button>
        </div>
        <div class="auth-card">
          <h2>${isLogin ? "Entre na sua conta" : "Crie sua conta MVP"}</h2>
          <p class="muted">
            ${isLogin ? "Acesse seu painel para revisar avaliacoes e configurar a IA." : "Comece com e-mail e senha ou use o fluxo rapido via Google."}
          </p>
          <button class="button ghost full" data-action="auth-google">
            Continuar com Google
          </button>
          <div class="divider"><span>ou</span></div>
          <form id="${isLogin ? "login-form" : "register-form"}" class="stack-form">
            ${
              isLogin
                ? ""
                : `
                  <label>
                    <span>Nome</span>
                    <input name="name" type="text" placeholder="Seu nome" required />
                  </label>
                `
            }
            <label>
              <span>E-mail</span>
              <input name="email" type="email" placeholder="[email protected]" required />
            </label>
            <label>
              <span>Senha</span>
              <input name="password" type="password" placeholder="Minimo de 8 caracteres" required />
            </label>
            <button class="button primary full" type="submit">
              ${isLogin ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <button class="text-button" data-action="forgot-password">
            Esqueceu a senha?
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderSidebar() {
  const items = [
    ["dashboard", "Dashboard"],
    ["reviews", "Reviews"],
    ["settings", "Settings"],
    ["agency", "Agency Mode"],
    ["billing", "Billing"],
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo">RB</div>
        <div>
          <strong>Reputation</strong>
          <span>Boost IA</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${items
          .map(
            ([route, label]) => `
              <button class="nav-item ${state.route === route ? "active" : ""}" data-route="${route}">
                <span class="nav-dot"></span>
                ${label}
              </button>
            `,
          )
          .join("")}
      </nav>
      <div class="sidebar-cta">
        <p class="eyebrow">Agency Mode</p>
        <strong>Escala para multiplos clientes</strong>
        <p>Mantenha reputacao, IA e faturamento sob o mesmo painel.</p>
        <button class="button primary full" data-route="agency">Abrir painel</button>
      </div>
      <div class="sidebar-user">
        <div class="user-avatar">${escapeHtml((state.user?.name || "U").slice(0, 2).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(state.user?.name || "")}</strong>
          <p>${escapeHtml(state.user?.email || "")}</p>
        </div>
        <button class="icon-button" data-action="logout" title="Sair">Sair</button>
      </div>
    </aside>
  `;
}

function renderTopBar() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Gestao de reputacao automatizada</p>
        <h1>${state.route === "dashboard" ? "Dashboard" : state.route === "reviews" ? "Reviews" : state.route === "settings" ? "Settings" : state.route === "agency" ? "Agency Mode" : "Billing"}</h1>
      </div>
      <div class="topbar-actions">
        <span class="notification-pill">${state.dashboard?.pendingReviews || 0} pendentes</span>
        <button class="button ghost" data-action="view-pending">Ver pendentes</button>
        <button class="button ghost topbar-logout" data-action="logout">Sair</button>
      </div>
    </header>
  `;
}

function renderDashboard() {
  const dashboard = state.dashboard;
  if (!dashboard) {
    return `<div class="empty-state">Carregando dashboard...</div>`;
  }

  return `
    <section class="page-grid dashboard-grid">
      <article class="hero-panel">
        <div>
          <p class="eyebrow">Visao geral da reputacao</p>
          <h2>${escapeHtml(dashboard.businessName)}</h2>
          <p class="muted">Acompanhe volume de reviews, media de estrelas e produtividade da automacao.</p>
        </div>
        <div class="hero-actions">
          <button class="button primary" data-action="start-google-connect">
            ${dashboard.googleConnected ? "Gerenciar Google" : "Conectar Google Meu Negocio"}
          </button>
          <button class="button ghost" data-route="reviews">Ver avaliacoes pendentes</button>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-title">Average Rating</span>
        <strong>${dashboard.averageRating}</strong>
        <div class="stars-row">${starRow(dashboard.averageRating)}</div>
        <p>Baseado em ${dashboard.totalReviews} reviews</p>
      </article>
      <article class="metric-card">
        <span class="metric-title">Total Reviews</span>
        <strong>${dashboard.totalReviews}</strong>
        <p class="positive">+${dashboard.reviewGrowthRate}% nos ultimos 30 dias</p>
      </article>
      <article class="metric-card">
        <span class="metric-title">New Reviews</span>
        <strong>${dashboard.newReviewsLast30Days}</strong>
        <p>${dashboard.pendingReviews} aguardando resposta</p>
      </article>
      <article class="panel chart-panel">
        <div class="panel-head">
          <div>
            <h3>Total Reviews Over Time</h3>
            <p>Evolucao das avaliacoes no periodo recente.</p>
          </div>
          <span class="soft-pill">Last 30 Days</span>
        </div>
        ${drawLineChart(dashboard.trendSeries)}
      </article>
      <article class="panel reviews-panel">
        <div class="panel-head">
          <div>
            <h3>Recent Google Reviews</h3>
            <p>Ultimas interacoes para revisar ou celebrar.</p>
          </div>
          <button class="text-button" data-route="reviews">View All Reviews</button>
        </div>
        <div class="review-feed">
          ${dashboard.recentReviews
            .map(
              (review) => `
                <button class="feed-item" data-action="open-review" data-review-id="${review.id}">
                  <span class="avatar-circle">${escapeHtml(review.customerInitials)}</span>
                  <div class="feed-copy">
                    <div class="feed-line">
                      <strong>${escapeHtml(review.customerName)}</strong>
                      <span>${formatDate(review.date)}</span>
                    </div>
                    <div class="stars-row small">${starRow(review.rating)}</div>
                    <p>${escapeHtml(truncate(review.comment, 112))}</p>
                  </div>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
      <article class="insights-strip">
        <div>
          <strong>${dashboard.positiveReviewRate}%</strong>
          <span>Positive Reviews</span>
        </div>
        <div>
          <strong>${dashboard.reviewGrowthRate}%</strong>
          <span>Growth in Reviews</span>
        </div>
        <div>
          <strong>${dashboard.averageResponseHours}h</strong>
          <span>Avg. Response Time</span>
        </div>
        <div>
          <strong>${dashboard.reviewRequestsSent}</strong>
          <span>Review Requests Sent</span>
        </div>
      </article>
    </section>
  `;
}

function renderReviewsPage() {
  return `
    <section class="page-grid">
      <article class="panel filters-panel">
        <form id="reviews-filter-form" class="filters-form">
          <input
            type="search"
            name="search"
            value="${escapeHtml(state.reviewsFilter.search)}"
            placeholder="Buscar por cliente ou texto"
          />
          <select name="status">
            <option value="all" ${state.reviewsFilter.status === "all" ? "selected" : ""}>Todos os status</option>
            <option value="pending" ${state.reviewsFilter.status === "pending" ? "selected" : ""}>Pendentes</option>
            <option value="responded" ${state.reviewsFilter.status === "responded" ? "selected" : ""}>Respondidas</option>
            <option value="edited" ${state.reviewsFilter.status === "edited" ? "selected" : ""}>Editadas</option>
          </select>
          <select name="sort">
            <option value="newest" ${state.reviewsFilter.sort === "newest" ? "selected" : ""}>Mais recentes</option>
            <option value="oldest" ${state.reviewsFilter.sort === "oldest" ? "selected" : ""}>Mais antigas</option>
            <option value="highest" ${state.reviewsFilter.sort === "highest" ? "selected" : ""}>Maior nota</option>
            <option value="lowest" ${state.reviewsFilter.sort === "lowest" ? "selected" : ""}>Menor nota</option>
          </select>
          <button class="button primary" type="submit">Aplicar</button>
        </form>
      </article>
      <article class="reviews-list">
        ${state.reviews
          .map(
            (review) => `
              <div class="review-row">
                <div class="review-identity">
                  <span class="avatar-circle">${escapeHtml(review.customerInitials)}</span>
                  <div>
                    <strong>${escapeHtml(review.customerName)}</strong>
                    <span>${formatDate(review.date)} • ${escapeHtml(review.locationTitle)}</span>
                  </div>
                </div>
                <div class="review-content">
                  <div class="stars-row small">${starRow(review.rating)}</div>
                  <p>${escapeHtml(truncate(review.comment, 150))}</p>
                </div>
                <div class="review-status">
                  <span class="status-badge ${badgeClass(review.status)}">${badgeLabel(review.status)}</span>
                </div>
                <div class="review-actions">
                  <button class="button primary small" data-action="open-review" data-review-id="${review.id}">
                    ${review.status === "pending" ? "Responder" : "Ver resposta"}
                  </button>
                </div>
              </div>
            `,
          )
          .join("")}
      </article>
    </section>
  `;
}

function renderSettingsPage() {
  const keywords = state.settings?.seoKeywords || [];
  const selectedLocations = getSelectedLocationTitles();
  const googleConnected = state.googleConnection?.status === "connected";

  return `
    <section class="page-grid settings-grid">
      <article class="panel setting-band">
        <div>
          <p class="eyebrow">Conexao Google Business Profile</p>
          <h3>${googleConnected ? "Conta conectada" : "Conectar Google Meu Negocio"}</h3>
          <p>
            ${
              googleConnected
                ? `Localidades ativas: ${escapeHtml(selectedLocations.join(", ") || "Nenhuma selecionada")}.`
                : "Ative o fluxo guiado para autorizar acesso e escolher quais localidades o MVP vai gerenciar."
            }
          </p>
        </div>
        <button class="button primary" data-action="start-google-connect">
          ${googleConnected ? "Gerenciar locais" : "Iniciar conexao"}
        </button>
      </article>
      <form id="settings-form" class="settings-stack">
        <article class="panel setting-card">
          <div>
            <p class="eyebrow">Auto-Pilot Mode</p>
            <h3>Ativar Resposta Automatica com IA</h3>
            <p>Permita que a IA gere respostas sugeridas e acelere a operacao da equipe.</p>
          </div>
          <label class="toggle-row">
            <input type="checkbox" name="autoPilotEnabled" ${state.settings?.autoPilotEnabled ? "checked" : ""} />
            <span class="toggle-switch"></span>
            <span>${state.settings?.autoPilotEnabled ? "Auto-pilot ON" : "Auto-pilot OFF"}</span>
          </label>
        </article>
        <article class="panel setting-card split">
          <div>
            <p class="eyebrow">AI Tone</p>
            <h3>Tom de voz</h3>
            <p>Escolha como a IA responde aos clientes nas avaliacoes.</p>
          </div>
          <label>
            <span>Tom preferencial</span>
            <select name="tone">
              ${toneOptions
                .map(
                  (tone) => `
                    <option value="${tone}" ${state.settings?.tone === tone ? "selected" : ""}>${tone}</option>
                  `,
                )
                .join("")}
            </select>
          </label>
        </article>
        <article class="panel setting-card split">
          <div>
            <p class="eyebrow">Custom Instructions</p>
            <h3>Diretrizes adicionais</h3>
            <p>Defina instrucoes livres para alinhar contexto, promessa de marca e postura da resposta.</p>
          </div>
          <label>
            <span>Instrucoes</span>
            <textarea name="customInstructions" rows="5" maxlength="500">${escapeHtml(state.settings?.customInstructions || "")}</textarea>
          </label>
        </article>
        <article class="panel setting-card split">
          <div>
            <p class="eyebrow">Local SEO Keywords</p>
            <h3>Palavras-chave de SEO local</h3>
            <p>Inclua termos que ajudem as respostas a reforcar a presenca local da marca.</p>
          </div>
          <div class="keywords-editor">
            <label>
              <span>Palavras-chave</span>
              <input
                name="seoKeywords"
                type="text"
                value="${escapeHtml(keywords.join(", "))}"
                placeholder="Ex.: dentist near me, family dental care"
              />
            </label>
            <div class="keywords-list">
              ${keywords.map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`).join("")}
            </div>
          </div>
        </article>
        <div class="form-actions">
          <button class="button primary" type="submit">Salvar configuracoes</button>
        </div>
      </form>
    </section>
  `;
}

function renderAgencyPage() {
  return `
    <section class="page-grid">
      <article class="hero-panel">
        <div>
          <p class="eyebrow">White label basico</p>
          <h2>Gerencie clientes com faturamento centralizado</h2>
          <p class="muted">Adicione subcontas, acompanhe status operacional e mantenha a configuracao de IA em um unico lugar.</p>
        </div>
        <div class="hero-actions">
          <button class="button primary" data-action="open-add-client">Adicionar novo cliente</button>
        </div>
      </article>
      <article class="panel agency-table">
        <div class="panel-head">
          <div>
            <h3>Painel de clientes</h3>
            <p>${state.agency?.clients?.length || 0} contas gerenciadas</p>
          </div>
        </div>
        ${(state.agency?.clients || [])
          .map(
            (client) => `
              <div class="table-row">
                <strong>${escapeHtml(client.businessName)}</strong>
                <span>${escapeHtml(client.status)}</span>
                <span>${client.locations} locais</span>
                <span>${client.averageRating.toFixed(1)} estrelas</span>
                <span>${client.autopilotEnabled ? "IA ativa" : "IA desativada"}</span>
              </div>
            `,
          )
          .join("")}
      </article>
    </section>
  `;
}

function renderBillingPage() {
  const subscription = state.subscription;
  return `
    <section class="page-grid billing-grid">
      <article class="panel billing-hero">
        <div>
          <p class="eyebrow">Gerenciamento de assinatura</p>
          <h2>${escapeHtml(subscription?.planName || "Growth")} Plan</h2>
          <p>Status atual: <strong>${escapeHtml(subscription?.status || "-")}</strong></p>
          <p>Proxima cobranca: ${formatDate(subscription?.nextBillingDate)}</p>
        </div>
        <div class="billing-price">
          <strong>${formatCurrency(subscription?.monthlyPrice, subscription?.currency)}</strong>
          <span>/ mes</span>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Acoes</h3>
            <p>Abra o portal do provedor ou agende o cancelamento.</p>
          </div>
        </div>
        <div class="button-row">
          <button class="button primary" data-action="open-billing-portal">Abrir portal de cobranca</button>
          <button class="button danger" data-action="cancel-subscription">Cancelar assinatura</button>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Historico de pagamentos</h3>
            <p>Ultimas faturas processadas.</p>
          </div>
        </div>
        <div class="invoice-list">
          ${(subscription?.invoices || [])
            .map(
              (invoice) => `
                <div class="invoice-row">
                  <div>
                    <strong>${escapeHtml(invoice.label)}</strong>
                    <span>${formatDate(invoice.paidAt)}</span>
                  </div>
                  <span>${escapeHtml(invoice.status)}</span>
                  <strong>${formatCurrency(invoice.amount, subscription?.currency)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderCurrentPage() {
  if (state.route === "reviews") return renderReviewsPage();
  if (state.route === "settings") return renderSettingsPage();
  if (state.route === "agency") return renderAgencyPage();
  if (state.route === "billing") return renderBillingPage();
  return renderDashboard();
}

function renderAppShell() {
  return `
    <div class="layout-shell">
      ${renderSidebar()}
      <main class="content-shell">
        ${renderTopBar()}
        ${renderCurrentPage()}
      </main>
    </div>
  `;
}

function renderReviewModal() {
  const review = getSelectedReview();
  if (!review) {
    return "";
  }

  const draftReply = state.modal?.draftReply ?? review.draftReply ?? review.aiSuggestedReply ?? "";

  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal-card large" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Review Detail</p>
            <h3>${escapeHtml(review.customerName)}</h3>
          </div>
          <button class="icon-button" data-action="close-modal">Fechar</button>
        </div>
        <div class="review-modal-body">
          <section class="review-source-card">
            <div class="review-identity">
              <span class="avatar-circle">${escapeHtml(review.customerInitials)}</span>
              <div>
                <strong>${escapeHtml(review.customerName)}</strong>
                <span>${formatDate(review.date)} • ${escapeHtml(review.locationTitle)}</span>
              </div>
            </div>
            <div class="stars-row small">${starRow(review.rating)}</div>
            <p>${escapeHtml(review.comment)}</p>
          </section>
          <section class="reply-editor-card">
            <div class="panel-head">
              <div>
                <h4>Resposta sugerida</h4>
                <p>Edite antes de publicar se desejar.</p>
              </div>
              <button class="button ghost small" data-action="generate-reply">Gerar novamente</button>
            </div>
            <textarea id="review-draft-reply" rows="8">${escapeHtml(draftReply)}</textarea>
            <div class="modal-actions">
              <button class="button ghost" data-action="discard-reply">Descartar</button>
              <button class="button primary" data-action="publish-reply">Publicar resposta</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderGoogleModal() {
  const modal = state.modal;
  if (!modal || modal.type !== "google-connect") {
    return "";
  }

  const locations = modal.availableLocations || [];
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Conexao Google</p>
            <h3>Selecione as localidades</h3>
          </div>
          <button class="icon-button" data-action="close-modal">Fechar</button>
        </div>
        <p class="muted">${escapeHtml(modal.message || "Escolha as localidades que devem ser gerenciadas no MVP.")}</p>
        <form id="google-location-form" class="location-list">
          ${locations
            .map(
              (location) => `
                <label class="location-item">
                  <input
                    type="checkbox"
                    name="selectedLocationIds"
                    value="${location.id}"
                    ${modal.selectedLocationIds?.includes(location.id) ? "checked" : ""}
                  />
                  <div>
                    <strong>${escapeHtml(location.title)}</strong>
                    <span>${escapeHtml(location.address)}</span>
                  </div>
                </label>
              `,
            )
            .join("")}
          <button class="button primary full" type="submit">Salvar localidades</button>
        </form>
      </div>
    </div>
  `;
}

function renderAgencyModal() {
  if (!state.modal || state.modal.type !== "add-client") {
    return "";
  }
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Modo Agencia</p>
            <h3>Adicionar novo cliente</h3>
          </div>
          <button class="icon-button" data-action="close-modal">Fechar</button>
        </div>
        <form id="client-form" class="stack-form">
          <label>
            <span>Nome do negocio</span>
            <input name="businessName" required placeholder="Ex.: Bella Skin Studio" />
          </label>
          <label>
            <span>Status</span>
            <input name="status" placeholder="Onboarding" />
          </label>
          <label>
            <span>Media de estrelas</span>
            <input name="averageRating" type="number" min="0" max="5" step="0.1" value="4.8" />
          </label>
          <label>
            <span>Numero de localidades</span>
            <input name="locations" type="number" min="1" value="1" />
          </label>
          <label class="checkbox-inline">
            <input name="autopilotEnabled" type="checkbox" checked />
            <span>Ativar IA por padrao</span>
          </label>
          <button class="button primary full" type="submit">Adicionar cliente</button>
        </form>
      </div>
    </div>
  `;
}

function renderModal() {
  if (!state.modal) {
    modalRoot.innerHTML = "";
    return;
  }
  if (state.modal.type === "review") {
    modalRoot.innerHTML = renderReviewModal();
    return;
  }
  if (state.modal.type === "google-connect") {
    modalRoot.innerHTML = renderGoogleModal();
    return;
  }
  if (state.modal.type === "add-client") {
    modalRoot.innerHTML = renderAgencyModal();
    return;
  }
}

function render() {
  appRoot.innerHTML = state.user ? renderAppShell() : renderAuthView();
  renderModal();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  if (!form) return;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const endpoint = state.authMode === "login" ? "/api/auth/login" : "/api/auth/register";
  setBusy("auth", true);
  try {
    await api(endpoint, { method: "POST", body: payload });
    await bootstrapSession();
    showToast(state.authMode === "login" ? "Login efetuado." : "Conta criada com sucesso.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy("auth", false);
  }
}

async function openGoogleAuth() {
  setBusy("google-auth", true);
  try {
    const payload = await api("/api/auth/google", {
      method: "POST",
      body: {
        name: "Google Demo User",
        email: "google-demo@reputationboost.local",
      },
    });

    if (payload.authorizationUrl) {
      window.location.href = payload.authorizationUrl;
      return;
    }

    await bootstrapSession();
    showToast(payload.message || "Login Google concluido.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy("google-auth", false);
  }
}

async function startGoogleConnectionFlow() {
  setBusy("google-connect", true);
  try {
    const payload = await api("/api/google/connect/start", { method: "POST" });
    if (payload.mode === "oauth" && payload.authorizationUrl) {
      window.location.href = payload.authorizationUrl;
      return;
    }
    state.modal = {
      type: "google-connect",
      mode: payload.mode,
      message: payload.message,
      availableLocations: payload.availableLocations || [],
      selectedLocationIds: [...(state.googleConnection?.selectedLocationIds || [])],
    };
    render();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy("google-connect", false);
  }
}

async function saveGoogleLocations(event) {
  event.preventDefault();
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  if (!form) return;
  const formData = new FormData(form);
  const selectedLocationIds = formData.getAll("selectedLocationIds");

  try {
    await api("/api/google/connect/complete", {
      method: "POST",
      body: {
        mode: state.modal?.mode || "demo",
        selectedLocationIds,
      },
    });
    state.modal = null;
    await refreshBootstrap();
    showToast("Localidades salvas com sucesso.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function submitSettings(event) {
  event.preventDefault();
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  if (!form) return;
  const formData = new FormData(form);
  const seoKeywords = String(formData.get("seoKeywords") || "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  try {
    await api("/api/settings", {
      method: "PUT",
      body: {
        autoPilotEnabled: formData.get("autoPilotEnabled") === "on",
        tone: formData.get("tone"),
        customInstructions: formData.get("customInstructions"),
        seoKeywords,
      },
    });
    await refreshBootstrap();
    showToast("Configuracoes salvas.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function submitReviewsFilter(event) {
  event.preventDefault();
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  if (!form) return;
  const formData = new FormData(form);
  state.reviewsFilter = {
    status: String(formData.get("status") || "all"),
    sort: String(formData.get("sort") || "newest"),
    search: String(formData.get("search") || ""),
  };
  try {
    state.reviews = await api(
      `/api/reviews?status=${encodeURIComponent(state.reviewsFilter.status)}&sort=${encodeURIComponent(
        state.reviewsFilter.sort,
      )}&search=${encodeURIComponent(state.reviewsFilter.search)}`,
    );
    render();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function openReviewModal(reviewId) {
  const review = state.reviews.find((item) => item.id === reviewId);
  if (!review) {
    return;
  }
  state.modal = {
    type: "review",
    reviewId,
    draftReply: review.draftReply || review.aiSuggestedReply || "",
  };
  render();
}

async function regenerateReply() {
  const review = getSelectedReview();
  if (!review) {
    return;
  }
  setBusy("generate-reply", true);
  try {
    const updatedReview = await api(`/api/reviews/${review.id}/generate`, { method: "POST" });
    state.reviews = state.reviews.map((item) => (item.id === review.id ? updatedReview : item));
    state.modal.draftReply = updatedReview.draftReply;
    render();
    showToast("Resposta sugerida atualizada.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy("generate-reply", false);
  }
}

async function publishCurrentReply() {
  const review = getSelectedReview();
  const draftReply = document.querySelector("#review-draft-reply")?.value || "";
  if (!review) {
    return;
  }
  setBusy("publish-reply", true);
  try {
    await api(`/api/reviews/${review.id}/reply`, {
      method: "PUT",
      body: { draftReply },
    });
    const updatedReview = await api(`/api/reviews/${review.id}/publish`, {
      method: "POST",
      body: { draftReply },
    });
    state.reviews = state.reviews.map((item) => (item.id === review.id ? updatedReview : item));
    state.modal = null;
    await refreshBootstrap();
    showToast("Resposta publicada.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy("publish-reply", false);
  }
}

async function discardCurrentReply() {
  const review = getSelectedReview();
  if (!review) {
    return;
  }
  try {
    await api(`/api/reviews/${review.id}/discard`, { method: "POST" });
    state.modal = null;
    await refreshBootstrap();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function submitClientForm(event) {
  event.preventDefault();
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  if (!form) return;
  const formData = new FormData(form);
  try {
    await api("/api/agency/clients", {
      method: "POST",
      body: {
        businessName: formData.get("businessName"),
        status: formData.get("status"),
        averageRating: Number(formData.get("averageRating") || 0),
        locations: Number(formData.get("locations") || 1),
        autopilotEnabled: formData.get("autopilotEnabled") === "on",
      },
    });
    state.modal = null;
    await refreshBootstrap();
    showToast("Cliente adicionado com sucesso.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function openBillingPortal() {
  try {
    const payload = await api("/api/subscription/portal", { method: "POST" });
    if (payload.url) {
      window.open(payload.url, "_blank", "noopener");
    }
    showToast(payload.message);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function cancelCurrentSubscription() {
  const shouldProceed = window.confirm("Deseja realmente cancelar a assinatura?");
  if (!shouldProceed) {
    return;
  }
  try {
    await api("/api/subscription/cancel", { method: "POST" });
    await refreshBootstrap();
    showToast("Cancelamento processado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  Object.assign(state, {
    user: null,
    dashboard: null,
    reviews: [],
    settings: null,
    agency: null,
    subscription: null,
    googleConnection: null,
    integrations: null,
    modal: null,
  });
  navigate("dashboard");
  render();
}

document.addEventListener("submit", async (event) => {
  if (event.target.matches("#login-form") || event.target.matches("#register-form")) {
    await handleAuthSubmit(event);
  }
  if (event.target.matches("#settings-form")) {
    await submitSettings(event);
  }
  if (event.target.matches("#reviews-filter-form")) {
    await submitReviewsFilter(event);
  }
  if (event.target.matches("#google-location-form")) {
    await saveGoogleLocations(event);
  }
  if (event.target.matches("#client-form")) {
    await submitClientForm(event);
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action], [data-route]");
  if (!button) {
    return;
  }

  if (button.dataset.route) {
    navigate(button.dataset.route);
    return;
  }

  const action = button.dataset.action;
  if (action === "switch-auth") {
    state.authMode = button.dataset.mode;
    render();
  }
  if (action === "forgot-password") {
    const email = window.prompt("Informe o e-mail da conta:");
    if (!email) return;
    try {
      const payload = await api("/api/auth/forgot-password", { method: "POST", body: { email } });
      showToast(payload.message);
    } catch (error) {
      showToast(error.message, "error");
    }
  }
  if (action === "auth-google") {
    await openGoogleAuth();
  }
  if (action === "view-pending") {
    navigate("reviews");
    state.reviewsFilter.status = "pending";
    await submitReviewsFilter({
      preventDefault() {},
      currentTarget: document.querySelector("#reviews-filter-form") || buildVirtualFilterForm(),
    });
  }
  if (action === "open-review") {
    openReviewModal(button.dataset.reviewId);
  }
  if (action === "close-modal") {
    if (event.target === button || button.classList.contains("icon-button")) {
      state.modal = null;
      render();
    }
  }
  if (action === "start-google-connect") {
    await startGoogleConnectionFlow();
  }
  if (action === "generate-reply") {
    await regenerateReply();
  }
  if (action === "publish-reply") {
    await publishCurrentReply();
  }
  if (action === "discard-reply") {
    await discardCurrentReply();
  }
  if (action === "open-add-client") {
    state.modal = { type: "add-client" };
    render();
  }
  if (action === "open-billing-portal") {
    await openBillingPortal();
  }
  if (action === "cancel-subscription") {
    await cancelCurrentSubscription();
  }
  if (action === "logout") {
    await logout();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#review-draft-reply") && state.modal?.type === "review") {
    state.modal.draftReply = event.target.value;
  }
});

window.addEventListener("hashchange", async () => {
  updateRouteFromHash();
  render();
  if (state.user && state.route === "reviews") {
    try {
      state.reviews = await api(
        `/api/reviews?status=${encodeURIComponent(state.reviewsFilter.status)}&sort=${encodeURIComponent(
          state.reviewsFilter.sort,
        )}&search=${encodeURIComponent(state.reviewsFilter.search)}`,
      );
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

function buildVirtualFilterForm() {
  const form = document.createElement("form");
  form.innerHTML = `
    <input name="search" value="${state.reviewsFilter.search}" />
    <input name="status" value="${state.reviewsFilter.status}" />
    <input name="sort" value="${state.reviewsFilter.sort}" />
  `;
  return form;
}

updateRouteFromHash();
render();
await bootstrapSession();

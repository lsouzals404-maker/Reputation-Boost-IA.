import { config, isAsaasConfigured, isStripeConfigured } from "../config.js";
import { mutateState, readState } from "../store.js";

function mapStripeStatus(status, cancelAtPeriodEnd) {
  if (cancelAtPeriodEnd) {
    return "cancel_scheduled";
  }
  return status || "active";
}

function buildStripeAuthHeader() {
  return `Basic ${Buffer.from(`${config.stripeSecretKey}:`).toString("base64")}`;
}

async function stripeRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: buildStripeAuthHeader(),
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  if (!response.ok) {
    throw new Error(`Stripe returned ${response.status}`);
  }
  return response.json();
}

async function asaasRequest(path, { method = "GET" } = {}) {
  const response = await fetch(`${config.asaasBaseUrl}${path}`, {
    method,
    headers: {
      access_token: config.asaasApiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`Asaas returned ${response.status}`);
  }
  return response.json();
}

async function syncStripeSubscription(subscription) {
  if (!isStripeConfigured() || !subscription.stripeSubscriptionId) {
    return subscription;
  }

  const stripeSubscription = await stripeRequest(`/v1/subscriptions/${subscription.stripeSubscriptionId}`);
  const invoiceList =
    subscription.stripeCustomerId
      ? await stripeRequest(`/v1/invoices?customer=${encodeURIComponent(subscription.stripeCustomerId)}&limit=10`)
      : { data: [] };

  return {
    ...subscription,
    status: mapStripeStatus(stripeSubscription.status, stripeSubscription.cancel_at_period_end),
    nextBillingDate: stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
      : subscription.nextBillingDate,
    invoices: (invoiceList.data || []).map((invoice) => ({
      id: invoice.id,
      label: invoice.number || invoice.id,
      amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
      status: invoice.status,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
    })),
  };
}

async function syncAsaasSubscription(subscription) {
  if (!isAsaasConfigured() || !subscription.asaasSubscriptionId) {
    return subscription;
  }

  const remoteSubscription = await asaasRequest(`/v3/subscriptions/${subscription.asaasSubscriptionId}`);
  const payments = await asaasRequest(`/v3/subscriptions/${subscription.asaasSubscriptionId}/payments`);

  return {
    ...subscription,
    status: String(remoteSubscription.status || subscription.status).toLowerCase(),
    nextBillingDate: remoteSubscription.nextDueDate
      ? new Date(remoteSubscription.nextDueDate).toISOString()
      : subscription.nextBillingDate,
    invoices: (payments.data || []).map((payment) => ({
      id: payment.id,
      label: payment.description || payment.id,
      amount: payment.value,
      status: String(payment.status || "").toLowerCase(),
      paidAt: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
    })),
  };
}

export async function getSubscriptionData(userId) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  if (!workspace) {
    return null;
  }

  const subscription = workspace.subscription;
  if (subscription.provider === "asaas") {
    try {
      return await syncAsaasSubscription(subscription);
    } catch (error) {
      console.warn("[billing] asaas fallback:", error.message);
      return subscription;
    }
  }

  try {
    return await syncStripeSubscription(subscription);
  } catch (error) {
    console.warn("[billing] stripe fallback:", error.message);
    return subscription;
  }
}

export async function createBillingPortalSession(userId) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  if (!workspace) {
    const error = new Error("Workspace nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (workspace.subscription.provider === "stripe" && isStripeConfigured() && workspace.subscription.stripeCustomerId) {
    const session = await stripeRequest("/v1/billing_portal/sessions", {
      method: "POST",
      body: {
        customer: workspace.subscription.stripeCustomerId,
        return_url: config.stripeReturnUrl,
      },
    });

    return {
      url: session.url,
      message: "Portal Stripe criado com sucesso.",
    };
  }

  return {
    url: "",
    message:
      "Portal de autoatendimento nao configurado neste ambiente. O painel continua funcional com dados locais para o MVP.",
  };
}

export async function cancelSubscription(userId) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  if (!workspace) {
    const error = new Error("Workspace nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (workspace.subscription.provider === "stripe" && isStripeConfigured() && workspace.subscription.stripeSubscriptionId) {
    await stripeRequest(`/v1/subscriptions/${workspace.subscription.stripeSubscriptionId}`, {
      method: "POST",
      body: { cancel_at_period_end: "true" },
    });
  }

  if (workspace.subscription.provider === "asaas" && isAsaasConfigured() && workspace.subscription.asaasSubscriptionId) {
    await asaasRequest(`/v3/subscriptions/${workspace.subscription.asaasSubscriptionId}`, { method: "DELETE" });
  }

  return mutateState((draftState) => {
    const draftWorkspace = draftState.workspaces[userId];
    draftWorkspace.subscription.status = draftWorkspace.subscription.provider === "stripe" ? "cancel_scheduled" : "cancelled";
    return draftWorkspace.subscription;
  });
}


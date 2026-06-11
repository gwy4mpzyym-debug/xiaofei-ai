const state = {
  business: null,
  businessId: new URLSearchParams(location.search).get("business") || "xiaofei",
  messages: [],
  busy: false,
  subscriptionActive: false
};

const els = {
  shopLogo: document.querySelector("#shopLogo"),
  shopName: document.querySelector("#shopName"),
  adminLink: document.querySelector("#adminLink"),
  chatSubtitle: document.querySelector("#chatSubtitle"),
  modeBadge: document.querySelector("#modeBadge"),
  modelBadge: document.querySelector("#modelBadge"),
  subscriptionBadge: document.querySelector("#subscriptionBadge"),
  shopAddress: document.querySelector("#shopAddress"),
  shopPhone: document.querySelector("#shopPhone"),
  shopHours: document.querySelector("#shopHours"),
  shopPolicy: document.querySelector("#shopPolicy"),
  serviceList: document.querySelector("#serviceList"),
  messages: document.querySelector("#messages"),
  form: document.querySelector("#chatForm"),
  input: document.querySelector("#messageInput"),
  clearChatBtn: document.querySelector("#clearChatBtn")
};

function withBusiness(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}business=${encodeURIComponent(state.businessId)}`;
}

function pageHref(page, businessId = state.businessId) {
  const url = new URL(page, location.href);
  url.search = "";
  url.searchParams.set("business", businessId);
  return `${url.pathname}${url.search}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(role, content) {
  state.messages.push({ role, content });
  renderMessages();
}

function renderMessages() {
  els.messages.innerHTML = state.messages.map((message) => {
    const who = message.role === "assistant" ? "AI 接待员" : "客户";
    const type = message.role === "assistant" ? "assistant" : "user";
    return `
      <div class="message ${type}">
        <span>${who}</span>
        <div class="bubble">${escapeHtml(message.content)}</div>
      </div>
    `;
  }).join("");
  els.messages.scrollTop = els.messages.scrollHeight;
}

function scoreClass(score) {
  if (score >= 4) return "high";
  if (score >= 3) return "mid";
  return "low";
}

function renderServices(services) {
  els.serviceList.innerHTML = services.map((item) => `
    <div class="service-item">
      <strong>${escapeHtml(item.name)}</strong>
      <b>${escapeHtml(item.price)}</b>
      <span>${escapeHtml(item.duration)}</span>
    </div>
  `).join("");
}

async function api(path, options = {}) {
  const response = await fetch(withBusiness(path), {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function loadConfig() {
  const data = await api("/api/config");
  state.business = data.business;
  state.subscriptionActive = Boolean(data.business.subscription.active);
  document.title = `${data.business.name} AI 接待系统`;
  els.shopLogo.textContent = data.business.initials || "AI";
  els.shopName.textContent = data.business.name;
  els.adminLink.href = pageHref("admin.html", data.business.id);
  els.chatSubtitle.textContent = `询问价格、营业时间或预约${data.business.services.map((item) => item.name).join("/")}`;
  els.modeBadge.textContent = data.mode === "openai" ? "OpenAI 模式" : "演示模式";
  els.modelBadge.textContent = data.model;
  els.subscriptionBadge.textContent = data.business.subscription.active
    ? data.business.subscription.statusText
    : "AI 未开通";
  els.subscriptionBadge.classList.toggle("is-warning", !data.business.subscription.active);
  els.shopAddress.textContent = data.business.address;
  els.shopPhone.textContent = data.business.phone;
  els.shopHours.textContent = data.business.hours;
  els.shopPolicy.textContent = data.business.bookingPolicy;
  renderServices(data.business.services);
  renderQuickPrompts(data.business.quickPrompts);
  if (!state.subscriptionActive) {
    els.input.disabled = true;
    els.form.querySelector("button").disabled = true;
    els.input.placeholder = data.business.subscription.status === "expired"
      ? "该商家订阅已到期，续费后可继续使用 AI"
      : "该商家还未开通订阅，开通后可使用 AI";
  }
}

function renderQuickPrompts(prompts) {
  const quickRow = document.querySelector(".quick-row");
  quickRow.innerHTML = prompts.map((item) => `
    <button type="button" data-message="${escapeHtml(item.message)}" ${state.subscriptionActive ? "" : "disabled"}>${escapeHtml(item.label)}</button>
  `).join("");
  quickRow.querySelectorAll("[data-message]").forEach((button) => {
    button.addEventListener("click", () => {
      sendMessage(button.dataset.message);
    });
  });
}

async function sendMessage(text) {
  if (!text.trim() || state.busy || !state.subscriptionActive) return;
  state.busy = true;
  els.form.querySelector("button").disabled = true;
  addMessage("user", text.trim());

  try {
    const data = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: text.trim(),
        history: state.messages.slice(-10)
      })
    });
    addMessage("assistant", data.reply);
  } catch (error) {
    addMessage("assistant", `系统暂时没处理成功：${error.message}`);
  } finally {
    state.busy = false;
    els.form.querySelector("button").disabled = false;
    els.input.focus();
  }
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = els.input.value;
  els.input.value = "";
  sendMessage(text);
});

els.clearChatBtn.addEventListener("click", () => {
  state.messages = [];
  renderMessages();
});

async function boot() {
  await loadConfig();
  if (state.business.subscription.active) {
    addMessage("assistant", `你好，这里是 ${state.business.name} AI 接待。我们可以帮你登记预约。${state.business.services.map((item) => `${item.name} ${item.price}`).join("，")}。门店电话 ${state.business.phone}。请问你想咨询什么项目？希望什么时候来？`);
  } else {
    addMessage("assistant", state.business.subscription.status === "expired"
      ? `这里是 ${state.business.name}。AI 自动接待订阅已到期，请商家续费后继续使用。`
      : `这里是 ${state.business.name}。AI 自动接待还未开通订阅，请商家开通后使用。`);
  }
}

boot().catch((error) => {
  document.body.innerHTML = `<main class="boot-error">启动失败：${escapeHtml(error.message)}</main>`;
});

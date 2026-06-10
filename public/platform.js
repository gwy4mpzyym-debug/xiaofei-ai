const grid = document.querySelector("#businessGrid");
const planGrid = document.querySelector("#planGrid");
const creatorForm = document.querySelector("#creatorForm");
const platformPassword = document.querySelector("#platformPassword");
const platformLogin = document.querySelector("#platformLogin");
const platformLoginBtn = document.querySelector("#platformLoginBtn");
const platformLogoutBtn = document.querySelector("#platformLogoutBtn");
const creatorTitle = document.querySelector("#creatorTitle");
const creatorSubtitle = document.querySelector("#creatorSubtitle");
const creatorFields = document.querySelector("#creatorFields");
const creatorSubmit = document.querySelector("#creatorSubmit");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const creatorError = document.querySelector("#creatorError");
const creatorResult = document.querySelector("#creatorResult");
const platformState = {
  unlocked: false,
  businesses: [],
  subscriptionTrial: null,
  subscriptionPlans: [],
  editingId: ""
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function renderBusinesses(businesses) {
  platformState.businesses = businesses;
  grid.innerHTML = businesses.map((business) => `
    <article class="business-card">
      <div class="shop-logo" aria-hidden="true">${escapeHtml(business.initials || "AI")}</div>
      <div>
        <h3>${escapeHtml(business.name)}</h3>
        <p>${escapeHtml(business.category)}</p>
      </div>
      <div class="subscription-state ${escapeHtml(business.subscription?.status || "inactive")}">
        <strong>${escapeHtml(business.subscription?.statusText || "未开通订阅")}</strong>
        <span>${escapeHtml(business.subscription?.planName ? `${business.subscription.planName} / ${business.subscription.priceLabel}` : "AI 自动接待未启用")}</span>
        <em>${escapeHtml(business.subscription?.trialAvailable ? "可开通首次 7 天免费试用" : business.subscription?.trialUsed ? "免费试用已使用" : business.subscription?.paidUsed ? "已开通过付费订阅" : "")}</em>
      </div>
      ${platformState.unlocked ? `
        <div class="subscription-actions">
          <button
            type="button"
            data-subscribe="${encodeURIComponent(business.id)}"
            data-action="trial"
            ${business.subscription?.trialAvailable ? "" : "disabled"}
          >${business.subscription?.trialAvailable ? "7天免费试用" : "试用已不可用"}</button>
          ${platformState.subscriptionPlans.map((plan) => `
            <button type="button" data-subscribe="${encodeURIComponent(business.id)}" data-plan="${escapeHtml(plan.id)}">${escapeHtml(plan.name)}</button>
          `).join("")}
          <button type="button" data-subscribe="${encodeURIComponent(business.id)}" data-action="deactivate">停用</button>
        </div>
      ` : ""}
      <div class="business-actions">
        <a href="/chat?business=${encodeURIComponent(business.id)}">顾客页</a>
        <a href="/admin?business=${encodeURIComponent(business.id)}">老板后台</a>
        <button type="button" data-copy="/chat?business=${encodeURIComponent(business.id)}">复制顾客链接</button>
        <button type="button" data-copy="/admin?business=${encodeURIComponent(business.id)}">复制后台链接</button>
        ${platformState.unlocked ? `<button type="button" data-edit="${encodeURIComponent(business.id)}">编辑</button>` : ""}
        ${platformState.unlocked ? `<button type="button" data-delete="${encodeURIComponent(business.id)}">删除</button>` : ""}
      </div>
    </article>
  `).join("");
}

async function loadBusinesses() {
  const data = await api("/api/platform/businesses");
  platformState.subscriptionTrial = data.subscriptionTrial || platformState.subscriptionTrial;
  platformState.subscriptionPlans = data.subscriptionPlans || platformState.subscriptionPlans;
  renderPlans([platformState.subscriptionTrial, ...platformState.subscriptionPlans].filter(Boolean));
  renderBusinesses(data.businesses);
}

function renderPlans(plans) {
  if (!planGrid) return;
  planGrid.innerHTML = plans.map((plan) => `
    <article class="price-card">
      <span>${escapeHtml(plan.name)}</span>
      <strong>${escapeHtml(plan.priceLabel)}</strong>
      <p>${escapeHtml(plan.description)}</p>
    </article>
  `).join("");
}

function setUnlocked(unlocked) {
  platformState.unlocked = unlocked;
  platformLogin.hidden = unlocked;
  creatorFields.hidden = !unlocked;
  creatorSubmit.hidden = !unlocked;
  platformLogoutBtn.hidden = !unlocked;
  cancelEditBtn.hidden = !unlocked || !platformState.editingId;
  renderBusinesses(platformState.businesses);
}

function formField(name) {
  return creatorForm.elements.namedItem(name);
}

function formatServices(services = []) {
  return services.map((service) => {
    const aliases = Array.isArray(service.aliases) ? service.aliases.join(",") : "";
    return [service.name, service.price, service.duration, aliases].filter(Boolean).join(" | ");
  }).join("\n");
}

function formatRules(rules = []) {
  return rules.join("\n");
}

function setCreatorMode(mode, business = null) {
  const editing = mode === "edit" && business;
  platformState.editingId = editing ? business.id : "";
  creatorTitle.textContent = editing ? `编辑：${business.name}` : "新增老板客户";
  creatorSubtitle.textContent = editing
    ? "修改商家资料后，顾客页和老板后台会立即更新。"
    : "填完资料后，系统会自动生成该老板的顾客页和后台。";
  creatorSubmit.textContent = editing ? "保存商家资料" : "生成商家网站";
  cancelEditBtn.hidden = !platformState.unlocked || !editing;

  if (!editing) {
    creatorForm.reset();
    const idField = formField("id");
    if (idField) idField.disabled = false;
    return;
  }

  formField("id").value = business.id;
  formField("id").disabled = true;
  formField("name").value = business.name || "";
  formField("category").value = business.category || "";
  formField("adminPassword").value = "";
  formField("phone").value = business.phone || "";
  formField("hours").value = business.hours || "";
  formField("address").value = business.address || "";
  formField("bookingPolicy").value = business.bookingPolicy || "";
  formField("services").value = formatServices(business.services);
  formField("humanRules").value = formatRules(business.humanRules || []);
}

function parseServices(value) {
  const lines = String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => {
    const [name, price, duration, aliases] = line.split("|").map((part) => String(part || "").trim());
    return { name, price, duration, aliases };
  }).filter((item) => item.name);
}

function parseRules(value) {
  return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

platformLoginBtn.addEventListener("click", async () => {
  creatorError.textContent = "";
  try {
    await api("/api/platform/login", {
      method: "POST",
      body: JSON.stringify({ password: platformPassword.value })
    });
    platformPassword.value = "";
    setUnlocked(true);
    await loadBusinesses();
  } catch (error) {
    creatorError.textContent = error.message;
  }
});

platformLogoutBtn.addEventListener("click", async () => {
  await api("/api/platform/logout", { method: "POST", body: "{}" });
  setUnlocked(false);
  await loadBusinesses();
});

creatorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  creatorError.textContent = "";
  creatorResult.innerHTML = "";

  const form = new FormData(creatorForm);
  const payload = {
    id: form.get("id"),
    name: form.get("name"),
    category: form.get("category"),
    adminPassword: form.get("adminPassword"),
    phone: form.get("phone"),
    hours: form.get("hours"),
    address: form.get("address"),
    bookingPolicy: form.get("bookingPolicy"),
    services: parseServices(form.get("services")),
    humanRules: parseRules(form.get("humanRules"))
  };

  try {
    if (!platformState.editingId && !payload.adminPassword) {
      throw new Error("新增商家时需要填写老板后台密码");
    }

    const editingId = platformState.editingId;
    const data = await api(editingId ? `/api/platform/businesses/${encodeURIComponent(editingId)}` : "/api/platform/businesses", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const id = data.business.id;
    creatorResult.innerHTML = `
      <strong>${escapeHtml(data.business.name)} ${editingId ? "已更新" : "已生成"}</strong>
      <a href="/chat?business=${encodeURIComponent(id)}">打开顾客页</a>
      <a href="/admin?business=${encodeURIComponent(id)}">打开老板后台</a>
    `;
    setCreatorMode("new");
    await loadBusinesses();
  } catch (error) {
    creatorError.textContent = error.message;
  }
});

grid.addEventListener("click", async (event) => {
  const subscriptionButton = event.target.closest("button[data-subscribe]");
  if (subscriptionButton) {
    creatorError.textContent = "";
    const id = decodeURIComponent(subscriptionButton.dataset.subscribe);
    const business = platformState.businesses.find((item) => item.id === id);
    try {
      const action = subscriptionButton.dataset.action || "activate";
      const planId = subscriptionButton.dataset.plan || "";
      const data = await api(`/api/platform/businesses/${encodeURIComponent(id)}/subscription`, {
        method: "POST",
        body: JSON.stringify({ action, planId })
      });
      creatorResult.innerHTML = `<strong>${escapeHtml(business?.name || id)}：${escapeHtml(data.subscription.statusText)}</strong>`;
      await loadBusinesses();
    } catch (error) {
      creatorError.textContent = error.message;
    }
    return;
  }

  const editButton = event.target.closest("button[data-edit]");
  if (editButton) {
    const business = platformState.businesses.find((item) => item.id === decodeURIComponent(editButton.dataset.edit));
    if (business) {
      creatorError.textContent = "";
      creatorResult.innerHTML = "";
      setCreatorMode("edit", business);
      document.querySelector(".creator-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  const copyButton = event.target.closest("button[data-copy]");
  if (copyButton) {
    const url = new URL(copyButton.dataset.copy, location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    copyButton.textContent = "已复制";
    setTimeout(() => {
      copyButton.textContent = copyButton.dataset.copy.includes("/admin") ? "复制后台链接" : "复制顾客链接";
    }, 1200);
    return;
  }

  const button = event.target.closest("button[data-delete]");
  if (!button) return;
  creatorError.textContent = "";
  try {
    await api(`/api/platform/businesses/${button.dataset.delete}`, { method: "DELETE" });
    if (platformState.editingId === decodeURIComponent(button.dataset.delete)) {
      setCreatorMode("new");
    }
    await loadBusinesses();
  } catch (error) {
    creatorError.textContent = error.message;
  }
});

cancelEditBtn.addEventListener("click", () => {
  creatorError.textContent = "";
  creatorResult.innerHTML = "";
  setCreatorMode("new");
});

async function boot() {
  await loadBusinesses();
  try {
    await api("/api/platform/me");
    setUnlocked(true);
  } catch {
    setUnlocked(false);
  }
}

boot().catch((error) => {
  grid.innerHTML = `<div class="empty-state"><strong>加载失败</strong><span>${escapeHtml(error.message)}</span></div>`;
});

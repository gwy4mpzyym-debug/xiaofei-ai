const adminState = {
  businessId: new URLSearchParams(location.search).get("business") || "xiaofei",
  business: null,
  status: "",
  leads: [],
  stats: null
};

const statusLabels = {
  new: "新线索",
  contacted: "已联系",
  booked: "已预约",
  done: "已完成",
  archived: "归档"
};

const els = {
  shopLogo: document.querySelector("#shopLogo"),
  adminSubtitle: document.querySelector("#adminSubtitle"),
  customerLink: document.querySelector("#customerLink"),
  loginHint: document.querySelector("#loginHint"),
  loginPanel: document.querySelector("#loginPanel"),
  adminShell: document.querySelector("#adminShell"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  loginError: document.querySelector("#loginError"),
  logoutBtn: document.querySelector("#logoutBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  statsGrid: document.querySelector("#statsGrid"),
  filterTabs: document.querySelector("#filterTabs"),
  leadCount: document.querySelector("#leadCount"),
  adminLeadList: document.querySelector("#adminLeadList")
};

function withBusiness(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}business=${encodeURIComponent(adminState.businessId)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scoreClass(score) {
  if (score >= 4) return "high";
  if (score >= 3) return "mid";
  return "low";
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const response = await fetch(withBusiness(path), {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function loadConfig() {
  const data = await api("/api/config");
  adminState.business = data.business;
  document.title = `${data.business.name} 老板后台`;
  els.shopLogo.textContent = data.business.initials || "AI";
  els.adminSubtitle.textContent = `${data.business.name} 客户线索管理`;
  els.customerLink.href = `/chat?business=${encodeURIComponent(data.business.id)}`;
  els.loginHint.textContent = `${data.business.name} 后台登录`;
  const exportLink = document.querySelector(".download-button");
  if (exportLink) exportLink.href = withBusiness("/api/admin/export.csv");
}

function setLoggedIn(isLoggedIn) {
  els.loginPanel.hidden = isLoggedIn;
  els.adminShell.hidden = !isLoggedIn;
  els.logoutBtn.hidden = !isLoggedIn;
}

function renderStats(stats) {
  const cards = [
    ["总线索", stats.total],
    ["新线索", stats.new],
    ["高意向", stats.highIntent],
    ["需人工", stats.needsHuman],
    ["已预约", stats.booked]
  ];
  els.statsGrid.innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
    </div>
  `).join("");
}

function renderTabs() {
  els.filterTabs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === adminState.status);
  });
}

function renderLeads() {
  els.leadCount.textContent = `${adminState.leads.length} 条`;
  if (!adminState.leads.length) {
    els.adminLeadList.innerHTML = `
      <div class="empty-state admin-empty">
        <strong>当前没有线索</strong>
        <span>顾客在咨询页留下预约时间、手机号或高意向问题后，会自动出现在这里。</span>
      </div>
    `;
    return;
  }

  els.adminLeadList.innerHTML = adminState.leads.map((lead) => `
    <article class="admin-lead-card" data-id="${escapeHtml(lead.id)}">
      <div class="lead-card-top">
        <div>
          <strong>${escapeHtml(lead.service || "待确认")}</strong>
          <span>${escapeHtml(lead.channel || "网站聊天")} · ${formatTime(lead.createdAt)}</span>
        </div>
        <div class="lead-badges">
          <span class="score ${scoreClass(lead.intentScore)}">${lead.intentScore}/5</span>
          <span class="status-badge">${escapeHtml(statusLabels[lead.status] || lead.status)}</span>
        </div>
      </div>
      <div class="lead-detail-grid">
        <div><span>手机号</span><b>${escapeHtml(lead.phone || "未留下")}</b></div>
        <div><span>预约时间</span><b>${escapeHtml(lead.requestedTime || "待确认")}</b></div>
        <div><span>紧急程度</span><b>${escapeHtml(lead.urgency || "普通")}</b></div>
        <div><span>转人工</span><b>${lead.needsHuman ? "是" : "否"}</b></div>
      </div>
      <div class="lead-note">
        <span>客户消息</span>
        <p>${escapeHtml(lead.lastCustomerMessage || lead.notes || "")}</p>
      </div>
      <label class="admin-note">
        <span>老板备注</span>
        <textarea data-role="note">${escapeHtml(lead.adminNote || "")}</textarea>
      </label>
      <div class="lead-actions">
        ${Object.entries(statusLabels).map(([status, label]) => `
          <button type="button" data-action="status" data-status="${status}" ${lead.status === status ? "disabled" : ""}>${label}</button>
        `).join("")}
        <button type="button" data-action="save-note">保存备注</button>
        <button type="button" data-action="delete" class="danger">删除</button>
      </div>
    </article>
  `).join("");
}

async function loadLeads() {
  const suffix = adminState.status ? `?status=${encodeURIComponent(adminState.status)}` : "";
  const data = await api(`/api/admin/leads${suffix}`);
  adminState.leads = data.leads;
  adminState.stats = data.stats;
  renderStats(data.stats);
  renderTabs();
  renderLeads();
}

async function checkSession() {
  try {
    await api("/api/admin/me");
    setLoggedIn(true);
    await loadLeads();
  } catch {
    setLoggedIn(false);
  }
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.loginError.textContent = "";
  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: els.passwordInput.value })
    });
    els.passwordInput.value = "";
    setLoggedIn(true);
    await loadLeads();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST", body: "{}" });
  setLoggedIn(false);
});

els.filterTabs.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  adminState.status = button.dataset.status;
  await loadLeads();
});

els.adminLeadList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = event.target.closest(".admin-lead-card");
  const id = card?.dataset.id;
  if (!id) return;

  if (button.dataset.action === "delete") {
    await api(`/api/admin/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadLeads();
    return;
  }

  if (button.dataset.action === "status") {
    await api(`/api/admin/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: button.dataset.status })
    });
    await loadLeads();
    return;
  }

  if (button.dataset.action === "save-note") {
    const note = card.querySelector("[data-role='note']").value;
    await api(`/api/admin/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: note })
    });
    await loadLeads();
  }
});

els.resetBtn.addEventListener("click", async () => {
  await api("/api/admin/reset", { method: "POST", body: "{}" });
  await loadLeads();
});

loadConfig().then(checkSession).catch(() => setLoggedIn(false));

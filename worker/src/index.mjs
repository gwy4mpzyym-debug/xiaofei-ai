const LEAD_STATUSES = ["new", "contacted", "booked", "done", "archived"];
const DEFAULT_BUSINESS_ID = "xiaofei";
const TRIAL_DAYS = 7;
const TRIAL_PLAN = {
  id: "trial",
  name: "7天免费试用",
  days: TRIAL_DAYS,
  priceLabel: "0 元",
  description: "首次订阅可免费试用 7 天，每个商家仅限一次。"
};
const SUBSCRIPTION_PLANS = {
  month1: {
    id: "month1",
    name: "1个月",
    months: 1,
    price: 199,
    priceLabel: "199 元",
    description: "适合先体验或短期试用。"
  },
  month3: {
    id: "month3",
    name: "3个月",
    months: 3,
    price: 499,
    priceLabel: "499 元",
    description: "适合稳定使用，折合约 166 元/月。"
  },
  month12: {
    id: "month12",
    name: "12个月",
    months: 12,
    price: 1599,
    priceLabel: "1599 元",
    description: "适合长期客户，折合约 133 元/月。"
  }
};
const DEFAULT_BUSINESSES = {
  xiaofei: {
    id: "xiaofei",
    initials: "XF",
    name: "小飞理发店",
    category: "理发店",
    adminPassword: "288133",
    phone: "288133",
    address: "海南省临高县加来镇新市路",
    hours: "周一至周日 9:00-18:00",
    bookingPolicy: "可先帮客户预留意向时间，最终档期由老板确认。",
    services: [
      { name: "单剪", price: "19 元", duration: "30 分钟", aliases: ["单剪", "剪", "理发", "头发", "发型", "儿童", "小孩", "孩子"] },
      { name: "烫发", price: "99 元", duration: "2-3 小时", aliases: ["烫发", "烫", "卷"] }
    ],
    humanRules: [
      "客户投诉或退款要求",
      "明确要求老板、店长或真人联系",
      "大额团体预约",
      "价格争议或特殊折扣",
      "烫染前健康风险、过敏、头皮损伤等问题"
    ],
    quickPrompts: [
      { label: "问价格和时间", message: "单剪多少钱？今天下午能约吗？" },
      { label: "烫发咨询", message: "我想明天下午烫发，大概多少钱？" },
      { label: "儿童剪发", message: "我要带孩子来剪头发，下午五点可以吗？" },
      { label: "转人工", message: "我想找老板确认一下团体预约" }
    ],
    subscription: {
      planId: "month12",
      startsAt: "2026-06-10T00:00:00.000Z",
      expiresAt: "2099-12-31T23:59:59.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z",
      trialStartedAt: "",
      trialUsedAt: "",
      paidStartedAt: "2026-06-10T00:00:00.000Z"
    }
  },
  beauty: {
    id: "beauty",
    initials: "HY",
    name: "花漾美容工作室",
    category: "美容店",
    adminPassword: "123456",
    phone: "0898-6666888",
    address: "演示地址：海口市美兰区海甸岛",
    hours: "周一至周日 10:00-20:00",
    bookingPolicy: "可以登记预约意向，最终由门店确认具体美容师和档期。",
    services: [
      { name: "基础面部护理", price: "99 元", duration: "60 分钟", aliases: ["基础面部护理", "面部", "护理", "补水", "清洁"] },
      { name: "美甲", price: "68 元起", duration: "60-90 分钟", aliases: ["美甲", "指甲", "甲片"] },
      { name: "肩颈放松", price: "88 元", duration: "45 分钟", aliases: ["肩颈放松", "肩颈", "按摩", "放松"] }
    ],
    humanRules: [
      "客户过敏、皮肤破损或医美相关问题",
      "客户投诉或退款要求",
      "明确要求店长或真人联系",
      "团体预约或上门服务"
    ],
    quickPrompts: [
      { label: "面护价格", message: "基础面部护理多少钱？今天下午能约吗？" },
      { label: "美甲咨询", message: "我想明天下午做美甲，大概多少钱？" },
      { label: "营业时间", message: "你们几点营业？地址在哪里？" },
      { label: "转人工", message: "我皮肤容易过敏，想让店长确认一下" }
    ],
    subscription: {
      planId: "",
      startsAt: "",
      expiresAt: "",
      updatedAt: "",
      trialStartedAt: "",
      trialUsedAt: "",
      paidStartedAt: ""
    }
  }
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  intent_score INTEGER NOT NULL DEFAULT 2,
  needs_human INTEGER NOT NULL DEFAULT 0,
  phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  requested_time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leads_business_created ON leads (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_business_status ON leads (business_id, status);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  business_id TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
`;

let initPromise;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), origin);

    try {
      await ensureDb(env);
      const url = new URL(request.url);
      const response = await route(request, env, url);
      return cors(response, origin);
    } catch (error) {
      return cors(json({ error: error.message || "服务器错误" }, error.status || 500), origin);
    }
  }
};

async function ensureDb(env) {
  if (!env.DB) throw new HttpError("缺少 D1 绑定 DB", 500);
  initPromise ||= (async () => {
    await env.DB.exec(SCHEMA);
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM businesses").first();
    if (!Number(count?.total)) {
      for (const business of Object.values(DEFAULT_BUSINESSES)) {
        const item = normalizeBusiness(business, business.id);
        await saveBusiness(env, item);
      }
    }
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(Date.now()).run();
  })();
  return initPromise;
}

async function route(request, env, url) {
  const businessId = await businessIdFromUrl(env, url);
  const business = await getBusiness(env, businessId);
  const method = request.method.toUpperCase();

  if (method === "GET" && url.pathname === "/api/health") {
    return json({
      ok: true,
      mode: env.OPENAI_API_KEY ? "openai" : "demo",
      uptimeSeconds: 0
    });
  }

  if (method === "GET" && url.pathname === "/api/config") {
    const businesses = await listBusinesses(env);
    return json({
      business: publicBusiness(business),
      businesses: businesses.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        initials: item.initials,
        subscription: subscriptionStatus(item.subscription)
      })),
      subscriptionTrial: subscriptionTrial(),
      subscriptionPlans: subscriptionPlans(),
      mode: env.OPENAI_API_KEY ? "openai" : "demo",
      model: env.OPENAI_API_KEY ? (env.OPENAI_MODEL || "gpt-4.1-mini") : "Cloudflare D1 云端模式"
    });
  }

  if (method === "POST" && url.pathname === "/api/chat") {
    const subscription = subscriptionStatus(business.subscription);
    if (!subscription.active) {
      throw new HttpError(subscription.status === "expired"
        ? `该商家的 AI 订阅已到期（${subscription.expiresDate}），续费后可继续使用。`
        : "该商家还没有开通 AI 订阅，开通后才能使用自动接待。", 402);
    }

    const body = await readJson(request);
    const message = String(body.message || "").trim();
    if (!message) throw new HttpError("消息不能为空", 400);

    let source = "demo";
    let apiError = "";
    let rawResult;
    if (env.OPENAI_API_KEY) {
      try {
        rawResult = await callOpenAI(env, message, body.history, business);
        source = "openai";
      } catch (error) {
        apiError = error.message || "OpenAI 调用失败";
        rawResult = fallbackAI(message, business);
      }
    } else {
      rawResult = fallbackAI(message, business);
    }

    const result = normalizeAiResult(rawResult, message, business);
    if (shouldSaveLead(result.lead)) await saveLead(env, result.lead);
    return json({ ...result, source, apiError, saved: shouldSaveLead(result.lead) });
  }

  if (method === "POST" && url.pathname === "/api/platform/login") {
    const body = await readJson(request);
    if (String(body.password || "") !== String(env.PLATFORM_PASSWORD || "admin123")) {
      throw new HttpError("平台密码不正确", 401);
    }
    return json({ ok: true, token: await createSession(env, "platform", "") });
  }

  if (method === "POST" && url.pathname === "/api/platform/logout") {
    await deleteBearerSession(env, request);
    return json({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/platform/me") {
    await requireSession(env, request, "platform", "");
    return json({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/platform/businesses") {
    const isAdmin = await maybeSession(env, request, "platform", "");
    const businesses = await listBusinesses(env);
    return json({
      businesses: businesses.map((item) => isAdmin ? platformBusiness(item) : publicBusiness(item)),
      subscriptionTrial: subscriptionTrial(),
      subscriptionPlans: subscriptionPlans()
    });
  }

  if (method === "POST" && url.pathname === "/api/platform/businesses") {
    await requireSession(env, request, "platform", "");
    const body = await readJson(request);
    const item = normalizeBusiness(body);
    if (await getBusiness(env, item.id, false)) throw new HttpError("商家 ID 已存在", 409);
    await saveBusiness(env, item);
    return json({ business: platformBusiness(item) }, 201);
  }

  const businessMatch = url.pathname.match(/^\/api\/platform\/businesses\/([^/]+)$/);
  if (businessMatch && method === "PUT") {
    await requireSession(env, request, "platform", "");
    const id = decodeURIComponent(businessMatch[1]);
    const existing = await getBusiness(env, id, false);
    if (!existing) throw new HttpError("商家不存在", 404);
    const body = await readJson(request);
    const item = normalizeBusiness({
      ...existing,
      ...body,
      id,
      adminPassword: body.adminPassword || existing.adminPassword,
      subscription: existing.subscription
    }, id);
    await saveBusiness(env, item);
    return json({ business: platformBusiness(item) });
  }

  if (businessMatch && method === "DELETE") {
    await requireSession(env, request, "platform", "");
    const id = decodeURIComponent(businessMatch[1]);
    await env.DB.prepare("DELETE FROM businesses WHERE id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM leads WHERE business_id = ?").bind(id).run();
    return json({ ok: true });
  }

  const subscriptionMatch = url.pathname.match(/^\/api\/platform\/businesses\/([^/]+)\/subscription$/);
  if (subscriptionMatch && method === "POST") {
    await requireSession(env, request, "platform", "");
    const id = decodeURIComponent(subscriptionMatch[1]);
    const item = await getBusiness(env, id, false);
    if (!item) throw new HttpError("商家不存在", 404);
    const body = await readJson(request);
    const action = String(body.action || "activate");
    if (action === "trial") activateTrial(item);
    else if (action === "deactivate") deactivateSubscription(item);
    else activateSubscription(item, String(body.planId || ""));
    await saveBusiness(env, item);
    return json({ business: platformBusiness(item), subscription: subscriptionStatus(item.subscription) });
  }

  if (method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readJson(request);
    if (String(body.password || "") !== String(business.adminPassword || "")) {
      throw new HttpError("后台密码不正确", 401);
    }
    return json({ ok: true, token: await createSession(env, "admin", businessId) });
  }

  if (method === "POST" && url.pathname === "/api/admin/logout") {
    await deleteBearerSession(env, request);
    return json({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/admin/me") {
    await requireSession(env, request, "admin", businessId);
    return json({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/admin/leads") {
    await requireSession(env, request, "admin", businessId);
    const status = url.searchParams.get("status") || "";
    const leads = await listLeads(env, businessId);
    const filtered = LEAD_STATUSES.includes(status) ? leads.filter((lead) => lead.status === status) : leads;
    return json({
      leads: filtered.slice(0, 200),
      stats: leadStats(leads),
      statuses: LEAD_STATUSES
    });
  }

  if (method === "GET" && url.pathname === "/api/admin/export.csv") {
    await requireSession(env, request, "admin", businessId);
    return csv(csvRowsForLeads(await listLeads(env, businessId)), `${businessId}-leads.csv`);
  }

  const leadMatch = url.pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
  if (leadMatch && method === "PATCH") {
    await requireSession(env, request, "admin", businessId);
    const id = decodeURIComponent(leadMatch[1]);
    const lead = await getLead(env, id, businessId);
    if (!lead) throw new HttpError("线索不存在", 404);
    const body = await readJson(request);
    if (body.status && LEAD_STATUSES.includes(body.status)) lead.status = body.status;
    if (typeof body.adminNote === "string") lead.adminNote = body.adminNote.slice(0, 1000);
    if (typeof body.nextAction === "string") lead.nextAction = body.nextAction.slice(0, 1000);
    lead.updatedAt = new Date().toISOString();
    await saveLead(env, lead);
    return json({ lead, stats: leadStats(await listLeads(env, businessId)) });
  }

  if (leadMatch && method === "DELETE") {
    await requireSession(env, request, "admin", businessId);
    const id = decodeURIComponent(leadMatch[1]);
    await env.DB.prepare("DELETE FROM leads WHERE id = ? AND business_id = ?").bind(id, businessId).run();
    return json({ ok: true, stats: leadStats(await listLeads(env, businessId)) });
  }

  if (method === "POST" && url.pathname === "/api/admin/reset") {
    await requireSession(env, request, "admin", businessId);
    await env.DB.prepare("DELETE FROM leads WHERE business_id = ?").bind(businessId).run();
    return json({ ok: true });
  }

  throw new HttpError("API 不存在", 404);
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError("JSON 格式不正确", 400);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function csv(rows, filename) {
  const body = `\ufeff${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

function cors(response, origin) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin === "null" ? "*" : origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function addMonths(value, months) {
  const date = new Date(value);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) date.setDate(0);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function subscriptionPlan(planId) {
  return planId === TRIAL_PLAN.id ? TRIAL_PLAN : SUBSCRIPTION_PLANS[planId] || null;
}

function subscriptionTrial() {
  return { ...TRIAL_PLAN };
}

function subscriptionPlans() {
  return Object.values(SUBSCRIPTION_PLANS).map(({ id, name, months, price, priceLabel, description }) => ({
    id,
    name,
    months,
    price,
    priceLabel,
    description
  }));
}

function normalizeSubscription(input = {}) {
  const planId = subscriptionPlan(input.planId) ? input.planId : "";
  return {
    planId,
    startsAt: validIso(input.startsAt),
    expiresAt: validIso(input.expiresAt),
    updatedAt: validIso(input.updatedAt),
    trialStartedAt: validIso(input.trialStartedAt),
    trialUsedAt: validIso(input.trialUsedAt),
    paidStartedAt: validIso(input.paidStartedAt)
  };
}

function subscriptionStatus(subscription = {}) {
  const normalized = normalizeSubscription(subscription);
  const plan = subscriptionPlan(normalized.planId);
  const expiresAt = normalized.expiresAt ? new Date(normalized.expiresAt) : null;
  const hasExpiry = expiresAt && !Number.isNaN(expiresAt.getTime());
  const active = Boolean(plan && hasExpiry && expiresAt.getTime() > Date.now());
  const expired = Boolean(plan && hasExpiry && expiresAt.getTime() <= Date.now());
  const expiresDate = normalized.expiresAt ? normalized.expiresAt.slice(0, 10) : "";
  const isTrial = normalized.planId === TRIAL_PLAN.id;
  const trialUsed = Boolean(normalized.trialUsedAt);
  const paidUsed = Boolean(normalized.paidStartedAt || (normalized.planId && !isTrial));

  return {
    ...normalized,
    active,
    status: active ? "active" : expired ? "expired" : "inactive",
    planName: plan ? plan.name : "",
    priceLabel: plan ? plan.priceLabel : "",
    isTrial,
    trialUsed,
    paidUsed,
    trialAvailable: !trialUsed && !paidUsed && !active,
    expiresDate,
    statusText: active
      ? `${isTrial ? "试用中" : "已开通"}，到期 ${expiresDate}`
      : expired
        ? `${isTrial ? "试用已结束" : "已到期"}，到期 ${expiresDate}`
        : "未开通订阅"
  };
}

function activateSubscription(business, planId) {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) throw new HttpError("套餐不存在", 400);
  const now = new Date();
  const current = subscriptionStatus(business.subscription);
  const base = current.active ? new Date(current.expiresAt) : now;
  business.subscription = {
    planId,
    startsAt: current.active && current.startsAt ? current.startsAt : now.toISOString(),
    expiresAt: addMonths(base, plan.months).toISOString(),
    updatedAt: now.toISOString(),
    trialStartedAt: current.trialStartedAt,
    trialUsedAt: current.trialUsedAt,
    paidStartedAt: current.paidStartedAt || now.toISOString()
  };
}

function activateTrial(business) {
  const current = subscriptionStatus(business.subscription);
  if (current.trialUsed) throw new HttpError("该商家已经使用过 7 天免费试用", 400);
  if (current.paidUsed) throw new HttpError("该商家已经开通过付费订阅，不能再使用免费试用", 400);
  if (current.active) throw new HttpError("该商家已有有效订阅，不需要开通试用", 400);
  const now = new Date();
  business.subscription = {
    planId: TRIAL_PLAN.id,
    startsAt: now.toISOString(),
    expiresAt: addDays(now, TRIAL_DAYS).toISOString(),
    updatedAt: now.toISOString(),
    trialStartedAt: now.toISOString(),
    trialUsedAt: now.toISOString(),
    paidStartedAt: current.paidStartedAt
  };
}

function deactivateSubscription(business) {
  business.subscription = {
    ...normalizeSubscription(business.subscription),
    expiresAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function slugifyId(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || `biz-${Date.now().toString(36)}`;
}

function initialsForName(name) {
  const cleaned = String(name || "AI").trim();
  if (/^[a-z0-9 ]+$/i.test(cleaned)) {
    return cleaned.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AI";
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function normalizeService(service = {}) {
  const name = String(service.name || "").trim();
  const aliases = Array.isArray(service.aliases)
    ? service.aliases
    : String(service.aliases || name).split(/[,，、\s]+/).filter(Boolean);
  return {
    name: name || "服务项目",
    price: String(service.price || "到店咨询").trim(),
    duration: String(service.duration || "待确认").trim(),
    aliases: Array.from(new Set([name, ...aliases].filter(Boolean)))
  };
}

function normalizeBusiness(input = {}, existingId = "") {
  const id = slugifyId(input.id || existingId || input.name);
  const services = Array.isArray(input.services) && input.services.length
    ? input.services.map(normalizeService)
    : [normalizeService({ name: "服务咨询", price: "到店咨询", duration: "待确认" })];
  const firstService = services[0];
  return {
    id,
    initials: String(input.initials || initialsForName(input.name)).slice(0, 3).toUpperCase(),
    name: String(input.name || "新商家").trim(),
    category: String(input.category || "本地门店").trim(),
    adminPassword: String(input.adminPassword || input.phone || "123456").trim(),
    phone: String(input.phone || "待设置").trim(),
    address: String(input.address || "待设置").trim(),
    hours: String(input.hours || "待设置").trim(),
    bookingPolicy: String(input.bookingPolicy || "可以先登记预约意向，最终由门店确认。").trim(),
    services,
    humanRules: Array.isArray(input.humanRules) && input.humanRules.length
      ? input.humanRules.map(String)
      : ["客户投诉或退款要求", "明确要求老板、店长或真人联系", "价格争议或特殊要求"],
    quickPrompts: Array.isArray(input.quickPrompts) && input.quickPrompts.length
      ? input.quickPrompts
      : [
        { label: "问价格", message: `${firstService.name}多少钱？今天能约吗？` },
        { label: "问地址", message: "你们地址在哪里？几点营业？" },
        { label: "想预约", message: `我想明天预约${firstService.name}` },
        { label: "转人工", message: "我想找老板或真人确认一下" }
      ],
    subscription: normalizeSubscription(input.subscription)
  };
}

function publicBusiness(business) {
  return {
    id: business.id,
    initials: business.initials,
    name: business.name,
    category: business.category,
    phone: business.phone,
    address: business.address,
    hours: business.hours,
    bookingPolicy: business.bookingPolicy,
    services: business.services.map(({ name, price, duration }) => ({ name, price, duration })),
    quickPrompts: business.quickPrompts,
    subscription: subscriptionStatus(business.subscription)
  };
}

function platformBusiness(business) {
  return {
    ...publicBusiness(business),
    services: business.services.map(({ name, price, duration, aliases }) => ({ name, price, duration, aliases })),
    humanRules: business.humanRules
  };
}

async function listBusinesses(env) {
  const result = await env.DB.prepare("SELECT data_json FROM businesses ORDER BY created_at ASC").all();
  return result.results.map((row) => normalizeBusiness(JSON.parse(row.data_json)));
}

async function getBusiness(env, id, fallback = true) {
  const row = await env.DB.prepare("SELECT data_json FROM businesses WHERE id = ?").bind(id).first();
  if (row) return normalizeBusiness(JSON.parse(row.data_json), id);
  if (!fallback) return null;
  const defaultRow = await env.DB.prepare("SELECT data_json FROM businesses WHERE id = ?").bind(DEFAULT_BUSINESS_ID).first();
  return defaultRow ? normalizeBusiness(JSON.parse(defaultRow.data_json), DEFAULT_BUSINESS_ID) : clone(DEFAULT_BUSINESSES[DEFAULT_BUSINESS_ID]);
}

async function saveBusiness(env, business) {
  const item = normalizeBusiness(business, business.id);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO businesses (id, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(item.id, JSON.stringify(item), now, now).run();
  return item;
}

async function businessIdFromUrl(env, url) {
  const requested = url.searchParams.get("business") || DEFAULT_BUSINESS_ID;
  const row = await env.DB.prepare("SELECT id FROM businesses WHERE id = ?").bind(requested).first();
  return row ? requested : DEFAULT_BUSINESS_ID;
}

function normalizeStoredLead(lead = {}) {
  return {
    id: lead.id || crypto.randomUUID(),
    createdAt: lead.createdAt || new Date().toISOString(),
    updatedAt: lead.updatedAt || lead.createdAt || new Date().toISOString(),
    status: LEAD_STATUSES.includes(lead.status) ? lead.status : "new",
    channel: lead.channel || "网站聊天",
    businessId: lead.businessId || DEFAULT_BUSINESS_ID,
    name: lead.name || "",
    phone: lead.phone || "",
    service: lead.service || "待确认",
    requestedTime: lead.requestedTime || "待确认",
    intentScore: Math.max(1, Math.min(5, Number(lead.intentScore || 2))),
    urgency: ["低", "普通", "高"].includes(lead.urgency) ? lead.urgency : "普通",
    needsHuman: Boolean(lead.needsHuman),
    notes: lead.notes || "",
    lastCustomerMessage: lead.lastCustomerMessage || lead.notes || "",
    adminNote: lead.adminNote || "",
    nextAction: lead.nextAction || "继续跟进"
  };
}

async function saveLead(env, lead) {
  const item = normalizeStoredLead(lead);
  await env.DB.prepare(`
    INSERT INTO leads (id, business_id, status, intent_score, needs_human, phone, service, requested_time, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      intent_score = excluded.intent_score,
      needs_human = excluded.needs_human,
      phone = excluded.phone,
      service = excluded.service,
      requested_time = excluded.requested_time,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `).bind(
    item.id,
    item.businessId,
    item.status,
    item.intentScore,
    item.needsHuman ? 1 : 0,
    item.phone,
    item.service,
    item.requestedTime,
    JSON.stringify(item),
    item.createdAt,
    item.updatedAt
  ).run();
  return item;
}

async function listLeads(env, businessId) {
  const result = await env.DB.prepare("SELECT data_json FROM leads WHERE business_id = ? ORDER BY created_at DESC LIMIT 200")
    .bind(businessId)
    .all();
  return result.results.map((row) => normalizeStoredLead(JSON.parse(row.data_json)));
}

async function getLead(env, id, businessId) {
  const row = await env.DB.prepare("SELECT data_json FROM leads WHERE id = ? AND business_id = ?").bind(id, businessId).first();
  return row ? normalizeStoredLead(JSON.parse(row.data_json)) : null;
}

function leadStats(leads) {
  return {
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    highIntent: leads.filter((lead) => Number(lead.intentScore) >= 4).length,
    needsHuman: leads.filter((lead) => lead.needsHuman).length,
    booked: leads.filter((lead) => lead.status === "booked").length
  };
}

function detectService(text, business) {
  for (const service of business.services) {
    const terms = [service.name, ...(service.aliases || [])];
    if (terms.some((term) => term && text.includes(term))) return service.name;
  }
  return "待确认";
}

function detectRequestedTime(text) {
  const match = text.match(/(今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|上午|中午|下午|晚上|[0-2]?\d[:：点][0-5]?\d?)/g);
  return match ? match.join(" ") : "待确认";
}

function detectPhone(text) {
  const match = text.match(/(?:\+?86[- ]?)?1[3-9]\d{9}|(?:\d[- ]*){7,}/);
  return match ? match[0].replace(/\s+/g, "") : "";
}

function serviceSummary(business) {
  return business.services.map((item) => `${item.name} ${item.price}`).join("，");
}

function fallbackAI(message, business) {
  const service = detectService(message, business);
  const requestedTime = detectRequestedTime(message);
  const phone = detectPhone(message);
  const wantsHuman = /老板|店长|真人|人工|投诉|退款|过敏|头皮|受伤/.test(message);
  const wantsPrice = /多少钱|价格|价位|收费|贵/.test(message);
  const wantsBooking = /约|预约|有空|几点|时间|今天|明天|下午|晚上/.test(message);
  const highIntent = wantsBooking || requestedTime !== "待确认" || phone;

  let reply;
  if (wantsHuman) {
    reply = `好的，我先帮你标记为需要店里人工处理。请留下姓名和手机号，${business.name} 会尽快联系你确认。你也可以直接拨打 ${business.phone}。`;
  } else if (wantsPrice) {
    reply = `可以的。${business.name} 目前${serviceSummary(business)}。我们地址在${business.address}，营业时间是 ${business.hours}，电话 ${business.phone}。你想咨询哪一项？方便的话也留个手机号，我帮你登记。`;
  } else if (wantsBooking) {
    reply = `可以，我先帮你登记${service === "待确认" ? "预约需求" : service}。${requestedTime === "待确认" ? "请告诉我你希望今天、明天还是其他时间来。" : `你说的时间是「${requestedTime}」。`}最终档期需要店里确认。请留下姓名和手机号，方便 ${business.name} 回复你。`;
  } else {
    reply = `你好，这里是 ${business.name} AI 接待。我们可以帮你登记预约。${serviceSummary(business)}。门店电话 ${business.phone}。你想咨询什么项目？希望什么时候来？`;
  }

  return {
    reply,
    lead: {
      name: "",
      phone,
      service,
      requestedTime,
      intentScore: highIntent ? 4 : 2,
      urgency: /今天|马上|现在|急/.test(message) ? "高" : "普通",
      needsHuman: wantsHuman,
      notes: message,
      nextAction: wantsHuman ? "通知老板人工接手" : phone ? "联系客户确认档期" : "继续索取姓名和手机号"
    },
    actionLog: [
      `识别服务：${service}`,
      `预约时间：${requestedTime}`,
      highIntent ? "判断意向：较高" : "判断意向：普通",
      wantsHuman ? "触发转人工规则" : "生成自动回复",
      phone ? "已捕获手机号" : "等待客户留下手机号"
    ]
  };
}

function normalizeAiResult(result, message, business) {
  const safe = result && typeof result === "object" ? result : fallbackAI(message, business);
  const lead = safe.lead && typeof safe.lead === "object" ? safe.lead : {};
  return {
    reply: String(safe.reply || "收到，我先帮你登记。请留下姓名、手机号和想预约的时间。"),
    lead: normalizeStoredLead({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "new",
      channel: "网站聊天",
      businessId: business.id,
      name: String(lead.name || ""),
      phone: String(lead.phone || ""),
      service: String(lead.service || detectService(message, business)),
      requestedTime: String(lead.requestedTime || detectRequestedTime(message)),
      intentScore: Math.max(1, Math.min(5, Number(lead.intentScore || 2))),
      urgency: ["低", "普通", "高"].includes(lead.urgency) ? lead.urgency : "普通",
      needsHuman: Boolean(lead.needsHuman),
      notes: String(lead.notes || message),
      lastCustomerMessage: message,
      adminNote: "",
      nextAction: String(lead.nextAction || "继续跟进")
    }),
    actionLog: Array.isArray(safe.actionLog) && safe.actionLog.length
      ? safe.actionLog.map(String).slice(0, 6)
      : ["已生成回复", "已整理线索"]
  };
}

function shouldSaveLead(lead) {
  return lead.intentScore >= 3 || lead.phone || lead.needsHuman || lead.requestedTime !== "待确认";
}

async function createSession(env, scope, businessId) {
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const days = Math.max(1, Number(env.SESSION_TTL_DAYS || 7));
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO sessions (token, scope, business_id, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, scope, businessId || "", expiresAt)
    .run();
  return token;
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function maybeSession(env, request, scope, businessId) {
  const token = bearerToken(request);
  if (!token) return false;
  const row = await env.DB.prepare("SELECT scope, business_id, expires_at FROM sessions WHERE token = ?").bind(token).first();
  if (!row || Number(row.expires_at) <= Date.now()) return false;
  return row.scope === scope && (scope === "platform" || row.business_id === businessId);
}

async function requireSession(env, request, scope, businessId) {
  if (await maybeSession(env, request, scope, businessId)) return true;
  throw new HttpError(scope === "platform" ? "需要平台登录" : "需要老板登录", 401);
}

async function deleteBearerSession(env, request) {
  const token = bearerToken(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csvRowsForLeads(leads) {
  return [
    ["创建时间", "状态", "服务", "手机号", "预约时间", "意向分", "紧急程度", "需人工", "客户消息", "老板备注", "下一步"],
    ...leads.map((lead) => [
      lead.createdAt,
      lead.status,
      lead.service,
      lead.phone,
      lead.requestedTime,
      lead.intentScore,
      lead.urgency,
      lead.needsHuman ? "是" : "否",
      lead.lastCustomerMessage || lead.notes,
      lead.adminNote,
      lead.nextAction
    ])
  ];
}

function buildSystemPrompt(business) {
  return `
你是「${business.name}」的 AI 接待员，行业是「${business.category}」。你的目标是：快速回答客户问题、收集预约信息、判断意向、把需要老板处理的客户转人工。

门店资料：
- 店名：${business.name}
- 地址：${business.address}
- 电话：${business.phone}
- 营业时间：${business.hours}
- 预约规则：${business.bookingPolicy}

服务与价格：
${business.services.map((item) => `- ${item.name}：${item.price}，约 ${item.duration}`).join("\n")}

必须转人工的情况：
${business.humanRules.map((rule) => `- ${rule}`).join("\n")}

回复要求：
- 使用简体中文。
- 语气像真人前台，亲切但不要油腻。
- 不要承诺最终档期，只能说“可以先帮你预留/登记，最终由店里确认”。
- 如果客户没有留下手机号，要自然索取手机号。
- 输出 JSON，字段为 reply, lead, actionLog。
`.trim();
}

function compactHistory(history) {
  if (!Array.isArray(history)) return "";
  return history
    .slice(-8)
    .map((item) => `${item.role === "assistant" ? "AI" : "客户"}：${String(item.content || "").slice(0, 500)}`)
    .join("\n");
}

async function callOpenAI(env, message, history, business) {
  const input = [
    buildSystemPrompt(business),
    "",
    "最近对话：",
    compactHistory(history) || "暂无",
    "",
    `客户最新消息：${message}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "business_receptionist",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["reply", "lead", "actionLog"],
            properties: {
              reply: { type: "string" },
              lead: {
                type: "object",
                additionalProperties: false,
                required: ["name", "phone", "service", "requestedTime", "intentScore", "urgency", "needsHuman", "notes", "nextAction"],
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  service: { type: "string" },
                  requestedTime: { type: "string" },
                  intentScore: { type: "integer", minimum: 1, maximum: 5 },
                  urgency: { type: "string", enum: ["低", "普通", "高"] },
                  needsHuman: { type: "boolean" },
                  notes: { type: "string" },
                  nextAction: { type: "string" }
                }
              },
              actionLog: { type: "array", items: { type: "string" } }
            }
          },
          strict: true
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `OpenAI API 返回 ${response.status}`);
  const text = extractOutputText(data);
  if (!text) throw new Error("OpenAI 返回为空");
  return JSON.parse(text);
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  if (!Array.isArray(data.output)) return "";
  const parts = [];
  for (const item of data.output) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (typeof content.text === "string") parts.push(content.text);
      if (typeof content.output_text === "string") parts.push(content.output_text);
    }
  }
  return parts.join("\n").trim();
}

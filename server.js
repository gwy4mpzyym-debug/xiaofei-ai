const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8756);
const HOST = process.env.HOST || "0.0.0.0";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ROOT = __dirname;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto
  .createHash("sha256")
  .update(`multi-business-ai:${ROOT}`)
  .digest("hex");
const PUBLIC_DIR = path.join(ROOT, "public");
const SERVERLESS_DATA_DIR = (process.env.NETLIFY || process.env.VERCEL) ? "/tmp/xiaofei-ai-data" : "";
const DATA_DIR = process.env.DATA_DIR || SERVERLESS_DATA_DIR || path.join(ROOT, "data");
const BUSINESSES_FILE = path.join(DATA_DIR, "businesses.json");
const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD || "admin123";
const LEAD_STATUSES = ["new", "contacted", "booked", "done", "archived"];
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
      { name: "单剪", price: "19 元", duration: "30 分钟", aliases: ["剪", "单剪", "理发", "头发", "发型", "儿童", "小孩", "孩子"] },
      { name: "烫发", price: "99 元", duration: "2-3 小时", aliases: ["烫", "烫发", "卷"] }
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
      { name: "基础面部护理", price: "99 元", duration: "60 分钟", aliases: ["面部", "护理", "补水", "清洁"] },
      { name: "美甲", price: "68 元起", duration: "60-90 分钟", aliases: ["美甲", "指甲", "甲片"] },
      { name: "肩颈放松", price: "88 元", duration: "45 分钟", aliases: ["肩颈", "按摩", "放松"] }
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
      updatedAt: ""
    }
  }
};

const DEFAULT_BUSINESS_ID = "xiaofei";
let businesses = {};

const leadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "lead", "actionLog"],
  properties: {
    reply: {
      type: "string",
      description: "面向客户的中文回复，语气自然、简洁、像理发店前台。"
    },
    lead: {
      type: "object",
      additionalProperties: false,
      required: [
        "name",
        "phone",
        "service",
        "requestedTime",
        "intentScore",
        "urgency",
        "needsHuman",
        "notes",
        "nextAction"
      ],
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
    actionLog: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 6
    }
  }
};

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
  if (!plan) throw new Error("套餐不存在");

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
  return business.subscription;
}

function activateTrial(business) {
  const current = subscriptionStatus(business.subscription);
  if (current.trialUsed) throw new Error("该商家已经使用过 7 天免费试用");
  if (current.paidUsed) throw new Error("该商家已经开通过付费订阅，不能再使用免费试用");
  if (current.active) throw new Error("该商家已有有效订阅，不需要开通试用");

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
  return business.subscription;
}

function deactivateSubscription(business) {
  business.subscription = {
    ...normalizeSubscription(business.subscription),
    updatedAt: new Date().toISOString()
  };
  business.subscription.expiresAt = new Date().toISOString();
  return business.subscription;
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

function normalizeService(service) {
  const name = String(service.name || "").trim();
  const price = String(service.price || "").trim();
  const duration = String(service.duration || "待确认").trim();
  const aliases = Array.isArray(service.aliases)
    ? service.aliases
    : String(service.aliases || name)
      .split(/[,，、\s]+/)
      .filter(Boolean);
  return {
    name: name || "服务项目",
    price: price || "到店咨询",
    duration: duration || "待确认",
    aliases: Array.from(new Set([name, ...aliases].filter(Boolean)))
  };
}

function normalizeBusiness(input, existingId = "") {
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

function loadBusinesses() {
  ensureDataFile();
  if (!fs.existsSync(BUSINESSES_FILE)) {
    businesses = clone(DEFAULT_BUSINESSES);
    saveBusinesses();
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(BUSINESSES_FILE, "utf8"));
    businesses = Object.fromEntries(Object.entries(data).map(([id, business]) => [id, normalizeBusiness(business, id)]));
  } catch {
    businesses = clone(DEFAULT_BUSINESSES);
    saveBusinesses();
  }
}

function saveBusinesses() {
  ensureDataFile();
  fs.writeFileSync(BUSINESSES_FILE, `${JSON.stringify(businesses, null, 2)}\n`, "utf8");
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

function getBusiness(id) {
  return businesses[id] || businesses[DEFAULT_BUSINESS_ID];
}

function businessIdFromUrl(url) {
  const requested = url.searchParams.get("business") || DEFAULT_BUSINESS_ID;
  return businesses[requested] ? requested : DEFAULT_BUSINESS_ID;
}

function businessIdFromReq(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return businessIdFromUrl(url);
}

function leadFileForBusiness(businessId) {
  return path.join(DATA_DIR, `${businessId}-leads.json`);
}

function ensureLeadFile(businessId) {
  ensureDataFile();
  const file = leadFileForBusiness(businessId);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]\n", "utf8");
  }
  return file;
}

function readLeads(businessId) {
  const file = ensureLeadFile(businessId);
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLeads(businessId, leads) {
  const file = ensureLeadFile(businessId);
  fs.writeFileSync(file, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
}

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(body);
}

function sendCsv(res, filename, rows) {
  const body = `\ufeff${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return [part, ""];
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    }));
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createAdminToken(businessId) {
  const payload = Buffer.from(JSON.stringify({
    scope: "admin",
    businessId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function createPlatformToken() {
  const payload = Buffer.from(JSON.stringify({
    scope: "platform",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (sign(payload) !== signature) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Number(data.exp) <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function verifyAdminToken(token, businessId) {
  const data = readSessionToken(token);
  return Boolean(data && data.scope === "admin" && data.businessId === businessId);
}

function verifyPlatformToken(token) {
  const data = readSessionToken(token);
  return Boolean(data && data.scope === "platform");
}

function passwordMatches(password, business) {
  const left = crypto.createHash("sha256").update(String(password)).digest();
  const right = crypto.createHash("sha256").update(business.adminPassword).digest();
  return crypto.timingSafeEqual(left, right);
}

function platformPasswordMatches(password) {
  const left = crypto.createHash("sha256").update(String(password)).digest();
  const right = crypto.createHash("sha256").update(PLATFORM_PASSWORD).digest();
  return crypto.timingSafeEqual(left, right);
}

function cookieNameForBusiness(businessId) {
  return `ai_admin_${businessId}`;
}

function isAdmin(req, businessId) {
  return verifyAdminToken(parseCookies(req)[cookieNameForBusiness(businessId)], businessId);
}

function isPlatformAdmin(req) {
  return verifyPlatformToken(parseCookies(req).ai_platform_session);
}

function requireAdmin(req, res, businessId) {
  if (isAdmin(req, businessId)) return true;
  sendJson(res, 401, { error: "需要老板登录" });
  return false;
}

function requirePlatformAdmin(req, res) {
  if (isPlatformAdmin(req)) return true;
  sendJson(res, 401, { error: "需要平台登录" });
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("请求内容太大"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON 格式不正确"));
      }
    });
    req.on("error", reject);
  });
}

function buildSystemPrompt(business) {
  const serviceLines = business.services
    .map((item) => `- ${item.name}：${item.price}，约 ${item.duration}`)
    .join("\n");
  const ruleLines = business.humanRules.map((rule) => `- ${rule}`).join("\n");

  return `
你是「${business.name}」的 AI 接待员，行业是「${business.category}」。你的目标是：快速回答客户问题、收集预约信息、判断意向、把需要老板处理的客户转人工。

门店资料：
- 店名：${business.name}
- 地址：${business.address}
- 电话：${business.phone}
- 营业时间：${business.hours}
- 预约规则：${business.bookingPolicy}

服务与价格：
${serviceLines}

必须转人工的情况：
${ruleLines}

回复要求：
- 使用简体中文。
- 语气像真人前台，亲切但不要油腻。
- 不要承诺最终档期，只能说“可以先帮你预留/登记，最终由店里确认”。
- 涉及过敏、头皮损伤、退款投诉、复杂烫染方案时必须 needsHuman=true。
- 如果客户没有留下手机号，要自然索取手机号。
- 如果客户想预约，要问清楚服务项目、希望时间、姓名和手机号。
- 输出必须完全符合 JSON schema，不要输出多余文字。
`.trim();
}

function compactHistory(history) {
  if (!Array.isArray(history)) return "";
  return history
    .slice(-8)
    .map((item) => `${item.role === "assistant" ? "AI" : "客户"}：${String(item.content || "").slice(0, 500)}`)
    .join("\n");
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

async function callOpenAI(message, history, business) {
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
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "business_receptionist",
          description: "小企业 AI 接待回复和线索结构化信息。",
          strict: true,
          schema: leadSchema
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const detail = data.error?.message || `OpenAI API 返回 ${response.status}`;
    throw new Error(detail);
  }

  const text = extractOutputText(data);
  if (!text) throw new Error("OpenAI 返回为空");
  return JSON.parse(text);
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
      nextAction: wantsHuman
        ? "通知老板人工接手"
        : phone
          ? "联系客户确认档期"
          : "继续索取姓名和手机号"
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
    lead: {
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
    },
    actionLog: Array.isArray(safe.actionLog) && safe.actionLog.length
      ? safe.actionLog.map(String).slice(0, 6)
      : ["已生成回复", "已整理线索"]
  };
}

function shouldSaveLead(lead) {
  return lead.intentScore >= 3 || lead.phone || lead.needsHuman || lead.requestedTime !== "待确认";
}

function normalizeStoredLead(lead) {
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

function leadStats(leads) {
  return {
    total: leads.length,
    new: leads.filter((lead) => normalizeStoredLead(lead).status === "new").length,
    highIntent: leads.filter((lead) => Number(lead.intentScore) >= 4).length,
    needsHuman: leads.filter((lead) => Boolean(lead.needsHuman)).length,
    booked: leads.filter((lead) => normalizeStoredLead(lead).status === "booked").length
  };
}

function csvRowsForLeads(leads) {
  return [
    ["创建时间", "状态", "渠道", "服务", "预约时间", "姓名", "手机号", "意向分", "紧急程度", "需人工", "下一步", "客户消息", "老板备注"],
    ...leads.map((lead) => {
      const safe = normalizeStoredLead(lead);
      return [
        safe.createdAt,
        safe.status,
        safe.channel,
        safe.service,
        safe.requestedTime,
        safe.name,
        safe.phone,
        safe.intentScore,
        safe.urgency,
        safe.needsHuman ? "是" : "否",
        safe.nextAction,
        safe.lastCustomerMessage || safe.notes,
        safe.adminNote
      ];
    })
  ];
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = decodeURIComponent(url.pathname);
  if (requestPath === "/" && url.searchParams.has("business")) {
    res.writeHead(302, { Location: `/chat?business=${encodeURIComponent(url.searchParams.get("business"))}` });
    res.end();
    return;
  }

  let cleanPath = requestPath === "/" ? "/platform.html" : requestPath;
  if (cleanPath === "/chat") cleanPath = "/index.html";
  if (cleanPath === "/admin") cleanPath = "/admin.html";
  if (cleanPath === "/platform") cleanPath = "/platform.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, cleanPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    }[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const businessId = businessIdFromUrl(url);
  const business = getBusiness(businessId);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      mode: OPENAI_API_KEY ? "openai" : "demo",
      businessCount: Object.keys(businesses).length,
      uptimeSeconds: Math.round(process.uptime())
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, {
      business: publicBusiness(business),
      businesses: Object.values(businesses).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        initials: item.initials,
        subscription: subscriptionStatus(item.subscription)
      })),
      subscriptionTrial: subscriptionTrial(),
      subscriptionPlans: subscriptionPlans(),
      mode: OPENAI_API_KEY ? "openai" : "demo",
      model: OPENAI_API_KEY ? OPENAI_MODEL : "演示模式"
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/platform/login") {
    try {
      const body = await readBody(req);
      if (!platformPasswordMatches(body.password || "")) {
        sendJson(res, 401, { error: "平台密码不正确" });
        return;
      }

      sendJson(res, 200, { ok: true }, {
        "Set-Cookie": `ai_platform_session=${encodeURIComponent(createPlatformToken())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "登录失败" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/platform/logout") {
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": "ai_platform_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/platform/me") {
    sendJson(res, isPlatformAdmin(req) ? 200 : 401, isPlatformAdmin(req) ? { ok: true } : { error: "需要平台登录" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/platform/businesses") {
    sendJson(res, 200, {
      businesses: Object.values(businesses).map((item) => isPlatformAdmin(req) ? platformBusiness(item) : publicBusiness(item)),
      subscriptionTrial: subscriptionTrial(),
      subscriptionPlans: subscriptionPlans()
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/platform/businesses") {
    if (!requirePlatformAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const business = normalizeBusiness({
        id: body.id,
        name: body.name,
        category: body.category,
        adminPassword: body.adminPassword,
        phone: body.phone,
        address: body.address,
        hours: body.hours,
        bookingPolicy: body.bookingPolicy,
        services: body.services,
        humanRules: body.humanRules
      });

      if (businesses[business.id]) {
        sendJson(res, 409, { error: "这个商家 ID 已存在，请换一个" });
        return;
      }

      businesses[business.id] = business;
      saveBusinesses();
      ensureLeadFile(business.id);
      sendJson(res, 201, { business: publicBusiness(business) });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "新增商家失败" });
    }
    return;
  }

  const subscriptionMatch = url.pathname.match(/^\/api\/platform\/businesses\/([^/]+)\/subscription$/);
  if (req.method === "POST" && subscriptionMatch) {
    if (!requirePlatformAdmin(req, res)) return;
    try {
      const id = decodeURIComponent(subscriptionMatch[1]);
      if (!businesses[id]) {
        sendJson(res, 404, { error: "商家不存在" });
        return;
      }

      const body = await readBody(req);
      if (body.action === "deactivate") {
        deactivateSubscription(businesses[id]);
      } else if (body.action === "trial") {
        activateTrial(businesses[id]);
      } else {
        activateSubscription(businesses[id], body.planId);
      }
      saveBusinesses();
      sendJson(res, 200, { business: platformBusiness(businesses[id]), subscription: subscriptionStatus(businesses[id].subscription) });
    } catch (error) {
      const message = error.message || "订阅更新失败";
      const status = /已经|不能|不需要|不存在/.test(message) ? 400 : 500;
      sendJson(res, status, { error: message });
    }
    return;
  }

  const platformBusinessMatch = url.pathname.match(/^\/api\/platform\/businesses\/([^/]+)$/);
  if (req.method === "PUT" && platformBusinessMatch) {
    if (!requirePlatformAdmin(req, res)) return;
    try {
      const id = decodeURIComponent(platformBusinessMatch[1]);
      if (!businesses[id]) {
        sendJson(res, 404, { error: "商家不存在" });
        return;
      }

      const body = await readBody(req);
      const business = normalizeBusiness({
        ...businesses[id],
        name: body.name,
        category: body.category,
        adminPassword: body.adminPassword || businesses[id].adminPassword,
        phone: body.phone,
        address: body.address,
        hours: body.hours,
        bookingPolicy: body.bookingPolicy,
        services: body.services,
        humanRules: body.humanRules,
        subscription: businesses[id].subscription
      }, id);
      business.id = id;
      businesses[id] = business;
      saveBusinesses();
      sendJson(res, 200, { business: publicBusiness(business) });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "更新商家失败" });
    }
    return;
  }

  if (req.method === "DELETE" && platformBusinessMatch) {
    if (!requirePlatformAdmin(req, res)) return;
    const id = decodeURIComponent(platformBusinessMatch[1]);
    if (!businesses[id]) {
      sendJson(res, 404, { error: "商家不存在" });
      return;
    }
    if (id === DEFAULT_BUSINESS_ID) {
      sendJson(res, 400, { error: "默认样板商家不能删除" });
      return;
    }
    delete businesses[id];
    saveBusinesses();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    try {
      const body = await readBody(req);
      if (!passwordMatches(body.password || "", business)) {
        sendJson(res, 401, { error: "密码不正确" });
        return;
      }

      sendJson(res, 200, { ok: true }, {
        "Set-Cookie": `${cookieNameForBusiness(businessId)}=${encodeURIComponent(createAdminToken(businessId))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "登录失败" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `${cookieNameForBusiness(businessId)}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/me") {
    sendJson(res, isAdmin(req, businessId) ? 200 : 401, isAdmin(req, businessId) ? { ok: true, business: publicBusiness(business) } : { error: "需要老板登录" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/leads") {
    if (!requireAdmin(req, res, businessId)) return;
    const leads = readLeads(businessId).map((lead) => normalizeStoredLead({ ...lead, businessId }));
    const status = url.searchParams.get("status") || "";
    const filtered = LEAD_STATUSES.includes(status)
      ? leads.filter((lead) => lead.status === status)
      : leads;
    sendJson(res, 200, {
      leads: filtered.slice(-200).reverse(),
      stats: leadStats(leads),
      statuses: LEAD_STATUSES
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/export.csv") {
    if (!requireAdmin(req, res, businessId)) return;
    sendCsv(res, `${businessId}-leads.csv`, csvRowsForLeads(readLeads(businessId).map((lead) => normalizeStoredLead({ ...lead, businessId })).reverse()));
    return;
  }

  const leadStatusMatch = url.pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
  if (req.method === "PATCH" && leadStatusMatch) {
    if (!requireAdmin(req, res, businessId)) return;
    try {
      const body = await readBody(req);
      const id = decodeURIComponent(leadStatusMatch[1]);
      const leads = readLeads(businessId).map((lead) => normalizeStoredLead({ ...lead, businessId }));
      const index = leads.findIndex((lead) => lead.id === id);
      if (index === -1) {
        sendJson(res, 404, { error: "线索不存在" });
        return;
      }

      if (body.status && LEAD_STATUSES.includes(body.status)) {
        leads[index].status = body.status;
      }
      if (typeof body.adminNote === "string") {
        leads[index].adminNote = body.adminNote.slice(0, 1000);
      }
      if (typeof body.nextAction === "string") {
        leads[index].nextAction = body.nextAction.slice(0, 1000);
      }
      leads[index].updatedAt = new Date().toISOString();
      writeLeads(businessId, leads);
      sendJson(res, 200, { lead: leads[index], stats: leadStats(leads) });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "更新失败" });
    }
    return;
  }

  if (req.method === "DELETE" && leadStatusMatch) {
    if (!requireAdmin(req, res, businessId)) return;
    const id = decodeURIComponent(leadStatusMatch[1]);
    const leads = readLeads(businessId).map((lead) => normalizeStoredLead({ ...lead, businessId }));
    const next = leads.filter((lead) => lead.id !== id);
    if (next.length === leads.length) {
      sendJson(res, 404, { error: "线索不存在" });
      return;
    }
    writeLeads(businessId, next);
    sendJson(res, 200, { ok: true, stats: leadStats(next) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/reset") {
    if (!requireAdmin(req, res, businessId)) return;
    writeLeads(businessId, []);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    try {
      const subscription = subscriptionStatus(business.subscription);
      if (!subscription.active) {
        sendJson(res, 402, {
          error: subscription.status === "expired"
            ? `该商家的 AI 订阅已到期（${subscription.expiresDate}），续费后可继续使用。`
            : "该商家还没有开通 AI 订阅，开通后才能使用自动接待。",
          subscription
        });
        return;
      }

      const body = await readBody(req);
      const message = String(body.message || "").trim();
      if (!message) {
        sendJson(res, 400, { error: "消息不能为空" });
        return;
      }

      let source = "demo";
      let rawResult;
      let apiError = "";

      if (OPENAI_API_KEY) {
        try {
          rawResult = await callOpenAI(message, body.history, business);
          source = "openai";
        } catch (error) {
          apiError = error.message;
          rawResult = fallbackAI(message, business);
        }
      } else {
        rawResult = fallbackAI(message, business);
      }

      const result = normalizeAiResult(rawResult, message, business);
      if (shouldSaveLead(result.lead)) {
        const leads = readLeads(businessId);
        leads.push(result.lead);
        writeLeads(businessId, leads.slice(-200));
      }

      sendJson(res, 200, {
        ...result,
        source,
        apiError,
        saved: shouldSaveLead(result.lead)
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "服务器错误" });
    }
    return;
  }

  sendJson(res, 404, { error: "API 不存在" });
}

loadBusinesses();

function appHandler(req, res) {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
  } else {
    serveStatic(req, res);
  }
}

Object.keys(businesses).forEach(ensureLeadFile);

if (require.main === module) {
  const server = http.createServer(appHandler);
  server.listen(PORT, HOST, () => {
    console.log(`多商家 AI 自动化系统已启动: http://127.0.0.1:${PORT}`);
    console.log(OPENAI_API_KEY ? `OpenAI 模式：${OPENAI_MODEL}` : "演示模式：未设置 OPENAI_API_KEY");
  });
}

module.exports = appHandler;

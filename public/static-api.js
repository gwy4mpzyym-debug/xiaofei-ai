(() => {
  const params = new URLSearchParams(location.search);
  const enabled = !window.XIAOFEI_API?.enabled?.()
    && (location.hostname.endsWith(".github.io") || location.protocol === "file:" || params.has("static"));
  const PREFIX = "xiaofei-ai-static-v1:";
  const DEFAULT_BUSINESS_ID = "xiaofei";
  const PLATFORM_PASSWORD = "admin123";
  const LEAD_STATUSES = ["new", "contacted", "booked", "done", "archived"];
  const TRIAL_PLAN = {
    id: "trial",
    name: "7天免费试用",
    days: 7,
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

  window.XIAOFEI_STATIC_API = {
    enabled,
    exportCsv: (businessId = DEFAULT_BUSINESS_ID) => csvForLeads(readLeads(businessId))
  };

  if (!enabled) return;

  const realFetch = window.fetch.bind(window);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function storeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch {
      return clone(fallback);
    }
  }

  function storeSet(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Static demo mode can continue even if storage is blocked.
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function randomId() {
    return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  function addMonths(value, months) {
    const date = new Date(value);
    const day = date.getDate();
    date.setMonth(date.getMonth() + months);
    if (date.getDate() !== day) date.setDate(0);
    return date;
  }

  function validIso(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function subscriptionPlan(planId) {
    return planId === TRIAL_PLAN.id ? TRIAL_PLAN : SUBSCRIPTION_PLANS[planId] || null;
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

  function loadBusinesses() {
    const data = storeGet("businesses", DEFAULT_BUSINESSES);
    return Object.fromEntries(Object.entries(data).map(([id, business]) => [id, normalizeBusiness(business, id)]));
  }

  function saveBusinesses(businesses) {
    storeSet("businesses", businesses);
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

  function businessIdFromUrl(url) {
    const businesses = loadBusinesses();
    const requested = url.searchParams.get("business") || DEFAULT_BUSINESS_ID;
    return businesses[requested] ? requested : DEFAULT_BUSINESS_ID;
  }

  function getBusiness(id) {
    const businesses = loadBusinesses();
    return businesses[id] || businesses[DEFAULT_BUSINESS_ID];
  }

  function leadsKey(businessId) {
    return `leads:${businessId}`;
  }

  function readLeads(businessId) {
    return storeGet(leadsKey(businessId), []).map((lead) => normalizeStoredLead({ ...lead, businessId }));
  }

  function writeLeads(businessId, leads) {
    storeSet(leadsKey(businessId), leads.slice(-200));
  }

  function normalizeStoredLead(lead = {}) {
    return {
      id: lead.id || randomId(),
      createdAt: lead.createdAt || nowIso(),
      updatedAt: lead.updatedAt || lead.createdAt || nowIso(),
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
        id: randomId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        status: "new",
        channel: "网站聊天",
        businessId: business.id,
        name: "",
        phone,
        service,
        requestedTime,
        intentScore: highIntent ? 4 : 2,
        urgency: /今天|马上|现在|急/.test(message) ? "高" : "普通",
        needsHuman: wantsHuman,
        notes: message,
        lastCustomerMessage: message,
        adminNote: "",
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

  function shouldSaveLead(lead) {
    return lead.intentScore >= 3 || lead.phone || lead.needsHuman || lead.requestedTime !== "待确认";
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
      expiresAt: addDays(now, TRIAL_PLAN.days).toISOString(),
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
      expiresAt: nowIso(),
      updatedAt: nowIso()
    };
    return business.subscription;
  }

  function isPlatformAdmin() {
    return localStorage.getItem(PREFIX + "platform-session") === "1";
  }

  function isAdmin(businessId) {
    return localStorage.getItem(PREFIX + `admin-session:${businessId}`) === "1";
  }

  function requirePlatformAdmin() {
    if (!isPlatformAdmin()) throw Object.assign(new Error("需要平台登录"), { status: 401 });
  }

  function requireAdmin(businessId) {
    if (!isAdmin(businessId)) throw Object.assign(new Error("需要老板登录"), { status: 401 });
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function csvForLeads(leads) {
    const rows = [
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
    return `\ufeff${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  function csvResponse(data) {
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  function apiInfo(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : input?.url;
    if (!rawUrl) return null;
    const url = new URL(rawUrl, location.origin);
    const index = url.pathname.indexOf("/api/");
    if (index === -1) return null;
    return {
      url,
      pathname: url.pathname.slice(index),
      method: String(init.method || input.method || "GET").toUpperCase()
    };
  }

  async function requestJson(input, init = {}) {
    const body = init.body || "";
    if (!body) return {};
    if (typeof body === "string") return JSON.parse(body);
    if (body instanceof Blob) return JSON.parse(await body.text());
    return {};
  }

  async function route(input, init = {}) {
    const info = apiInfo(input, init);
    const { url, pathname, method } = info;
    const businessId = businessIdFromUrl(url);
    const business = getBusiness(businessId);

    if (method === "GET" && pathname === "/api/health") {
      return jsonResponse({ ok: true, mode: "static", businessCount: Object.keys(loadBusinesses()).length, uptimeSeconds: 0 });
    }

    if (method === "GET" && pathname === "/api/config") {
      const businesses = loadBusinesses();
      return jsonResponse({
        business: publicBusiness(business),
        businesses: Object.values(businesses).map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          initials: item.initials,
          subscription: subscriptionStatus(item.subscription)
        })),
        subscriptionTrial: { ...TRIAL_PLAN },
        subscriptionPlans: Object.values(SUBSCRIPTION_PLANS),
        mode: "demo",
        model: "GitHub Pages 永久演示版"
      });
    }

    if (method === "POST" && pathname === "/api/chat") {
      const subscription = subscriptionStatus(business.subscription);
      if (!subscription.active) {
        return jsonResponse({ error: "该商家还没有开通 AI 订阅，开通后才能使用自动接待。", subscription }, 402);
      }
      const body = await requestJson(input, init);
      const message = String(body.message || "").trim();
      if (!message) return jsonResponse({ error: "消息不能为空" }, 400);
      const result = fallbackAI(message, business);
      if (shouldSaveLead(result.lead)) {
        const leads = readLeads(business.id);
        leads.push(result.lead);
        writeLeads(business.id, leads);
      }
      return jsonResponse({ ...result, source: "static", apiError: "", saved: shouldSaveLead(result.lead) });
    }

    if (method === "POST" && pathname === "/api/platform/login") {
      const body = await requestJson(input, init);
      if (String(body.password || "") !== PLATFORM_PASSWORD) return jsonResponse({ error: "平台密码不正确" }, 401);
      localStorage.setItem(PREFIX + "platform-session", "1");
      return jsonResponse({ ok: true });
    }

    if (method === "POST" && pathname === "/api/platform/logout") {
      localStorage.removeItem(PREFIX + "platform-session");
      return jsonResponse({ ok: true });
    }

    if (method === "GET" && pathname === "/api/platform/me") {
      return isPlatformAdmin() ? jsonResponse({ ok: true }) : jsonResponse({ error: "需要平台登录" }, 401);
    }

    if (method === "GET" && pathname === "/api/platform/businesses") {
      const businesses = Object.values(loadBusinesses()).map((item) => isPlatformAdmin() ? platformBusiness(item) : publicBusiness(item));
      return jsonResponse({
        businesses,
        subscriptionTrial: { ...TRIAL_PLAN },
        subscriptionPlans: Object.values(SUBSCRIPTION_PLANS)
      });
    }

    if (method === "POST" && pathname === "/api/platform/businesses") {
      requirePlatformAdmin();
      const body = await requestJson(input, init);
      const businesses = loadBusinesses();
      const next = normalizeBusiness({ ...body, subscription: body.subscription || {} });
      if (businesses[next.id]) return jsonResponse({ error: "商家 ID 已存在" }, 409);
      businesses[next.id] = next;
      saveBusinesses(businesses);
      return jsonResponse({ business: platformBusiness(next) }, 201);
    }

    const businessMatch = pathname.match(/^\/api\/platform\/businesses\/([^/]+)$/);
    if (businessMatch && method === "PUT") {
      requirePlatformAdmin();
      const id = decodeURIComponent(businessMatch[1]);
      const businesses = loadBusinesses();
      if (!businesses[id]) return jsonResponse({ error: "商家不存在" }, 404);
      const body = await requestJson(input, init);
      businesses[id] = normalizeBusiness({
        ...businesses[id],
        ...body,
        id,
        adminPassword: body.adminPassword || businesses[id].adminPassword,
        subscription: businesses[id].subscription
      }, id);
      saveBusinesses(businesses);
      return jsonResponse({ business: platformBusiness(businesses[id]) });
    }

    if (businessMatch && method === "DELETE") {
      requirePlatformAdmin();
      const id = decodeURIComponent(businessMatch[1]);
      const businesses = loadBusinesses();
      if (!businesses[id]) return jsonResponse({ error: "商家不存在" }, 404);
      delete businesses[id];
      saveBusinesses(businesses);
      writeLeads(id, []);
      return jsonResponse({ ok: true });
    }

    const subscriptionMatch = pathname.match(/^\/api\/platform\/businesses\/([^/]+)\/subscription$/);
    if (subscriptionMatch && method === "POST") {
      requirePlatformAdmin();
      const id = decodeURIComponent(subscriptionMatch[1]);
      const businesses = loadBusinesses();
      const item = businesses[id];
      if (!item) return jsonResponse({ error: "商家不存在" }, 404);
      const body = await requestJson(input, init);
      const action = String(body.action || "activate");
      if (action === "trial") activateTrial(item);
      else if (action === "deactivate") deactivateSubscription(item);
      else activateSubscription(item, String(body.planId || ""));
      businesses[id] = item;
      saveBusinesses(businesses);
      return jsonResponse({ business: platformBusiness(item), subscription: subscriptionStatus(item.subscription) });
    }

    if (method === "POST" && pathname === "/api/admin/login") {
      const body = await requestJson(input, init);
      if (String(body.password || "") !== business.adminPassword) return jsonResponse({ error: "后台密码不正确" }, 401);
      localStorage.setItem(PREFIX + `admin-session:${businessId}`, "1");
      return jsonResponse({ ok: true });
    }

    if (method === "POST" && pathname === "/api/admin/logout") {
      localStorage.removeItem(PREFIX + `admin-session:${businessId}`);
      return jsonResponse({ ok: true });
    }

    if (method === "GET" && pathname === "/api/admin/me") {
      return isAdmin(businessId) ? jsonResponse({ ok: true }) : jsonResponse({ error: "需要老板登录" }, 401);
    }

    if (method === "GET" && pathname === "/api/admin/leads") {
      requireAdmin(businessId);
      const leads = readLeads(businessId);
      const status = url.searchParams.get("status") || "";
      const filtered = LEAD_STATUSES.includes(status) ? leads.filter((lead) => lead.status === status) : leads;
      return jsonResponse({
        leads: filtered.slice(-200).reverse(),
        stats: leadStats(leads),
        statuses: LEAD_STATUSES
      });
    }

    if (method === "GET" && pathname === "/api/admin/export.csv") {
      requireAdmin(businessId);
      return csvResponse(csvForLeads(readLeads(businessId).reverse()));
    }

    const leadMatch = pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
    if (leadMatch && method === "PATCH") {
      requireAdmin(businessId);
      const id = decodeURIComponent(leadMatch[1]);
      const body = await requestJson(input, init);
      const leads = readLeads(businessId);
      const index = leads.findIndex((lead) => lead.id === id);
      if (index === -1) return jsonResponse({ error: "线索不存在" }, 404);
      if (body.status && LEAD_STATUSES.includes(body.status)) leads[index].status = body.status;
      if (typeof body.adminNote === "string") leads[index].adminNote = body.adminNote.slice(0, 1000);
      if (typeof body.nextAction === "string") leads[index].nextAction = body.nextAction.slice(0, 1000);
      leads[index].updatedAt = nowIso();
      writeLeads(businessId, leads);
      return jsonResponse({ lead: leads[index], stats: leadStats(leads) });
    }

    if (leadMatch && method === "DELETE") {
      requireAdmin(businessId);
      const id = decodeURIComponent(leadMatch[1]);
      const leads = readLeads(businessId);
      const next = leads.filter((lead) => lead.id !== id);
      if (next.length === leads.length) return jsonResponse({ error: "线索不存在" }, 404);
      writeLeads(businessId, next);
      return jsonResponse({ ok: true, stats: leadStats(next) });
    }

    if (method === "POST" && pathname === "/api/admin/reset") {
      requireAdmin(businessId);
      writeLeads(businessId, []);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "API 不存在" }, 404);
  }

  window.fetch = async (input, init = {}) => {
    if (!apiInfo(input, init)) return realFetch(input, init);
    try {
      return await route(input, init);
    } catch (error) {
      return jsonResponse({ error: error.message || "请求失败" }, error.status || 500);
    }
  };
})();

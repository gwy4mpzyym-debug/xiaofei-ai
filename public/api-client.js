(() => {
  const TOKEN_PREFIX = "xiaofei-ai-token:";

  function apiBase() {
    return String(window.XIAOFEI_API_BASE || "").trim().replace(/\/+$/, "");
  }

  function tokenKey(scope, businessId = "") {
    return `${TOKEN_PREFIX}${scope}${businessId ? `:${businessId}` : ""}`;
  }

  function getToken(scope, businessId = "") {
    return localStorage.getItem(tokenKey(scope, businessId)) || "";
  }

  function setToken(scope, businessId, token) {
    if (!token) return;
    localStorage.setItem(tokenKey(scope, businessId), token);
  }

  function clearToken(scope, businessId = "") {
    localStorage.removeItem(tokenKey(scope, businessId));
  }

  function urlFor(path, businessId = "") {
    const base = apiBase();
    const url = new URL(path, base || location.origin);
    if (businessId && url.pathname.startsWith("/api/") && !url.searchParams.has("business")) {
      url.searchParams.set("business", businessId);
    }
    return base ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  }

  async function request(path, options = {}) {
    const {
      businessId = "",
      scope = "",
      ...fetchOptions
    } = options;
    const headers = new Headers(fetchOptions.headers || {});
    if (!headers.has("Content-Type") && fetchOptions.body) {
      headers.set("Content-Type", "application/json");
    }
    const token = scope ? getToken(scope, businessId) : "";
    if (apiBase() && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(urlFor(path, businessId), {
      credentials: apiBase() ? "omit" : "same-origin",
      ...fetchOptions,
      headers
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};
    if (!response.ok) throw new Error(data.error || "请求失败");
    return data;
  }

  window.XIAOFEI_API = {
    apiBase,
    enabled: () => Boolean(apiBase()),
    request,
    setToken,
    clearToken,
    urlFor
  };
})();

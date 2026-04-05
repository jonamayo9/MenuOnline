let CONFIG = null;
  let ordersCache = [];
  let selectedOrderId = null;
const isDeleted = (text) =>
  String(text || "").includes("(Eliminada)") ||
  String(text || "").includes("(Eliminado)");
  // ✅ corregido para que coincida con Gestión de pedidos / backend
  const STATUS = {
    NEW: 0,
    PREPARING: 1,
    READY: 2,
    DELIVERED: 3,
    CANCELED: 4,
    FINISHED: 5
  };

  // ===== AUTH =====
  const TOKEN_KEY = "menuonline_token";
  const SLUG_KEY  = "menuonline_companySlug";
  const LOGIN_PAGE = "/Admin/login.html";

  // PROD
  //const CONFIG_PATH = "/MenuOnline/config.json";
  // DEV
  const CONFIG_PATH = "/config.json";

  function logoutToLogin(){
    localStorage.removeItem(TOKEN_KEY);
    location.replace(LOGIN_PAGE);
  }

  function parseJwt(token){
    try{
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join("")
      );
      return JSON.parse(json);
    }catch{
      return null;
    }
  }

  function isTokenValid(token){
    const payload = parseJwt(token);
    const exp = payload?.exp;
    if(!exp) return false;
    return exp > Math.floor(Date.now()/1000);
  }

  function requireAuth(){
    const t = localStorage.getItem(TOKEN_KEY);
    if(!t || !isTokenValid(t)){
      logoutToLogin();
      return false;
    }
    return true;
  }

  function authHeaders(extra = {}){
    const token = localStorage.getItem(TOKEN_KEY);
    return { ...extra, "Authorization": "Bearer " + token };
  }

  const BUSINESS_GASTRONOMIA = 1;
const BUSINESS_OTROS = 2;

async function loadConfig(){
  const res = await fetch(CONFIG_PATH, { cache: "no-store" });
  if(!res.ok) throw new Error("No pude leer config.json");
  return await res.json();
}

async function fetchAuth(url, options = {}){
  const token = localStorage.getItem(TOKEN_KEY);
  if(!token){
    logoutToLogin();
    return null;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: "Bearer " + token
    }
  });

  if(res.status === 401 || res.status === 403){
    logoutToLogin();
    return null;
  }

  return res;
}

async function apiGetAdminMe(){
  const res = await fetchAuth(`${CONFIG.apiBaseUrl}/api/admin/me`);
  if(!res || !res.ok) return null;
  return await res.json().catch(() => null);
}

function redirectNotFound(){
  location.replace("/404.html");
}

async function guardAdminResumenAccess(){
  try{
    CONFIG = await loadConfig();

    const me = await apiGetAdminMe();
    if(!me){
      redirectNotFound();
      return false;
    }

    if(Number(me.businessType) === BUSINESS_OTROS){
      redirectNotFound();
      return false;
    }

    if(me.featureDashboardEnabled !== true || me.canAccessDashboard !== true){
      redirectNotFound();
      return false;
    }

    return true;
  }catch(err){
    console.error(err);
    redirectNotFound();
    return false;
  }
}

  // ===== TOAST =====
  let activeToastEl = null;

  function toastShow(message, type = "info") {
    const container = document.getElementById("toastContainer");

    if (activeToastEl) {
      activeToastEl.remove();
      activeToastEl = null;
    }

    const colors = {
      success: "bg-emerald-500",
      error: "bg-rose-500",
      info: "bg-slate-900"
    };

    const icon = type === "success" ? "✓" : type === "error" ? "⚠" : "⏳";

    const el = document.createElement("div");
    el.className = `
      ${colors[type]} text-white px-5 py-4 rounded-2xl shadow-2xl
      flex items-center gap-3 min-w-[280px]
      transform transition-all duration-200 translate-y-2 opacity-0
    `;
    el.innerHTML = `
      <div class="text-lg font-bold leading-none">${icon}</div>
      <div class="text-sm font-semibold">${message}</div>
    `;

    container.appendChild(el);
    activeToastEl = el;

    requestAnimationFrame(() => {
      el.classList.remove("translate-y-2", "opacity-0");
    });

    return el;
  }

  function toastUpdate(message, type = "info", autoCloseMs = null) {
    if (!activeToastEl) {
      toastShow(message, type);
      if (autoCloseMs) toastAutoClose(autoCloseMs);
      return;
    }

    const colors = {
      success: "bg-emerald-500",
      error: "bg-rose-500",
      info: "bg-slate-900"
    };

    const icon = type === "success" ? "✓" : type === "error" ? "⚠" : "⏳";

    activeToastEl.className = `
      ${colors[type]} text-white px-5 py-4 rounded-2xl shadow-2xl
      flex items-center gap-3 min-w-[280px]
      transform transition-all duration-200
    `;
    activeToastEl.innerHTML = `
      <div class="text-lg font-bold leading-none">${icon}</div>
      <div class="text-sm font-semibold">${message}</div>
    `;

    if (autoCloseMs) toastAutoClose(autoCloseMs);
  }

  function toastAutoClose(ms = 1800) {
    const el = activeToastEl;
    if (!el) return;

    setTimeout(() => {
      if (activeToastEl !== el) return;

      el.classList.add("translate-y-2", "opacity-0");
      setTimeout(() => {
        if (activeToastEl === el) activeToastEl = null;
        el.remove();
      }, 200);
    }, ms);
  }

  // ===== CONFIG =====
  async function loadConfig(){
    const r = await fetch(CONFIG_PATH, { cache:"no-store" });
    if(!r.ok) throw new Error("No pude leer config.json");
    return await r.json();
  }

  function getSlug(){
    return localStorage.getItem(SLUG_KEY) || CONFIG.companySlug;
  }

  // ===== HELPERS =====
  function fmtMoney(n){
    const num = Number(n || 0);
    return num.toLocaleString("es-AR");
  }

  function fmtDateInputValue(){
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function fmtDateTime(iso){
    if(!iso) return "—";
    return new Date(iso).toLocaleString("es-AR");
  }

  function statusLabel(s){
    const map = {
      0:{ t:"Nuevo", cls:"bg-slate-100 text-slate-700" },
      1:{ t:"Preparando", cls:"bg-amber-100 text-amber-900" },
      2:{ t:"Listo", cls:"bg-sky-100 text-sky-800" },
      3:{ t:"Entregado", cls:"bg-emerald-100 text-emerald-900" },
      4:{ t:"Cancelado", cls:"bg-rose-100 text-rose-800" },
      5:{ t:"Finalizado", cls:"bg-violet-100 text-violet-800" }
    };
    return map[s] || { t:`Estado ${s}`, cls:"bg-slate-100 text-slate-700" };
  }

  function paymentText(order){
    const method = order.paymentMethod || "—";
    const paymentStatus = order.paymentStatus ? ` · ${order.paymentStatus}` : "";
    return `${method}${paymentStatus}`;
  }

  function computeOrderTotal(order){
    if(Number(order?.total || 0) > 0) return Number(order.total || 0);

    const items = Array.isArray(order?.items) ? order.items : [];
    return items.reduce((acc, it) => {
      const qty = Number(it.qty ?? 0);
      const unit = Number(it.unitPrice ?? 0);
      const line = Number(it.lineTotal ?? (qty * unit));
      return acc + (Number.isNaN(line) ? 0 : line);
    }, 0);
  }

  // ===== API =====
  async function fetchAuth(url, options = {}){
    if(!requireAuth()) return null;

    const res = await fetch(url, {
      ...options,
      headers: authHeaders(options.headers || {})
    });

    if(res.status === 401 || res.status === 403){
      logoutToLogin();
      return null;
    }

    return res;
  }

  async function getOrders(){
    const date = document.getElementById("date").value;
    const status = document.getElementById("status").value;

    const qs = new URLSearchParams();
    if(date) qs.set("date", date);
    if(status !== "") qs.set("status", status);

    const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/orders` + (qs.toString() ? `?${qs}` : "");
    const r = await fetchAuth(url);
    if(!r) return;

    if(!r.ok) throw new Error("Error cargando pedidos");

    ordersCache = await r.json();
    render();
  }

  async function getOrderDetail(id){
    const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/orders/${id}`;
    const r = await fetchAuth(url);
    if(!r) return null;

    if(!r.ok) throw new Error("No pude cargar el detalle");
    return await r.json();
  }

  async function updateOrderStatus(id, status){
    const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/orders/${id}/status`;
    const r = await fetchAuth(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if(!r) return;

    if(!r.ok){
      let msg = "Error actualizando estado";
      try{
        const txt = await r.text();
        if(txt) msg = txt;
      }catch{}
      throw new Error(msg);
    }
  }

  // ===== RENDER =====
  function render(){
    document.getElementById("kpiCount").innerText = ordersCache.length;

    const canceledCount = ordersCache.filter(o => Number(o.status) === STATUS.CANCELED).length;
    const total = ordersCache
      .filter(o => Number(o.status) !== STATUS.CANCELED)
      .reduce((acc,o)=>acc+computeOrderTotal(o),0);

    document.getElementById("kpiTotal").innerText = "$ " + fmtMoney(total);
    document.getElementById("kpiNote").innerText = `Cancelados: ${canceledCount}`;

    const el = document.getElementById("list");

    if (!ordersCache.length) {
      el.innerHTML = `
        <div class="glass-card rounded-[2rem] p-8 text-center">
          <div class="text-5xl mb-3">📊</div>
          <div class="text-xl font-extrabold text-slate-900 font-display">No hay pedidos</div>
          <div class="text-sm text-slate-500 mt-2">Probá cambiando la fecha o el estado.</div>
        </div>
      `;
      return;
    }

    el.innerHTML = ordersCache.map(o=>{
      const s = statusLabel(Number(o.status));
      const totalOrder = computeOrderTotal(o);

      return `
        <button data-open="${o.id}" class="w-full text-left module-card glass-card rounded-[2rem] p-6">
          <div class="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-extrabold text-lg text-slate-900 font-display">Pedido #${o.orderNumber}</div>
                <span class="text-xs px-3 py-1 rounded-xl font-semibold ${s.cls}">${s.t}</span>
              </div>
              <div class="text-sm text-slate-500 mt-2">${fmtDateTime(o.createdAt)}</div>
              <div class="text-sm text-slate-500 mt-1">${o.customerName || "Cliente sin nombre"}</div>
            </div>

            <div class="text-2xl font-extrabold text-slate-900 font-display">$ ${fmtMoney(totalOrder)}</div>
          </div>
        </button>
      `;
    }).join("");

    el.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-open"));
        await openModal(id);
      });
    });
  }

  // ===== MODAL =====
  async function openModal(id){
    try{
      toastShow("Cargando detalle...", "info");
      const order = await getOrderDetail(id);
      if(!order) return;

      selectedOrderId = id;

      const s = statusLabel(Number(order.status));

      document.getElementById("mTitle").textContent = `Pedido #${order.orderNumber}`;
      document.getElementById("mSub").textContent = fmtDateTime(order.createdAt);
      document.getElementById("mCustomer").textContent = order.customerName || "—";
      document.getElementById("mAddress").textContent = order.address || "—";
      document.getElementById("mPayment").textContent = paymentText(order);
      document.getElementById("mTotal").textContent = "$ " + fmtMoney(computeOrderTotal(order));

      const badge = document.getElementById("mStatusBadge");
      badge.className = `text-xs px-3 py-1 rounded-xl font-semibold ${s.cls}`;
      badge.textContent = s.t;

      const itemsEl = document.getElementById("mItems");
      const items = Array.isArray(order.items) ? order.items : [];

      itemsEl.innerHTML = items.length
        ? items.map(it => `
            <div class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
              <div class="font-bold ${isDeleted(it.name) ? "text-rose-600" : "text-slate-900"}">
                ${it.name || "Item"}
              </div>
                <div class="text-xs text-slate-500 mt-1">
                  ${Number(it.qty || 0)} x $${fmtMoney(it.unitPrice || 0)}
                  ${it.note ? ` · Nota: ${it.note}` : ""}
                </div>
              </div>
              <div class="font-extrabold text-slate-900">
                $ ${fmtMoney(it.lineTotal ?? ((Number(it.qty || 0)) * Number(it.unitPrice || 0)))}
              </div>
            </div>
          `).join("")
        : `<div class="text-sm text-slate-400">(Sin items)</div>`;

      document.getElementById("modal").classList.remove("hidden");
      toastAutoClose(300);
    } catch (e) {
      console.error(e);
      toastUpdate("No pude abrir el detalle", "error", 2500);
    }
  }

  function closeModal(){
    document.getElementById("modal").classList.add("hidden");
    selectedOrderId = null;
  }

  async function setStatusAndRefresh(status){
    if(selectedOrderId == null) return;

    try{
      toastShow("Actualizando estado...", "info");
      await updateOrderStatus(selectedOrderId, status);
      closeModal();
      await getOrders();
      toastUpdate("Estado actualizado", "success", 1800);
    }catch(e){
      console.error(e);
      toastUpdate(e.message || "No pude actualizar el estado", "error", 2500);
    }
  }

  // ===== EVENTS =====
  document.getElementById("refresh").addEventListener("click", getOrders);
  document.getElementById("date").addEventListener("change", getOrders);
  document.getElementById("status").addEventListener("change", getOrders);

  document.getElementById("close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if(e.target.id === "modal") closeModal();
  });

  document.getElementById("btnNew").addEventListener("click", () => setStatusAndRefresh(STATUS.NEW));
  document.getElementById("btnPrep").addEventListener("click", () => setStatusAndRefresh(STATUS.PREPARING));
  document.getElementById("btnDel").addEventListener("click", () => setStatusAndRefresh(STATUS.DELIVERED));
  document.getElementById("btnCan").addEventListener("click", () => setStatusAndRefresh(STATUS.CANCELED));

  // ===== INIT =====
  (async function init(){
    try{
      if(!requireAuth()) return;

    const allowed = await guardAdminResumenAccess();
    if(!allowed) return;
      document.getElementById("date").value = fmtDateInputValue();
      await getOrders();
    }catch(e){
      console.error(e);
      toastShow("Error ❌ " + (e.message || e), "error");
      toastAutoClose(3000);
    }
  })();
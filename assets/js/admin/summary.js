let CONFIG = null;
  let summaryCache = null;
  let allOrdersCache = [];
  let selectedOrderId = null;

  const TOKEN_KEY = "menuonline_token";
  const SLUG_KEY  = "menuonline_companySlug";
  const LOGIN_PAGE = "/Admin/login.html";
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

  async function loadConfig(){
    const r = await fetch(CONFIG_PATH, { cache:"no-store" });
    if(!r.ok) throw new Error("No pude leer config.json");
    return await r.json();
  }


let CURRENT_COMPANY_SLUG = null;

function getSlug(){
  return CURRENT_COMPANY_SLUG || CONFIG.companySlug || "";
}
  function fmtMoney(n){
    const num = Number(n || 0);
    return num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function fmtDateInputValue(date){
    const d = new Date(date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function fmtDateTime(iso){
    if(!iso) return "—";
    return new Date(iso).toLocaleString("es-AR");
  }

  function esc(v){
    return String(v ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function normalizeText(v){
    return String(v || "").trim().toLowerCase();
  }

  function paymentMethodLabel(value){
    const v = normalizeText(value);
    if(v === "cash" || v === "efectivo") return "Efectivo";
    if(v === "transfer" || v === "transferencia") return "Transferencia";
    if(v === "qr") return "QR";
    if(v === "mercadopago" || v === "mercado pago" || v === "mp") return "Mercado Pago";
    return value || "—";
  }

  function paymentBadgeClass(value){
    const v = normalizeText(value);
    if(v === "cash" || v === "efectivo") return "bg-emerald-50 text-emerald-800 border border-emerald-100";
    if(v === "transfer" || v === "transferencia") return "bg-sky-50 text-sky-800 border border-sky-100";
    if(v === "qr") return "bg-cyan-50 text-cyan-800 border border-cyan-100";
    if(v === "mercadopago" || v === "mercado pago" || v === "mp") return "bg-violet-50 text-violet-800 border border-violet-100";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  async function loadAdminContext(){
  const r = await fetchAuth(`${CONFIG.apiBaseUrl}/api/admin/me`);
  if(!r) return null;

  if(!r.ok){
    throw new Error("No pude cargar el contexto del administrador");
  }

  const me = await r.json();

  CURRENT_COMPANY_SLUG =
    me.companySlug ||
    me.CompanySlug ||
    me.slug ||
    me.Slug ||
    "";

  if(!CURRENT_COMPANY_SLUG){
    throw new Error("No se pudo resolver la empresa del administrador");
  }

  localStorage.setItem(SLUG_KEY, CURRENT_COMPANY_SLUG);

  return me;
}

  function paymentStatusLabel(value){
    const n = Number(value);
    if(n === 0) return "Sin estado";
    if(n === 1) return "Pendiente";
    if(n === 2) return "Aprobado";
    if(n === 3) return "Rechazado";
    if(n === 4) return "Cancelado";
    return value == null || value === "" ? "—" : `Estado ${value}`;
  }

  function paymentStatusBadgeClass(value){
    const n = Number(value);
    if(n === 2) return "bg-emerald-50 text-emerald-800 border border-emerald-100";
    if(n === 1) return "bg-amber-50 text-amber-800 border border-amber-100";
    if(n === 3) return "bg-rose-50 text-rose-800 border border-rose-100";
    if(n === 4) return "bg-slate-100 text-slate-700 border border-slate-200";
    return "bg-slate-50 text-slate-600 border border-slate-200";
  }

  function statusLabel(s){
    const n = Number(s);
    const map = {
      0:{ t:"Nuevo", cls:"bg-slate-100 text-slate-700" },
      1:{ t:"Preparando", cls:"bg-amber-100 text-amber-900" },
      2:{ t:"Listo", cls:"bg-sky-100 text-sky-800" },
      3:{ t:"Entregado", cls:"bg-emerald-100 text-emerald-900" },
      4:{ t:"Cancelado", cls:"bg-rose-100 text-rose-800" },
      5:{ t:"Finalizado", cls:"bg-violet-100 text-violet-800" }
    };
    return map[n] || { t:`Estado ${s ?? "—"}`, cls:"bg-slate-100 text-slate-700" };
  }

  function boolBadge(v, yesText = "Sí", noText = "No"){
    if(v){
      return `<span class="badge-soft bg-emerald-50 text-emerald-800 border border-emerald-100">${yesText}</span>`;
    }
    return `<span class="badge-soft bg-slate-100 text-slate-600 border border-slate-200">${noText}</span>`;
  }

  function isDeletedText(text){
    const raw = String(text || "");
    return raw.includes("(Producto eliminado)") || raw.includes("(Eliminada)") || raw.includes("(Eliminado)") || raw.includes("(Opción eliminada)") || raw.includes("(Variante eliminada)");
  }

  function getDateRangeDefault(){
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 6);
    return {
      from: fmtDateInputValue(from),
      to: fmtDateInputValue(now)
    };
  }

  function setDefaultDates(){
    const range = getDateRangeDefault();
    document.getElementById("from").value = range.from;
    document.getElementById("to").value = range.to;
  }

  function updateRangeText(){
    const from = document.getElementById("from").value;
    const to = document.getElementById("to").value;
    const groupBy = document.getElementById("groupBy").value;
    const labelMap = { day:"día", week:"semana", month:"mes" };
    document.getElementById("rangeText").textContent =
      `${from || "—"} → ${to || "—"} · ${labelMap[groupBy] || groupBy}`;
  }

  function readFilters(){
    return {
      from: document.getElementById("from").value || "",
      to: document.getElementById("to").value || "",
      paymentMethod: document.getElementById("paymentMethod").value || "",
      status: document.getElementById("status").value || "",
      paymentStatus: document.getElementById("paymentStatus").value || "",
      onlyWithPromotion: document.getElementById("onlyWithPromotion").checked,
      onlyWithCoupon: document.getElementById("onlyWithCoupon").checked,
      includeCanceled: document.getElementById("includeCanceled").checked,
      groupBy: document.getElementById("groupBy").value || "day"
    };
  }

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

  function buildSummaryQuery(filters){
    const qs = new URLSearchParams();

    if(filters.from) qs.set("from", filters.from);
    if(filters.to) qs.set("to", filters.to);
    if(filters.paymentMethod) qs.set("paymentMethod", filters.paymentMethod);
    if(filters.status !== "") qs.set("status", filters.status);
    if(filters.paymentStatus !== "") qs.set("paymentStatus", filters.paymentStatus);
    if(filters.onlyWithPromotion) qs.set("onlyWithPromotion", "true");
    if(filters.onlyWithCoupon) qs.set("onlyWithCoupon", "true");
    if(filters.groupBy) qs.set("groupBy", filters.groupBy);

    return qs.toString();
  }

  async function getSummary(){
    const filters = readFilters();
    updateRangeText();

    const query = buildSummaryQuery(filters);
    const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/summary${query ? `?${query}` : ""}`;
    const r = await fetchAuth(url);
    if(!r) return;

    if(!r.ok){
      let msg = "Error cargando centro de ventas";
      try{
        const txt = await r.text();
        if(txt) msg = txt;
      }catch{}
      throw new Error(msg);
    }

    const data = await r.json();
    summaryCache = data;
    allOrdersCache = arr(pick(data, "orders", "Orders"));
    renderAll();
  }

  async function getOrderDetail(id){
    const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/summary/orders/${id}`;
    const r = await fetchAuth(url);
    if(!r) return null;

    if(!r.ok){
      let msg = "No pude cargar el detalle";
      try{
        const txt = await r.text();
        if(txt) msg = txt;
      }catch{}
      throw new Error(msg);
    }

    return await r.json();
  }

    function pick(obj, ...keys){
    for(const key of keys){
      if(obj && obj[key] !== undefined && obj[key] !== null){
        return obj[key];
      }
    }
    return undefined;
  }

  function arr(value){
    return Array.isArray(value) ? value : [];
  }

  function num(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function getVisibleOrders(){
    const includeCanceled = document.getElementById("includeCanceled").checked;
    const orders = arr(allOrdersCache).slice();

    if(includeCanceled) return orders;

    return orders.filter(o => num(pick(o, "status", "Status")) !== 4);
  }

  function renderAll(){
    renderKpis();
    renderSalesByPaymentMethod();
    renderSalesByPeriod();
    renderTopProducts();
    renderProductsWithPromotion();
    renderProductsWithCoupon();
    renderOrders();
  }

  function renderKpis(){
    const totals = pick(summaryCache, "totals", "Totals") || {};
    const visibleOrders = getVisibleOrders();

    const grossTotal = document.getElementById("includeCanceled").checked
      ? visibleOrders.reduce((acc, o) => acc + num(pick(o, "total", "Total")), 0)
      : num(pick(totals, "grossTotal", "GrossTotal"));

    document.getElementById("kpiTotalSales").textContent = "$ " + fmtMoney(grossTotal);
    document.getElementById("kpiOrders").textContent = String(visibleOrders.length);
    document.getElementById("kpiCancelled").textContent = `${num(pick(totals, "cancelledCount", "CancelledCount"))} cancelados`;

    const promoProducts = arr(pick(summaryCache, "productsWithPromotions", "ProductsWithPromotions"));
    const couponProducts = arr(pick(summaryCache, "productsWithCoupons", "ProductsWithCoupons"));

    const promoSales = promoProducts.reduce((acc, x) => acc + num(pick(x, "totalSold", "TotalSold")), 0);
    const couponSales = couponProducts.reduce((acc, x) => acc + num(pick(x, "totalSold", "TotalSold")), 0);

    document.getElementById("kpiPromoSales").textContent = "$ " + fmtMoney(promoSales);
    document.getElementById("kpiPromoCount").textContent = `${promoProducts.length} productos`;

    document.getElementById("kpiCouponSales").textContent = "$ " + fmtMoney(couponSales);
    document.getElementById("kpiCouponCount").textContent = `${couponProducts.length} productos`;
  }

   function renderSalesByPaymentMethod(){
    const container = document.getElementById("salesByPaymentMethod");
    let rows = arr(pick(summaryCache, "salesByPaymentMethod", "SalesByPaymentMethod"));
    const includeCanceled = document.getElementById("includeCanceled").checked;

    if(includeCanceled){
      const rebuilt = new Map();
      for(const order of allOrdersCache){
        const key = pick(order, "paymentMethod", "PaymentMethod") || "Sin definir";
        if(!rebuilt.has(key)){
          rebuilt.set(key, { paymentMethod: key, ordersCount: 0, total: 0 });
        }
        const row = rebuilt.get(key);
        row.ordersCount += 1;
        row.total += num(pick(order, "total", "Total"));
      }
      rows = Array.from(rebuilt.values());
    }

    const total = rows.reduce((acc, r) => acc + num(r.total), 0);

    if(!rows.length){
      container.innerHTML = `<div class="empty-state">No hay datos para mostrar.</div>`;
      return;
    }

    rows.sort((a,b) => num(b.total) - num(a.total));

    container.innerHTML = rows.map(r => {
      const percent = total > 0 ? ((num(r.total) / total) * 100) : 0;
      return `
        <div class="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge-soft ${paymentBadgeClass(r.paymentMethod)}">${esc(paymentMethodLabel(r.paymentMethod))}</span>
              <span class="text-sm text-slate-500">${num(r.ordersCount)} pedidos</span>
            </div>
            <div class="text-lg font-extrabold text-slate-900 font-display">$ ${fmtMoney(r.total || 0)}</div>
          </div>

          <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full rounded-full bg-violet-500" style="width:${Math.max(4, Math.min(100, percent))}%"></div>
          </div>
          <div class="text-xs text-slate-400 mt-2">${percent.toFixed(1)}%</div>
        </div>
      `;
    }).join("");
  }

    function renderSalesByPeriod(){
    const container = document.getElementById("salesByPeriod");
    const rows = arr(pick(summaryCache, "salesByPeriod", "SalesByPeriod"));

    const max = Math.max(...rows.map(r => num(r.total)), 0);

    if(!rows.length){
      container.innerHTML = `<div class="empty-state">No hay datos para mostrar.</div>`;
      return;
    }

    container.innerHTML = rows.map(r => {
      const period = pick(r, "period", "Period") || "—";
      const ordersCount = num(pick(r, "ordersCount", "OrdersCount"));
      const total = num(pick(r, "total", "Total"));
      const percent = max > 0 ? ((total / max) * 100) : 0;

      return `
        <div class="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div>
              <div class="font-bold text-slate-900">${esc(period)}</div>
              <div class="text-sm text-slate-500">${ordersCount} pedidos</div>
            </div>
            <div class="text-lg font-extrabold text-slate-900 font-display">$ ${fmtMoney(total)}</div>
          </div>

          <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full rounded-full bg-violet-500" style="width:${Math.max(4, Math.min(100, percent))}%"></div>
          </div>
        </div>
      `;
    }).join("");
  }

    function renderTopProducts(){
    const body = document.getElementById("topProductsBody");
    const rows = arr(pick(summaryCache, "topProducts", "TopProducts"));

    if(!rows.length){
      body.innerHTML = `<tr><td colspan="5" class="empty-state">No hay productos para mostrar.</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => `
      <tr>
        <td><div class="font-bold text-slate-900">${esc(pick(r, "name", "Name") || "")}</div></td>
        <td class="font-semibold text-slate-700">${num(pick(r, "quantity", "Quantity"))}</td>
        <td class="font-extrabold text-slate-900">$ ${fmtMoney(pick(r, "totalSold", "TotalSold") || 0)}</td>
        <td>${boolBadge(Boolean(pick(r, "hasPromotion", "HasPromotion")), "Sí", "No")}</td>
        <td>${boolBadge(Boolean(pick(r, "hasCoupon", "HasCoupon")), "Sí", "No")}</td>
      </tr>
    `).join("");
  }

function renderProductsWithPromotion(){
  const body = document.getElementById("productsWithPromotionBody");
  const rows = Array.isArray(summaryCache?.productsWithPromotions)
    ? summaryCache.productsWithPromotions
    : Array.isArray(summaryCache?.ProductsWithPromotions)
      ? summaryCache.ProductsWithPromotions
      : [];

  if(!rows.length){
    body.innerHTML = `<tr><td colspan="6" class="empty-state">No hay productos con promoción.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(r => {
    const name = r.name ?? r.Name ?? "";
    const quantity = Number(r.quantity ?? r.Quantity ?? 0);
    const totalSold = Number(r.totalSold ?? r.TotalSold ?? 0);
    const originalUnitPrice = Number(r.originalUnitPrice ?? r.OriginalUnitPrice ?? 0);
    const finalUnitPrice = Number(r.finalUnitPrice ?? r.FinalUnitPrice ?? 0);
    const promotionTitle = String(r.promotionTitle ?? r.PromotionTitle ?? "").trim();

    return `
      <tr>
        <td>
          <div class="title-cell">
            <div class="title-main">${esc(name)}</div>
          </div>
        </td>
        <td class="font-semibold text-slate-700 tabular-nums">${quantity}</td>
        <td class="font-extrabold text-slate-700 price-col">$ ${fmtMoney(originalUnitPrice)}</td>
        <td class="font-extrabold text-violet-700 price-col">$ ${fmtMoney(finalUnitPrice)}</td>
        <td class="font-extrabold text-slate-900 price-col">$ ${fmtMoney(totalSold)}</td>
        <td>
          ${
            promotionTitle
              ? `<span class="summary-pill promo">${esc(promotionTitle)}</span>`
              : `<span class="text-slate-400 font-bold">—</span>`
          }
        </td>
      </tr>
    `;
  }).join("");
}

function renderProductsWithCoupon(){
  const body = document.getElementById("productsWithCouponBody");
  const rows = Array.isArray(summaryCache?.productsWithCoupons)
    ? summaryCache.productsWithCoupons
    : Array.isArray(summaryCache?.ProductsWithCoupons)
      ? summaryCache.ProductsWithCoupons
      : [];

  if(!rows.length){
    body.innerHTML = `<tr><td colspan="6" class="empty-state">No hay productos con cupón.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(r => {
    const name = r.name ?? r.Name ?? "";
    const quantity = Number(r.quantity ?? r.Quantity ?? 0);
    const totalSold = Number(r.totalSold ?? r.TotalSold ?? 0);
    const originalUnitPrice = Number(r.originalUnitPrice ?? r.OriginalUnitPrice ?? 0);
    const finalUnitPrice = Number(r.finalUnitPrice ?? r.FinalUnitPrice ?? 0);
    const couponCode = String(r.couponCode ?? r.CouponCode ?? "").trim();

    return `
      <tr>
        <td>
          <div class="title-cell">
            <div class="title-main">${esc(name)}</div>
          </div>
        </td>
        <td class="font-semibold text-slate-700 tabular-nums">${quantity}</td>
        <td class="font-extrabold text-slate-700 price-col">$ ${fmtMoney(originalUnitPrice)}</td>
        <td class="font-extrabold text-emerald-700 price-col">$ ${fmtMoney(finalUnitPrice)}</td>
        <td class="font-extrabold text-slate-900 price-col">$ ${fmtMoney(totalSold)}</td>
        <td>
          ${
            couponCode
              ? `<span class="summary-pill coupon">${esc(couponCode)}</span>`
              : `<span class="text-slate-400 font-bold">—</span>`
          }
        </td>
      </tr>
    `;
  }).join("");
}

    function renderOrders(){
    const body = document.getElementById("ordersBody");
    const rows = getVisibleOrders();

    document.getElementById("ordersResume").textContent = `${rows.length} resultados`;

    if(!rows.length){
      body.innerHTML = `<tr><td colspan="7" class="empty-state">No hay pedidos para mostrar.</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(o => {
      const id = pick(o, "id", "Id");
      const orderCode = pick(o, "orderCode", "OrderCode");
      const orderNumber = pick(o, "orderNumber", "OrderNumber");
      const displayOrder = orderCode || orderNumber || "—";
      const createdAt = pick(o, "createdAt", "CreatedAt");
      const customerName = pick(o, "customerName", "CustomerName") || "Cliente sin nombre";
      const paymentMethod = pick(o, "paymentMethod", "PaymentMethod");
      const payStatusValue = pick(o, "paymentStatus", "PaymentStatus");
      const total = pick(o, "total", "Total");
      const status = statusLabel(pick(o, "status", "Status"));

      return `
        <tr>
          <td><div class="font-extrabold text-slate-900 font-display">${esc(displayOrder)}</div></td>
          <td><div class="text-slate-700">${esc(fmtDateTime(createdAt))}</div></td>
          <td><div class="font-semibold text-slate-900">${esc(customerName)}</div></td>
            <td>
            <div class="flex flex-wrap gap-2">
                <span class="badge-soft ${paymentBadgeClass(paymentMethod)}">${esc(paymentMethodLabel(paymentMethod))}</span>
                ${
                normalizeText(paymentMethod) === "mercadopago" ||
                normalizeText(paymentMethod) === "mercado pago" ||
                normalizeText(paymentMethod) === "mp"
                    ? `<span class="badge-soft ${paymentStatusBadgeClass(payStatusValue)}">${esc(paymentStatusLabel(payStatusValue))}</span>`
                    : ``
                }
            </div>
            </td>
          <td><span class="badge-soft ${status.cls.replaceAll(" ", " border border-transparent ")}">${esc(status.t)}</span></td>
          <td class="font-extrabold text-slate-900">$ ${fmtMoney(total || 0)}</td>
          <td>
            <button data-open="${id}" class="soft-btn px-4 py-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 text-sm">
              Ver detalle
            </button>
          </td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-open"));
        await openModal(id);
      });
    });
  }

 function renderModalItem(item){
  const selectionList = Array.isArray(item.selections) ? item.selections : [];
  const configSummary = Array.isArray(item.configurationSummary) ? item.configurationSummary : [];
  const nameDeleted = Boolean(item.isDeleted) || isDeletedText(item.name);

  return `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-bold ${nameDeleted ? "text-rose-600" : "text-slate-900"}">
            ${esc(item.name || "Item")}
          </div>

          <div class="text-xs text-slate-500 mt-1">
            ${Number(item.quantity || 0)} x $${fmtMoney(item.unitPrice || 0)}
          </div>

          ${configSummary.length ? `
            <div class="mt-3">
              <div class="text-sm font-semibold text-slate-700 mb-1">Configuración:</div>
              <div class="space-y-1">
                ${configSummary.map(x => `<div class="text-sm text-slate-600">${esc(x)}</div>`).join("")}
              </div>
            </div>
          ` : ``}

          ${selectionList.length ? `
            <div class="mt-3 space-y-2">
              ${selectionList.map(sel => `
                <div class="rounded-xl bg-white border border-slate-200 px-3 py-2">
                  <div class="text-sm ${sel.isOptionDeleted ? "text-rose-600 font-bold" : "text-slate-700 font-semibold"}">
                    ${esc(sel.optionName || "Opción")}
                  </div>
                  ${sel.variantName ? `
                    <div class="text-sm ${sel.isVariantDeleted ? "text-rose-600" : "text-slate-500"} mt-1">
                      ${esc(sel.variantName)}
                    </div>
                  ` : ``}
                  ${Number(sel.extraPrice || 0) > 0 ? `
                    <div class="text-xs text-slate-500 mt-1">Extra: $${fmtMoney(sel.extraPrice || 0)}</div>
                  ` : ``}
                </div>
              `).join("")}
            </div>
          ` : ``}

          ${item.note ? `
            <div class="mt-3 text-sm text-slate-600">
              <span class="font-semibold text-slate-700">Nota:</span> ${esc(item.note)}
            </div>
          ` : ``}

          ${(item.hadPromotion || item.promotionTitle || Number(item.promotionDiscountAmount || 0) > 0) ? `
            <div class="mt-3 flex flex-wrap gap-2">
              <span class="badge-soft bg-violet-50 text-violet-800 border border-violet-100">
                Promo${item.promotionTitle ? ` · ${esc(item.promotionTitle)}` : ``}
              </span>
              ${Number(item.promotionDiscountAmount || 0) > 0 ? `
                <span class="badge-soft bg-emerald-50 text-emerald-800 border border-emerald-100">
                  Descuento $${fmtMoney(item.promotionDiscountAmount || 0)}
                </span>
              ` : ``}
            </div>
          ` : ``}
        </div>

        <div class="font-extrabold text-slate-900 shrink-0">
          $ ${fmtMoney(item.lineTotal || 0)}
        </div>
      </div>
    </div>
  `;
}

  function renderSummaryBlock(detail){
  const subtotalBase = Number(detail.subtotalBase || 0);
  const surchargePercent = Number(detail.paymentSurchargePercent || 0);
  const surchargeAmount = Number(detail.paymentSurchargeAmount || 0);
  const discountAmount = Number(detail.discountAmount || 0);
  const total = Number(detail.total || 0);
  const couponLabel = detail.couponLabel || "Sin cupón";
  const paymentMethod = paymentMethodLabel(detail.paymentMethod || "—");
  const paymentStatus = paymentStatusLabel(detail.paymentStatus);
  const status = statusLabel(detail.status);

  return `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Medio de pago</div>
      <div class="flex flex-wrap gap-2">
        <span class="badge-soft ${paymentBadgeClass(paymentMethod)}">${esc(paymentMethod)}</span>
        <span class="badge-soft ${paymentStatusBadgeClass(detail.paymentStatus)}">${esc(paymentStatus)}</span>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Estado</div>
      <span class="badge-soft ${status.cls.replaceAll(" ", " border border-transparent ")}">${esc(status.t)}</span>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Subtotal base</div>
      <div class="font-extrabold text-slate-900">$ ${fmtMoney(subtotalBase)}</div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Recargo</div>
      <div class="font-extrabold text-slate-900">$ ${fmtMoney(surchargeAmount)}</div>
      ${surchargePercent > 0 ? `<div class="text-xs text-slate-500 mt-1">${fmtMoney(surchargePercent)}%</div>` : ``}
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Cupón</div>
      <div class="font-semibold text-slate-900">${esc(couponLabel)}</div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Descuento</div>
      <div class="font-extrabold text-slate-900">$ ${fmtMoney(discountAmount)}</div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] font-display mb-2">Total final</div>
      <div class="text-2xl font-extrabold text-slate-900 font-display">$ ${fmtMoney(total)}</div>
    </div>
  `;
}

  async function openModal(id){
  try{
    toastShow("Cargando detalle...", "info");
    const detail = await getOrderDetail(id);
    if(!detail) return;

    selectedOrderId = id;

    const status = statusLabel(detail.status);

    const displayOrder = detail.orderCode || detail.orderNumber || "—";
  document.getElementById("mTitle").textContent = `Pedido ${displayOrder}`;
    document.getElementById("mSub").textContent = fmtDateTime(detail.createdAt);
    document.getElementById("mCustomer").textContent = detail.customerName || "—";
    document.getElementById("mAddress").textContent = detail.address || "—";
    document.getElementById("mPayment").textContent = paymentMethodLabel(detail.paymentMethod);
    document.getElementById("mPaymentStatus").textContent = paymentStatusLabel(detail.paymentStatus);
    document.getElementById("mTotal").textContent = "$ " + fmtMoney(detail.total || 0);
    document.getElementById("mCouponLine").textContent = detail.couponLabel || "Sin cupón";

    const badge = document.getElementById("mStatusBadge");
    badge.className = `text-xs px-3 py-1 rounded-xl font-semibold ${status.cls}`;
    badge.textContent = status.t;

    const items = Array.isArray(detail.items) ? detail.items : [];
    document.getElementById("mItems").innerHTML = items.length
      ? items.map(renderModalItem).join("")
      : `<div class="text-sm text-slate-400">(Sin items)</div>`;

    document.getElementById("mSummary").innerHTML = renderSummaryBlock(detail);

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

  async function refreshAll(){
    try{
      toastShow("Actualizando centro de ventas...", "info");
      await getSummary();
      toastUpdate("Centro de ventas actualizado", "success", 1600);
    }catch(e){
      console.error(e);
      toastUpdate(e.message || "Error actualizando", "error", 2600);
    }
  }

  document.getElementById("refresh").addEventListener("click", refreshAll);

  document.getElementById("from").addEventListener("change", refreshAll);
  document.getElementById("to").addEventListener("change", refreshAll);
  document.getElementById("groupBy").addEventListener("change", refreshAll);
  document.getElementById("onlyWithPromotion").addEventListener("change", refreshAll);
  document.getElementById("onlyWithCoupon").addEventListener("change", refreshAll);
  document.getElementById("paymentMethod").addEventListener("change", refreshAll);
  document.getElementById("status").addEventListener("change", refreshAll);
  document.getElementById("paymentStatus").addEventListener("change", refreshAll);
  document.getElementById("includeCanceled").addEventListener("change", renderAll);

  document.getElementById("close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if(e.target.id === "modal") closeModal();
  });

(async function init(){
  try{
    if(!requireAuth()) return;

    CONFIG = await loadConfig();
    await loadAdminContext();

    setDefaultDates();
    updateRangeText();
    await getSummary();
  }catch(e){
    console.error(e);
    toastShow("Error ❌ " + (e.message || e), "error");
    toastAutoClose(3000);
  }
})();
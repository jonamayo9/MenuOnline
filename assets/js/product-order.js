let CONFIG = null;
let currentOrders = [];
let isRefreshing = false;

let PRODUCT_ORDER_CONTEXT = null;
let companyOrderNotificationMode = 0;
let companyOrderNotificationTemplate = "";
let companyWhatsapp = "";
let companyName = "";
let companyLogoUrl = "";

const TOKEN_KEY = "menuonline_token";
const SLUG_KEY = "menuonline_companySlug";
const LOGIN_PAGE = "/Admin/login.html";
const CONFIG_PATH = "/config.json";
const ARG_TZ = "America/Argentina/Buenos_Aires";


const STATUS_LABEL = {
  0: "Nuevo",
  1: "Preparando",
  2: "Enviado",
  3: "Entregado",
  4: "Cancelado"
};

const notifyState = {
  order: null
};

function openNotifyModal(order){
  notifyState.order = order || null;

  document.getElementById("notifySub").textContent =
    order?.orderCode ? `Pedido ${order.orderCode}` : "Pedido seleccionado";

  document.getElementById("notifyModal").classList.remove("hidden");
}

function closeNotifyModal(){
  document.getElementById("notifyModal").classList.add("hidden");
  notifyState.order = null;
}


function statusBadge(status) {
  switch (Number(status)) {
    case 0: return "bg-blue-50 text-blue-700 border-blue-100";
    case 1: return "bg-amber-50 text-amber-800 border-amber-100";
    case 2: return "bg-violet-50 text-violet-800 border-violet-100";
    case 3: return "bg-emerald-50 text-emerald-800 border-emerald-100";
    case 4: return "bg-rose-50 text-rose-800 border-rose-100";
    default: return "bg-slate-50 text-slate-700 border-slate-100";
  }
}

function getAvailableNextStatuses(currentStatus) {
  switch (Number(currentStatus)) {
    case 0: // Nuevo
      return [1, 4]; // Preparando, Cancelado

    case 1: // Preparando
      return [2, 4]; // Enviado, Cancelado

    case 2: // Enviado
      return [3, 4]; // Entregado, Cancelado

    case 3: // Entregado
      return [4]; // Cancelado

    case 4: // Cancelado
    default:
      return [];
  }
}

function normalizePaymentMethodLabel(method){
  const raw = String(method || "").trim().toLowerCase();

  if (raw.includes("cash") || raw.includes("efectivo")) return "Efectivo";
  if (raw.includes("transfer")) return "Transferencia";
  if (raw.includes("mercadopago") || raw.includes("mercado")) return "Mercado Pago";
  return method || "—";
}

async function loadProductOrderContext() {
  const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-orders/context`;

  const res = await fetchAuth(url);

  if (!res) return null;

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No pude cargar el contexto de pedidos");
  }

  const data = await res.json();

  PRODUCT_ORDER_CONTEXT = data;
  companyOrderNotificationMode = Number(data?.orderNotificationMode ?? 0);
  companyOrderNotificationTemplate = String(data?.orderNotificationTemplate || "").trim();
  companyWhatsapp = String(data?.companyWhatsapp || "").trim();
  companyName = String(data?.companyName || "").trim();
  companyLogoUrl = String(data?.companyLogoUrl || "").trim();

  return data;
}

async function openWhatsappNotification(order) {
  try {
    if (!order?.id) {
      toast("No pude identificar el pedido", "error", 2200);
      return;
    }

    const data = await getProductOrderWhatsappUrl(order.id);

    if (!data?.whatsappUrl) {
      toast("No se pudo generar la URL de WhatsApp", "error", 2200);
      return;
    }

    window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error(e);
    toast(e.message || "No pude abrir WhatsApp", "error", 2500);
  }
}

function normalizeDeliveryType(type){
  const raw = String(type || "").trim().toLowerCase();
  if (raw === "delivery") return "Envío";
  if (raw === "pickup") return "Retiro";
  return "—";
}

function money(n) {
  return new Intl.NumberFormat("es-AR").format(Number(n || 0));
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { timeZone: ARG_TZ });
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function logoutToLogin(){
  localStorage.removeItem(TOKEN_KEY);
  location.replace(LOGIN_PAGE);
}

function parseJwt(token){
  try{
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(base64).split("").map(c =>
      "%" + c.charCodeAt(0).toString(16).padStart(2,"0")
    ).join(""));
    return JSON.parse(json);
  }catch{
    return null;
  }
}

function isTokenValid(token){
  const payload = parseJwt(token);
  const exp = payload?.exp;
  if(!exp) return false;
  const now = Math.floor(Date.now()/1000);
  return exp > now;
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

function getSlug(){
  return localStorage.getItem(SLUG_KEY) || CONFIG.companySlug;
}

async function loadConfig() {
  const res = await fetch(CONFIG_PATH, { cache: "no-store" });
  if (!res.ok) throw new Error("No pude leer config.json");
  return await res.json();
}

function toast(message, type = "info", autoCloseMs = 1800) {
  const container = document.getElementById("toastContainer");
  container.innerHTML = "";

  const colors = {
    success: "bg-emerald-500",
    error: "bg-rose-500",
    info: "bg-slate-900"
  };

  const icon = type === "success" ? "✓" : type === "error" ? "⚠" : "⏳";

  const el = document.createElement("div");
  el.className = `${colors[type]} text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] transition-all`;
  el.innerHTML = `
    <div class="text-lg font-bold leading-none">${icon}</div>
    <div class="text-sm font-semibold">${escapeHtml(message)}</div>
  `;
  container.appendChild(el);

  if (autoCloseMs) {
    setTimeout(() => {
      if (container.contains(el)) el.remove();
    }, autoCloseMs);
  }
}

function getTodayInputValue(){
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const yyyy = parts.find(p => p.type === "year")?.value || "0000";
  const mm = parts.find(p => p.type === "month")?.value || "01";
  const dd = parts.find(p => p.type === "day")?.value || "01";
  return `${yyyy}-${mm}-${dd}`;
}

function setDefaultDates() {
  const today = getTodayInputValue();
  document.getElementById("dateFrom").value = today;
  document.getElementById("dateTo").value = today;
}

function buildOrdersUrl(){
  const slug = getSlug();
  const params = new URLSearchParams();

  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;
  const status = document.getElementById("status").value;

  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (status !== "") params.set("status", status);

  return `${CONFIG.apiBaseUrl}/api/admin/${slug}/product-orders${params.toString() ? `?${params.toString()}` : ""}`;
}

async function fetchOrders(){
  const res = await fetchAuth(buildOrdersUrl());
  if(!res) return [];

  if(!res.ok){
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No pude cargar los pedidos");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchOrderDetail(orderId){
  const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-orders/${orderId}`;
  const res = await fetchAuth(url);
  if(!res) return null;

  if(!res.ok){
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No pude cargar el detalle");
  }

  return await res.json();
}

async function updateOrderStatus(orderId, status){
  const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-orders/${orderId}/status`;

  const res = await fetchAuth(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: Number(status) })
  });

  if(!res) return;

  if(!res.ok){
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No pude actualizar el estado");
  }

  return await res.json().catch(() => null);
}

async function getWhatsappUrl(orderId){
  const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-orders/${orderId}/whatsapp-message`;

  const res = await fetchAuth(url);

  if(!res) return null;

  if(!res.ok){
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No pude generar el mensaje de WhatsApp");
  }

  return await res.json();
}

function setSummary(orders){
  const count = orders.length;
  const total = orders.reduce((acc, o) => {
    if (Number(o.status) === 4) return acc;
    return acc + Number(o.total || 0);
  }, 0);

  const delivery = orders.reduce((acc, o) => {
    if (String(o.deliveryType || "").toLowerCase() !== "delivery") return acc;
    if (Number(o.status) === 4) return acc;
    return acc + Number(o.deliveryAmount || 0);
  }, 0);

  document.getElementById("summaryCount").textContent = String(count);
  document.getElementById("summaryTotal").textContent = `$ ${money(total)}`;
  document.getElementById("summaryDelivery").textContent = `$ ${money(delivery)}`;
}

function renderStatusActionButtons(order) {
  const currentStatus = Number(order.status);
  const nextStatuses = getAvailableNextStatuses(currentStatus);

  if (!nextStatuses.length) return "";

  return nextStatuses.map(status => {
    let cls = "bg-slate-100 text-slate-800 hover:bg-slate-200";

    if (status === 1) cls = "bg-amber-100 text-amber-800 hover:bg-amber-200";
    if (status === 2) cls = "bg-violet-100 text-violet-800 hover:bg-violet-200";
    if (status === 3) cls = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
    if (status === 4) cls = "bg-rose-100 text-rose-800 hover:bg-rose-200";

    return `
      <button
        class="action-btn ${cls} btn-change-status"
        data-id="${order.id}"
        data-next-status="${status}">
        ${STATUS_LABEL[status]}
      </button>
    `;
  }).join("");
}

function renderOrders(orders){
  const list = document.getElementById("list");

  if(!orders.length){
    list.innerHTML = `
      <div class="empty-soft">
        No hay pedidos para los filtros seleccionados.
      </div>
    `;
    setSummary([]);
    return;
  }

  setSummary(orders);

  list.innerHTML = orders.map(o => {
    const isDelivery = String(o.deliveryType || "").toLowerCase() === "delivery";
    const orderCode = o.orderCode || `#${o.id}`;
    const status = Number(o.status);
    const address = o.validatedAddress || o.address || "—";
    const customerWhatsapp = o.customerWhatsapp || "—";
    const purchasedText = buildPurchasedProductsSummary(o.items || []);
    const detailText = buildOrderDetailSummary(o.items || []);

    return `
      <div class="order-card">
        <div class="order-top">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3 flex-wrap">
              <div class="text-xl font-black font-display">${escapeHtml(orderCode)}</div>
              <span class="badge ${statusBadge(status)}">
                ${escapeHtml(o.statusLabel || STATUS_LABEL[status] || "Sin estado")}
              </span>
              <span class="badge bg-slate-50 text-slate-700 border-slate-200">
                ${escapeHtml(normalizeDeliveryType(o.deliveryType))}
              </span>
            </div>

            <div class="text-sm text-slate-500 mt-2">${escapeHtml(fmtDateTime(o.createdAt))}</div>
            <div class="mt-3 text-3xl font-black font-display">$ ${money(o.total)}</div>
          </div>

          <div class="order-actions">
            <button class="action-btn bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 btn-detail" data-id="${o.id}">
              Ver detalle
            </button>

            ${renderStatusActionButtons(o)}

          </div>
        </div>

        <div class="order-grid">
          <div class="order-box">
            <div class="order-box-label">Cliente</div>
            <div class="order-box-value">
              <div class="font-bold text-slate-900 break-words">${escapeHtml(o.customerName || "—")}</div>
              <div class="text-sm text-slate-500 mt-2 break-all">${escapeHtml(customerWhatsapp)}</div>
            </div>
          </div>

          <div class="order-box">
            <div class="order-box-label">Pago</div>
            <div class="order-box-value">
              <div class="font-bold text-slate-900">${escapeHtml(normalizePaymentMethodLabel(o.paymentMethod))}</div>
              <div class="text-sm text-slate-500 mt-2">${escapeHtml(o.deliveryType === "pickup" ? "Sin envío" : "Con envío")}</div>
            </div>
          </div>

          <div class="order-box">
            <div class="order-box-label">Dirección</div>
            <div class="order-box-value text-sm leading-relaxed break-words">
              ${escapeHtml(address)}
            </div>
          </div>

          <div class="order-box">
            <div class="order-box-label">Distancia / zona</div>
            <div class="order-box-value text-sm leading-relaxed">
              ${
                isDelivery
                  ? `
                    <div><span class="font-bold">Km:</span> ${o.distanceKm != null ? escapeHtml(String(o.distanceKm)) : "—"}</div>
                    <div class="mt-2"><span class="font-bold">Zona:</span> ${escapeHtml(o.zone || "—")}</div>
                  `
                  : `<div class="text-slate-500">Retiro en local</div>`
              }
            </div>
          </div>

          ${purchasedText ? `
<div class="order-box">
  <div class="order-box-label">Producto comprado</div>
  <div class="order-box-value text-sm leading-relaxed break-words">
    ${escapeHtml(purchasedText)}
  </div>
</div>
` : ``}

${detailText ? `
<div class="order-box">
  <div class="order-box-label">Detalle</div>
  <div class="order-box-value text-sm leading-relaxed break-words">
    ${escapeHtml(detailText)}
  </div>
</div>
` : ``}

<div class="order-box">
  <div class="order-box-label">Envío</div>
  <div class="order-box-value">
    ${
      isDelivery
        ? `<div class="order-box-total">$ ${money(o.deliveryAmount || 0)}</div>`
        : `<div class="text-slate-500 font-bold">No aplica</div>`
    }
  </div>
</div>
        </div>
      </div>
    `;
  }).join("");

  bindOrderActions();
}

function shouldAskManualWhatsappNotification(order) {
  return companyOrderNotificationMode === 1;
}

function bindOrderActions(){

  document.querySelectorAll(".btn-detail").forEach(btn => {
    btn.onclick = () => openOrderDetail(btn.dataset.id);
  });

    document.querySelectorAll(".btn-change-status").forEach(btn => {
    btn.onclick = async () => {
        const id = btn.dataset.id;
        const nextStatus = Number(btn.dataset.nextStatus);
        const order = currentOrders.find(x => Number(x.id) === Number(id));

        if (!order) return;

        try {
            toast("Guardando estado...", "info", 0);

            await updateOrderStatus(id, nextStatus);
            await refresh(true);

            const updatedOrder = currentOrders.find(x => Number(x.id) === Number(id)) || order;

            toast("Estado actualizado", "success", 1800);

            if (nextStatus === 2 && shouldAskManualWhatsappNotification(updatedOrder)) {
            openNotifyModal(updatedOrder);
            }
        } catch(e) {
        console.error(e);
        toast(e.message || "No pude actualizar el estado", "error", 2500);
        }
    };
    });
}

async function getProductOrderWhatsappUrl(orderId){
  const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-orders/${orderId}/whatsapp-message`;

  const res = await fetchAuth(url);
  if(!res) return null;

  if(!res.ok){
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No pude generar el mensaje de WhatsApp");
  }

  return await res.json();
}

async function openOrderDetail(orderId){
  try{
    toast("Cargando detalle...", "info", 0);
    const d = await fetchOrderDetail(orderId);
    if(!d) return;

    const isDelivery = String(d.deliveryType || "").toLowerCase() === "delivery";
    const orderCode = d.orderCode || `#${d.id}`;

    document.getElementById("dTitle").textContent = `Pedido ${orderCode}`;
    document.getElementById("dSub").textContent = fmtDateTime(d.createdAt);

    document.getElementById("dCustomerName").textContent = d.customerName || "—";
    document.getElementById("dWhatsapp").textContent = d.customerWhatsapp || "—";
    document.getElementById("dPayment").textContent = normalizePaymentMethodLabel(d.paymentMethod);
    document.getElementById("dStatus").textContent = STATUS_LABEL[Number(d.status)] || "—";

    document.getElementById("dDeliveryType").textContent = normalizeDeliveryType(d.deliveryType);
    document.getElementById("dAddress").textContent = d.address || "—";
    document.getElementById("dValidatedAddress").textContent = d.validatedAddress || "—";
    document.getElementById("dZone").textContent = d.zone || "—";
    document.getElementById("dDistance").textContent = d.distanceKm != null ? `${d.distanceKm} km` : "—";

    document.getElementById("dSubtotal").textContent = `$ ${money(d.subtotal)}`;
    document.getElementById("dDeliveryAmount").textContent = `$ ${money(d.deliveryAmount || 0)}`;
    document.getElementById("dTotal").textContent = `$ ${money(d.total)}`;

    const couponWrap = document.getElementById("dCouponWrap");
    if (d.couponCode || Number(d.couponAmount || 0) > 0) {
      couponWrap.classList.remove("hidden");
      document.getElementById("dCoupon").textContent =
        `${d.couponCode || "Cupón"} · $ ${money(d.couponAmount || 0)}`;
    } else {
      couponWrap.classList.add("hidden");
    }

    document.getElementById("dValidatedAddressWrap").style.display = isDelivery ? "" : "none";
    document.getElementById("dZoneWrap").style.display = isDelivery ? "" : "none";
    document.getElementById("dDistanceWrap").style.display = isDelivery ? "" : "none";
    document.getElementById("dDeliveryAmountWrap").style.display = isDelivery ? "flex" : "none";

const items = Array.isArray(d.items) ? d.items : [];
const purchasedText = buildPurchasedProductsSummary(items);
const detailLines = items
  .map(buildDetailSummaryFromSelections)
  .filter(Boolean);

const purchasedBox = document.getElementById("dPurchasedBox");
const detailBox = document.getElementById("dDetailBox");

if (purchasedBox) {
  purchasedBox.innerHTML = purchasedText
    ? purchasedText
        .split(" | ")
        .map(line => `<div class="break-words">${escapeHtml(line)}</div>`)
        .join("")
    : "—";
}

if (detailBox) {
  detailBox.innerHTML = detailLines.length
    ? detailLines
        .map(line => `<div class="break-words">${escapeHtml(line)}</div>`)
        .join("")
    : "—";
}

document.getElementById("dItems").innerHTML = items.length
  ? items.map(it => `
      <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-bold text-slate-900 break-words">${escapeHtml(it.name || "Producto")}</div>
            <div class="text-xs text-slate-500 mt-1">
              ${Number(it.qty || 0)} x $${money(it.unitPrice || 0)}
              ${it.note ? ` · Nota: ${escapeHtml(it.note)}` : ``}
            </div>
          </div>
          <div class="font-black text-slate-900 whitespace-nowrap">$ ${money(it.lineTotal || 0)}</div>
        </div>
      </div>
    `).join("")
  : `<div class="empty-soft">Este pedido no tiene items para mostrar.</div>`;
    document.getElementById("detailModal").classList.remove("hidden");
    toast("Detalle cargado", "success", 1000);
  }catch(e){
    console.error(e);
    toast(e.message || "No pude cargar el detalle", "error", 2500);
  }
}

function closeDetailModal(){
  document.getElementById("detailModal").classList.add("hidden");
}

function buildDetailSummaryFromSelections(item){
  if(!item) return "";

  if(Array.isArray(item.selections) && item.selections.length){
    return item.selections
      .map(s => {
        const option = String(s.optionName || "").trim();
        const variant = String(s.variantName || "").trim();

        if(option && variant) return `${option}: ${variant}`;
        if(variant) return variant;
        if(option) return option;
        return "";
      })
      .filter(Boolean)
      .join(" · ");
  }

  const note = String(item.note || "").trim();
  if(!note) return "";

  return note
    .replace(/^nota:\s*/i, "")
    .replace(/^variante:\s*/i, "")
    .trim();
}

function buildPurchasedProductsSummary(items){
  return (Array.isArray(items) ? items : [])
    .map(it => {
      const qty = Number(it.qty || 0);
      const name = String(it.name || "").trim();

      if(!name) return "";
      return `${qty} x ${name}`;
    })
    .filter(Boolean)
    .join(" | ");
}

function buildOrderDetailSummary(items){
  return (Array.isArray(items) ? items : [])
    .map(buildDetailSummaryFromSelections)
    .filter(Boolean)
    .join(" | ");
}

async function refresh(silent = false){
  if(isRefreshing) return;
  isRefreshing = true;

  try{
    if(!silent) toast("Cargando pedidos...", "info", 0);

    const orders = await fetchOrders();
    currentOrders = Array.isArray(orders) ? orders : [];
    renderOrders(currentOrders);

    if(!silent) toast("Pedidos actualizados", "success", 1200);
  }catch(e){
    console.error(e);
    renderOrders([]);
    toast(e.message || "No pude cargar los pedidos", "error", 2500);
  }finally{
    isRefreshing = false;
  }
}

function bindStaticEvents(){
  document.getElementById("refresh").addEventListener("click", () => refresh());
  document.getElementById("btnToday").addEventListener("click", () => {
    setDefaultDates();
    refresh();
  });

  document.getElementById("closeDetailModal").addEventListener("click", closeDetailModal);

  document.getElementById("detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal") closeDetailModal();
  });

  document.getElementById("dateFrom").addEventListener("change", () => refresh(true));
  document.getElementById("dateTo").addEventListener("change", () => refresh(true));
  document.getElementById("status").addEventListener("change", () => refresh(true));
  document.getElementById("closeNotifyModal").addEventListener("click", closeNotifyModal);

    document.getElementById("btnNotifyNo").addEventListener("click", closeNotifyModal);

    document.getElementById("btnNotifyYes").addEventListener("click", async () => {
    const order = notifyState.order;
    closeNotifyModal();

    if(order){
        await openWhatsappNotification(order);
    }
    });
}

async function bootstrap(){
  try{
    CONFIG = await loadConfig();
    if(!requireAuth()) return;

    setDefaultDates();
    bindStaticEvents();
    await loadProductOrderContext();
    await refresh();
  }catch(e){
    console.error(e);
    toast(e.message || "No pude iniciar la pantalla", "error", 3000);
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);
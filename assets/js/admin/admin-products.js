let CONFIG = null;
  let selectedImages = [];
  let selectedEditImages = [];
  let existingEditImages = [];
  let itemsCache = [];
  let categoriesCache = [];
  let filterCategoryId = "";
  let tableManagementEnabled = false;
  let variantGroupsCache = [];

  let currentVariantStockConfig = {
    menuItemId: 0,
    allGroups: [],
    activeCombinationTempId: null,
    combinations: []
  };

  const TOKEN_KEY = "menuonline_token";
  const SLUG_KEY  = "menuonline_companySlug";
  const LOGIN_PAGE = "/Admin/login.html";
  const CONFIG_PATH = "/config.json";

  const BUSINESS_TYPE_KEY = "menuonline_business_type";
  const BUSINESS_TYPES = {
    GASTRONOMIA: 1,
    OTROS: 2
  };

  function getBusinessType(){
    if (window.BusinessTypeStore?.get) {
      const value = window.BusinessTypeStore.get();
      if (value === BUSINESS_TYPES.OTROS) return BUSINESS_TYPES.OTROS;
      if (value === BUSINESS_TYPES.GASTRONOMIA) return BUSINESS_TYPES.GASTRONOMIA;
    }

    const raw = Number(localStorage.getItem(BUSINESS_TYPE_KEY));
    if(raw === BUSINESS_TYPES.OTROS) return BUSINESS_TYPES.OTROS;
    return BUSINESS_TYPES.GASTRONOMIA;
  }

  async function syncBusinessTypeFromApi(){
    try{
      const url = `${CONFIG.apiBaseUrl}/api/admin/me`;
      const res = await fetchAuth(url);
      if(!res || !res.ok) return;

      const me = await res.json().catch(() => null);
      if(!me) return;

      if(window.BusinessTypeStore?.set){
        window.BusinessTypeStore.set(me.businessType);
      }else{
        if(me.businessType == null){
          localStorage.removeItem(BUSINESS_TYPE_KEY);
        }else{
          localStorage.setItem(BUSINESS_TYPE_KEY, String(Number(me.businessType)));
        }
      }
    }catch{}
  }

  function isProductsMode(){
    return getBusinessType() === BUSINESS_TYPES.OTROS;
  }

  function getItemsApiBase(){
    return isProductsMode()
      ? `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/products`
      : `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/items`;
  }

  function getCategoriesApiUrl(){
    return isProductsMode()
      ? `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-categories`
      : `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/categories`;
  }

  function getFixedProductChannel(){
    return isProductsMode() ? 2 : 1;
  }

  function applyBusinessTypeTexts(){
    const productsMode = isProductsMode();

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const createTitle = document.getElementById("createTitle");
    const createSubtitle = document.getElementById("createSubtitle");
    const listSubtitle = document.getElementById("listSubtitle");
    const moduleChip = document.getElementById("moduleChip");
    const visiblePublicTitle = document.getElementById("visiblePublicTitle");
    const visiblePublicSubtitle = document.getElementById("visiblePublicSubtitle");
    const editVisiblePublicTitle = document.getElementById("editVisiblePublicTitle");
    const configDescription = document.getElementById("configDescription");
    const requiredUnitsHelp = document.getElementById("requiredUnitsHelp");
    const optionsHelp = document.getElementById("optionsHelp");
    const editConfigDescription = document.getElementById("editConfigDescription");
    const editOptionsHelp = document.getElementById("editOptionsHelp");

    const name = document.getElementById("name");
    const description = document.getElementById("description");
    const price = document.getElementById("price");
    const editName = document.getElementById("editName");
    const editDescription = document.getElementById("editDescription");
    const editPrice = document.getElementById("editPrice");

    if(productsMode){
      if(moduleChip) moduleChip.textContent = "Catálogo";
      if(pageTitle) pageTitle.textContent = "Productos";
      if(pageSubtitle) pageSubtitle.textContent = "Creá y administrá tu catálogo de productos de forma simple, moderna y ordenada.";
      if(createTitle) createTitle.textContent = "Nuevo producto";
      if(createSubtitle) createSubtitle.textContent = "Completá los datos para agregar un nuevo producto al catálogo.";
      if(listSubtitle) listSubtitle.textContent = "Filtrá y administrá tus productos del catálogo por categoría.";
      if(visiblePublicTitle) visiblePublicTitle.textContent = "Visible en catálogo público";
      if(visiblePublicSubtitle) visiblePublicSubtitle.textContent = "Aparece en la página pública de productos.";
      if(editVisiblePublicTitle) editVisiblePublicTitle.textContent = "Visible en catálogo público";
      if(configDescription) configDescription.textContent = "Opcional. Podés usarlo para combos, packs o productos que necesiten selección.";
      if(requiredUnitsHelp) requiredUnitsHelp.textContent = "Ej: 6 para pack de 6 unidades, 12 para pack de 12, 2 para combinaciones.";
      if(optionsHelp) optionsHelp.textContent = "Ej: Color, tamaño, sabor o cualquier variante que necesite el producto.";
      if(editConfigDescription) editConfigDescription.textContent = "Podés editar opciones y variantes del producto.";
      if(editOptionsHelp) editOptionsHelp.textContent = "Administrá opciones y variantes.";

      if(name) name.placeholder = "Ej: Coca Cola 500 ml";
      if(description) description.placeholder = "Ej: Gaseosa cola botella 500 ml retornable";
      if(price) price.placeholder = "Ej: 1800";

      if(editName) editName.placeholder = "Ej: Coca Cola 500 ml";
      if(editDescription) editDescription.placeholder = "Ej: Gaseosa cola botella 500 ml retornable";
      if(editPrice) editPrice.placeholder = "Ej: 1800";
    } else {
      if(moduleChip) moduleChip.textContent = "Productos";
      if(pageTitle) pageTitle.textContent = "Productos";
      if(pageSubtitle) pageSubtitle.textContent = "Creá y administrá tu menú de forma simple, moderna y ordenada.";
      if(createTitle) createTitle.textContent = "Nuevo producto";
      if(createSubtitle) createSubtitle.textContent = "Completá los datos para agregar un nuevo ítem al menú.";
      if(listSubtitle) listSubtitle.textContent = "Filtrá y administrá tus productos por categoría.";
      if(visiblePublicTitle) visiblePublicTitle.textContent = "Visible en menú público";
      if(visiblePublicSubtitle) visiblePublicSubtitle.textContent = "Aparece en la carta pública.";
      if(editVisiblePublicTitle) editVisiblePublicTitle.textContent = "Visible en menú público";
      if(configDescription) configDescription.textContent = "Usalo para productos como media docena de empanadas o pizza mitad y mitad.";
      if(requiredUnitsHelp) requiredUnitsHelp.textContent = "Ej: 6 para media docena, 12 para docena, 2 para mitad y mitad.";
      if(optionsHelp) optionsHelp.textContent = "Ej: Carne, Pollo, Muzza. A cada opción podés agregar variantes como Frita / Horno.";
      if(editConfigDescription) editConfigDescription.textContent = "Podés editar opciones y variantes del producto.";
      if(editOptionsHelp) editOptionsHelp.textContent = "Administrá opciones y variantes.";

      if(name) name.placeholder = "Ej: Hamburguesa clásica";
      if(description) description.placeholder = "Ej: Con cheddar, panceta y papas";
      if(price) price.placeholder = "Ej: 4500";

      if(editName) editName.placeholder = "Ej: Hamburguesa clásica";
      if(editDescription) editDescription.placeholder = "Ej: Con cheddar, panceta y papas";
      if(editPrice) editPrice.placeholder = "Ej: 4500";
    }
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
    }catch{ return null; }
  }

  function isTokenValid(){
    const t = localStorage.getItem(TOKEN_KEY);
    if(!t) return false;
    const payload = parseJwt(t);
    const exp = payload?.exp;
    if(!exp) return false;
    return exp > Math.floor(Date.now()/1000);
  }

  function requireAuth(){
    if(!isTokenValid()){
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
    return localStorage.getItem(SLUG_KEY) || (CONFIG ? CONFIG.companySlug : "");
  }

  async function loadConfig(){
    const r = await fetch(CONFIG_PATH, { cache: "no-store" });
    if(!r.ok) throw new Error("No pude leer config.json");
    return await r.json();
  }

  function resolveImgUrl(u){
    const s = String(u || "").trim();
    if(!s) return "";
    if(s.startsWith("http://") || s.startsWith("https://")) return s;

    const base = String(CONFIG?.apiBaseUrl || "").replace(/\/+$/,"");
    if(!base) return s;

    if(s.startsWith("/")) return base + s;
    return base + "/" + s;
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(msg, type="info", ms=1800){
    const c = document.getElementById("toastContainer");
    c.innerHTML = "";
    const colors = { info:"bg-slate-900", success:"bg-emerald-600", error:"bg-rose-600" };
    const el = document.createElement("div");
    el.className = `${colors[type]} text-white px-5 py-4 rounded-2xl shadow-2xl font-semibold text-sm`;
    el.innerText = msg;
    c.appendChild(el);
    if(ms) setTimeout(() => el.remove(), ms);
  }

  function parsePriceToNumber(raw){
    const cleaned = String(raw ?? "")
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");

    if(!cleaned) return NaN;
    const parts = cleaned.split(".");
    const normalized = parts.length <= 2 ? cleaned : (parts[0] + "." + parts.slice(1).join(""));
    return Number(normalized);
  }

  function guardPriceInput(el){
    el.addEventListener("keydown", (e) => {
      const blocked = ["e","E","+","-"];
      if(blocked.includes(e.key)) e.preventDefault();
    });
    el.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9.,]/g, "");
    });
  }

  function categoryNameById(categoryId){
    const c = categoriesCache.find(x => x.id === categoryId);
    return c ? c.name : "—";
  }

  function badgeEnabled(enabled){
    return enabled
      ? `<span class="text-xs px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-semibold">Activo</span>`
      : `<span class="text-xs px-3 py-1 rounded-xl bg-slate-100 text-slate-600 font-semibold">Inactivo</span>`;
  }

  function getConfigurationModeLabel(mode) {
    const value = Number(mode ?? 0);
    switch (value) {
      case 1:
        return "Cantidad exacta";
      case 2:
        return "Mitad y mitad";
      default:
        return "Sin configuración";
    }
  }

  function flagBadges(item){
    const on = "text-xs px-3 py-1 rounded-xl bg-violet-100 text-violet-800 font-semibold";
    const off = "text-xs px-3 py-1 rounded-xl bg-slate-100 text-slate-500 font-semibold";
    const publicLabel = isProductsMode() ? "Catálogo público" : "Menú público";

    return `
      <span class="${item.visibleInPublicMenu ? on : off}">${publicLabel}</span>
      ${tableManagementEnabled ? `<span class="${item.visibleInTables ? on : off}">Mesas</span>` : ``}
      ${tableManagementEnabled ? `<span class="${item.isInternalForTables ? on : off}">Interno</span>` : ``}
      ${item.hasConfiguration ? `<span class="text-xs px-3 py-1 rounded-xl bg-amber-100 text-amber-800 font-semibold">Configurable</span>` : ``}
      ${item.hasConfiguration && Number(item.requiredSelectionUnits || 0) > 0 ? `<span class="text-xs px-3 py-1 rounded-xl bg-indigo-100 text-indigo-800 font-semibold">${item.requiredSelectionUnits} u.</span>` : ``}
      ${item.hasConfiguration ? `<span class="text-xs px-3 py-1 rounded-xl bg-fuchsia-100 text-fuchsia-800 font-semibold">${getConfigurationModeLabel(item.configurationMode)}</span>` : ``}
    `;
  }

function formatPrice(n){
  const num = Number(n);
  if(Number.isNaN(num)) return n;
  return num.toLocaleString("es-AR");
}

function syncStockModeAvailability(prefix){
  const stockModeEl = document.getElementById(prefix ? `${prefix}StockMode` : "stockMode");
  const openBtn = document.getElementById(prefix ? `${prefix}OpenVariantStockSetupBtn` : "openVariantStockSetupBtn");

  if(!stockModeEl) return;

  const productsMode = isProductsMode();
  const subtypeOption = Array.from(stockModeEl.options || []).find(opt => Number(opt.value) === 2);
  const variantOption = Array.from(stockModeEl.options || []).find(opt => Number(opt.value) === 3);

  if(subtypeOption) subtypeOption.disabled = !productsMode;
  if(variantOption) variantOption.disabled = !productsMode;

  if(!productsMode && (Number(stockModeEl.value || 0) === 2 || Number(stockModeEl.value || 0) === 3)){
    stockModeEl.value = "0";
  }

  if(openBtn){
    openBtn.disabled = !productsMode;
    openBtn.classList.toggle("opacity-50", !productsMode);
    openBtn.classList.toggle("cursor-not-allowed", !productsMode);

    if(prefix === "edit"){
      openBtn.textContent = productsMode ? "Ver / configurar stock" : "No disponible en gourmet";
    }else{
      openBtn.textContent = productsMode ? "Configurar stock" : "No disponible en gourmet";
    }
  }
}

function applyStockVisibilityByBusinessType(){
  const showStock = isProductsMode();

  const stockSection = document.getElementById("stockSection");
  const editStockSection = document.getElementById("editStockSection");

  if(stockSection) stockSection.style.display = showStock ? "" : "none";
  if(editStockSection) editStockSection.style.display = showStock ? "" : "none";
}

function getVariantSelectionLabel(values, groups){
  const normalizedGroups = normalizeVariantGroups(groups);
  if(!Array.isArray(values) || !values.length) return "Sin selección";

  return values
    .map(v => {
      const optionId = Number(v.menuItemOptionId ?? 0);
      const variantId = v.menuItemOptionVariantId == null ? null : Number(v.menuItemOptionVariantId);
      const group = normalizedGroups.find(g => Number(g.optionId) === optionId);

      if(variantId == null){
        return group?.optionName || "";
      }

      const variant = group?.variants?.find(item => Number(item.variantId) === variantId);
      return variant?.variantName || group?.optionName || "";
    })
    .filter(Boolean)
    .join(" · ") || "Sin selección";
}

function buildVariantStockSummaryModel(config){
  const groups = normalizeVariantGroups(config?.variantGroups || config?.allGroups || []);
  const combinations = normalizeVariantCombinations(config?.combinations || []);

  const totalCombinations = combinations.length;
  const totalUnits = combinations.reduce((acc, item) => acc + Number(item.stockCurrent || 0), 0);
  const zeroStock = combinations.filter(item => Number(item.stockCurrent || 0) <= 0).length;

  const chips = combinations.map(item => {
    const stock = Number(item.stockCurrent || 0);
    const low = Number(item.lowStockThreshold || 0);

    return {
      label: getVariantSelectionLabel(item.values || [], groups),
      stock,
      low,
      isLow: stock <= 0 || (low > 0 && stock <= low)
    };
  });

  return {
    totalCombinations,
    totalUnits,
    zeroStock,
    chips
  };
}

function renderVariantStockSummaryHtml(config){
  const summary = buildVariantStockSummaryModel(config);

  if(!summary.totalCombinations){
    return `<div class="text-sm text-slate-500 font-medium">Todavía no configuraste combinaciones de stock.</div>`;
  }

  const chipsHtml = summary.chips.map(item => `
    <div class="px-3 py-2 rounded-2xl border text-xs font-semibold ${
      item.isLow
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200"
    }">
      <div class="font-extrabold">${escapeHtml(item.label)}</div>
      <div class="mt-1">Stock: ${item.stock}${item.low > 0 ? ` · Alerta: ${item.low}` : ""}</div>
    </div>
  `).join("");

  return `
    <div class="flex flex-wrap gap-2">
      ${chipsHtml}
    </div>
    <div class="mt-3 text-sm text-slate-700 font-semibold">
      ${summary.totalCombinations} combinaciones · ${summary.totalUnits} unidades totales · ${summary.zeroStock} sin stock
    </div>
  `;
}

function getStockApiBase(menuItemId){
  return `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-stock/${menuItemId}`;
}

function toggleSimpleStockVisibility(prefix){
  const stockModeEl = document.getElementById(prefix ? `${prefix}StockMode` : "stockMode");
  const stockCurrentWrap = document.getElementById(prefix ? `${prefix}SimpleStockCurrentWrap` : "simpleStockCurrentWrap");
  const lowStockWrap = document.getElementById(prefix ? `${prefix}SimpleLowStockWrap` : "simpleLowStockWrap");
  const openBtn = document.getElementById(prefix ? `${prefix}OpenVariantStockSetupBtn` : "openVariantStockSetupBtn");

  if(!stockModeEl) return;

  syncStockModeAvailability(prefix);

  const mode = Number(stockModeEl.value || 0);
  const isSimple = mode === 1;
  const isConfigurableStock = isProductsMode() && (mode === 2 || mode === 3);

  if(stockCurrentWrap) stockCurrentWrap.style.display = isSimple ? "" : "none";
  if(lowStockWrap) lowStockWrap.style.display = isSimple ? "" : "none";
  if(openBtn) openBtn.style.display = isConfigurableStock ? "" : "none";
}

async function loadVariantStockSummaryForEdit(){
  const menuItemId = Number(document.getElementById("editId")?.value || 0);
  const summaryWrap = document.getElementById("editVariantStockSummary");
  const summaryText = document.getElementById("editVariantStockSummaryText");
  const stockMode = Number(document.getElementById("editStockMode")?.value || 0);

  if(!summaryWrap || !summaryText){
    return;
  }

  if(!isProductsMode() || (stockMode !== 2 && stockMode !== 3) || !menuItemId){
    summaryWrap.classList.add("hidden");
    summaryText.innerHTML = "Sin datos todavía.";
    return;
  }

  try{
    const config = await loadProductVariantStock(menuItemId);
    summaryWrap.classList.remove("hidden");
    summaryText.innerHTML = renderVariantStockSummaryHtml(config || {});
  }catch(e){
    console.error(e);
    summaryWrap.classList.remove("hidden");
    summaryText.innerHTML = `<div class="text-sm text-rose-600 font-semibold">No se pudo cargar el resumen de stock.</div>`;
  }
}

function openVariantStockModal(){
  document.getElementById("variantStockModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeVariantStockModal(){
  document.getElementById("variantStockModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function normalizeVariantGroups(rawGroups){
  if(!Array.isArray(rawGroups)) return [];

  return rawGroups
    .map(group => ({
      optionId: Number(group.optionId ?? group.menuItemOptionId ?? 0),
      optionName: String(group.optionName ?? group.menuItemOptionName ?? "").trim(),
      variants: Array.isArray(group.variants)
        ? group.variants
            .map(v => ({
              variantId: Number(v.variantId ?? v.id ?? 0),
              variantName: String(v.variantName ?? v.name ?? "").trim()
            }))
            .filter(v => v.variantId > 0 && v.variantName)
        : []
    }))
    .filter(group => group.optionId > 0 && group.optionName);
}

let variantCombinationTempSeed = 0;

function nextVariantCombinationTempId(){
  variantCombinationTempSeed += 1;
  return `vc_${Date.now()}_${variantCombinationTempSeed}`;
}

function normalizeVariantCombinationValues(values){
  if(!Array.isArray(values)) return [];

  const unique = new Map();

  values.forEach(v => {
    const optionId = Number(v.menuItemOptionId ?? 0);
    const variantIdRaw = v.menuItemOptionVariantId;

    if(optionId <= 0) return;

    unique.set(optionId, {
      menuItemOptionId: optionId,
      menuItemOptionVariantId:
        variantIdRaw == null || variantIdRaw === "" ? null : Number(variantIdRaw)
    });
  });

  return Array.from(unique.values()).sort((a, b) => a.menuItemOptionId - b.menuItemOptionId);
}

function cloneVariantCombination(row){
  const values = normalizeVariantCombinationValues(row?.values || []);
  const selectedOptionIds = Array.isArray(row?.selectedOptionIds) && row.selectedOptionIds.length
    ? row.selectedOptionIds.map(v => Number(v)).filter(v => v > 0)
    : values.map(v => Number(v.menuItemOptionId)).filter(v => v > 0);

  return {
    __tempId: String(row?.__tempId || row?.id || nextVariantCombinationTempId()),
    enabled: row?.enabled ?? true,
    stockCurrent: row?.stockCurrent ?? 0,
    lowStockThreshold: row?.lowStockThreshold ?? 0,
    selectedOptionIds: [...new Set(selectedOptionIds)],
    isEditing: !!row?.isEditing,
    values
  };
}

function normalizeVariantCombinations(rawCombinations){
  if(!Array.isArray(rawCombinations)) return [];
  return rawCombinations.map(cloneVariantCombination);
}

function ensureVariantCombinationIds(){
  currentVariantStockConfig.combinations = normalizeVariantCombinations(currentVariantStockConfig.combinations || []);
  return currentVariantStockConfig.combinations;
}

function getVariantCombinationByTempId(tempId){
  const combinations = ensureVariantCombinationIds();
  return combinations.find(item => String(item.__tempId) === String(tempId)) || null;
}

function getEditingVariantCombination(){
  const combinations = ensureVariantCombinationIds();
  if(!combinations.length) {
    currentVariantStockConfig.activeCombinationTempId = null;
    return null;
  }

  const active = combinations.find(item => String(item.__tempId) === String(currentVariantStockConfig.activeCombinationTempId));
  if(active) return active;
  return null;
}

function startVariantCombinationEdit(tempId){
  const row = getVariantCombinationByTempId(tempId);
  if(!row) return;
  currentVariantStockConfig.activeCombinationTempId = String(row.__tempId);
  renderVariantGroupsSelector();
  renderVariantCombinations();
}

function finishVariantCombinationEdit(){
  currentVariantStockConfig.activeCombinationTempId = null;
  renderVariantGroupsSelector();
  renderVariantCombinations();
}

function buildVariantCombinationSignature(values, selectedOptionIds = []){
  const normalizedValues = normalizeVariantCombinationValues(values);
  const allowed = Array.isArray(selectedOptionIds) && selectedOptionIds.length
    ? normalizedValues.filter(v => selectedOptionIds.includes(Number(v.menuItemOptionId)))
    : normalizedValues;

  return allowed
    .map(v => `${v.menuItemOptionId}:${v.menuItemOptionVariantId == null ? "null" : v.menuItemOptionVariantId}`)
    .join('|');
}

function buildVariantCartesian(groups, limit = 200){
  const validGroups = (groups || []).filter(group => Array.isArray(group.variants) && group.variants.length);
  if(!validGroups.length) return [];

  let combinations = [[]];

  for(const group of validGroups){
    const next = [];

    for(const base of combinations){
      for(const variant of group.variants){
        next.push([
          ...base,
          {
            menuItemOptionId: Number(group.optionId),
            menuItemOptionVariantId: Number(variant.variantId)
          }
        ]);
        if(next.length >= limit) break;
      }
      if(next.length >= limit) break;
    }

    combinations = next;
    if(combinations.length >= limit) break;
  }

  return combinations.map(normalizeVariantCombinationValues);
}

function buildDefaultVariantCombinationValues(groups, existingCombinations){
  const selectedOptionIds = groups.map(group => Number(group.optionId));
  const usedSignatures = new Set(
    (existingCombinations || [])
      .map(item => buildVariantCombinationSignature(item.values || [], item.selectedOptionIds || selectedOptionIds))
      .filter(Boolean)
  );

  const cartesian = buildVariantCartesian(groups, 250);
  const available = cartesian.find(values => !usedSignatures.has(buildVariantCombinationSignature(values, selectedOptionIds)));
  if(available?.length) return available;

  return normalizeVariantCombinationValues(
    groups.map(group => ({
      menuItemOptionId: Number(group.optionId),
      menuItemOptionVariantId: Number(group.variants?.[0]?.variantId || 0)
    }))
  );
}

function renderVariantGroupsSelector(){
  const wrap = document.getElementById("variantGroupsSelector");
  if(!wrap) return;

  const groups = normalizeVariantGroups(currentVariantStockConfig.allGroups);
  const activeCombination = getEditingVariantCombination();
  const stockMode = Number(currentVariantStockConfig.stockMode || 0);
  const isSubtypeMode = stockMode === 2;

  if(!groups.length){
    wrap.innerHTML = `<div class="text-sm text-slate-400">${isSubtypeMode ? "No hay subtipos configurados para este producto." : "No hay variantes configuradas para este producto."}</div>`;
    return;
  }

  if(!activeCombination){
    wrap.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        El modal abrió en modo lectura. Tocá <strong>Editar</strong> en una combinación para modificar sus opciones.
      </div>
    `;
    return;
  }

  const selected = Array.isArray(activeCombination.selectedOptionIds)
    ? activeCombination.selectedOptionIds.map(Number)
    : [];

  wrap.innerHTML = `
    <div class="mb-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
      <div class="text-[11px] uppercase tracking-[0.18em] text-violet-500 font-extrabold font-display">Editando</div>
      <div class="text-sm font-bold text-violet-900 mt-1">Solo se modifica la combinación seleccionada.</div>
    </div>
    ${groups.map((group) => `
      <label class="feature-box flex items-start gap-3 px-4 py-4 cursor-pointer">
        <input
          type="checkbox"
          class="h-4 w-4 mt-1"
          ${selected.includes(Number(group.optionId)) ? "checked" : ""}
          onchange="toggleVariantOption(${Number(group.optionId)}, this.checked)"
        />

        <div class="min-w-0">
          <div class="text-sm font-semibold text-slate-800">${escapeHtml(group.optionName)}</div>
          <div class="text-xs text-slate-500 mt-1">
            ${isSubtypeMode
              ? "Stock independiente por subtipo"
              : ((group.variants || []).map(v => escapeHtml(v.variantName)).join(" · ") || "Sin variantes")}
          </div>
        </div>
      </label>
    `).join("")}
  `;
}

function toggleVariantOption(optionId, checked){
  const id = Number(optionId);
  const activeCombination = getEditingVariantCombination();
  if(!activeCombination) return;

  const stockMode = Number(currentVariantStockConfig.stockMode || 0);
  const isSubtypeMode = stockMode === 2;

  const selected = Array.isArray(activeCombination.selectedOptionIds)
    ? [...activeCombination.selectedOptionIds].map(Number).filter(v => v > 0)
    : [];

  if(checked){
    if(!selected.includes(id)) selected.push(id);
    activeCombination.selectedOptionIds = [...new Set(selected)];

    const hasValue = normalizeVariantCombinationValues(activeCombination.values || [])
      .some(v => Number(v.menuItemOptionId) === id);

    if(!hasValue){
      if(isSubtypeMode){
        activeCombination.values = normalizeVariantCombinationValues([
          ...(activeCombination.values || []),
          { menuItemOptionId: id, menuItemOptionVariantId: null }
        ]);
      } else {
        const group = normalizeVariantGroups(currentVariantStockConfig.allGroups)
          .find(g => Number(g.optionId) === id);

        const defaultVariantId = Number(group?.variants?.[0]?.variantId || 0);

        if(defaultVariantId > 0){
          activeCombination.values = normalizeVariantCombinationValues([
            ...(activeCombination.values || []),
            { menuItemOptionId: id, menuItemOptionVariantId: defaultVariantId }
          ]);
        }
      }
    }
  } else {
    activeCombination.selectedOptionIds = selected.filter(x => x !== id);
    activeCombination.values = normalizeVariantCombinationValues(activeCombination.values || [])
      .filter(v => Number(v.menuItemOptionId) !== id);
  }

  renderVariantGroupsSelector();
  renderVariantCombinations();
}

async function getItemById(id){
  const r = await fetchAuth(`${getItemsApiBase()}/${id}`);
  if(!r) return null;
  if(!r.ok) throw new Error("item_detail_failed");
  return await r.json();
}

function renderVariantCombinations(){
  const wrap = document.getElementById("variantCombinationsList");
  if(!wrap) return;

  const allGroups = normalizeVariantGroups(currentVariantStockConfig.allGroups);
  const combinations = ensureVariantCombinationIds();
  const editingCombination = getEditingVariantCombination();
  const stockMode = Number(currentVariantStockConfig.stockMode || 0);
  const isSubtypeMode = stockMode === 2;
  const isVariantMode = stockMode === 3;

  if(!combinations.length){
    wrap.innerHTML = `<div class="text-sm text-slate-400">Todavía no agregaste combinaciones.</div>`;
    return;
  }

  wrap.innerHTML = combinations.map((combination, index) => {
    const tempId = String(combination.__tempId);
    const isEditing = String(editingCombination?.__tempId || "") === tempId;

    const selectedIds = Array.isArray(combination.selectedOptionIds)
      ? combination.selectedOptionIds.map(Number).filter(v => v > 0)
      : [];

    const groups = allGroups.filter(g => selectedIds.includes(Number(g.optionId)));
    const signature = buildVariantCombinationSignature(combination.values || [], selectedIds);

    let valuesHtml = "";

    if(isSubtypeMode){
      valuesHtml = groups.length
        ? groups.map(group => `
            <div>
              <label class="field-label">${escapeHtml(group.optionName)}</label>
              <div class="field-input flex items-center bg-slate-50 text-slate-700 font-semibold">
                ${escapeHtml(group.optionName)}
              </div>
            </div>
          `).join("")
        : `
          <div class="md:col-span-2 xl:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
            ${isEditing
              ? "Elegí subtipos para esta combinación desde el panel izquierdo."
              : "Sin subtipos elegidos para esta combinación."}
          </div>
        `;
    }

    if(isVariantMode){
      valuesHtml = groups.length
        ? groups.map(group => {
            const selectedValue = normalizeVariantCombinationValues(combination.values || [])
              .find(v => Number(v.menuItemOptionId) === Number(group.optionId));

            const options = Array.isArray(group.variants) ? group.variants : [];

            return `
              <div>
                <label class="field-label">${escapeHtml(group.optionName)}</label>
                <select
                  class="field-input"
                  ${isEditing ? "" : "disabled"}
                  onchange="updateVariantCombinationValue('${tempId}', ${Number(group.optionId)}, this.value)">
                  <option value="">Seleccionar</option>
                  ${options.map(opt => `
                    <option value="${opt.variantId}" ${Number(selectedValue?.menuItemOptionVariantId || 0) === Number(opt.variantId) ? "selected" : ""}>
                      ${escapeHtml(opt.variantName)}
                    </option>
                  `).join("")}
                </select>
              </div>
            `;
          }).join("")
        : `
          <div class="md:col-span-2 xl:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
            ${isEditing
              ? "Elegí opciones para esta combinación desde el panel izquierdo."
              : "Sin opciones elegidas para esta combinación."}
          </div>
        `;
    }

    return `
      <div class="option-card ${isEditing ? "ring-2 ring-violet-300 border-violet-300" : ""}">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div class="text-sm font-extrabold text-slate-900 font-display">Combinación ${index + 1}</div>
            <div class="text-[11px] text-slate-400 mt-1">${escapeHtml(signature || "Sin combinación")}</div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            ${isEditing
              ? `<span class="text-[10px] px-2 py-1 rounded-full bg-violet-100 text-violet-800 font-extrabold">Editando</span>`
              : ""}

            ${isEditing
              ? `
                <button
                  type="button"
                  class="soft-btn px-3 py-2 rounded-2xl bg-violet-600 text-white hover:bg-violet-700 text-xs"
                  onclick="event.stopPropagation(); saveVariantCombinationEdit('${tempId}')">
                  Guardar
                </button>
              `
              : `
                <button
                  type="button"
                  class="soft-btn px-3 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs"
                  onclick="event.stopPropagation(); startVariantCombinationEdit('${tempId}')">
                  Editar
                </button>
              `}

            <button
              type="button"
              class="soft-btn px-3 py-2 rounded-2xl bg-rose-100 text-rose-800 hover:bg-rose-200 text-xs"
              onclick="event.stopPropagation(); removeVariantCombination('${tempId}')">
              Eliminar
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          ${valuesHtml}

          <div>
            <label class="field-label">Stock actual</label>
            <input
              type="number"
              min="0"
              class="field-input"
              ${isEditing ? "" : "disabled"}
              value="${combination.stockCurrent ?? ""}"
              oninput="updateVariantCombinationField('${tempId}', 'stockCurrent', this.value)" />
          </div>

          <div>
            <label class="field-label">Alerta stock bajo</label>
            <input
              type="number"
              min="0"
              class="field-input"
              ${isEditing ? "" : "disabled"}
              value="${combination.lowStockThreshold ?? ""}"
              oninput="updateVariantCombinationField('${tempId}', 'lowStockThreshold', this.value)" />
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function editVariantCombination(tempId){
  currentVariantStockConfig.combinations = ensureVariantCombinationIds().map(item => ({
    ...item,
    isEditing: String(item.__tempId) === String(tempId)
  }));

  currentVariantStockConfig.activeCombinationTempId = String(tempId);
  renderVariantGroupsSelector();
  renderVariantCombinations();
}

function finishVariantCombinationEdit(tempId){
  currentVariantStockConfig.combinations = ensureVariantCombinationIds().map(item => ({
    ...item,
    isEditing: String(item.__tempId) === String(tempId) ? false : !!item.isEditing
  }));

  renderVariantGroupsSelector();
  renderVariantCombinations();
}

async function saveVariantCombinationEdit(tempId){
  const row = getVariantCombinationByTempId(tempId);
  if(!row){
    toast("No se encontró la combinación", "error");
    return;
  }

  const mode = Number(currentVariantStockConfig.stockMode || 0);

  const selectedIds = Array.isArray(row.selectedOptionIds)
    ? row.selectedOptionIds.map(Number).filter(v => v > 0)
    : [];

  if(!selectedIds.length){
    toast("Seleccioná al menos una opción para la combinación", "error");
    return;
  }

  let values = normalizeVariantCombinationValues(row.values || [])
    .filter(v => selectedIds.includes(Number(v.menuItemOptionId)));

  if(mode === 2){
    values = values.map(v => ({
      menuItemOptionId: Number(v.menuItemOptionId),
      menuItemOptionVariantId: null
    }));
  }

  if(!values.length){
    toast(mode === 2 ? "Elegí al menos un subtipo" : "Elegí al menos una variante para la combinación", "error");
    return;
  }

  if(mode === 3 && values.length !== selectedIds.length){
    toast("Completá todas las opciones seleccionadas antes de guardar", "error");
    return;
  }

  const signature = buildVariantCombinationSignature(values, selectedIds);

  const duplicate = ensureVariantCombinationIds().find(item => {
    if(String(item.__tempId) === String(tempId)) return false;

    const otherSelectedIds = Array.isArray(item.selectedOptionIds)
      ? item.selectedOptionIds.map(Number).filter(v => v > 0)
      : [];

    const otherSignature = buildVariantCombinationSignature(item.values || [], otherSelectedIds);

    return signature && otherSignature && signature === otherSignature;
  });

  if(duplicate){
    toast("Ya existe una combinación igual", "error");
    return;
  }

  row.values = values;
  row.stockCurrent = Number(row.stockCurrent || 0);
  row.lowStockThreshold = Number(row.lowStockThreshold || 0);

  try{
    await persistVariantStockConfig();
    await openEditVariantStockSetup();
    toast("Combinación guardada", "success", 1200);
  }catch(e){
    console.error(e);
    toast("No se pudo guardar la combinación", "error");
  }
}

function addVariantCombination(){
  const combinations = ensureVariantCombinationIds();
  const allGroups = normalizeVariantGroups(currentVariantStockConfig.allGroups);
  const mode = Number(currentVariantStockConfig.stockMode || 0);

  if(mode === 2){
    const firstSubtype = allGroups.find(group => Number(group.optionId) > 0);

    if(!firstSubtype){
      toast("Primero configurá subtipos en el producto", "error");
      return;
    }

    const newCombination = {
      __tempId: nextVariantCombinationTempId(),
      enabled: true,
      stockCurrent: 0,
      lowStockThreshold: 0,
      selectedOptionIds: [Number(firstSubtype.optionId)],
      values: [{
        menuItemOptionId: Number(firstSubtype.optionId),
        menuItemOptionVariantId: null
      }],
      isEditing: true
    };

    currentVariantStockConfig.combinations = [
      ...combinations.map(item => ({ ...item, isEditing: false })),
      cloneVariantCombination(newCombination)
    ];

    currentVariantStockConfig.activeCombinationTempId = String(newCombination.__tempId);
    renderVariantGroupsSelector();
    renderVariantCombinations();
    return;
  }

  if(mode === 3){
    const firstGroupWithVariants = allGroups.find(group => Array.isArray(group.variants) && group.variants.length);

    if(!firstGroupWithVariants){
      toast("Primero configurá variantes en el producto", "error");
      return;
    }

    const newCombination = {
      __tempId: nextVariantCombinationTempId(),
      enabled: true,
      stockCurrent: 0,
      lowStockThreshold: 0,
      selectedOptionIds: [Number(firstGroupWithVariants.optionId)],
      values: [{
        menuItemOptionId: Number(firstGroupWithVariants.optionId),
        menuItemOptionVariantId: Number(firstGroupWithVariants.variants[0].variantId)
      }],
      isEditing: true
    };

    currentVariantStockConfig.combinations = [
      ...combinations.map(item => ({ ...item, isEditing: false })),
      cloneVariantCombination(newCombination)
    ];

    currentVariantStockConfig.activeCombinationTempId = String(newCombination.__tempId);
    renderVariantGroupsSelector();
    renderVariantCombinations();
    return;
  }

  toast("Elegí un modo de stock configurable", "info");
}

function removeVariantCombination(tempId){
  currentVariantStockConfig.combinations = ensureVariantCombinationIds().filter(item => String(item.__tempId) !== String(tempId));
  if(String(currentVariantStockConfig.activeCombinationTempId || '') === String(tempId)){
    currentVariantStockConfig.activeCombinationTempId = null;
  }
  renderVariantGroupsSelector();
  renderVariantCombinations();
}

function updateVariantCombinationField(tempId, field, value){
  const row = getVariantCombinationByTempId(tempId);
  if(!row || String(currentVariantStockConfig.activeCombinationTempId || '') !== String(tempId)) return;
  row[field] = value === "" ? null : Number(value);
}

function updateVariantCombinationValue(tempId, optionId, variantId){
  const comb = getVariantCombinationByTempId(tempId);
  if(!comb || String(currentVariantStockConfig.activeCombinationTempId || '') !== String(tempId)) return;

  const parsedOptionId = Number(optionId || 0);
  const parsedVariantId = Number(variantId || 0);
  const nextValues = normalizeVariantCombinationValues(comb.values || []);
  const existingIndex = nextValues.findIndex(v => Number(v.menuItemOptionId) === parsedOptionId);

  if(parsedVariantId <= 0){
    if(existingIndex >= 0) nextValues.splice(existingIndex, 1);
    comb.values = normalizeVariantCombinationValues(nextValues);
    return;
  }

  if(existingIndex >= 0){
    nextValues[existingIndex] = {
      menuItemOptionId: parsedOptionId,
      menuItemOptionVariantId: parsedVariantId
    };
  }else{
    nextValues.push({
      menuItemOptionId: parsedOptionId,
      menuItemOptionVariantId: parsedVariantId
    });
  }

  comb.values = normalizeVariantCombinationValues(nextValues);
}

async function loadProductVariantStock(menuItemId){
  const r = await fetchAuth(getStockApiBase(menuItemId));
  if(!r) return null;
  if(!r.ok) throw new Error("product_stock_load_failed");
  return await r.json();
}

async function saveProductVariantStock(menuItemId, payload){
  const r = await fetchAuth(getStockApiBase(menuItemId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r;
}

async function openEditVariantStockSetup(){
  const menuItemId = Number(document.getElementById("editId").value || 0);
  if(!menuItemId){
    toast("Producto inválido", "error");
    return;
  }

  try{
    let config = null;

    try{
      config = await loadProductVariantStock(menuItemId);
    }catch(e){
      console.warn("No se pudo leer stock existente.", e);
    }

    const stockModeFromUi = Number(document.getElementById("editStockMode").value || 0);
    const effectiveStockMode = Number(config?.stockMode ?? stockModeFromUi ?? 0);

    const localGroups = normalizeVariantGroups(
      sanitizeOptionsForPayload(getEditOptionsState()).map(option => ({
        optionId: option.id,
        optionName: option.name,
        variants: effectiveStockMode === 2
          ? []
          : (option.variants || []).map(v => ({
              variantId: v.id,
              variantName: v.name
            }))
      }))
    );

    const apiGroups = normalizeVariantGroups(
      (config?.variantGroups || []).map(group => ({
        optionId: group.optionId ?? group.menuItemOptionId ?? group.id,
        optionName: group.optionName ?? group.menuItemOptionName ?? group.name,
        variants: effectiveStockMode === 2
          ? []
          : (group.variants || []).map(v => ({
              variantId: v.variantId ?? v.id,
              variantName: v.variantName ?? v.name
            }))
      }))
    );

    const finalGroups = apiGroups.length ? apiGroups : localGroups;
    const normalizedCombinations = normalizeVariantCombinations(config?.combinations || []);

    currentVariantStockConfig = {
      menuItemId: Number(menuItemId),
      stockMode: effectiveStockMode,
      hasStock: !!config?.hasStock,
      stockCurrent: config?.stockCurrent ?? null,
      lowStockThreshold: config?.lowStockThreshold ?? null,
      hasVariantStock: !!config?.hasVariantStock,
      allGroups: finalGroups,
      activeCombinationTempId: null,
      combinations: normalizedCombinations.map(item => cloneVariantCombination({
        ...item,
        selectedOptionIds: (item.values || [])
          .map(value => Number(value.menuItemOptionId || 0))
          .filter(value => value > 0),
        values: (item.values || []).map(value => ({
          menuItemOptionId: Number(value.menuItemOptionId || 0),
          menuItemOptionVariantId:
            effectiveStockMode === 2
              ? null
              : (value.menuItemOptionVariantId == null ? null : Number(value.menuItemOptionVariantId))
        }))
      }))
    };

    document.getElementById("variantStockMenuItemId").value = String(menuItemId);

    const modalTitle = document.querySelector("#variantStockModal .text-2xl.font-extrabold");
    const modalSubtitle = document.querySelector("#variantStockModal .text-sm.text-slate-500.mt-1");

    if(modalTitle){
      modalTitle.textContent = effectiveStockMode === 2 ? "Subtipos y stock" : "Variantes y stock";
    }

    if(modalSubtitle){
      modalSubtitle.textContent = effectiveStockMode === 2
        ? "Usá los subtipos del producto y cargá stock por subtipo."
        : "Usá las opciones del producto y cargá stock por combinación.";
    }

    renderVariantGroupsSelector();
    renderVariantCombinations();
    openVariantStockModal();
  }catch(e){
    console.error(e);
    toast("No se pudo cargar la configuración de stock", "error");
  }
}

async function persistVariantStockConfig(){
  const menuItemId = Number(document.getElementById("variantStockMenuItemId").value || 0);
  if(!menuItemId){
    toast("Producto inválido", "error");
    return;
  }

  if(!isProductsMode()){
    toast("El stock solo está disponible para catálogo", "info");
    return;
  }

  const mode = Number(currentVariantStockConfig.stockMode || 0);
  const normalizedRows = ensureVariantCombinationIds();

  if(!normalizedRows.length){
    toast("Agregá al menos una combinación", "error");
    return;
  }

  const uniqueCombinationsMap = new Map();
  const usedOptionIdsSet = new Set();

  normalizedRows.forEach(item => {
    const selectedOptionIds = Array.isArray(item.selectedOptionIds)
      ? item.selectedOptionIds.map(Number).filter(x => x > 0)
      : [];

    let values = normalizeVariantCombinationValues(item.values || [])
      .filter(value => selectedOptionIds.includes(Number(value.menuItemOptionId)));

    if(mode === 2){
      values = values.map(value => ({
        menuItemOptionId: Number(value.menuItemOptionId),
        menuItemOptionVariantId: null
      }));
    }

    const signature = buildVariantCombinationSignature(values, selectedOptionIds);
    if(!signature) return;

    selectedOptionIds.forEach(id => usedOptionIdsSet.add(Number(id)));

    uniqueCombinationsMap.set(signature, {
      enabled: true,
      hasStock: true,
      stockCurrent: item.stockCurrent == null ? 0 : Number(item.stockCurrent),
      lowStockThreshold: item.lowStockThreshold == null ? 0 : Number(item.lowStockThreshold),
      values
    });
  });

  const combinations = Array.from(uniqueCombinationsMap.values());
  const usedOptionIds = Array.from(usedOptionIdsSet).sort((a,b) => a-b);

  const hasInvalidCombination = combinations.some(item => {
    if(!item.values.length) return true;

    const ids = item.values.map(value => Number(value.menuItemOptionId));
    const uniqueIds = new Set(ids);

    if(mode === 2){
      return item.values.some(value => value.menuItemOptionId <= 0)
        || uniqueIds.size !== item.values.length;
    }

    if(mode === 3){
      return item.values.some(value => value.menuItemOptionId <= 0 || value.menuItemOptionVariantId == null || value.menuItemOptionVariantId <= 0)
        || uniqueIds.size !== item.values.length;
    }

    return true;
  });

  if(!combinations.length || !usedOptionIds.length || hasInvalidCombination){
    toast("Revisá las combinaciones antes de guardar", "error");
    return;
  }

  const payload = {
    stockMode: mode,
    hasStock: false,
    stockCurrent: null,
    lowStockThreshold: null,
    hasVariantStock: true,
    combinations
  };

  try{
    const r = await saveProductVariantStock(menuItemId, payload);
    if(!r) return;

    if(!r.ok){
      const t = await r.text().catch(() => "");
      console.error(t);
      toast("Error guardando configuración de stock", "error");
      return;
    }

    toast("Configuración de stock guardada", "success");
    closeVariantStockModal();
    await loadVariantStockSummaryForEdit();
    await refresh();
  }catch(e){
    console.error(e);
    toast("Error guardando configuración de stock", "error");
  }
}

  function imgBoxRow(imgUrl){
    const src = resolveImgUrl(imgUrl);

    if(!src){
      return `<div class="w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-semibold">IMG</div>`;
    }

    return `
      <div class="w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
        <img src="${src}" class="w-full h-full object-cover"
          onerror="this.parentElement.outerHTML='<div class=&quot;w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-semibold&quot;>IMG</div>'"/>
      </div>
    `;
  }

  function buildImageCardHtml(item, index, mode){
    const src = item.previewUrl || item.url || "";
    const moveUpFn = mode === "edit" ? `moveEditImageUp(${index})` : `moveNewImageUp(${index})`;
    const moveDownFn = mode === "edit" ? `moveEditImageDown(${index})` : `moveNewImageDown(${index})`;
    const removeFn = mode === "edit" ? `removeEditImage(${index})` : `removeNewImage(${index})`;

    return `
      <div class="image-card">
        <div class="image-card-preview">
          <img src="${src}" alt="preview ${index + 1}">
        </div>

        <div class="p-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] px-2 py-1 rounded-full ${index === 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"} font-semibold">
              ${index === 0 ? "Principal" : "Secundaria"}
            </span>

            <span class="text-[10px] text-slate-400 font-semibold">
              Orden ${index + 1}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button type="button" onclick="${moveUpFn}"
              class="soft-btn px-2 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs">
              ↑
            </button>

            <button type="button" onclick="${moveDownFn}"
              class="soft-btn px-2 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs">
              ↓
            </button>

            <button type="button" onclick="${removeFn}"
              class="soft-btn px-2 py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderPreviewGrid(gridId, emptyId, items, mode){
    const grid = document.getElementById(gridId);
    const empty = document.getElementById(emptyId);

    if(!grid || !empty) return;

    if(!items.length){
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    grid.innerHTML = items.map((item, index) => buildImageCardHtml(item, index, mode)).join("");
  }

  function appendFilesToImages(files, targetArray){
    const incoming = Array.from(files || []);
    incoming.forEach(file => {
      targetArray.push({
        file,
        previewUrl: URL.createObjectURL(file)
      });
    });
  }

  function revokePreview(item){
    if(item?.previewUrl?.startsWith("blob:")){
      try { URL.revokeObjectURL(item.previewUrl); } catch {}
    }
  }

  function clearImageArray(arr){
    arr.forEach(revokePreview);
    arr.length = 0;
  }

  function removeArrayItem(arr, index){
    if(index < 0 || index >= arr.length) return;
    revokePreview(arr[index]);
    arr.splice(index, 1);
  }

  function moveArrayItemUp(arr, index){
    if(index <= 0 || index >= arr.length) return;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
  }

  function moveArrayItemDown(arr, index){
    if(index < 0 || index >= arr.length - 1) return;
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
  }

function buildImagesPayloadFromUrls(urls){

  return urls
    .filter(Boolean)
    .map((url,index)=>({
      url: url,
      isPrimary: index === 0,
      sortOrder: index
    }));

}

async function uploadMany(items){
  const urls = [];
  const seen = new Set();

  for(const item of (items || [])){
    if(item?.url){
      const normalized = String(item.url).trim();
      if(normalized && !seen.has(normalized)){
        seen.add(normalized);
        urls.push(normalized);
      }
      continue;
    }

    if(item?.file){
      const uploadedUrl = await upload(item.file);
      const normalized = String(uploadedUrl || "").trim();
      if(normalized && !seen.has(normalized)){
        seen.add(normalized);
        urls.push(normalized);
      }
    }
  }

  return urls;
}

  function renderNewImages(){
    renderPreviewGrid("imagePreviewGrid", "emptyPreviewBox", selectedImages, "new");
  }

  function renderEditImages(){
    const all = [...existingEditImages, ...selectedEditImages];
    renderPreviewGrid("editPreviewGrid", "editEmptyPreviewBox", all, "edit");
  }

  function moveNewImageUp(index){
    moveArrayItemUp(selectedImages, index);
    renderNewImages();
  }

  function moveNewImageDown(index){
    moveArrayItemDown(selectedImages, index);
    renderNewImages();
  }

  function removeNewImage(index){
    removeArrayItem(selectedImages, index);
    renderNewImages();
  }

  function moveEditImageUp(index){
    const all = [...existingEditImages, ...selectedEditImages];
    moveArrayItemUp(all, index);
    existingEditImages = all.filter(x => !!x.url);
    selectedEditImages = all.filter(x => !!x.file);
    renderEditImages();
  }

  function moveEditImageDown(index){
    const all = [...existingEditImages, ...selectedEditImages];
    moveArrayItemDown(all, index);
    existingEditImages = all.filter(x => !!x.url);
    selectedEditImages = all.filter(x => !!x.file);
    renderEditImages();
  }

  function removeEditImage(index){
    const all = [...existingEditImages, ...selectedEditImages];
    removeArrayItem(all, index);
    existingEditImages = all.filter(x => !!x.url);
    selectedEditImages = all.filter(x => !!x.file);
    renderEditImages();
  }

  window.moveNewImageUp = moveNewImageUp;
  window.addVariantCombination = addVariantCombination;
  window.removeVariantCombination = removeVariantCombination;
  window.updateVariantCombinationField = updateVariantCombinationField;
  window.updateVariantCombinationValue = updateVariantCombinationValue;
  window.moveNewImageDown = moveNewImageDown;
  window.removeNewImage = removeNewImage;
  window.moveEditImageUp = moveEditImageUp;
  window.moveEditImageDown = moveEditImageDown;
  window.removeEditImage = removeEditImage;
  window.toggleVariantOption = toggleVariantOption;
  window.startVariantCombinationEdit = startVariantCombinationEdit;
  window.finishVariantCombinationEdit = finishVariantCombinationEdit;
  window.editVariantCombination = editVariantCombination;
  window.saveVariantCombinationEdit = saveVariantCombinationEdit;

  function resolveTableManagementEnabled(){
    if(isProductsMode()){
      return false;
    }

    const slug = getSlug();

    try{
      const companyRaw = localStorage.getItem("menuonline_company");
      if(companyRaw){
        const company = JSON.parse(companyRaw);
        if(company && typeof company === "object"){
          if(typeof company.featureTableManagementEnabled === "boolean") return company.featureTableManagementEnabled;
          if(typeof company.tablesEnabled === "boolean") return company.tablesEnabled;
        }
      }
    }catch{}

    try{
      const companiesRaw = localStorage.getItem("menuonline_companies");
      if(companiesRaw){
        const companies = JSON.parse(companiesRaw);
        if(Array.isArray(companies)){
          const company = companies.find(x => x.slug === slug);
          if(company){
            if(typeof company.featureTableManagementEnabled === "boolean") return company.featureTableManagementEnabled;
            if(typeof company.tablesEnabled === "boolean") return company.tablesEnabled;
          }
        }
      }
    }catch{}

    if(typeof CONFIG?.featureTableManagementEnabled === "boolean") return CONFIG.featureTableManagementEnabled;
    if(typeof CONFIG?.tablesEnabled === "boolean") return CONFIG.tablesEnabled;

    return false;
  }

  function applyTableManagementVisibility(){
    const blocks = [
      document.getElementById("visibleInTablesBlock"),
      document.getElementById("isInternalForTablesBlock"),
      document.getElementById("editVisibleInTablesBlock"),
      document.getElementById("editIsInternalForTablesBlock")
    ];

    const showTables = tableManagementEnabled && !isProductsMode();

    blocks.forEach(el => {
      if(el){
        el.style.display = showTables ? "" : "none";
      }
    });

    if(!showTables){
      const visibleInTables = document.getElementById("visibleInTables");
      const isInternalForTables = document.getElementById("isInternalForTables");
      const editVisibleInTables = document.getElementById("editVisibleInTables");
      const editIsInternalForTables = document.getElementById("editIsInternalForTables");

      if(visibleInTables) visibleInTables.checked = false;
      if(isInternalForTables) isInternalForTables.checked = false;
      if(editVisibleInTables) editVisibleInTables.checked = false;
      if(editIsInternalForTables) editIsInternalForTables.checked = false;
    }
  }

  async function upload(file){
    const fd = new FormData();
    fd.append("file", file);

    const r = await fetchAuth(`${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/uploads/image`, {
      method: "POST",
      body: fd
    });
    if(!r) return null;
    if(!r.ok) throw new Error("upload_failed");
    return (await r.json()).url;
  }

  async function loadCategories(){
    const r = await fetchAuth(getCategoriesApiUrl());
    if(!r) return;
    if(!r.ok) throw new Error("categories_failed");

    categoriesCache = await r.json();

    const select = document.getElementById("category");
    const editSelect = document.getElementById("editCategory");
    const filterSelect = document.getElementById("filterCategory");

    select.innerHTML = `<option value="">Seleccionar categoría</option>`;
    editSelect.innerHTML = ``;
    filterSelect.innerHTML = `<option value="">Todas</option>`;

    categoriesCache.forEach(c => {
      if(c.enabled === false) return;
      select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      editSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      filterSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    filterSelect.value = filterCategoryId;
  }

  async function refresh(){
    const r = await fetchAuth(getItemsApiBase());
    if(!r) return;
    if(!r.ok) throw new Error("items_failed");
    itemsCache = await r.json();
    render();
  }

  async function createItem(payload){
    return await fetchAuth(getItemsApiBase(), {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
  }

  async function updateItem(id, payload){
    return await fetchAuth(`${getItemsApiBase()}/${id}`, {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
  }

  async function deleteItem(id){
    return await fetchAuth(`${getItemsApiBase()}/${id}`, {
      method: "DELETE"
    });
  }

  function getNewOptionsState(){
    if(!window.__newOptionsState) window.__newOptionsState = [];
    return window.__newOptionsState;
  }

  function getEditOptionsState(){
    if(!window.__editOptionsState) window.__editOptionsState = [];
    return window.__editOptionsState;
  }

  function normalizeNumberInput(v){
    const n = parsePriceToNumber(v);
    return Number.isNaN(n) ? 0 : n;
  }

  function sanitizeOptionsForPayload(options){
    return (options || [])
      .map((option, index) => ({
        id: option.id ?? 0,
        name: String(option.name || "").trim(),
        extraPrice: Number(option.extraPrice || 0),
        enabled: option.enabled ?? true,
        order: option.order ?? index,
        variants: (option.variants || [])
          .map(variant => ({
            id: variant.id ?? 0,
            name: String(variant.name || "").trim(),
            extraPrice: Number(variant.extraPrice || 0),
            enabled: variant.enabled ?? true
          }))
          .filter(variant => variant.name)
      }))
      .filter(option => option.name);
  }

  function buildOptionCardHtml(prefix, option, index){
    const variants = Array.isArray(option.variants) ? option.variants : [];

    const fn = {
      removeOption: prefix === "edit" ? "editRemoveOption" : "removeOption",
      updateOptionField: prefix === "edit" ? "editUpdateOptionField" : "updateOptionField",
      addVariant: prefix === "edit" ? "editAddVariant" : "addVariant",
      removeVariant: prefix === "edit" ? "editRemoveVariant" : "removeVariant",
      updateVariantField: prefix === "edit" ? "editUpdateVariantField" : "updateVariantField"
    };

    return `
      <div class="option-card" data-option-index="${index}">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div class="text-sm font-extrabold text-slate-900 font-display">Opción ${index + 1}</div>
          <button type="button"
            class="soft-btn px-3 py-2 rounded-2xl bg-rose-100 text-rose-800 hover:bg-rose-200 text-xs"
            onclick="${fn.removeOption}(${index})">
            Eliminar opción
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="field-label">Nombre de la opción</label>
            <input class="field-input"
              value="${escapeHtml(option.name || "")}"
              oninput="${fn.updateOptionField}(${index}, 'name', this.value)"
              placeholder="Ej: Carne" />
          </div>

          <div>
            <label class="field-label">Extra de precio</label>
            <input class="field-input"
              value="${escapeHtml(String(option.extraPrice ?? ""))}"
              oninput="${fn.updateOptionField}(${index}, 'extraPrice', this.value)"
              placeholder="0" />
          </div>
        </div>

        <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div class="text-sm font-semibold text-slate-800">Variantes</div>
            <div class="text-xs text-slate-500 mt-1">Ej: Frita / Horno. Si no agregás variantes, la opción queda sola.</div>
          </div>

          <button type="button"
            class="soft-btn px-3 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs"
            onclick="${fn.addVariant}(${index})">
            Agregar variante
          </button>
        </div>

        <div class="space-y-3">
          ${variants.length
            ? variants.map((variant, vIndex) => `
              <div class="variant-pill">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  <input class="field-input"
                    value="${escapeHtml(variant.name || "")}"
                    oninput="${fn.updateVariantField}(${index}, ${vIndex}, 'name', this.value)"
                    placeholder="Ej: Frita" />

                  <input class="field-input"
                    value="${escapeHtml(String(variant.extraPrice ?? ""))}"
                    oninput="${fn.updateVariantField}(${index}, ${vIndex}, 'extraPrice', this.value)"
                    placeholder="0" />
                </div>

                <button type="button"
                  class="soft-btn px-3 py-2 rounded-2xl bg-rose-100 text-rose-800 hover:bg-rose-200 text-xs shrink-0"
                  onclick="${fn.removeVariant}(${index}, ${vIndex})">
                  Quitar
                </button>
              </div>
            `).join("")
            : `<div class="text-sm text-slate-400">Sin variantes.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderOptionsBuilder(){
    const wrapper = document.getElementById("optionsBuilder");
    const enabled = document.getElementById("hasConfiguration").checked;
    document.getElementById("configSection").classList.toggle("hidden", !enabled);

    if(!enabled){
      wrapper.innerHTML = "";
      return;
    }

    const optionsState = getNewOptionsState();
    wrapper.innerHTML = optionsState.length
      ? optionsState.map((option, index) => buildOptionCardHtml("", option, index)).join("")
      : `<div class="text-sm text-slate-400">Todavía no agregaste opciones.</div>`;
  }

  function renderEditOptionsBuilder(){
    const wrapper = document.getElementById("editOptionsBuilder");
    const enabled = document.getElementById("editHasConfiguration").checked;
    document.getElementById("editConfigSection").classList.toggle("hidden", !enabled);

    if(!enabled){
      wrapper.innerHTML = "";
      return;
    }

    const optionsState = getEditOptionsState();
    wrapper.innerHTML = optionsState.length
      ? optionsState.map((option, index) => buildOptionCardHtml("edit", option, index)).join("")
      : `<div class="text-sm text-slate-400">Todavía no agregaste opciones.</div>`;
  }

  function addOption(){
    getNewOptionsState().push({
      name: "",
      extraPrice: 0,
      variants: []
    });
    renderOptionsBuilder();
  }

  function removeOption(index){
    getNewOptionsState().splice(index, 1);
    renderOptionsBuilder();
  }

  function updateOptionField(index, field, value){
    const optionsState = getNewOptionsState();
    if(!optionsState[index]) return;
    optionsState[index][field] = field === "extraPrice" ? normalizeNumberInput(value) : value;
  }

  function addVariant(index){
    const optionsState = getNewOptionsState();
    if(!optionsState[index]) return;
    if(!Array.isArray(optionsState[index].variants)) optionsState[index].variants = [];
    optionsState[index].variants.push({
      name: "",
      extraPrice: 0
    });
    renderOptionsBuilder();
  }

  function removeVariant(index, variantIndex){
    const optionsState = getNewOptionsState();
    if(!optionsState[index]?.variants) return;
    optionsState[index].variants.splice(variantIndex, 1);
    renderOptionsBuilder();
  }

  function updateVariantField(index, variantIndex, field, value){
    const optionsState = getNewOptionsState();
    if(!optionsState[index]?.variants?.[variantIndex]) return;
    optionsState[index].variants[variantIndex][field] = field === "extraPrice" ? normalizeNumberInput(value) : value;
  }

  function editAddOption(){
    getEditOptionsState().push({
      name: "",
      extraPrice: 0,
      variants: []
    });
    renderEditOptionsBuilder();
  }

  function editRemoveOption(index){
    getEditOptionsState().splice(index, 1);
    renderEditOptionsBuilder();
  }

  function editUpdateOptionField(index, field, value){
    const optionsState = getEditOptionsState();
    if(!optionsState[index]) return;
    optionsState[index][field] = field === "extraPrice" ? normalizeNumberInput(value) : value;
  }

  function editAddVariant(index){
    const optionsState = getEditOptionsState();
    if(!optionsState[index]) return;
    if(!Array.isArray(optionsState[index].variants)) optionsState[index].variants = [];
    optionsState[index].variants.push({
      name: "",
      extraPrice: 0
    });
    renderEditOptionsBuilder();
  }

  function editRemoveVariant(index, variantIndex){
    const optionsState = getEditOptionsState();
    if(!optionsState[index]?.variants) return;
    optionsState[index].variants.splice(variantIndex, 1);
    renderEditOptionsBuilder();
  }

  function editUpdateVariantField(index, variantIndex, field, value){
    const optionsState = getEditOptionsState();
    if(!optionsState[index]?.variants?.[variantIndex]) return;
    optionsState[index].variants[variantIndex][field] = field === "extraPrice" ? normalizeNumberInput(value) : value;
  }

  window.removeOption = removeOption;
  window.updateOptionField = updateOptionField;
  window.addVariant = addVariant;
  window.removeVariant = removeVariant;
  window.updateVariantField = updateVariantField;

  window.editRemoveOption = editRemoveOption;
  window.editUpdateOptionField = editUpdateOptionField;
  window.editAddVariant = editAddVariant;
  window.editRemoveVariant = editRemoveVariant;
  window.editUpdateVariantField = editUpdateVariantField;

  function openEditModal(){
    document.getElementById("editModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeEditModal(){
    document.getElementById("editModal").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function render(){
    const el = document.getElementById("list");

    let list = itemsCache;
    if(filterCategoryId){
      const cid = Number(filterCategoryId);
      list = list.filter(x => x.categoryId === cid);
    }

    if(!list.length){
      el.innerHTML = `
        <div class="glass-card rounded-[2rem] p-8 text-center">
          <div class="text-5xl mb-3">🍽️</div>
          <div class="text-xl font-extrabold text-slate-900 font-display">No hay productos para ese filtro</div>
          <div class="text-sm text-slate-500 mt-2">Probá cambiando la categoría o creando un nuevo producto.</div>
        </div>
      `;
      return;
    }

    el.innerHTML = list.map(i => {
      const catName = i.categoryName || categoryNameById(i.categoryId);
      const optionsCount = Array.isArray(i.options) ? i.options.length : 0;

      return `
        <div class="module-card glass-card rounded-[2rem] p-5 md:p-6">
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-4 min-w-0">
              ${imgBoxRow(i.imageUrl)}

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="text-xl font-extrabold tracking-tight text-slate-900 truncate font-display">
                    ${escapeHtml(i.name)}
                  </div>

                  ${badgeEnabled(i.enabled)}

                  <span class="text-xs px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                    ${escapeHtml(catName)}
                  </span>

                  ${flagBadges(i)}

                  ${
                    i.hasConfiguration
                      ? `<span class="text-xs px-3 py-1 rounded-xl bg-fuchsia-100 text-fuchsia-800 font-semibold">${optionsCount} opciones</span>`
                      : ``
                  }
                </div>

                ${
                  i.description
                    ? `<div class="text-sm text-slate-500 mt-3 line-clamp-2">${escapeHtml(i.description)}</div>`
                    : `<div class="text-sm text-slate-300 mt-3">(Sin descripción)</div>`
                }
              </div>
            </div>

            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div class="text-3xl font-extrabold text-slate-900 whitespace-nowrap font-display">
                $ ${formatPrice(i.price)}
              </div>

              <div class="grid grid-cols-2 gap-3 md:flex md:items-center md:flex-wrap">
                <button data-toggle="${i.id}"
                  class="soft-btn px-4 py-3 rounded-2xl text-sm w-full md:w-auto ${
                    i.enabled
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }">
                  ${i.enabled ? "Desactivar" : "Activar"}
                </button>

                <button data-edit="${i.id}"
                  class="soft-btn px-4 py-3 bg-slate-900 text-white rounded-2xl text-sm hover:shadow-lg w-full md:w-auto">
                  Editar
                </button>

                <button data-del="${i.id}"
                  class="soft-btn px-4 py-3 bg-rose-100 text-rose-800 rounded-2xl text-sm hover:bg-rose-200
                         w-full col-span-2
                         md:col-span-1 md:w-auto">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

document.querySelectorAll("[data-edit]").forEach(b => {
  b.onclick = async () => {
    await openEdit(Number(b.dataset.edit));
  };
});
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => removeItem(Number(b.dataset.del)));
    document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => toggleEnabled(Number(b.dataset.toggle)));
  }

  async function removeItem(id){
    if(!confirm("¿Eliminar producto?")) return;

    try{
      const r = await deleteItem(id);
      if(!r) return;

      if(r.status === 409){
        toast("No se puede eliminar: está en pedidos", "error", 2500);
        return;
      }
      if(!r.ok){
        toast("Error eliminando", "error");
        return;
      }
      toast("Producto eliminado", "success");
      await refresh();
    }catch{
      toast("Error eliminando", "error");
    }
  }

  function buildItemDetail(item){

  if(!item.selections || !item.selections.length)
      return "";

  return item.selections
      .map(x => {

          if(x.optionName && x.variantName)
              return `${x.optionName}: ${x.variantName}`;

          if(x.optionName)
              return x.optionName;

          return "";
      })
      .filter(Boolean)
      .join("<br>");
}

  async function toggleEnabled(id){
    const item = itemsCache.find(x => x.id === id);
    if(!item) return;

    try{
      toast("Guardando...", "info", 900);

      const payload = {
        name: item.name,
        description: item.description || "",
        price: item.price,
        categoryId: item.categoryId,
        enabled: !item.enabled,
        imageUrl: item.imageUrl || null,
        images: Array.isArray(item.images) && item.images.length
          ? item.images.map((img, index) => ({
              url: img.url || img.imageUrl,
              isPrimary: !!img.isPrimary || index === 0,
              sortOrder: img.sortOrder ?? index
            }))
          : (item.imageUrl ? [{ url: item.imageUrl, isPrimary: true, sortOrder: 0 }] : []),
        visibleInPublicMenu: !!item.visibleInPublicMenu,
        visibleInTables: tableManagementEnabled ? !!item.visibleInTables : false,
        isInternalForTables: tableManagementEnabled ? !!item.isInternalForTables : false,
        hasConfiguration: !!item.hasConfiguration,
        requiredSelectionUnits: item.hasConfiguration ? Number(item.requiredSelectionUnits || 0) : null,
        configurationMode: item.hasConfiguration ? Number(item.configurationMode || 0) : 0,
        options: item.hasConfiguration ? sanitizeOptionsForPayload(item.options || []) : [],
        productChannel: getFixedProductChannel(),
        hasStock: Number(item.stockMode || 0) === 1,
        stockCurrent: Number(item.stockMode || 0) === 1 ? (item.stockCurrent ?? null) : null,
        lowStockThreshold: Number(item.stockMode || 0) === 1 ? (item.lowStockThreshold ?? null) : null,
        hasVariantStock: isProductsMode() && Number(item.stockMode || 0) === 2,
        stockMode: isProductsMode() ? Number(item.stockMode || 0) : (Number(item.stockMode || 0) === 1 ? 1 : 0)
      };

      const r = await updateItem(id, payload);
      if(!r) return;

      if(!r.ok){
        toast("Error cambiando estado", "error");
        return;
      }

      toast(item.enabled ? "Producto desactivado" : "Producto activado", "success");
      await refresh();
    }catch{
      toast("Error cambiando estado", "error");
    }
  }

  async function openEdit(id){
  try{
    const i = await getItemById(id);
    if(!i) return;

    document.getElementById("editId").value = String(i.id);
    document.getElementById("editName").value = i.name ?? "";
    document.getElementById("editPrice").value = String(i.price ?? "");
    document.getElementById("editDescription").value = i.description ?? "";
    document.getElementById("editCategory").value = String(i.categoryId ?? "");
    document.getElementById("editEnabled").value = String(!!i.enabled);
    document.getElementById("editVisibleInPublicMenu").checked = !!i.visibleInPublicMenu;
    document.getElementById("editVisibleInTables").checked = tableManagementEnabled ? !!i.visibleInTables : false;
    document.getElementById("editIsInternalForTables").checked = tableManagementEnabled ? !!i.isInternalForTables : false;

    document.getElementById("editHasConfiguration").checked = !!i.hasConfiguration;
    document.getElementById("editRequiredSelectionUnits").value = i.requiredSelectionUnits ?? "";
    document.getElementById("editConfigurationMode").value = String(i.configurationMode ?? 0);

    window.__editOptionsState = sanitizeOptionsForPayload(i.options || []).map((option, index) => ({
      id: option.id ?? 0,
      name: option.name || "",
      extraPrice: option.extraPrice || 0,
      enabled: option.enabled ?? true,
      order: option.order ?? index,
      variants: (option.variants || []).map(variant => ({
        id: variant.id ?? 0,
        name: variant.name || "",
        extraPrice: variant.extraPrice || 0,
        enabled: variant.enabled ?? true
      }))
    }));

    clearImageArray(selectedEditImages);
    selectedEditImages = [];
    document.getElementById("editImageFile").value = "";

    existingEditImages =
      Array.isArray(i.images) && i.images.length
        ? i.images
            .map((img, index) => ({
              url: resolveImgUrl(img.url || img.imageUrl || ""),
              sortOrder: img.sortOrder ?? index,
              isPrimary: !!img.isPrimary
            }))
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : (i.imageUrl
            ? [{
                url: resolveImgUrl(i.imageUrl),
                sortOrder: 0,
                isPrimary: true
              }]
            : []);

    applyTableManagementVisibility();

    const normalizedStockMode = isProductsMode()
      ? Number(i.stockMode ?? 0)
      : (Number(i.stockMode ?? 0) === 1 ? 1 : 0);

    document.getElementById("editStockMode").value = String(normalizedStockMode);
    document.getElementById("editStockCurrent").value = i.stockCurrent ?? "";
    document.getElementById("editLowStockThreshold").value = i.lowStockThreshold ?? "";
    toggleSimpleStockVisibility("edit");

    renderEditOptionsBuilder();
    renderEditImages();
    openEditModal();
    loadVariantStockSummaryForEdit();
  }catch(e){
    console.error(e);
    toast("No se pudo cargar el detalle del producto", "error");
  }
}
  document.getElementById("closeModal").onclick = closeEditModal;

  document.getElementById("editModal").addEventListener("click", (e) => {
    if(e.target.id === "editModal"){
      closeEditModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && !document.getElementById("editModal").classList.contains("hidden")){
      closeEditModal();
    }
  });

  document.getElementById("refresh").addEventListener("click", async () => {
    try{
      tableManagementEnabled = resolveTableManagementEnabled();
      applyTableManagementVisibility();
      applyBusinessTypeTexts();
      await loadCategories();
      await refresh();
      toast("Actualizado", "success");
    }catch{
      toast("Error actualizando", "error");
    }
  });

  document.getElementById("filterCategory").addEventListener("change", (e) => {
    filterCategoryId = e.target.value;
    render();
  });

  document.getElementById("clearFilter").addEventListener("click", () => {
    filterCategoryId = "";
    document.getElementById("filterCategory").value = "";
    render();
  });

  document.getElementById("imageFile").addEventListener("change", (e) => {
    appendFilesToImages(e.target.files, selectedImages);
    e.target.value = "";
    renderNewImages();
  });

  document.getElementById("editImageFile").addEventListener("change", (e) => {
    appendFilesToImages(e.target.files, selectedEditImages);
    e.target.value = "";
    renderEditImages();
  });

  document.getElementById("clearNewImages").addEventListener("click", () => {
    clearImageArray(selectedImages);
    selectedImages = [];
    renderNewImages();
  });

  document.getElementById("clearEditImages").addEventListener("click", () => {
    clearImageArray(selectedEditImages);
    selectedEditImages = [];
    renderEditImages();
  });

  document.getElementById("hasConfiguration").addEventListener("change", () => {
    const isChecked = document.getElementById("hasConfiguration").checked;
    if (isChecked && getNewOptionsState().length === 0) {
      addOption();
      return;
    }
    renderOptionsBuilder();
  });

  document.getElementById("editHasConfiguration").addEventListener("change", () => {
    const isChecked = document.getElementById("editHasConfiguration").checked;
    if (isChecked && getEditOptionsState().length === 0) {
      editAddOption();
      return;
    }
    renderEditOptionsBuilder();
  });

  document.getElementById("addOptionBtn").addEventListener("click", addOption);
  document.getElementById("editAddOptionBtn").addEventListener("click", editAddOption);
document.getElementById("editOpenVariantStockSetupBtn")?.addEventListener("click", async () => {
  try{
    if(!isProductsMode()){
      toast("El stock no está disponible en gourmet", "info");
      return;
    }

    const stockMode = Number(document.getElementById("editStockMode").value || 0);
    const hasConfiguration = document.getElementById("editHasConfiguration").checked;
    const menuItemId = Number(document.getElementById("editId")?.value || 0);

    if(!menuItemId){
      toast("Producto inválido", "error");
      return;
    }

    if(stockMode !== 2 && stockMode !== 3){
      toast("Primero seleccioná 'Stock por subtipos' o 'Stock por variantes'", "info");
      return;
    }

    if(stockMode === 3 && !hasConfiguration){
      toast("Para usar stock por variantes, el producto debe ser configurable", "error");
      return;
    }

    await openEditVariantStockSetup();
  }catch(e){
    console.error(e);
    toast("No se pudo abrir la configuración de stock", "error");
  }
});

document.getElementById("openVariantStockSetupBtn")?.addEventListener("click", () => {
  toast("Primero creá el producto y después configurá variantes desde editar", "info");
});

document.getElementById("saveVariantStockBtn").addEventListener("click", persistVariantStockConfig);
  document.getElementById("stockMode").addEventListener("change", () => toggleSimpleStockVisibility(""));
document.getElementById("editStockMode").addEventListener("change", () => {
  toggleSimpleStockVisibility("edit");
  loadVariantStockSummaryForEdit();
});

document.getElementById("closeVariantStockModal").addEventListener("click", closeVariantStockModal);
document.getElementById("cancelVariantStockBtn").addEventListener("click", closeVariantStockModal);
document.getElementById("addVariantCombinationBtn").addEventListener("click", addVariantCombination);

document.getElementById("variantStockModal").addEventListener("click", (e) => {
  if(e.target.id === "variantStockModal"){
    closeVariantStockModal();
  }
});


  async function saveEditProduct({ closeAfterSave = true, openStockAfterSave = false } = {}){
    if(!requireAuth()) return false;

    const id = Number(document.getElementById("editId").value);
    const name = document.getElementById("editName").value.trim();
    const desc = document.getElementById("editDescription").value.trim();
    const cat = document.getElementById("editCategory").value;
    const enabled = document.getElementById("editEnabled").value === "true";
    const price = parsePriceToNumber(document.getElementById("editPrice").value);
    const visibleInPublicMenu = document.getElementById("editVisibleInPublicMenu").checked;
    const visibleInTables = tableManagementEnabled ? document.getElementById("editVisibleInTables").checked : false;
    const isInternalForTables = tableManagementEnabled ? document.getElementById("editIsInternalForTables").checked : false;

    const hasConfiguration = document.getElementById("editHasConfiguration").checked;
    const requiredSelectionUnitsRaw = document.getElementById("editRequiredSelectionUnits").value;
    const requiredSelectionUnits = requiredSelectionUnitsRaw ? Number(requiredSelectionUnitsRaw) : null;
    const configurationMode = Number(document.getElementById("editConfigurationMode").value || 0);
    const options = hasConfiguration ? sanitizeOptionsForPayload(getEditOptionsState()) : [];

    const stockMode = Number(document.getElementById("editStockMode").value || 0);
    const stockCurrentRaw = document.getElementById("editStockCurrent").value;
    const lowStockThresholdRaw = document.getElementById("editLowStockThreshold").value;

    if(!name){ toast("Escribí un nombre", "error"); return false; }
    if(!cat){ toast("Seleccioná categoría", "error"); return false; }
    if(!desc){ toast("La descripción es obligatoria", "error"); return false; }
    if(Number.isNaN(price) || price <= 0){ toast("Precio inválido", "error"); return false; }

    if(hasConfiguration){
      if(!requiredSelectionUnits || requiredSelectionUnits <= 0){
        toast("Completá las unidades requeridas", "error");
        return false;
      }
      if(configurationMode === 0){
        toast("Seleccioná un modo de configuración", "error");
        return false;
      }
      if(!options.length){
        toast("Agregá al menos una opción", "error");
        return false;
      }
    }

    if(isProductsMode() && stockMode === 2 && !hasConfiguration){
      toast("Para usar stock por variantes, el producto debe ser configurable", "error");
      return false;
    }

    toast("Guardando...");

    const existingUrls = existingEditImages.map(x => x.url).filter(Boolean);
const uploadedNewUrls = await uploadMany(selectedEditImages);
const finalUrls = [...new Set([...existingUrls, ...uploadedNewUrls])];

const images = buildImagesPayloadFromUrls(finalUrls);
const imageUrl = images.length ? images[0].url : null;

const payload = {
  name,
  description: desc,
  price,
  categoryId: Number(cat),
  enabled,
  imageUrl,
  images,
  visibleInPublicMenu,
  visibleInTables,
  isInternalForTables,
  hasConfiguration,
  requiredSelectionUnits: hasConfiguration ? requiredSelectionUnits : null,
  configurationMode: hasConfiguration ? configurationMode : 0,
  options: hasConfiguration ? options : [],
  productChannel: getFixedProductChannel(),
  hasStock: stockMode === 1,
  stockCurrent: stockMode === 1 && stockCurrentRaw !== "" ? Number(stockCurrentRaw) : null,
  lowStockThreshold: stockMode === 1 && lowStockThresholdRaw !== "" ? Number(lowStockThresholdRaw) : null,
  hasVariantStock: isProductsMode() && (stockMode === 2 || stockMode === 3),
  stockMode: isProductsMode() ? stockMode : (stockMode === 1 ? 1 : 0),
};

    const r = await updateItem(id, payload);
    if(!r) return false;

    if(!r.ok){
      const t = await r.text().catch(()=> "");
      console.error(t);
      toast("Error guardando (mirá consola)", "error", 2500);
      return false;
    }

    toast("Actualizado", "success");
    await refresh();

    if(closeAfterSave){
      closeEditModal();
    }else{
      await loadVariantStockSummaryForEdit();
    }

    if(openStockAfterSave){
      await openEditVariantStockSetup();
    }

    return true;
  }

  document.getElementById("saveConfigOnly")?.addEventListener("click", async () => {
    try{
      await saveEditProduct({ closeAfterSave: false, openStockAfterSave: false });
    }catch(e){
      console.error(e);
      toast("Error guardando configuración", "error", 2500);
    }
  });

  document.getElementById("save").addEventListener("click", async () => {
    try{
      if(!requireAuth()) return;

      const name = document.getElementById("name").value.trim();
      const desc = document.getElementById("description").value.trim();
      const cat = document.getElementById("category").value;
      const enabled = document.getElementById("enabled").value === "true";
      const price = parsePriceToNumber(document.getElementById("price").value);
      const visibleInPublicMenu = document.getElementById("visibleInPublicMenu").checked;
      const visibleInTables = tableManagementEnabled ? document.getElementById("visibleInTables").checked : false;
      const isInternalForTables = tableManagementEnabled ? document.getElementById("isInternalForTables").checked : false;

      const hasConfiguration = document.getElementById("hasConfiguration").checked;
      const requiredSelectionUnitsRaw = document.getElementById("requiredSelectionUnits").value;
      const requiredSelectionUnits = requiredSelectionUnitsRaw ? Number(requiredSelectionUnitsRaw) : null;
      const configurationMode = Number(document.getElementById("configurationMode").value || 0);
      const options = hasConfiguration ? sanitizeOptionsForPayload(getNewOptionsState()) : [];

      if(!name){ toast("Escribí un nombre", "error"); return; }
      if(!cat){ toast("Seleccioná categoría", "error"); return; }
      if(!desc){ toast("La descripción es obligatoria", "error"); return; }
      if(Number.isNaN(price) || price <= 0){ toast("Precio inválido", "error"); return; }

      if(hasConfiguration){
        if(!requiredSelectionUnits || requiredSelectionUnits <= 0){
          toast("Completá las unidades requeridas", "error");
          return;
        }
        if(configurationMode === 0){
          toast("Seleccioná un modo de configuración", "error");
          return;
        }
        if(!options.length){
          toast("Agregá al menos una opción", "error");
          return;
        }
      }

      toast("Creando producto...");

      const uploadedImageUrls = await uploadMany(selectedImages);
      const images = buildImagesPayloadFromUrls(uploadedImageUrls);
      const imageUrl = images.length ? images[0].url : null;
      const stockMode = Number(document.getElementById("stockMode").value || 0);

if(isProductsMode() && stockMode === 2 && !hasConfiguration){
  toast("Para usar stock por variantes, el producto debe ser configurable", "error");
  return;
}
const stockCurrentRaw = document.getElementById("stockCurrent").value;
const lowStockThresholdRaw = document.getElementById("lowStockThreshold").value;

      const payload = {
        name,
        description: desc,
        price,
        categoryId: Number(cat),
        enabled,
        imageUrl,
        images,
        visibleInPublicMenu,
        visibleInTables,
        isInternalForTables,
        hasConfiguration,
        requiredSelectionUnits: hasConfiguration ? requiredSelectionUnits : null,
        configurationMode: hasConfiguration ? configurationMode : 0,
        options: hasConfiguration ? options : [],
        productChannel: getFixedProductChannel(),
        hasStock: stockMode === 1,
stockCurrent: stockMode === 1 && stockCurrentRaw !== "" ? Number(stockCurrentRaw) : null,
lowStockThreshold: stockMode === 1 && lowStockThresholdRaw !== "" ? Number(lowStockThresholdRaw) : null,
hasVariantStock: isProductsMode() && stockMode === 2,
stockMode: isProductsMode() ? stockMode : (stockMode === 1 ? 1 : 0),
      };

      const r = await createItem(payload);
      if(!r) return;

      if(!r.ok){
        const t = await r.text().catch(()=> "");
        console.error(t);
        toast("Error creando (mirá consola)", "error", 2500);
        return;
      }

      toast("Producto creado", "success");

      document.getElementById("name").value = "";
      document.getElementById("description").value = "";
      document.getElementById("price").value = "";
      document.getElementById("category").value = "";
      document.getElementById("enabled").value = "true";
      document.getElementById("visibleInPublicMenu").checked = true;
      document.getElementById("visibleInTables").checked = true;
      document.getElementById("isInternalForTables").checked = false;
      document.getElementById("imageFile").value = "";
      clearImageArray(selectedImages);
      selectedImages = [];
      renderNewImages();

      document.getElementById("hasConfiguration").checked = false;
      document.getElementById("requiredSelectionUnits").value = "";
      document.getElementById("configurationMode").value = "0";
      window.__newOptionsState = [];
      renderOptionsBuilder();

      applyTableManagementVisibility();
      await refresh();
    }catch(e){
      console.error(e);
      toast("Error creando", "error", 2500);
    }
  });

  document.getElementById("update").addEventListener("click", async () => {
    try{
      await saveEditProduct({ closeAfterSave: true, openStockAfterSave: false });
    }catch(e){
      console.error(e);
      toast("Error guardando", "error", 2500);
    }
  });

  guardPriceInput(document.getElementById("price"));
  guardPriceInput(document.getElementById("editPrice"));

  (async function init(){
    try{
      if(!requireAuth()) return;
      CONFIG = await loadConfig();
      await syncBusinessTypeFromApi();
      applyBusinessTypeTexts();
      applyStockVisibilityByBusinessType();
      tableManagementEnabled = resolveTableManagementEnabled();
      applyTableManagementVisibility();
      window.__newOptionsState = [];
      window.__editOptionsState = [];
      renderOptionsBuilder();
      renderEditOptionsBuilder();
      renderNewImages();
      renderEditImages();
      toggleSimpleStockVisibility("");
      toggleSimpleStockVisibility("edit");
      await loadCategories();
      await refresh();
    }catch(e){
      console.error(e);
      toast("Error cargando", "error", 2500);
    }
  })();
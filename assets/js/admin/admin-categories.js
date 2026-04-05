    let CONFIG = null;
    let isRefreshing = false;
    let categoriesCache = [];
    let editingId = null;

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
        if (Number(value) === BUSINESS_TYPES.OTROS) return BUSINESS_TYPES.OTROS;
        if (Number(value) === BUSINESS_TYPES.GASTRONOMIA) return BUSINESS_TYPES.GASTRONOMIA;
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

    function getSlug(){
      return localStorage.getItem(SLUG_KEY) || CONFIG.companySlug;
    }

    function getListCategoriesUrl(){
      return isProductsMode()
        ? `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-categories`
        : `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/categories`;
    }

    function getCrudCategoriesBaseUrl(){
      return isProductsMode()
        ? `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/product-categories`
        : `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/categories`;
    }

    function applyBusinessTypeTexts(){
      const productsMode = isProductsMode();

      const pageModeChip = document.getElementById("pageModeChip");
      const pageTitle = document.getElementById("pageTitle");
      const pageSubtitle = document.getElementById("pageSubtitle");
      const formTitle = document.getElementById("formTitle");
      const formSubtitle = document.getElementById("formSubtitle");
      const createName = document.getElementById("createName");
      const editModalSubtitle = document.getElementById("editModalSubtitle");

      if(productsMode){
        if(pageModeChip) pageModeChip.textContent = "Categorías catálogo";
        if(pageTitle) pageTitle.textContent = "Categorías";
        if(pageSubtitle) pageSubtitle.textContent = "Creá, editá y ordená tus categorías del catálogo.";
        if(formTitle) formTitle.textContent = "Nueva categoría";
        if(formSubtitle) formSubtitle.textContent = "Completá los datos para usarla en productos.";
        if(createName) createName.placeholder = "Ej: Bebidas";
        if(editModalSubtitle) editModalSubtitle.textContent = "Actualizá los datos de la categoría del catálogo.";
      } else {
        if(pageModeChip) pageModeChip.textContent = "Categorías";
        if(pageTitle) pageTitle.textContent = "Categorías";
        if(pageSubtitle) pageSubtitle.textContent = "Creá, editá y ordená tus categorías del menú.";
        if(formTitle) formTitle.textContent = "Nueva categoría";
        if(formSubtitle) formSubtitle.textContent = "Completá los datos y guardá.";
        if(createName) createName.placeholder = "Ej: Hamburguesas";
        if(editModalSubtitle) editModalSubtitle.textContent = "Actualizá los datos de la categoría.";
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

    async function loadConfig() {
      const res = await fetch(CONFIG_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error("No pude leer config.json");
      return await res.json();
    }

    async function readErrorMessage(res, fallback){
      try{
        const text = await res.text();
        return text || fallback;
      }catch{
        return fallback;
      }
    }

    async function apiGetCategories() {
      const res = await fetchAuth(getListCategoriesUrl());
      if(!res) return [];
      if (!res.ok) throw new Error(await readErrorMessage(res, "Error cargando categorías"));
      return await res.json();
    }

    async function apiCreateCategory(body) {
      const res = await fetchAuth(getCrudCategoriesBaseUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res) return null;
      if (!res.ok) throw new Error(await readErrorMessage(res, "Error creando categoría"));
      return await res.json();
    }

    async function apiUpdateCategory(id, body) {
      const res = await fetchAuth(`${getCrudCategoriesBaseUrl()}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res) return null;
      if (!res.ok) throw new Error(await readErrorMessage(res, "Error actualizando categoría"));
      return await res.json().catch(() => null);
    }

    async function apiDeleteCategory(id) {
      const res = await fetchAuth(`${getCrudCategoriesBaseUrl()}/${id}`, {
        method: "DELETE"
      });
      if(!res) return null;
      if (!res.ok) throw new Error(await readErrorMessage(res, "Error eliminando categoría"));
      return true;
    }

    async function apiMoveCategoryUp(id) {
      const res = await fetchAuth(`${getCrudCategoriesBaseUrl()}/${id}/move-up`, {
        method: "POST"
      });
      if(!res) return null;
      if (!res.ok) throw new Error(await readErrorMessage(res, "Error subiendo categoría"));
      return true;
    }

    async function apiMoveCategoryDown(id) {
      const res = await fetchAuth(`${getCrudCategoriesBaseUrl()}/${id}/move-down`, {
        method: "POST"
      });
      if(!res) return null;
      if (!res.ok) throw new Error(await readErrorMessage(res, "Error bajando categoría"));
      return true;
    }

    function badge(enabled) {
      return enabled
        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
        : "bg-rose-50 text-rose-800 border-rose-100";
    }

    function resetCreateForm() {
      document.getElementById("createName").value = "";
      document.getElementById("createSortOrder").value = "0";
      document.getElementById("createEnabled").checked = true;
    }

    function openEditModal(cat) {
      editingId = cat.id;
      document.getElementById("editName").value = cat.name ?? "";
      document.getElementById("editSortOrder").value = String(cat.sortOrder ?? 0);
      document.getElementById("editEnabled").checked = cat.enabled !== false;
      document.getElementById("editIdLabel").textContent = String(cat.id ?? "—");
      document.getElementById("editModal").classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeEditModal() {
      editingId = null;
      document.getElementById("editModal").classList.remove("open");
      document.body.style.overflow = "";
      document.getElementById("editName").value = "";
      document.getElementById("editSortOrder").value = "0";
      document.getElementById("editEnabled").checked = true;
      document.getElementById("editIdLabel").textContent = "—";
    }

    function buildPayload(name, sortOrder, enabled) {
      const bt = getBusinessType();
      const productChannel = bt === BUSINESS_TYPES.OTROS ? 2 : 1;

      return {
        name,
        sortOrder,
        enabled,
        productChannel
      };
    }

    function render(items) {
      const el = document.getElementById("list");

      if (!items.length) {
        el.innerHTML = `
          <div class="glass-card rounded-[2rem] p-8 text-center">
            <div class="text-5xl mb-3">📂</div>
            <div class="text-xl font-extrabold text-slate-900 font-display">No hay categorías</div>
            <div class="text-sm text-slate-500 mt-2">Creá la primera desde el formulario de arriba.</div>
          </div>`;
        return;
      }

      el.innerHTML = items.map(c => `
        <div class="module-card glass-card rounded-[2rem] p-6">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="min-w-[260px]">
              <div class="flex items-center gap-3 flex-wrap">
                <div class="text-xl font-extrabold tracking-tight text-slate-900 font-display">${escapeHtml(c.name ?? "")}</div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold border ${badge(c.enabled !== false)}">
                  ${(c.enabled !== false) ? "Habilitada" : "Deshabilitada"}
                </span>
              </div>

              <div class="text-sm text-slate-500 mt-3">
                Orden:
                <span class="font-bold text-slate-800">${c.sortOrder ?? 0}</span>
              </div>

              <div class="text-xs text-slate-400 mt-1">Id: ${c.id}</div>
            </div>

            <div class="flex gap-2 flex-wrap justify-end items-center">
              <button class="icon-btn"
                data-up="1" data-id="${c.id}" title="Subir">
                ↑
              </button>

              <button class="icon-btn"
                data-down="1" data-id="${c.id}" title="Bajar">
                ↓
              </button>

              <button class="soft-btn px-4 py-3 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200"
                data-edit="1" data-id="${c.id}">
                Editar
              </button>

              <button class="soft-btn px-4 py-3 rounded-2xl bg-rose-100 text-rose-800 hover:bg-rose-200"
                data-del="1" data-id="${c.id}">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      `).join("");

      el.querySelectorAll("button[data-edit='1']").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-id"));
          const cat = categoriesCache.find(x => x.id === id);
          if (cat) openEditModal(cat);
        });
      });

      el.querySelectorAll("button[data-del='1']").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-id"));
          if (!confirm("¿Eliminar esta categoría?")) return;

          try {
            toastShow("Eliminando categoría...", "info");
            await apiDeleteCategory(id);
            await refresh();
            toastUpdate("Categoría eliminada", "success", 1800);

            if (editingId === id) {
              closeEditModal();
            }
          } catch (e) {
            console.error(e);
            toastUpdate(e.message || "No se pudo eliminar", "error", 2600);
          }
        });
      });

      el.querySelectorAll("button[data-up='1']").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-id"));

          try {
            toastShow("Moviendo categoría...", "info");
            await apiMoveCategoryUp(id);
            await refresh();
            toastUpdate("Categoría movida", "success", 1400);
          } catch (e) {
            console.error(e);
            toastUpdate(e.message || "No se pudo mover", "error", 2200);
          }
        });
      });

      el.querySelectorAll("button[data-down='1']").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-id"));

          try {
            toastShow("Moviendo categoría...", "info");
            await apiMoveCategoryDown(id);
            await refresh();
            toastUpdate("Categoría movida", "success", 1400);
          } catch (e) {
            console.error(e);
            toastUpdate(e.message || "No se pudo mover", "error", 2200);
          }
        });
      });
    }

    function escapeHtml(value){
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    async function refresh() {
      if (isRefreshing) return;
      isRefreshing = true;

      const btn = document.getElementById("refresh");
      const old = btn.textContent;
      btn.textContent = "Cargando...";
      btn.disabled = true;

      try {
        const items = await apiGetCategories();
        categoriesCache = Array.isArray(items) ? items : [];
        render(categoriesCache);
      } finally {
        btn.textContent = old;
        btn.disabled = false;
        isRefreshing = false;
      }
    }

    async function handleCreate() {
      const name = document.getElementById("createName").value.trim();
      const sortOrder = Number(document.getElementById("createSortOrder").value);
      const enabled = document.getElementById("createEnabled").checked;

      if (!name) {
        toastShow("Poné un nombre", "error");
        toastAutoClose(1800);
        return;
      }

      try {
        toastShow("Creando categoría...", "info");
        await apiCreateCategory(buildPayload(name, sortOrder, enabled));
        await refresh();
        resetCreateForm();
        toastUpdate("Categoría creada", "success", 1800);
      } catch (e) {
        console.error(e);
        toastUpdate(e.message || "Error guardando categoría", "error", 3000);
      }
    }

    async function handleEditSave() {
      if (editingId == null) return;

      const name = document.getElementById("editName").value.trim();
      const sortOrder = Number(document.getElementById("editSortOrder").value);
      const enabled = document.getElementById("editEnabled").checked;

      if (!name) {
        toastShow("Poné un nombre", "error");
        toastAutoClose(1800);
        return;
      }

      try {
        toastShow("Guardando cambios...", "info");
        await apiUpdateCategory(editingId, buildPayload(name, sortOrder, enabled));
        await refresh();
        closeEditModal();
        toastUpdate("Categoría actualizada", "success", 1800);
      } catch (e) {
        console.error(e);
        toastUpdate(e.message || "Error actualizando categoría", "error", 3000);
      }
    }

    (async function init() {
      try {
        if(!requireAuth()) return;

        CONFIG = await loadConfig();
        await syncBusinessTypeFromApi();
        applyBusinessTypeTexts();

        document.getElementById("refresh").addEventListener("click", refresh);
        document.getElementById("saveCreate").addEventListener("click", handleCreate);

        document.getElementById("closeEditModal").addEventListener("click", closeEditModal);
        document.getElementById("cancelEditModal").addEventListener("click", closeEditModal);
        document.getElementById("saveEditModal").addEventListener("click", handleEditSave);

        document.getElementById("editModal").addEventListener("click", (e) => {
          if (e.target.id === "editModal") {
            closeEditModal();
          }
        });

        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            closeEditModal();
          }
        });

        resetCreateForm();
        await refresh();
      } catch (e) {
        console.error(e);
        toastShow("Error ❌ " + (e.message || e), "error");
        toastAutoClose(3000);
      }
    })();
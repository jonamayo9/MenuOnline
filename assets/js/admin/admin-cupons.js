 const CONFIG_PATH = "/config.json";

    const TOKEN_KEY = "menuonline_token";
    const AUTH_KEY  = "menuonline_authorization";
    const SLUG_KEY  = "menuonline_companySlug";
    const EMAIL_KEY = "menuonline_email";

    const LOGIN_PAGE = "/Admin/login.html";

    let activeToast = null;
    let configData = null;
    let currentScope = "global";
    let categories = [];
    let allItems = [];
    let selectedProductId = null;
    let couponsData = [];
    let editingCouponId = null;
    let pendingDeleteCouponId = null;
    let pendingDeleteCouponTitle = "";

    const BUSINESS_GASTRONOMIA = 1;
const BUSINESS_OTROS = 2;

function redirectNotFound() {
  location.replace("/404.html");
}

async function guardAdminCouponsAccess() {
  try {
    configData = await loadConfig();

    const me = await apiGetAdminMe();
    if (!me) {
      redirectNotFound();
      return false;
    }

    if (Number(me.businessType) !== BUSINESS_OTROS) {
      redirectNotFound();
      return false;
    }

    if (me.featureProductsEnabled !== true || me.featureCategoriesEnabled !== true) {
      redirectNotFound();
      return false;
    }

    if (me.canAccessProducts !== true || me.canAccessCategories !== true) {
      redirectNotFound();
      return false;
    }

    return true;
  } catch (err) {
    console.error(err);
    redirectNotFound();
    return false;
  }
}

    function toast(message, type = "info", ms = 1800) {
      const container = document.getElementById("toastContainer");
      if (activeToast) {
        activeToast.remove();
        activeToast = null;
      }

      const colors = {
        success: "background:#0f172a;border-left:3px solid #10b981;",
        error:   "background:#0f172a;border-left:3px solid #ef4444;",
        info:    "background:#0f172a;border-left:3px solid #6d28d9;"
      };

      const icon = type === "success" ? "✓" : type === "error" ? "✕" : "·";

      const el = document.createElement("div");
      el.className = "toast-item";
      el.style.cssText = `${colors[type] || colors.info}color:white;`;
      el.innerHTML = `
        <span style="font-weight:800;font-size:14px;">${icon}</span>
        <span style="font-size:13px;font-weight:500;">${escapeHtml(message)}</span>
      `;
      container.appendChild(el);
      activeToast = el;

      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));

      setTimeout(() => {
        if (activeToast !== el) return;
        el.classList.remove("show");
        setTimeout(() => {
          if (activeToast === el) activeToast = null;
          el.remove();
        }, 200);
      }, ms);
    }

    function showStatus(title, message, type = "info") {
      const box = document.getElementById("statusBox");
      const titleEl = document.getElementById("statusTitle");
      const messageEl = document.getElementById("statusMessage");

      box.className = "status-box show";
      box.classList.add(type === "success" ? "status-success" : type === "error" ? "status-error" : "status-info");

      titleEl.textContent = title;
      messageEl.textContent = message;
    }

    function hideStatus() {
      const box = document.getElementById("statusBox");
      box.className = "status-box";
    }

    function logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AUTH_KEY);
      location.replace(LOGIN_PAGE);
    }

    async function loadConfig() {
      const res = await fetch(CONFIG_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error("No pude leer config.json");
      return await res.json();
    }

    function getCompanySlug() {
      const qs = new URLSearchParams(location.search);
      const fromQuery = (qs.get("companySlug") || qs.get("c") || "").trim();
      if (fromQuery) return fromQuery;
      return (localStorage.getItem(SLUG_KEY) || "").trim();
    }

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function normalizeText(value) {
      return String(value || "").trim().toLowerCase();
    }

    function parseNumber(value) {
      if (value === null || value === undefined || value === "") return null;
      const n = Number(String(value).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }

    function formatMoney(value) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    }

    function formatDateTime(value) {
      if (!value) return "—";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleString("es-AR");
    }

    function toIsoOrNull(localValue) {
      if (!localValue) return null;
      const d = new Date(localValue);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    }

    function fromIsoToLocalInput(value) {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }

    function formatDiscountLabel(type, value) {
      const n = Number(value || 0);
      if (String(type) === "1") return `${n}%`;
      return formatMoney(n);
    }

    function getScopeLabel(scope) {
      if (String(scope) === "global" || Number(scope) === 1) return "Global";
      if (String(scope) === "category" || Number(scope) === 2) return "Por categoría";
      return "Producto";
    }

    function generateCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let out = "";
      for (let i = 0; i < 8; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
      return out;
    }

    async function fetchAuth(url, options = {}) {
      const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(AUTH_KEY);
      if (!token) {
        location.replace(LOGIN_PAGE);
        return null;
      }

      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: token.startsWith("Bearer ") ? token : ("Bearer " + token)
        }
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return null;
      }

      return res;
    }

    async function apiGetAdminMe() {
      const url = `${configData.apiBaseUrl}/api/admin/me`;
      const res = await fetchAuth(url);
      if (!res || !res.ok) return null;
      return await res.json().catch(() => null);
    }

    async function apiGetCategories(companySlug) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/categories`;
      const res = await fetchAuth(url);
      if (!res || !res.ok) throw new Error("No pude cargar categorías");
      return await res.json();
    }

    async function apiGetItems(companySlug) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/items`;
      const res = await fetchAuth(url);
      if (!res || !res.ok) throw new Error("No pude cargar productos");
      return await res.json();
    }

    async function apiGetCoupons(companySlug) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/coupons`;
      const res = await fetchAuth(url);
      if (!res || !res.ok) throw new Error("No pude cargar cupones");
      return await res.json().catch(() => []);
    }

    async function apiCreateCoupon(companySlug, payload) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/coupons`;
      const res = await fetchAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) return null;
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.title || "No pude crear el cupón");
      }

      return data;
    }

    async function apiUpdateCoupon(companySlug, couponId, payload) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/coupons/${couponId}`;
      const res = await fetchAuth(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) return null;
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.title || "No pude actualizar el cupón");
      }

      return data;
    }

    async function apiDeleteCoupon(companySlug, couponId) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/coupons/${couponId}`;
      const res = await fetchAuth(url, { method: "DELETE" });

      if (!res) return null;
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.title || "No pude eliminar el cupón");
      }

      return data;
    }

    function renderCategories() {
      const select = document.getElementById("categorySelect");
      select.innerHTML = `<option value="">Seleccionar categoría</option>`;

      categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = String(cat.id ?? cat.Id);
        option.textContent = cat.name ?? cat.Name ?? "Sin nombre";
        select.appendChild(option);
      });
    }

    function itemMatchesSearch(item, term) {
      if (!term) return true;
      const text = `${item.name || item.Name || ""} ${item.description || item.Description || ""}`.toLowerCase();
      return text.includes(term);
    }

    function renderItemsList() {
      const container = document.getElementById("itemsContainer");
      const term = normalizeText(document.getElementById("itemsSearchInput").value);

      let visibleItems = allItems.filter(item => !(item.isDeleted ?? item.IsDeleted ?? false));
      if (term) {
        visibleItems = visibleItems.filter(item => itemMatchesSearch(item, term));
      }

      if (!visibleItems.length) {
        container.innerHTML = `<div class="empty-state">No encontré productos para mostrar.</div>`;
        return;
      }

      container.innerHTML = "";

      visibleItems.forEach(item => {
        const itemId = Number(item.id ?? item.Id);
        const itemName = item.name ?? item.Name ?? "";
        const itemDescription = item.description ?? item.Description ?? "";
        const itemPrice = Number(item.price ?? item.Price ?? 0);
        const checked = selectedProductId === itemId;

        const row = document.createElement("label");
        row.className = "item-row";
        row.innerHTML = `
          <input type="radio"
                 name="coupon-product-selection"
                 ${checked ? "checked" : ""}
                 style="width:18px;height:18px;margin-top:2px;accent-color:#6d28d9;cursor:pointer;flex-shrink:0;" />
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
              <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;color:var(--ink);">
                ${escapeHtml(itemName)}
              </div>
              <div class="pill-chip">${formatMoney(itemPrice)}</div>
            </div>
            <div class="muted-text" style="margin-top:4px;">
              ${escapeHtml(itemDescription || "Sin descripción")}
            </div>
          </div>
        `;

        const input = row.querySelector("input");
        input.addEventListener("change", () => {
          selectedProductId = itemId;
          updateSelectedProductChip();
          updateSummary();
          renderItemsList();
        });

        container.appendChild(row);
      });
    }

    function updateSelectedProductChip() {
      const chip = document.getElementById("selectedProductChip");

      if (!selectedProductId) {
        chip.textContent = "Sin producto";
        return;
      }

      const item = allItems.find(x => Number(x.id ?? x.Id) === Number(selectedProductId));
      chip.textContent = item ? (item.name ?? item.Name ?? "Producto") : "1 producto";
    }

    function setScope(scope) {
      currentScope = scope;

      document.querySelectorAll("[data-scope-card]").forEach(card => {
        card.classList.toggle("active", card.getAttribute("data-scope-card") === scope);
      });

      document.getElementById("scopeCategoryBlock").classList.toggle("hidden-block", scope !== "category");
      document.getElementById("scopeProductBlock").classList.toggle("hidden-block", scope !== "product");

      if (scope !== "product") {
        selectedProductId = null;
        updateSelectedProductChip();
      }

      document.getElementById("currentScopeLabel").textContent = getScopeLabel(scope);
      updateSummary();
    }

    function updateSummary() {
      const discountType = document.getElementById("discountTypeSelect").value;
      const discountValue = document.getElementById("discountValueInput").value;
      const code = document.getElementById("couponCodeInput").value.trim();

      document.getElementById("summaryScope").textContent = getScopeLabel(currentScope);
      document.getElementById("summaryDiscount").textContent = discountValue ? formatDiscountLabel(discountType, discountValue) : "—";
      document.getElementById("summaryCode").textContent = code || "—";
    }

    function buildPayload() {
      const name = document.getElementById("couponNameInput").value.trim();
      const code = document.getElementById("couponCodeInput").value.trim().toUpperCase();
      const discountType = Number(document.getElementById("discountTypeSelect").value);
      const discountValue = parseNumber(document.getElementById("discountValueInput").value);
      const expiresAtUtc = toIsoOrNull(document.getElementById("expiresAtInput").value);
      const maxUsesRaw = document.getElementById("maxUsesInput").value.trim();
      const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
      const isActive = document.getElementById("isActiveInput").checked;
      const categoryIdRaw = document.getElementById("categorySelect").value;

      if (!name) throw new Error("Ingresá un nombre para el cupón.");
      if (!code) throw new Error("Ingresá un código.");
      if (discountValue === null || discountValue <= 0) throw new Error("Ingresá un valor de descuento válido.");
      if (discountType === 1 && discountValue > 100) throw new Error("Si el descuento es porcentaje, no puede ser mayor a 100.");
      if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) throw new Error("El máximo de usos debe ser mayor a 0.");

      const payload = {
        code,
        name,
        discountType,
        discountValue,
        scopeType: currentScope === "global" ? 1 : currentScope === "category" ? 2 : 3,
        categoryId: null,
        menuItemId: null,
        expiresAtUtc,
        maxUses,
        isActive
      };

      if (currentScope === "category") {
        if (!categoryIdRaw) throw new Error("Seleccioná una categoría.");
        payload.categoryId = Number(categoryIdRaw);
      }

      if (currentScope === "product") {
        if (!selectedProductId) throw new Error("Seleccioná un producto.");
        payload.menuItemId = Number(selectedProductId);
      }

      return payload;
    }

    function clearForm() {
      editingCouponId = null;
      currentScope = "global";
      selectedProductId = null;

      document.getElementById("couponNameInput").value = "";
      document.getElementById("couponCodeInput").value = "";
      document.getElementById("discountTypeSelect").value = "1";
      document.getElementById("discountValueInput").value = "";
      document.getElementById("expiresAtInput").value = "";
      document.getElementById("maxUsesInput").value = "";
      document.getElementById("isActiveInput").checked = true;
      document.getElementById("categorySelect").value = "";
      document.getElementById("itemsSearchInput").value = "";

      setScope("global");
      updateSelectedProductChip();
      updateSummary();

      document.getElementById("btnSave").innerHTML = "Guardar cupón";
    }

    function fillFormFromCoupon(coupon) {
      editingCouponId = coupon.id ?? coupon.Id ?? null;

      const scopeType = Number(coupon.scopeType ?? coupon.ScopeType ?? 1);
      const code = coupon.code ?? coupon.Code ?? "";
      const name = coupon.name ?? coupon.Name ?? "";
      const discountType = Number(coupon.discountType ?? coupon.DiscountType ?? 1);
      const discountValue = coupon.discountValue ?? coupon.DiscountValue ?? "";
      const expiresAtUtc = coupon.expiresAtUtc ?? coupon.ExpiresAtUtc ?? null;
      const maxUses = coupon.maxUses ?? coupon.MaxUses ?? "";
      const isActive = !!(coupon.isActive ?? coupon.IsActive);

      document.getElementById("couponNameInput").value = name;
      document.getElementById("couponCodeInput").value = code;
      document.getElementById("discountTypeSelect").value = String(discountType);
      document.getElementById("discountValueInput").value = String(discountValue ?? "");
      document.getElementById("expiresAtInput").value = fromIsoToLocalInput(expiresAtUtc);
      document.getElementById("maxUsesInput").value = maxUses ?? "";
      document.getElementById("isActiveInput").checked = isActive;

      if (scopeType === 1) {
        setScope("global");
      } else if (scopeType === 2) {
        setScope("category");
        document.getElementById("categorySelect").value = String(coupon.categoryId ?? coupon.CategoryId ?? "");
      } else {
        setScope("product");
        selectedProductId = Number(coupon.menuItemId ?? coupon.MenuItemId ?? 0) || null;
        updateSelectedProductChip();
        renderItemsList();
      }

      updateSummary();
      document.getElementById("btnSave").innerHTML = "Actualizar cupón";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function isExpired(coupon) {
      const expiresAtUtc = coupon.expiresAtUtc ?? coupon.ExpiresAtUtc;
      if (!expiresAtUtc) return false;
      const d = new Date(expiresAtUtc);
      if (Number.isNaN(d.getTime())) return false;
      return d.getTime() <= Date.now();
    }

    function renderCouponsList() {
      const emptyState = document.getElementById("couponsEmptyState");
      const list = document.getElementById("couponsList");
      const countChip = document.getElementById("couponsCountChip");

      countChip.textContent = `${couponsData.length} cupón${couponsData.length === 1 ? "" : "es"}`;

      if (!Array.isArray(couponsData) || !couponsData.length) {
        emptyState.classList.remove("hidden-block");
        list.classList.add("hidden-block");
        list.innerHTML = "";
        return;
      }

      emptyState.classList.add("hidden-block");
      list.classList.remove("hidden-block");
      list.innerHTML = "";

      couponsData.forEach(coupon => {
        const couponId = coupon.id ?? coupon.Id;
        const code = coupon.code ?? coupon.Code ?? "—";
        const name = coupon.name ?? coupon.Name ?? "Sin nombre";
        const discountType = coupon.discountType ?? coupon.DiscountType;
        const discountValue = coupon.discountValue ?? coupon.DiscountValue;
        const scopeType = coupon.scopeType ?? coupon.ScopeType;
        const maxUses = coupon.maxUses ?? coupon.MaxUses;
        const usedCount = coupon.usedCount ?? coupon.UsedCount ?? 0;
        const expiresAtUtc = coupon.expiresAtUtc ?? coupon.ExpiresAtUtc;
        const isActive = !!(coupon.isActive ?? coupon.IsActive);
        const expired = isExpired(coupon);

        let stateClass = "coupon-state-inactive";
        let stateLabel = isActive ? "Activo" : "Inactivo";

        if (expired) {
          stateClass = "coupon-state-expired";
          stateLabel = "Vencido";
        } else if (isActive) {
          stateClass = "coupon-state-active";
          stateLabel = "Activo";
        }

        const card = document.createElement("div");
        card.className = "coupon-card";
        card.innerHTML = `
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:240px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <span class="pill-chip ${stateClass}">
                  ${stateLabel}
                </span>
                <span class="pill-chip">${getScopeLabel(scopeType)}</span>
                <span class="pill-chip">${formatDiscountLabel(discountType, discountValue)}</span>
              </div>

              <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:var(--ink);margin-bottom:6px;">
                ${escapeHtml(name)}
              </div>

              <div class="badge-preview" style="margin-bottom:8px;">
                ${escapeHtml(code)}
              </div>

              <div class="muted-text">
                Usos: <strong>${usedCount}</strong>${maxUses ? ` / <strong>${maxUses}</strong>` : ""}
              </div>

              <div class="muted-text" style="margin-top:6px;">
                Vence: <strong>${formatDateTime(expiresAtUtc)}</strong>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;min-width:160px;">
              <button class="btn-secondary" type="button" data-edit-coupon="${couponId}">
                Editar
              </button>

              <button
                class="btn-secondary"
                type="button"
                data-delete-coupon="${couponId}"
                data-delete-title="${escapeHtml(name)}"
                style="border-color:#fecaca;color:#991b1b;background:#fff;">
                Eliminar
              </button>
            </div>
          </div>
        `;

        list.appendChild(card);
      });

      list.querySelectorAll("[data-edit-coupon]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-edit-coupon"));
          const coupon = couponsData.find(x => Number(x.id ?? x.Id) === id);
          if (coupon) fillFormFromCoupon(coupon);
        });
      });

      list.querySelectorAll("[data-delete-coupon]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-delete-coupon"));
          const title = btn.getAttribute("data-delete-title") || "Cupón";
          openDeleteCouponModal(id, title);
        });
      });
    }

    function openDeleteCouponModal(couponId, couponTitle) {
      pendingDeleteCouponId = couponId;
      pendingDeleteCouponTitle = couponTitle || "Cupón";

      document.getElementById("deleteCouponModalTitle").textContent = pendingDeleteCouponTitle;
      document.getElementById("deleteCouponModal").classList.remove("hidden-block");
      document.body.style.overflow = "hidden";
    }

    function closeDeleteCouponModal() {
      pendingDeleteCouponId = null;
      pendingDeleteCouponTitle = "";

      document.getElementById("deleteCouponModal").classList.add("hidden-block");
      document.body.style.overflow = "";
    }

    async function handleDeleteCoupon() {
      try {
        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");
        if (!pendingDeleteCouponId) throw new Error("No hay cupón seleccionado.");

        const confirmBtn = document.getElementById("btnConfirmDeleteCoupon");
        const cancelBtn = document.getElementById("btnCancelDeleteCoupon");

        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.textContent = "Eliminando...";

        const data = await apiDeleteCoupon(companySlug, pendingDeleteCouponId);

        closeDeleteCouponModal();
        toast(data?.message || "Cupón eliminado", "success", 1800);
        await loadCoupons();
      } catch (error) {
        toast(error.message || "No pude eliminar el cupón", "error", 2200);

        document.getElementById("btnConfirmDeleteCoupon").disabled = false;
        document.getElementById("btnCancelDeleteCoupon").disabled = false;
        document.getElementById("btnConfirmDeleteCoupon").textContent = "Eliminar";
      }
    }

    async function handleSave() {
      try {
        hideStatus();

        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");

        const payload = buildPayload();

        document.getElementById("btnSave").disabled = true;
        document.getElementById("btnSave").textContent = editingCouponId ? "Actualizando..." : "Guardando...";

        let data = null;

        if (editingCouponId) {
          data = await apiUpdateCoupon(companySlug, editingCouponId, payload);
          toast("Cupón actualizado correctamente", "success", 1800);
        } else {
          data = await apiCreateCoupon(companySlug, payload);
          toast("Cupón creado correctamente", "success", 1800);
        }

        showStatus(
          editingCouponId ? "Cupón actualizado" : "Cupón guardado",
          data?.message || "La operación se realizó correctamente.",
          "success"
        );

        clearForm();
        await loadCoupons();
      } catch (error) {
        showStatus("No pude guardar el cupón", error.message || "Ocurrió un error.", "error");
        toast(error.message || "No pude guardar el cupón", "error", 2200);
      } finally {
        document.getElementById("btnSave").disabled = false;
        document.getElementById("btnSave").innerHTML = editingCouponId ? "Actualizar cupón" : "Guardar cupón";
      }
    }

    async function loadCoupons() {
      const companySlug = getCompanySlug();
      if (!companySlug) return;

      couponsData = await apiGetCoupons(companySlug);
      renderCouponsList();
    }

    function bindEvents() {
      document.getElementById("btnLogout").addEventListener("click", logout);

      document.querySelectorAll("[data-scope-card]").forEach(card => {
        card.addEventListener("click", () => {
          setScope(card.getAttribute("data-scope-card"));
        });
      });

      document.getElementById("couponNameInput").addEventListener("input", updateSummary);
      document.getElementById("couponCodeInput").addEventListener("input", e => {
        e.target.value = e.target.value.toUpperCase().replace(/\s+/g, "");
        updateSummary();
      });
      document.getElementById("discountTypeSelect").addEventListener("change", updateSummary);
      document.getElementById("discountValueInput").addEventListener("input", updateSummary);

      document.getElementById("btnGenerateCode").addEventListener("click", () => {
        document.getElementById("couponCodeInput").value = generateCode();
        updateSummary();
      });

      document.getElementById("btnNew").addEventListener("click", () => {
        clearForm();
        hideStatus();
      });

      document.getElementById("btnSave").addEventListener("click", handleSave);
      document.getElementById("btnReloadCoupons").addEventListener("click", loadCoupons);

      document.getElementById("itemsSearchInput").addEventListener("input", renderItemsList);

      document.getElementById("btnCancelDeleteCoupon").addEventListener("click", closeDeleteCouponModal);
      document.getElementById("deleteCouponModalOverlay").addEventListener("click", closeDeleteCouponModal);
      document.getElementById("btnConfirmDeleteCoupon").addEventListener("click", handleDeleteCoupon);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeDeleteCouponModal();
        }
      });
    }

    async function init() {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(AUTH_KEY);
  if (!token) {
    location.replace(LOGIN_PAGE);
    return;
  }

  const allowed = await guardAdminCouponsAccess();
  if (!allowed) return;

  bindEvents();
  updateSummary();
  updateSelectedProductChip();

  const companySlug = getCompanySlug();
  const email = localStorage.getItem(EMAIL_KEY) || "—";

  document.getElementById("companyLabel").textContent = companySlug || "—";
  document.getElementById("emailLabel").textContent = email;

  try {
    const me = await apiGetAdminMe();
    if (me) {
      document.getElementById("companyLabel").textContent =
        me.companyName ||
        me.companyDisplayName ||
        me.companySlug ||
        companySlug ||
        "—";

      if (me.email) {
        document.getElementById("emailLabel").textContent = me.email;
      }
    }

    if (!companySlug) {
      throw new Error("No encontré companySlug.");
    }

    categories = await apiGetCategories(companySlug);
    allItems = await apiGetItems(companySlug);

    renderCategories();
    renderItemsList();
    await loadCoupons();

    showStatus(
      "Pantalla lista",
      "Ya podés crear, editar y eliminar cupones.",
      "info"
    );
  } catch (error) {
    console.error(error);
    showStatus("No pude cargar la pantalla", error.message || "Ocurrió un error.", "error");
    toast(error.message || "No pude cargar la pantalla", "error", 2400);
  }
}
init();

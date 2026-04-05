//   PROD
    //const CONFIG_PATH = "/MenuOnline/config.json";
    //  DEV
    const CONFIG_PATH = "/config.json";

    const TOKEN_KEY = "menuonline_token";
    const AUTH_KEY  = "menuonline_authorization";
    const SLUG_KEY  = "menuonline_companySlug";
    const EMAIL_KEY = "menuonline_email";

    const LOGIN_PAGE = "/Admin/login.html";

    let activeToast = null;
    let configData = null;
    let currentScope = "category";
    let allItems = [];
    let categories = [];
    let selectedItemIds = [];
    let lastPreviewRequestJson = "";
    let previewData = null;
    let promotionsData = [];
    let pendingDeletePromotionId = null;
    let pendingDeletePromotionTitle = "";
    let pendingDeleteButtonEl = null;

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
        <span style="font-size:13px;font-weight:500;">${message}</span>
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

    function formatDiscountLabel(type, value) {
      const n = Number(value || 0);
      if (String(type) === "1") return `${n}%`;
      return formatMoney(n);
    }

    function getScopeLabel(scope) {
      if (String(scope) === "category" || Number(scope) === 1) return "Por categoría";
      if (String(scope) === "manual" || Number(scope) === 2) return "Selección manual";
      return "Individual";
    }

    function getDiscountTypeLabel(type) {
      return String(type) === "1" ? "Por porcentaje" : "Por monto fijo";
    }

    function toIsoOrNull(localValue) {
      if (!localValue) return null;
      const d = new Date(localValue);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
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
      const me = await res.json().catch(() => null);
      if (me && window.BusinessTypeStore) {
        window.BusinessTypeStore.set(me.businessType);
      }
      return me;
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

    async function apiPreviewPromotion(companySlug, payload) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/promotions/preview`;
      const res = await fetchAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) return null;

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.title || "No pude generar la vista previa");
      }

      return data;
    }

    async function apiSavePromotion(companySlug, payload) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/promotions`;
      const res = await fetchAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) return null;

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.title || "No pude guardar la promoción");
      }

      return data;
    }

    async function apiGetPromotions(companySlug) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/promotions`;
      const res = await fetchAuth(url);

      if (!res || !res.ok) {
        throw new Error("No pude cargar promociones");
      }

      return await res.json().catch(() => []);
    }

    async function apiTogglePromotion(companySlug, promotionId) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/promotions/${promotionId}/toggle`;
      const res = await fetchAuth(url, {
        method: "PATCH"
      });

      if (!res) return null;

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "No pude cambiar el estado de la promoción");
      }

      return data;
    }

    async function apiDeletePromotion(companySlug, promotionId) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/promotions/${promotionId}`;
      const res = await fetchAuth(url, {
        method: "DELETE"
      });

      if (!res) return null;

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "No pude eliminar la promoción");
      }

      return data;
    }

    function updateSummary() {
      const discountType = document.getElementById("discountTypeSelect").value;
      const value = document.getElementById("discountValueInput").value;
      const badgeText = document.getElementById("badgeTextInput").value.trim();

      document.getElementById("summaryScope").textContent = getScopeLabel(currentScope);
      document.getElementById("summaryType").textContent = getDiscountTypeLabel(discountType);
      document.getElementById("summaryValue").textContent = value ? formatDiscountLabel(discountType, value) : "—";
      document.getElementById("currentModeLabel").textContent = getScopeLabel(currentScope);
      document.getElementById("summaryBadgePreview").textContent =
        badgeText || (discountType === "1" && value ? `${value}% OFF` : "PROMO");
    }

    function setScope(scope) {
      currentScope = scope;

      document.querySelectorAll("[data-scope-card]").forEach(card => {
        card.classList.toggle("active", card.getAttribute("data-scope-card") === scope);
      });

      document.getElementById("scopeCategoryBlock").classList.toggle("hidden-block", scope !== "category");
      document.getElementById("scopeItemsBlock").classList.toggle("hidden-block", scope === "category");

      if (scope === "single" && selectedItemIds.length > 1) {
        selectedItemIds = selectedItemIds.slice(0, 1);
      }

      renderItemsList();
      updateSelectedCount();
      resetPreview();
      updateSummary();
    }

    function updateSelectedCount() {
      const count = selectedItemIds.length;
      const chip = document.getElementById("selectedCountChip");
      chip.textContent = currentScope === "single"
        ? `${count} seleccionado`
        : `${count} seleccionados`;
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

    function isItemSelected(itemId) {
      return selectedItemIds.includes(itemId);
    }

    function toggleItemSelection(itemId, checked) {
      if (currentScope === "single") {
        selectedItemIds = checked ? [itemId] : [];
      } else {
        if (checked) {
          if (!selectedItemIds.includes(itemId)) {
            selectedItemIds.push(itemId);
          }
        } else {
          selectedItemIds = selectedItemIds.filter(id => id !== itemId);
        }
      }

      renderItemsList();
      updateSelectedCount();
      resetPreview();
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
        const checked = isItemSelected(itemId);

        const row = document.createElement("label");
        row.className = "item-row";
        row.innerHTML = `
          <input type="${currentScope === "single" ? "radio" : "checkbox"}"
                 name="${currentScope === "single" ? "single-item-selection" : ""}"
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
        input.addEventListener("change", e => {
          toggleItemSelection(itemId, e.target.checked);
        });

        container.appendChild(row);
      });
    }

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function buildPayload() {
      const title = document.getElementById("promotionTitleInput").value.trim();
      const badgeText = document.getElementById("badgeTextInput").value.trim();
      const bannerText = document.getElementById("bannerTextInput").value.trim();
      const discountType = Number(document.getElementById("discountTypeSelect").value);
      const discountValue = parseNumber(document.getElementById("discountValueInput").value);
      const categoryIdRaw = document.getElementById("categorySelect").value;
      const startDateUtc = toIsoOrNull(document.getElementById("startDateInput").value);
      const endDateUtc = toIsoOrNull(document.getElementById("endDateInput").value);
      const isActive = document.getElementById("isActiveInput").checked;
      const isHighlighted = document.getElementById("isHighlightedInput").checked;

      if (!title) {
        throw new Error("Ingresá un título para la promoción.");
      }

      if (discountValue === null || discountValue <= 0) {
        throw new Error("Ingresá un valor de descuento válido.");
      }

      const payload = {
        title,
        badgeText: badgeText || null,
        bannerText: bannerText || null,
        scopeType: currentScope === "category" ? 1 : currentScope === "manual" ? 2 : 3,
        discountType,
        discountValue,
        isActive,
        isHighlighted,
        startDateUtc,
        endDateUtc,
        categoryIds: [],
        menuItemIds: []
      };

      if (currentScope === "category") {
        if (!categoryIdRaw) {
          throw new Error("Seleccioná una categoría.");
        }

        payload.categoryIds = [Number(categoryIdRaw)];
      } else {
        if (!selectedItemIds.length) {
          throw new Error(currentScope === "single"
            ? "Seleccioná un producto."
            : "Seleccioná al menos un producto.");
        }

        payload.menuItemIds = [...selectedItemIds];
      }

      return payload;
    }

    function resetPreview() {
      previewData = null;
      lastPreviewRequestJson = "";
      document.getElementById("btnSave").disabled = true;
      document.getElementById("previewCountChip").textContent = "0 productos";
      document.getElementById("previewTableBody").innerHTML = "";
      document.getElementById("previewEmptyState").classList.remove("hidden-block");
      document.getElementById("previewTableBlock").classList.add("hidden-block");
    }

    function renderPreview(data) {
      previewData = data;
      document.getElementById("btnSave").disabled = !(data && Array.isArray(data.items) && data.items.length > 0);

      const emptyState = document.getElementById("previewEmptyState");
      const tableBlock = document.getElementById("previewTableBlock");
      const tbody = document.getElementById("previewTableBody");
      const countChip = document.getElementById("previewCountChip");

      tbody.innerHTML = "";

      const items = Array.isArray(data?.items) ? data.items : [];
      countChip.textContent = `${items.length} producto${items.length === 1 ? "" : "s"}`;

      if (!items.length) {
        emptyState.classList.remove("hidden-block");
        tableBlock.classList.add("hidden-block");
        return;
      }

      items.forEach(item => {
        const current = Number(item.originalPrice ?? item.currentPrice ?? 0);
        const next = Number(item.finalPrice ?? item.newPrice ?? 0);
        const save = Number(item.discountAmount ?? 0);
        const saveClass = save >= 0 ? "delta-up" : "delta-down";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight:700;">${escapeHtml(item.menuItemName || item.name || "")}</td>
          <td class="price-old">${formatMoney(current)}</td>
          <td class="price-new">${formatMoney(next)}</td>
          <td class="${saveClass}">${formatMoney(save)}</td>
        `;
        tbody.appendChild(tr);
      });

      emptyState.classList.add("hidden-block");
      tableBlock.classList.remove("hidden-block");
    }

    function renderPromotionsList() {
      const emptyState = document.getElementById("promotionsEmptyState");
      const list = document.getElementById("promotionsList");

      if (!Array.isArray(promotionsData) || !promotionsData.length) {
        emptyState.classList.remove("hidden-block");
        list.classList.add("hidden-block");
        list.innerHTML = "";
        return;
      }

      emptyState.classList.add("hidden-block");
      list.classList.remove("hidden-block");
      list.innerHTML = "";

      promotionsData.forEach(promo => {
        const promoId = promo.id ?? promo.Id;
        const title = promo.title ?? promo.Title ?? "Sin título";
        const badgeText = promo.badgeText ?? promo.BadgeText ?? "";
        const bannerText = promo.bannerText ?? promo.BannerText ?? "";
        const isActive = !!(promo.isActive ?? promo.IsActive);
        const isHighlighted = !!(promo.isHighlighted ?? promo.IsHighlighted);
        const scopeType = promo.scopeType ?? promo.ScopeType;
        const discountType = promo.discountType ?? promo.DiscountType;
        const discountValue = promo.discountValue ?? promo.DiscountValue;
        const totalMenuItems = promo.totalMenuItems ?? promo.TotalMenuItems ?? 0;
        const totalCategories = promo.totalCategories ?? promo.TotalCategories ?? 0;
        const startDateUtc = promo.startDateUtc ?? promo.StartDateUtc;
        const endDateUtc = promo.endDateUtc ?? promo.EndDateUtc;

        const card = document.createElement("div");
        card.className = "promo-card";
        card.innerHTML = `
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:240px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <span class="pill-chip ${isActive ? "promo-state-active" : "promo-state-inactive"}">
                  ${isActive ? "Activa" : "Inactiva"}
                </span>
                <span class="pill-chip">${getScopeLabel(scopeType)}</span>
                <span class="pill-chip">${formatDiscountLabel(discountType, discountValue)}</span>
                ${isHighlighted ? `<span class="pill-chip" style="background:#fff7ed;border-color:#fed7aa;color:#9a3412;">Destacada</span>` : ``}
              </div>

              <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:var(--ink);margin-bottom:6px;">
                ${escapeHtml(title)}
              </div>

              ${badgeText ? `
                <div class="badge-preview" style="margin-bottom:8px;">
                  ${escapeHtml(badgeText)}
                </div>
              ` : ``}

              ${bannerText ? `
                <div class="muted-text" style="margin-bottom:10px;">
                  ${escapeHtml(bannerText)}
                </div>
              ` : ``}

              <div class="muted-text">
                Productos: <strong>${totalMenuItems}</strong> · Categorías: <strong>${totalCategories}</strong>
              </div>

              <div class="muted-text" style="margin-top:6px;">
                Desde: <strong>${formatDateTime(startDateUtc)}</strong> · Hasta: <strong>${formatDateTime(endDateUtc)}</strong>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;min-width:150px;">
              <button class="btn-secondary" type="button" data-toggle-promo="${promoId}">
                ${isActive ? "Desactivar" : "Activar"}
              </button>

              <button
                class="btn-secondary"
                type="button"
                data-delete-promo="${promoId}"
                data-delete-title="${escapeHtml(title)}"
                style="border-color:#fecaca;color:#991b1b;background:#fff;">
                Eliminar
              </button>
            </div>
          </div>
        `;

        list.appendChild(card);
      });

      list.querySelectorAll("[data-toggle-promo]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const promoId = btn.getAttribute("data-toggle-promo");
          await handleTogglePromotion(promoId, btn);
        });
      });

      list.querySelectorAll("[data-delete-promo]").forEach(btn => {
        btn.addEventListener("click", () => {
          const promoId = btn.getAttribute("data-delete-promo");
          const promoTitle = btn.getAttribute("data-delete-title") || "Promoción";
          openDeletePromotionModal(promoId, promoTitle, btn);
        });
      });
    }

    async function handlePreview() {
      try {
        hideStatus();

        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");

        const payload = buildPayload();
        lastPreviewRequestJson = JSON.stringify(payload);

        document.getElementById("btnPreview").disabled = true;
        document.getElementById("btnPreview").textContent = "Generando...";

        const data = await apiPreviewPromotion(companySlug, payload);
        renderPreview(data);

        showStatus(
          "Vista previa generada",
          `Se calcularon ${data?.totalAffectedItems || data?.items?.length || 0} producto(s) para la promoción seleccionada.`,
          "success"
        );
      } catch (error) {
        resetPreview();
        showStatus("No pude generar la vista previa", error.message || "Ocurrió un error.", "error");
        toast(error.message || "No pude generar la vista previa", "error", 2200);
      } finally {
        document.getElementById("btnPreview").disabled = false;
        document.getElementById("btnPreview").innerHTML = `
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M1.5 7.5C2.7 4.9 4.8 3.6 7.5 3.6C10.2 3.6 12.3 4.9 13.5 7.5C12.3 10.1 10.2 11.4 7.5 11.4C4.8 11.4 2.7 10.1 1.5 7.5Z" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" stroke-width="1.4"/>
          </svg>
          Vista previa
        `;
      }
    }

    async function handleSave() {
      try {
        hideStatus();

        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");

        const payload = buildPayload();

        if (!previewData || lastPreviewRequestJson !== JSON.stringify(payload)) {
          throw new Error("Generá la vista previa antes de guardar la promoción.");
        }

        document.getElementById("btnSave").disabled = true;
        document.getElementById("btnSave").textContent = "Guardando...";

        const data = await apiSavePromotion(companySlug, payload);

        toast("Promoción guardada correctamente", "success", 1800);
        showStatus(
          "Promoción guardada",
          data?.message || "La promoción se guardó correctamente.",
          "success"
        );

        await loadPromotions();
      } catch (error) {
        showStatus("No pude guardar la promoción", error.message || "Ocurrió un error.", "error");
        toast(error.message || "No pude guardar la promoción", "error", 2200);
      } finally {
        document.getElementById("btnSave").disabled = !previewData;
        document.getElementById("btnSave").innerHTML = `
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 7.5L6 10.5L12 4.5" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Guardar promo
        `;
      }
    }

    function openDeletePromotionModal(promoId, promoTitle, buttonEl) {
      pendingDeletePromotionId = promoId;
      pendingDeletePromotionTitle = promoTitle || "Promoción";
      pendingDeleteButtonEl = buttonEl || null;

      document.getElementById("deletePromoModalTitle").textContent = pendingDeletePromotionTitle;
      document.getElementById("deletePromoModal").classList.remove("hidden-block");
      document.body.style.overflow = "hidden";
    }

    function closeDeletePromotionModal() {
      pendingDeletePromotionId = null;
      pendingDeletePromotionTitle = "";
      pendingDeleteButtonEl = null;

      document.getElementById("deletePromoModal").classList.add("hidden-block");
      document.body.style.overflow = "";
    }

    async function handleDeletePromotion() {
      try {
        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");
        if (!pendingDeletePromotionId) throw new Error("No hay promoción seleccionada.");

        const confirmBtn = document.getElementById("btnConfirmDeletePromo");
        const cancelBtn = document.getElementById("btnCancelDeletePromo");

        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.textContent = "Eliminando...";

        const data = await apiDeletePromotion(companySlug, pendingDeletePromotionId);

        closeDeletePromotionModal();
        toast(data?.message || "Promoción eliminada", "success", 1800);
        await loadPromotions();
      } catch (error) {
        toast(error.message || "No pude eliminar la promoción", "error", 2200);

        const confirmBtn = document.getElementById("btnConfirmDeletePromo");
        const cancelBtn = document.getElementById("btnCancelDeletePromo");

        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = "Eliminar";
      }
    }

    async function handleTogglePromotion(promoId, buttonEl) {
      try {
        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");

        buttonEl.disabled = true;
        buttonEl.textContent = "Actualizando...";

        const data = await apiTogglePromotion(companySlug, promoId);

        toast(data?.message || "Estado actualizado", "success", 1800);
        await loadPromotions();
      } catch (error) {
        toast(error.message || "No pude cambiar el estado", "error", 2200);
      } finally {
        if (buttonEl) buttonEl.disabled = false;
      }
    }

    async function loadPromotions() {
      const companySlug = getCompanySlug();
      if (!companySlug) return;

      promotionsData = await apiGetPromotions(companySlug);
      renderPromotionsList();
    }

    function bindEvents() {
      document.getElementById("btnLogout").addEventListener("click", logout);

      document.querySelectorAll("[data-scope-card]").forEach(card => {
        card.addEventListener("click", () => {
          setScope(card.getAttribute("data-scope-card"));
        });
      });

      document.getElementById("promotionTitleInput").addEventListener("input", () => {
        updateSummary();
        resetPreview();
      });

      document.getElementById("badgeTextInput").addEventListener("input", () => {
        updateSummary();
        resetPreview();
      });

      document.getElementById("bannerTextInput").addEventListener("input", resetPreview);
      document.getElementById("startDateInput").addEventListener("change", resetPreview);
      document.getElementById("endDateInput").addEventListener("change", resetPreview);
      document.getElementById("isActiveInput").addEventListener("change", resetPreview);
      document.getElementById("isHighlightedInput").addEventListener("change", resetPreview);

      document.getElementById("discountTypeSelect").addEventListener("change", () => {
        updateSummary();
        resetPreview();
      });

      document.getElementById("discountValueInput").addEventListener("input", () => {
        updateSummary();
        resetPreview();
      });

      document.getElementById("categorySelect").addEventListener("change", resetPreview);

      document.getElementById("itemsSearchInput").addEventListener("input", () => {
        renderItemsList();
      });

      document.getElementById("btnPreview").addEventListener("click", handlePreview);
      document.getElementById("btnSave").addEventListener("click", handleSave);
      document.getElementById("btnReloadPromotions").addEventListener("click", loadPromotions);

      document.getElementById("btnCancelDeletePromo").addEventListener("click", closeDeletePromotionModal);
      document.getElementById("deletePromoModalOverlay").addEventListener("click", closeDeletePromotionModal);
      document.getElementById("btnConfirmDeletePromo").addEventListener("click", handleDeletePromotion);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeDeletePromotionModal();
        }
      });
    }

    async function init() {
      const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(AUTH_KEY);
      if (!token) {
        location.replace(LOGIN_PAGE);
        return;
      }

      bindEvents();
      updateSummary();
      resetPreview();

      const companySlug = getCompanySlug();
      const email = localStorage.getItem(EMAIL_KEY) || "—";

      document.getElementById("companyLabel").textContent = companySlug || "—";
      document.getElementById("emailLabel").textContent = email;

      try {
        configData = await loadConfig();

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
        await loadPromotions();

        showStatus(
          "Pantalla lista",
          "Ya podés generar una vista previa, guardar promociones y administrar su estado.",
          "info"
        );
      } catch (error) {
        console.error(error);
        showStatus("No pude cargar la pantalla", error.message || "Ocurrió un error.", "error");
        toast(error.message || "No pude cargar la pantalla", "error", 2400);
      }
    }

    init();
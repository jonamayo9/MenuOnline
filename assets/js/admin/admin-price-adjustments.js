// PROD
    //const CONFIG_PATH = "/MenuOnline/config.json";
    // DEV
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

    function formatValueLabel(adjustmentType, value) {
      if (value === null || value === undefined || value === "") return "—";
      const n = Number(value);
      if (!Number.isFinite(n)) return "—";
      if (adjustmentType === "percentage") {
        return `${n > 0 ? "+" : ""}${n}%`;
      }
      return `${n > 0 ? "+" : ""}${formatMoney(n)}`;
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

    async function apiPreviewAdjustment(companySlug, payload) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/items/price-adjustments/preview`;
      const res = await fetchAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) return null;

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "No pude generar la vista previa");
      }

      return data;
    }

    async function apiApplyAdjustment(companySlug, payload) {
      const url = `${configData.apiBaseUrl}/api/admin/${encodeURIComponent(companySlug)}/items/price-adjustments`;
      const res = await fetchAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) return null;

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "No pude aplicar el ajuste");
      }

      return data;
    }

    function updateSummary() {
      const type = document.getElementById("adjustmentTypeSelect").value;
      const value = document.getElementById("adjustmentValueInput").value;

      const scopeLabel = currentScope === "category"
        ? "Por categoría"
        : currentScope === "manual"
          ? "Selección manual"
          : "Individual";

      const typeLabel = type === "percentage" ? "Por porcentaje" : "Por monto fijo";

      document.getElementById("summaryScope").textContent = scopeLabel;
      document.getElementById("summaryType").textContent = typeLabel;
      document.getElementById("summaryValue").textContent = formatValueLabel(type, value);
      document.getElementById("currentModeLabel").textContent = scopeLabel;
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
        option.value = String(cat.id);
        option.textContent = cat.name;
        select.appendChild(option);
      });
    }

    function itemMatchesSearch(item, term) {
      if (!term) return true;
      const text = `${item.name || ""} ${item.description || ""}`.toLowerCase();
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

      let visibleItems = allItems.filter(item => !item.isDeleted);

      if (term) {
        visibleItems = visibleItems.filter(item => itemMatchesSearch(item, term));
      }

      if (!visibleItems.length) {
        container.innerHTML = `<div class="empty-state">No encontré productos para mostrar.</div>`;
        return;
      }

      container.innerHTML = "";

      visibleItems.forEach(item => {
        const checked = isItemSelected(item.id);
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
                ${escapeHtml(item.name || "")}
              </div>
              <div class="pill-chip">${formatMoney(item.price)}</div>
            </div>
            <div class="muted-text" style="margin-top:4px;">
              ${escapeHtml(item.description || "Sin descripción")}
            </div>
          </div>
        `;

        const input = row.querySelector("input");
        input.addEventListener("change", e => {
          toggleItemSelection(item.id, e.target.checked);
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
      const adjustmentType = document.getElementById("adjustmentTypeSelect").value;
      const value = parseNumber(document.getElementById("adjustmentValueInput").value);
      const categoryIdRaw = document.getElementById("categorySelect").value;

      if (value === null) {
        throw new Error("Ingresá un valor para el ajuste.");
      }

      const payload = {
        scope: currentScope,
        categoryId: null,
        itemIds: [],
        adjustmentType,
        value
      };

      if (currentScope === "category") {
        if (!categoryIdRaw) {
          throw new Error("Seleccioná una categoría.");
        }
        payload.categoryId = Number(categoryIdRaw);
      } else {
        if (!selectedItemIds.length) {
          throw new Error(currentScope === "single"
            ? "Seleccioná un producto."
            : "Seleccioná al menos un producto.");
        }

        payload.itemIds = [...selectedItemIds];
      }

      return payload;
    }

    function resetPreview() {
      previewData = null;
      lastPreviewRequestJson = "";
      document.getElementById("btnApply").disabled = true;
      document.getElementById("previewCountChip").textContent = "0 productos";
      document.getElementById("previewTableBody").innerHTML = "";
      document.getElementById("previewEmptyState").classList.remove("hidden-block");
      document.getElementById("previewTableBlock").classList.add("hidden-block");
    }

    function renderPreview(data) {
      previewData = data;
      document.getElementById("btnApply").disabled = !(data && Array.isArray(data.items) && data.items.length > 0);

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
        const current = Number(item.currentPrice || 0);
        const next = Number(item.newPrice || 0);
        const delta = next - current;
        const deltaClass = delta >= 0 ? "delta-up" : "delta-down";
        const deltaLabel = `${delta >= 0 ? "+" : ""}${formatMoney(delta)}`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight:700;">${escapeHtml(item.name || "")}</td>
          <td class="price-old">${formatMoney(current)}</td>
          <td class="price-new">${formatMoney(next)}</td>
          <td class="${deltaClass}">${deltaLabel}</td>
        `;
        tbody.appendChild(tr);
      });

      emptyState.classList.add("hidden-block");
      tableBlock.classList.remove("hidden-block");
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

        const data = await apiPreviewAdjustment(companySlug, payload);
        renderPreview(data);

        showStatus(
          "Vista previa generada",
          `Se calcularon ${data?.totalItems || 0} producto(s) para el ajuste seleccionado.`,
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

    async function handleApply() {
      try {
        hideStatus();

        const companySlug = getCompanySlug();
        if (!companySlug) throw new Error("No hay empresa seleccionada.");

        const payload = buildPayload();

        if (!previewData || lastPreviewRequestJson !== JSON.stringify(payload)) {
          throw new Error("Generá la vista previa antes de aplicar el ajuste.");
        }

        document.getElementById("btnApply").disabled = true;
        document.getElementById("btnApply").textContent = "Aplicando...";

        const data = await apiApplyAdjustment(companySlug, payload);

        toast("Precios actualizados correctamente", "success", 1800);
        showStatus(
          "Ajuste aplicado",
          data?.message || "Los precios se actualizaron correctamente.",
          "success"
        );

        allItems = await apiGetItems(companySlug);
        renderItemsList();
        await handlePreview();
      } catch (error) {
        showStatus("No pude aplicar el ajuste", error.message || "Ocurrió un error.", "error");
        toast(error.message || "No pude aplicar el ajuste", "error", 2200);
      } finally {
        document.getElementById("btnApply").disabled = !previewData;
        document.getElementById("btnApply").innerHTML = `
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 7.5L6 10.5L12 4.5" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Aplicar ajuste
        `;
      }
    }

    function bindEvents() {
      document.getElementById("btnLogout").addEventListener("click", logout);

      document.querySelectorAll("[data-scope-card]").forEach(card => {
        card.addEventListener("click", () => {
          setScope(card.getAttribute("data-scope-card"));
        });
      });

      document.getElementById("adjustmentTypeSelect").addEventListener("change", () => {
        updateSummary();
        resetPreview();
      });

      document.getElementById("adjustmentValueInput").addEventListener("input", () => {
        updateSummary();
        resetPreview();
      });

      document.getElementById("categorySelect").addEventListener("change", () => {
        resetPreview();
      });

      document.getElementById("itemsSearchInput").addEventListener("input", () => {
        renderItemsList();
      });

      document.getElementById("btnPreview").addEventListener("click", handlePreview);
      document.getElementById("btnApply").addEventListener("click", handleApply);
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

        showStatus(
          "Pantalla lista",
          "Ya podés generar una vista previa y aplicar ajustes masivos o individuales.",
          "info"
        );
      } catch (error) {
        console.error(error);
        showStatus("No pude cargar la pantalla", error.message || "Ocurrió un error.", "error");
        toast(error.message || "No pude cargar la pantalla", "error", 2400);
      }
    }

    init();
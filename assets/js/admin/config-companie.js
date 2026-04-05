let CONFIG = null;
    let isRefreshing = false;
    let currentData = null;
    let logoFileSelected = null;
    let shiftsCache = [];
    let deletingShiftId = null;
    let baseAddressValidated = false;

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

    function getSlug(){
      return localStorage.getItem(SLUG_KEY) || CONFIG.companySlug;
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

    async function apiGetAdminMe() {
      const url = `${CONFIG.apiBaseUrl}/api/admin/me`;
      const res = await fetchAuth(url);
      if (!res || !res.ok) return null;

      const me = await res.json().catch(() => null);

      if (me?.companySlug) {
        localStorage.setItem(SLUG_KEY, me.companySlug);
      }

      return me;
    }

    async function apiGetCompanySettings() {
      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/company-settings`;
      const res = await fetchAuth(url);
      if(!res) return null;
      if (!res.ok) throw new Error("Error cargando configuración");
      return await res.json();
    }

    async function apiUpdateCompanySettings(body) {
      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/company-settings`;
      const res = await fetchAuth(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res) return null;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Error guardando configuración");
      }
      return await res.json().catch(() => null);
    }

    async function apiUploadLogo(file) {
      if (!(file instanceof File)) throw new Error("Archivo inválido");

      const fd = new FormData();
      fd.append("file", file);

      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/company-settings/logo`;
      const res = await fetchAuth(url, { method: "POST", body: fd });

      if(!res) return null;
      if(!res.ok){
        const text = await res.text().catch(() => "");
        throw new Error(text || "No pude subir el logo");
      }

      const data = await res.json().catch(() => null);
      return data?.logoUrl || data?.LogoUrl || null;
    }

    function buildImageUrl(path){
      if(!path) return "";
      if(String(path).startsWith("http")) return path;
      if(!CONFIG?.apiBaseUrl) return path;
      return CONFIG.apiBaseUrl + path;
    }

    function setLogoPreview(url){
      const preview = document.getElementById("logoPreview");
      if(url){
        preview.src = buildImageUrl(url);
        preview.classList.remove("hidden");
      }else{
        preview.classList.add("hidden");
        preview.removeAttribute("src");
      }
    }

    function applyVisibility(data){
      const transferEnabled = !!data?.transferEnabled;
      const mercadoPagoEnabled = !!data?.mercadoPagoEnabled;
      const hasAnyMethod = transferEnabled || mercadoPagoEnabled;
      const businessType = Number(data?.businessType ?? 0);
      const isOtros = businessType === 2;

      document.getElementById("transferBox").classList.toggle("hidden", !transferEnabled);
      document.getElementById("transferAdjustmentSection").classList.toggle("hidden", !transferEnabled);
      document.getElementById("mpAdjustmentSection").classList.toggle("hidden", !mercadoPagoEnabled);

      document.getElementById("chipTransfer").classList.toggle("hidden", !transferEnabled);
      document.getElementById("chipMp").classList.toggle("hidden", !mercadoPagoEnabled);

      document.getElementById("paymentSettingsCard").classList.toggle("hidden", !hasAnyMethod);
      document.getElementById("emptyMethodsInfo").classList.toggle("hidden", hasAnyMethod);
      document.getElementById("paymentSummary").textContent = hasAnyMethod ? "Métodos activos" : "Sin métodos habilitados";

      document.getElementById("companyAddressSection").classList.toggle("hidden", !isOtros);
    }

    function getOrderNotificationModeLabel(value){
      const map = {
        0: "No notifica",
        1: "WhatsApp manual",
        2: "WhatsApp automático"
      };
      return map[Number(value)] || "No definido";
    }

    function normalizeRange(raw, index){
      return {
        id: raw?.id ?? null,
        fromKm: Number(raw?.fromKm ?? 0),
        toKm: Number(raw?.toKm ?? 0),
        price: Number(raw?.price ?? 0),
        enabled: raw?.enabled !== false,
        orderIndex: Number(raw?.orderIndex ?? index ?? 0)
      };
    }

    function getDeliveryRangesFromDom(){
      return Array.from(document.querySelectorAll(".delivery-range-row")).map((row, index) => ({
        id: row.getAttribute("data-id") ? Number(row.getAttribute("data-id")) : null,
        fromKm: Number(row.querySelector("[data-field='fromKm']").value || 0),
        toKm: Number(row.querySelector("[data-field='toKm']").value || 0),
        price: Number(row.querySelector("[data-field='price']").value || 0),
        enabled: !!row.querySelector("[data-field='enabled']").checked,
        orderIndex: index
      }));
    }

    function setBaseAddressStatus(valid){
      baseAddressValidated = !!valid;
      const el = document.getElementById("baseAddressStatus");
      if(!el) return;
      el.className = "status-pill " + (baseAddressValidated ? "ok" : "warn");
      el.innerHTML = baseAddressValidated
        ? '<span style="width:8px;height:8px;border-radius:999px;background:currentColor;opacity:.85;"></span> Ubicación validada'
        : '<span style="width:8px;height:8px;border-radius:999px;background:currentColor;opacity:.85;"></span> Pendiente de validar';
    }

    function renderCompanyMapPlaceholder(data){
      const el = document.getElementById("companyBaseMapShellContent");
      if(!el) return;

      if(data && data.normalizedAddress && data.lat != null && data.lng != null){
        el.innerHTML = `
          <div class="w-full">
            <div class="text-base font-extrabold text-slate-700 font-display">Dirección encontrada</div>
            <div class="mt-3 text-sm text-slate-600">${escapeHtml(data.normalizedAddress)}</div>
            <div class="mt-4 inline-flex flex-wrap gap-2 justify-center">
              <div class="px-3 py-2 rounded-xl border bg-white text-slate-700 text-sm font-semibold">Lat: ${Number(data.lat).toFixed(6)}</div>
              <div class="px-3 py-2 rounded-xl border bg-white text-slate-700 text-sm font-semibold">Lng: ${Number(data.lng).toFixed(6)}</div>
            </div>
            <div class="mt-4 text-xs text-slate-500">Más adelante este bloque se reemplaza por el mapa real con pin movible.</div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div>
            <div class="text-base font-extrabold text-slate-700 font-display">Mapa pendiente de integrar</div>
            <div class="mt-2">
              Primero validá la dirección del local.<br>
              Cuando quede validada, acá se va a mostrar el resultado con la ubicación encontrada.
            </div>
          </div>
        `;
      }
    }

    function escapeHtml(str){
      return String(str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function renderDeliveryRanges(ranges){
  const tbody = document.getElementById("deliveryRangesBody");
  const empty = document.getElementById("deliveryRangesEmpty");
  if(!tbody || !empty) return;

  const rows = Array.isArray(ranges) ? ranges : [];
  empty.classList.toggle("hidden", rows.length > 0);

  tbody.innerHTML = rows.map((range, index) => {
    const item = normalizeRange(range, index);

    return `
      <tr class="delivery-range-row is-readonly" data-id="${item.id ?? ""}" data-editing="false">
        <td colspan="6">
          <div class="range-row-shell">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center range-mobile-stack">
              <div class="md:col-span-1">
                <label class="field-label">Orden</label>
                <input type="number" class="field-input" data-field="orderIndex" value="${index}" readonly disabled />
              </div>

              <div class="md:col-span-3">
                <label class="field-label">Desde km</label>
                <input type="number" step="0.01" class="field-input" data-field="fromKm" value="${item.fromKm}" disabled />
              </div>

              <div class="md:col-span-3">
                <label class="field-label">Hasta km</label>
                <input type="number" step="0.01" class="field-input" data-field="toKm" value="${item.toKm}" disabled />
              </div>

              <div class="md:col-span-3">
                <label class="field-label">Precio</label>
                <input type="number" step="0.01" class="field-input" data-field="price" value="${item.price}" disabled />
              </div>

              <div class="md:col-span-1">
                <label class="field-label">Activo</label>
                <div class="toggle-shell h-[50px] bg-slate-50 border border-slate-200 rounded-2xl px-4 flex items-center justify-center shadow-sm">
                  <input type="checkbox" data-field="enabled" ${item.enabled ? "checked" : ""} class="w-4 h-4" disabled />
                </div>
              </div>

              <div class="md:col-span-1">
                <label class="field-label">Acción</label>
                <div class="range-actions">
                  <button type="button" class="range-btn range-btn-edit edit-range-btn">Editar</button>
                  <button type="button" class="range-btn range-btn-save save-range-btn hidden">Guardar</button>
                  <button type="button" class="range-btn range-btn-cancel cancel-range-btn hidden">Cancelar</button>
                  <button type="button" class="range-btn range-btn-remove remove-range-btn">Quitar</button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  bindDeliveryRangeEvents();
}



function setRangeEditing(row, editing){
  if(!row) return;

  row.setAttribute("data-editing", editing ? "true" : "false");
  row.classList.toggle("is-readonly", !editing);

  row.querySelectorAll("[data-field='fromKm'], [data-field='toKm'], [data-field='price'], [data-field='enabled']")
    .forEach(el => {
      el.disabled = !editing;
    });

  const editBtn = row.querySelector(".edit-range-btn");
  const saveBtn = row.querySelector(".save-range-btn");
  const cancelBtn = row.querySelector(".cancel-range-btn");

  if(editBtn) editBtn.classList.toggle("hidden", editing);
  if(saveBtn) saveBtn.classList.toggle("hidden", !editing);
  if(cancelBtn) cancelBtn.classList.toggle("hidden", !editing);

  if(editing){
    row.dataset.original = JSON.stringify({
      fromKm: row.querySelector("[data-field='fromKm']").value,
      toKm: row.querySelector("[data-field='toKm']").value,
      price: row.querySelector("[data-field='price']").value,
      enabled: row.querySelector("[data-field='enabled']").checked
    });
  }
}

function collectDeliveryRanges(){

  const rows = document.querySelectorAll(".delivery-range-row");

  return Array.from(rows).map((row, index) => {

    const fromKm =
      Number(row.querySelector('[data-field="fromKm"]').value || 0);

    const toKm =
      Number(row.querySelector('[data-field="toKm"]').value || 0);

    const price =
      Number(row.querySelector('[data-field="price"]').value || 0);

    const enabled =
      row.querySelector('[data-field="enabled"]').checked;

    return {
      fromKm,
      toKm,
      price,
      enabled,
      orderIndex: index
    };

  });

}

async function saveRangeRow(row){
  const fromKm = Number(row.querySelector("[data-field='fromKm']").value || 0);
  const toKm = Number(row.querySelector("[data-field='toKm']").value || 0);
  const price = Number(row.querySelector("[data-field='price']").value || 0);

  if(Number.isNaN(fromKm) || fromKm < 0){
    toastUpdate("El km desde no puede ser negativo", "error", 2200);
    return;
  }

  if(Number.isNaN(toKm) || toKm <= fromKm){
    toastUpdate("El km hasta debe ser mayor que el km desde", "error", 2200);
    return;
  }

  if(Number.isNaN(price) || price < 0){
    toastUpdate("El precio no puede ser negativo", "error", 2200);
    return;
  }

  try {
    toastShow("Guardando tramo...", "info");

    const values = readCompanyForm();
    validateCompanyInfo(values);

    const logoUrl = currentData?.logoUrl || null;

    await apiUpdateCompanySettings(buildCompanyPayload(values, logoUrl));
    await refreshCompanySettings();

    setRangeEditing(row, false);
    toastUpdate("Tramo guardado", "success", 1200);
  } catch (e) {
    console.error(e);
    toastUpdate(e?.message || "No pude guardar el tramo", "error", 2200);
  }
}

function cancelRangeRow(row){
  const raw = row.dataset.original;
  if(raw){
    const original = JSON.parse(raw);

    row.querySelector("[data-field='fromKm']").value = original.fromKm;
    row.querySelector("[data-field='toKm']").value = original.toKm;
    row.querySelector("[data-field='price']").value = original.price;
    row.querySelector("[data-field='enabled']").checked = !!original.enabled;
  }

  setRangeEditing(row, false);
}

function bindDeliveryRangeEvents(){
  const tbody = document.getElementById("deliveryRangesBody");
  if(!tbody) return;

  tbody.querySelectorAll(".edit-range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".delivery-range-row");
      setRangeEditing(row, true);
    });
  });

tbody.querySelectorAll(".save-range-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const row = btn.closest(".delivery-range-row");
    await saveRangeRow(row);
  });
});

  tbody.querySelectorAll(".cancel-range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".delivery-range-row");
      cancelRangeRow(row);
    });
  });

  tbody.querySelectorAll(".remove-range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = getDeliveryRangesFromDom();
      const row = btn.closest(".delivery-range-row");
      const rowIndex = Array.from(tbody.querySelectorAll(".delivery-range-row")).indexOf(row);
      renderDeliveryRanges(list.filter((_, i) => i !== rowIndex));
      toastUpdate("Tramo quitado", "success", 1200);
    });
  });
}

function addEmptyDeliveryRange(){
  const current = getDeliveryRangesFromDom();

  current.push({
    id: null,
    fromKm: current.length === 0 ? 0 : 0,
    toKm: current.length === 0 ? 3 : 0,
    price: 0,
    enabled: true,
    orderIndex: current.length
  });

  renderDeliveryRanges(current);

  const rows = document.querySelectorAll(".delivery-range-row");
  const lastRow = rows[rows.length - 1];
  if(lastRow){
    setRangeEditing(lastRow, true);
  }
}

    function buildCompanyAddressQuery(){
      const parts = [
        (document.getElementById("addressStreet").value || "").trim(),
        (document.getElementById("addressNumber").value || "").trim(),
        (document.getElementById("addressCity").value || "").trim(),
        (document.getElementById("addressPostalCode").value || "").trim(),
        (document.getElementById("addressProvince").value || "").trim(),
        "Argentina"
      ].filter(Boolean);

      return parts.join(", ");
    }

    async function geocodeCompanyAddress(){
      const query = buildCompanyAddressQuery();

      if(query.replaceAll(",", "").trim().length < 8){
        throw new Error("Completá una dirección más precisa antes de validar.");
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });

      if(!res.ok){
        throw new Error("No pude validar la dirección ahora.");
      }

      const data = await res.json();
      const first = Array.isArray(data) ? data[0] : null;

      if(!first || !first.lat || !first.lon){
        throw new Error("No encontramos una coincidencia válida para esa dirección.");
      }

      return {
        normalizedAddress: first.display_name || query,
        lat: Number(first.lat),
        lng: Number(first.lon)
      };
    }

async function validateCompanyBaseAddress(){
  toastShow("Validando dirección...", "info");

  const street = (document.getElementById("addressStreet")?.value || "").trim();
  const number = (document.getElementById("addressNumber")?.value || "").trim();
  const city = (document.getElementById("addressCity")?.value || "").trim();
  const province = (document.getElementById("addressProvince")?.value || "").trim();
  const postalCode = (document.getElementById("addressPostalCode")?.value || "").trim();

  if(!street || !number || !city){
    toastUpdate("Completá calle, altura y localidad", "error", 2500);
    return;
  }

  const companySlug = getSlug();

  if(!companySlug){
    toastUpdate("No pude obtener la empresa del usuario logueado", "error", 2500);
    return;
  }

  const fullAddress =
    `${street} ${number}, ${city}, ${province || ""}, ${postalCode || ""}, Argentina`;

  const response = await fetchAuth(
    `${CONFIG.apiBaseUrl}/api/admin/${companySlug}/company-settings/validate-base-address`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: fullAddress
      })
    }
  );

  if(!response){
    toastUpdate("No pude validar la dirección", "error", 2500);
    return;
  }

  const data = await response.json().catch(() => null);

  if(!response.ok || !data?.valid){
    toastUpdate(
      data?.message || "No pude validar la dirección",
      "error",
      2500
    );
    return;
  }

  document.getElementById("baseAddressNormalized").value = data.normalizedAddress || "";
  document.getElementById("baseLatitude").value = data.lat ?? "";
  document.getElementById("baseLongitude").value = data.lng ?? "";

  setBaseAddressStatus(true);

  renderCompanyMapPlaceholder({
    lat: data.lat,
    lng: data.lng,
    normalizedAddress: data.normalizedAddress
  });

  toastUpdate("Dirección validada correctamente", "success", 1800);
}

    function clearCompanyBaseValidation(){
      document.getElementById("baseAddressNormalized").value = "";
      document.getElementById("baseLatitude").value = "";
      document.getElementById("baseLongitude").value = "";
      setBaseAddressStatus(false);
      renderCompanyMapPlaceholder(null);
    }

    function fillCompanyForm(data){
      currentData = data || {};

      document.getElementById("name").value = data?.name ?? "";
      document.getElementById("whatsapp").value = data?.whatsapp ?? "";
      document.getElementById("alias").value = data?.alias ?? "";
      document.getElementById("orderNotificationModeView").textContent = getOrderNotificationModeLabel(data?.orderNotificationMode ?? 0);
      document.getElementById("orderNotificationTemplate").value = data?.orderNotificationTemplate ?? "";

      document.getElementById("transferSurchargePercent").value = data?.transferSurchargePercent ?? 0;
      document.getElementById("mercadoPagoSurchargePercent").value = data?.mercadoPagoSurchargePercent ?? 0;

      document.getElementById("addressStreet").value = data?.addressStreet ?? "";
      document.getElementById("addressNumber").value = data?.addressNumber ?? "";
      document.getElementById("addressCity").value = data?.addressCity ?? "";
      document.getElementById("addressPostalCode").value = data?.addressPostalCode ?? "";
      document.getElementById("addressProvince").value = data?.addressProvince ?? "";

      document.getElementById("baseAddressNormalized").value = data?.baseAddressNormalized ?? "";
      document.getElementById("baseLatitude").value = data?.baseLatitude ?? "";
      document.getElementById("baseLongitude").value = data?.baseLongitude ?? "";

      setBaseAddressStatus(!!data?.baseAddressValidated);
      renderCompanyMapPlaceholder(
        data?.baseAddressValidated && data?.baseAddressNormalized && data?.baseLatitude != null && data?.baseLongitude != null
          ? { normalizedAddress: data.baseAddressNormalized, lat: data.baseLatitude, lng: data.baseLongitude }
          : null
      );
      renderDeliveryRanges(Array.isArray(data?.deliveryRanges) ? data.deliveryRanges : []);
      setLogoPreview(data?.logoUrl || "");
      applyVisibility(data);
    }

    async function refreshCompanySettings(){
      const data = await apiGetCompanySettings();
      fillCompanyForm(data);
    }

    function readCompanyForm(){
      const name = (document.getElementById("name").value || "").trim();
      const whatsapp = (document.getElementById("whatsapp").value || "").trim();
      const alias = (document.getElementById("alias").value || "").trim();
      const orderNotificationTemplate = (document.getElementById("orderNotificationTemplate").value || "").trim();

      const transferSurchargePercent = Number(document.getElementById("transferSurchargePercent").value || 0);
      const mercadoPagoSurchargePercent = Number(document.getElementById("mercadoPagoSurchargePercent").value || 0);

      const addressStreet = (document.getElementById("addressStreet").value || "").trim();
      const addressNumber = (document.getElementById("addressNumber").value || "").trim();
      const addressCity = (document.getElementById("addressCity").value || "").trim();
      const addressPostalCode = (document.getElementById("addressPostalCode").value || "").trim();
      const addressProvince = (document.getElementById("addressProvince").value || "").trim();
      const baseAddressNormalized = (document.getElementById("baseAddressNormalized").value || "").trim();
      const baseLatitudeRaw = (document.getElementById("baseLatitude").value || "").trim();
      const baseLongitudeRaw = (document.getElementById("baseLongitude").value || "").trim();

      return {
        name,
        whatsapp,
        alias,
        orderNotificationTemplate,
        transferSurchargePercent,
        mercadoPagoSurchargePercent,
        addressStreet,
        addressNumber,
        addressCity,
        addressPostalCode,
        addressProvince,
        baseAddressNormalized,
        baseLatitude: baseLatitudeRaw === "" ? null : Number(baseLatitudeRaw),
        baseLongitude: baseLongitudeRaw === "" ? null : Number(baseLongitudeRaw),
        baseAddressValidated,
        deliveryRanges: getDeliveryRangesFromDom()
      };
    }

    function validateCompanyInfo(values){
      if(!values.name){
        throw new Error("El nombre es obligatorio");
      }

      const businessType = Number(currentData?.businessType ?? 0);
      const isOtros = businessType === 2;

      if(isOtros){
        if(!values.addressStreet || !values.addressNumber || !values.addressCity){
          throw new Error("Para este tipo de negocio, calle, altura y localidad son obligatorios");
        }

        if(values.baseLatitude === null || Number.isNaN(values.baseLatitude) || values.baseLongitude === null || Number.isNaN(values.baseLongitude)){
          throw new Error("Primero tenés que validar la dirección del local");
        }

        if(!values.baseAddressValidated){
          throw new Error("Primero tenés que validar la dirección del local");
        }

        for(const range of values.deliveryRanges){
          if(Number.isNaN(range.fromKm) || range.fromKm < 0){
            throw new Error("El km desde no puede ser negativo");
          }
          if(Number.isNaN(range.toKm) || range.toKm <= range.fromKm){
            throw new Error("El km hasta debe ser mayor que el km desde");
          }
          if(Number.isNaN(range.price) || range.price < 0){
            throw new Error("El precio del tramo no puede ser negativo");
          }
        }
      }
    }

    function validatePaymentSettings(values){
      if (Number.isNaN(values.transferSurchargePercent) || values.transferSurchargePercent < 0 || values.transferSurchargePercent > 100) {
        throw new Error("El ajuste de transferencia debe estar entre 0 y 100");
      }

      if (Number.isNaN(values.mercadoPagoSurchargePercent) || values.mercadoPagoSurchargePercent < 0 || values.mercadoPagoSurchargePercent > 100) {
        throw new Error("El ajuste de Mercado Pago debe estar entre 0 y 100");
      }
    }

    async function uploadLogoIfNeeded(){
      let logoUrl = currentData?.logoUrl || null;

      if(logoFileSelected){
        toastShow("Subiendo logo...", "info");
        logoUrl = await apiUploadLogo(logoFileSelected);
        if(!logoUrl) throw new Error("No pude subir el logo");
      }

      return logoUrl;
    }

    function buildCompanyPayload(values, logoUrl){
      const businessType = Number(currentData?.businessType ?? 0);
      const isOtros = businessType === 2;

      return {
        name: values.name,
        whatsapp: values.whatsapp || null,
        logoUrl: logoUrl || null,
        alias: values.alias || null,
        orderNotificationTemplate: values.orderNotificationTemplate || null,
        transferSurchargePercent: values.transferSurchargePercent,
        mercadoPagoSurchargePercent: values.mercadoPagoSurchargePercent,

        addressStreet: isOtros ? (values.addressStreet || null) : null,
        addressNumber: isOtros ? (values.addressNumber || null) : null,
        addressCity: isOtros ? (values.addressCity || null) : null,
        addressPostalCode: isOtros ? (values.addressPostalCode || null) : null,
        addressProvince: isOtros ? (values.addressProvince || null) : null,
        baseAddressNormalized: isOtros ? (values.baseAddressNormalized || null) : null,
        baseLatitude: isOtros ? values.baseLatitude : null,
        baseLongitude: isOtros ? values.baseLongitude : null,
        baseAddressValidated: isOtros ? !!values.baseAddressValidated : false,
        deliveryRanges: isOtros ? values.deliveryRanges.map((x, index) => ({
          id: x.id || null,
          fromKm: Number(x.fromKm || 0),
          toKm: Number(x.toKm || 0),
          price: Number(x.price || 0),
          enabled: !!x.enabled,
          orderIndex: index
        })) : []
      };
    }

    async function saveCompanyInfo(){
      const values = readCompanyForm();
      validateCompanyInfo(values);

      const logoUrl = await uploadLogoIfNeeded();

      toastShow("Guardando datos...", "info");

      await apiUpdateCompanySettings(buildCompanyPayload(values, logoUrl));

      logoFileSelected = null;
      document.getElementById("logoFile").value = "";

      await refreshCompanySettings();
      toastUpdate("Datos guardados", "success", 1800);
    }

    async function savePaymentSettings(){
      const values = readCompanyForm();
      validatePaymentSettings(values);

      toastShow("Guardando ajustes...", "info");

      await apiUpdateCompanySettings(buildCompanyPayload(values, currentData?.logoUrl || null));

      await refreshCompanySettings();
      toastUpdate("Ajustes guardados", "success", 1800);
    }

    async function apiGetShifts() {
      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/shifts`;
      const res = await fetchAuth(url);
      if(!res) return [];
      if (!res.ok) throw new Error("Error cargando turnos");
      return await res.json();
    }

    async function apiCreateShift(body) {
      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/shifts`;
      const res = await fetchAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res) return null;
      if (!res.ok) throw new Error("Error creando turno");
      return await res.json();
    }

    async function apiUpdateShift(id, body) {
      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/shifts/${id}`;
      const res = await fetchAuth(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res) return;
      if (!res.ok) throw new Error("Error actualizando turno");
    }

    async function apiDeleteShift(id) {
      const url = `${CONFIG.apiBaseUrl}/api/admin/${getSlug()}/shifts/${id}`;
      const res = await fetchAuth(url, { method: "DELETE" });
      if(!res) return;
      if (!res.ok) throw new Error("Error eliminando turno");
    }

    function dayLabel(d) {
      if (d === null || d === undefined || d === "") return "Todos";
      const map = ["Domingos", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados"];
      return map[d] ?? String(d);
    }

    function badge(enabled) {
      return enabled
        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
        : "bg-rose-50 text-rose-800 border-rose-100";
    }

    function isHourValid(value){
      return Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 23;
    }

    function openEditModal(shift){
      document.getElementById("editId").value = String(shift.id);
      document.getElementById("editDayOfWeek").value = shift.dayOfWeek ?? "";
      document.getElementById("editOpenHour").value = String(shift.openHour ?? 0);
      document.getElementById("editCloseHour").value = String(shift.closeHour ?? 0);
      document.getElementById("editEnabled").checked = !!shift.enabled;
      document.getElementById("editModal").classList.remove("hidden");
    }

    function closeEditModal(){
      document.getElementById("editModal").classList.add("hidden");
    }

    function openDeleteModal(id, label){
      deletingShiftId = id;
      document.getElementById("deleteSubtitle").textContent = label
        ? `Vas a eliminar el turno de ${label}.`
        : "Confirmá la eliminación del turno.";
      document.getElementById("deleteModal").classList.remove("hidden");
    }

    function closeDeleteModal(){
      deletingShiftId = null;
      document.getElementById("deleteModal").classList.add("hidden");
    }

    function setSummary(items) {
      document.getElementById("summary").textContent = `${items.length} turno(s)`;
    }

    function renderShifts(items) {
      const el = document.getElementById("list");
      setSummary(items);

      if (!items.length) {
        el.innerHTML = `
          <div class="glass-card rounded-[2rem] p-8 text-center">
            <div class="text-5xl mb-3">🕒</div>
            <div class="text-xl font-extrabold text-slate-900 font-display">No hay turnos</div>
            <div class="text-sm text-slate-500 mt-2">Agregá el primero desde el formulario de arriba.</div>
          </div>`;
        return;
      }

      el.innerHTML = items.map(s => `
        <div class="module-card glass-card rounded-[2rem] p-6"
             data-day-label="${dayLabel(s.dayOfWeek)}">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="min-w-[260px]">
              <div class="flex items-center gap-3 flex-wrap">
                <div class="text-xl font-extrabold tracking-tight text-slate-900 font-display">${dayLabel(s.dayOfWeek)}</div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold border ${badge(s.enabled)}">
                  ${s.enabled ? "Habilitado" : "Deshabilitado"}
                </span>
              </div>

              <div class="text-sm text-slate-500 mt-3">
                Abre:
                <span class="font-bold text-slate-800">${s.openHour}:00</span>
                ·
                Cierra:
                <span class="font-bold text-slate-800">${s.closeHour}:00</span>
              </div>

              <div class="text-xs text-slate-400 mt-1">Id: ${s.id}</div>
            </div>

            <div class="flex gap-2 flex-wrap justify-end items-center w-full md:w-auto">
              <button class="soft-btn px-4 py-3 min-w-[110px] rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200"
                data-edit="1" data-id="${s.id}">
                Editar
              </button>

              <button class="soft-btn px-4 py-3 min-w-[110px] rounded-2xl bg-rose-100 text-rose-800 hover:bg-rose-200"
                data-del="1" data-id="${s.id}">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      `).join("");

      el.querySelectorAll("button[data-edit='1']").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-id"));
          const shift = shiftsCache.find(x => x.id === id);
          if (shift) openEditModal(shift);
        });
      });

      el.querySelectorAll("button[data-del='1']").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-id"));
          const card = btn.closest("[data-day-label]");
          const label = card?.getAttribute("data-day-label") || null;
          openDeleteModal(id, label);
        });
      });
    }

    async function refreshShifts() {
      const items = await apiGetShifts();
      shiftsCache = Array.isArray(items) ? items : [];
      renderShifts(shiftsCache);
    }

    async function refreshAll() {
      if (isRefreshing) return;
      isRefreshing = true;

      const btn = document.getElementById("refresh");
      const old = btn.textContent;
      btn.textContent = "Cargando...";
      btn.disabled = true;

      try {
        await Promise.all([
          refreshCompanySettings(),
          refreshShifts()
        ]);
      } finally {
        btn.textContent = old;
        btn.disabled = false;
        isRefreshing = false;
      }
    }

    document.getElementById("logoFile").addEventListener("change", (e) => {
      logoFileSelected = e.target.files?.[0] ?? null;
      if(logoFileSelected){
        const preview = document.getElementById("logoPreview");
        preview.src = URL.createObjectURL(logoFileSelected);
        preview.classList.remove("hidden");
      }
    });

    document.getElementById("clearLogo").addEventListener("click", () => {
      logoFileSelected = null;
      document.getElementById("logoFile").value = "";
      setLogoPreview("");
      if(currentData){
        currentData.logoUrl = null;
      }
    });

    (async function init() {
      try {
        if(!requireAuth()) return;

        CONFIG = await loadConfig();
        await apiGetAdminMe();
        document.getElementById("refresh").addEventListener("click", refreshAll);

        document.getElementById("addDeliveryRange")?.addEventListener("click", () => {
          addEmptyDeliveryRange();
        });

        document.getElementById("validateBaseAddress")?.addEventListener("click", async () => {
          try {
            await validateCompanyBaseAddress();
          } catch (e) {
            console.error(e);
            toastUpdate(e?.message || "No pude validar la dirección", "error", 2500);
          }
        });

        document.getElementById("retryBaseAddress")?.addEventListener("click", async () => {
          try {
            clearCompanyBaseValidation();
            await validateCompanyBaseAddress();
          } catch (e) {
            console.error(e);
            toastUpdate(e?.message || "No pude buscar la dirección otra vez", "error", 2500);
          }
        });

        document.getElementById("clearBaseAddressValidation")?.addEventListener("click", () => {
          clearCompanyBaseValidation();
          toastShow("Validación limpiada", "info");
          toastAutoClose(1500);
        });

        const btnEmojiPicker = document.getElementById("btnEmojiPicker");
        const emojiPickerPanel = document.getElementById("emojiPickerPanel");
        const templateInput = document.getElementById("orderNotificationTemplate");

        btnEmojiPicker?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          emojiPickerPanel?.classList.toggle("hidden");
        });

        emojiPickerPanel?.querySelectorAll(".emoji-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const emoji = btn.textContent || "";
            if (!templateInput) return;

            const start = templateInput.selectionStart ?? templateInput.value.length;
            const end = templateInput.selectionEnd ?? templateInput.value.length;
            const value = templateInput.value || "";

            templateInput.value = value.slice(0, start) + emoji + value.slice(end);

            const newPos = start + emoji.length;
            templateInput.setSelectionRange(newPos, newPos);
            templateInput.focus();
            emojiPickerPanel?.classList.add("hidden");
          });
        });

        document.addEventListener("click", (e) => {
          if (!emojiPickerPanel || !btnEmojiPicker) return;
          const clickedInsidePanel = emojiPickerPanel.contains(e.target);
          const clickedButton = btnEmojiPicker.contains(e.target);

          if (!clickedInsidePanel && !clickedButton) {
            emojiPickerPanel.classList.add("hidden");
          }
        });

        document.getElementById("saveCompanyInfo").addEventListener("click", async () => {
          try {
            await saveCompanyInfo();
          } catch (e) {
            console.error(e);
            toastUpdate(e?.message || "Error guardando datos", "error", 2500);
          }
        });

        document.getElementById("savePaymentSettings").addEventListener("click", async () => {
          try {
            await savePaymentSettings();
          } catch (e) {
            console.error(e);
            toastUpdate(e?.message || "Error guardando ajustes", "error", 2500);
          }
        });

        document.getElementById("create").addEventListener("click", async () => {
          const dayVal = document.getElementById("dayOfWeek").value;
          const openHour = Number(document.getElementById("openHour").value);
          const closeHour = Number(document.getElementById("closeHour").value);
          const enabled = document.getElementById("enabled").checked;

          if (!isHourValid(openHour) || !isHourValid(closeHour)) {
            toastShow("Las horas deben estar entre 0 y 23", "error");
            toastAutoClose(1800);
            return;
          }

          try {
            toastShow("Creando turno...", "info");
            await apiCreateShift({
              dayOfWeek: dayVal === "" ? null : Number(dayVal),
              openHour,
              closeHour,
              enabled
            });
            await refreshShifts();
            toastUpdate("Turno creado correctamente", "success", 1800);
          } catch (e) {
            console.error(e);
            toastUpdate("Error al crear turno", "error", 2500);
          }
        });

        document.getElementById("closeModal").addEventListener("click", closeEditModal);
        document.getElementById("editModal").addEventListener("click", (e) => {
          if (e.target.id === "editModal") closeEditModal();
        });

        document.getElementById("update").addEventListener("click", async () => {
          const id = Number(document.getElementById("editId").value);
          const dayVal = document.getElementById("editDayOfWeek").value;
          const openHour = Number(document.getElementById("editOpenHour").value);
          const closeHour = Number(document.getElementById("editCloseHour").value);
          const enabled = document.getElementById("editEnabled").checked;

          if (!isHourValid(openHour) || !isHourValid(closeHour)) {
            toastShow("Las horas deben estar entre 0 y 23", "error");
            toastAutoClose(1800);
            return;
          }

          try {
            toastShow("Guardando cambios...", "info");
            await apiUpdateShift(id, {
              dayOfWeek: dayVal === "" ? null : Number(dayVal),
              openHour,
              closeHour,
              enabled
            });
            closeEditModal();
            await refreshShifts();
            toastUpdate("Turno actualizado", "success", 1800);
          } catch (e) {
            console.error(e);
            toastUpdate("Error al actualizar turno", "error", 2500);
          }
        });

        document.getElementById("closeDeleteModal").addEventListener("click", closeDeleteModal);
        document.getElementById("cancelDelete").addEventListener("click", closeDeleteModal);

        document.getElementById("deleteModal").addEventListener("click", (e) => {
          if (e.target.id === "deleteModal") closeDeleteModal();
        });

        document.getElementById("confirmDelete").addEventListener("click", async () => {
          if (!deletingShiftId) return;

          try {
            toastShow("Eliminando turno...", "info");
            await apiDeleteShift(deletingShiftId);
            closeDeleteModal();
            await refreshShifts();
            toastUpdate("Turno eliminado", "success", 1800);
          } catch (e) {
            console.error(e);
            toastUpdate("Error al eliminar turno", "error", 2500);
          }
        });

        await refreshAll();
      } catch (e) {
        console.error(e);
        toastShow("Error ❌ " + (e.message || e), "error");
        toastAutoClose(3000);
      }
    })();
(function () {
  "use strict";

  const TOKEN_KEY = "menuonline_token";
  const SLUG_KEY = "menuonline_companySlug";
  const CONFIG_PATH = "/config.json";

  let CFG = {};

  const formEl = document.getElementById("productForm");
  const companySlugTextEl = document.getElementById("companySlugText");
  const formMessageEl = document.getElementById("formMessage");
  const listMessageEl = document.getElementById("listMessage");
  const productsListEl = document.getElementById("productsList");
  const imagesContainerEl = document.getElementById("imagesContainer");
  const btnAddImageEl = document.getElementById("btnAddImage");
  const btnLoadProductsEl = document.getElementById("btnLoadProducts");
  const categorySelectEl = document.getElementById("categoryId");

  const state = {
    companySlug: "",
    token: "",
    products: [],
    categories: []
  };

  window.addEventListener("load", init);

  async function init() {
    try {
      await loadConfig();

      state.token = localStorage.getItem(TOKEN_KEY) || "";
      state.companySlug = getCompanySlug();

      if (!state.token) {
        showFormMessage("No se encontró token en localStorage.", true);
        return;
      }

      if (!state.companySlug) {
        showFormMessage("No se encontró companySlug.", true);
        return;
      }

      companySlugTextEl.textContent = "Empresa: " + state.companySlug;

      bindEvents();

      addImageRow();
      await loadCategories();
      await loadProducts();
    } catch (error) {
      console.error(error);
      showFormMessage(error.message || "No se pudo iniciar la pantalla.", true);
    }
  }

  function bindEvents() {
    formEl.addEventListener("submit", onSubmit);
    btnAddImageEl.addEventListener("click", addImageRow);
    btnLoadProductsEl.addEventListener("click", loadProducts);
  }

  async function loadConfig() {
    const res = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error("No pude leer config.json");

    CFG = await res.json();

    if (!CFG.apiBaseUrl) {
      throw new Error("config.json sin apiBaseUrl");
    }
  }

  function apiUrl(path) {
    const base = String(CFG.apiBaseUrl || "").replace(/\/+$/, "");
    return base + (String(path).startsWith("/") ? path : "/" + path);
  }

  function getCompanySlug() {
    const qs = new URLSearchParams(window.location.search);
    const fromQuery = (qs.get("companySlug") || qs.get("c") || "").trim();
    if (fromQuery) {
      localStorage.setItem(SLUG_KEY, fromQuery);
      return fromQuery;
    }

    return (localStorage.getItem(SLUG_KEY) || "").trim();
  }

  function createAuthHeaders() {
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer " + state.token
    };
  }

  async function loadCategories() {
    categorySelectEl.innerHTML = `<option value="">Cargando categorías...</option>`;

    const response = await fetch(
      apiUrl(`/api/admin/${encodeURIComponent(state.companySlug)}/product-categories`),
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + state.token
        }
      }
    );

    const text = await response.text();
    const data = tryParseJson(text);

    if (!response.ok) {
      throw new Error(getErrorMessage(data, text));
    }

    state.categories = Array.isArray(data)
      ? data.filter(function (x) { return x && x.enabled !== false; })
      : [];

    renderCategories();
  }

  function renderCategories() {
    categorySelectEl.innerHTML = "";

    if (!state.categories.length) {
      categorySelectEl.innerHTML = `<option value="">No hay categorías de productos</option>`;
      return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Seleccionar categoría";
    categorySelectEl.appendChild(placeholder);

    state.categories.forEach(function (cat) {
      const option = document.createElement("option");
      option.value = String(cat.id);
      option.textContent = cat.name || "Sin nombre";
      categorySelectEl.appendChild(option);
    });
  }

  function addImageRow(urlValue, isPrimaryValue, sortOrderValue) {
    const row = document.createElement("div");
    row.className = "image-row";

    row.innerHTML = `
      <label>
        <span>URL imagen</span>
        <div class="image-preview-wrap">
          <img class="image-preview" src="" alt="preview" />
          <input class="img-url" type="text" placeholder="https://..." value="${escapeAttr(urlValue || "")}" />
        </div>
      </label>

      <label>
        <span>Orden</span>
        <input class="img-sort" type="number" value="${Number(sortOrderValue || 0)}" />
      </label>

      <label class="check">
        <input class="img-primary" type="radio" name="primaryImage" ${isPrimaryValue ? "checked" : ""} />
        <span>Principal</span>
      </label>

      <div>
        <button type="button" class="danger btn-remove-image">Eliminar</button>
      </div>
    `;

    const input = row.querySelector(".img-url");
    const preview = row.querySelector(".image-preview");
    const removeBtn = row.querySelector(".btn-remove-image");

    input.addEventListener("input", function () {
      updatePreview(preview, input.value);
    });

    removeBtn.addEventListener("click", function () {
      row.remove();
      ensureOnePrimary();
    });

    updatePreview(preview, urlValue || "");
    imagesContainerEl.appendChild(row);

    ensureOnePrimary();
  }

  function updatePreview(img, url) {
    const clean = String(url || "").trim();

    if (!clean) {
      img.src = "";
      return;
    }

    img.src = clean;
    img.onerror = function () {
      img.src = "";
    };
  }

  function ensureOnePrimary() {
    const radios = Array.from(document.querySelectorAll(".img-primary"));
    if (!radios.length) return;

    const hasChecked = radios.some(function (r) { return r.checked; });
    if (!hasChecked) {
      radios[0].checked = true;
    }
  }

  function getImagesPayload() {
    const rows = Array.from(imagesContainerEl.querySelectorAll(".image-row"));

    return rows
      .map(function (row, index) {
        const url = String(row.querySelector(".img-url").value || "").trim();
        const sortOrder = Number(row.querySelector(".img-sort").value || index);
        const isPrimary = row.querySelector(".img-primary").checked;

        return {
          url: url,
          isPrimary: isPrimary,
          sortOrder: sortOrder
        };
      })
      .filter(function (img) {
        return img.url !== "";
      });
  }

  function getPayload() {
    return {
      categoryId: Number(categorySelectEl.value || 0),
      name: String(document.getElementById("name").value || "").trim(),
      description: String(document.getElementById("description").value || "").trim(),
      price: Number(document.getElementById("price").value || 0),
      enabled: document.getElementById("enabled").checked,
      hasConfiguration: document.getElementById("hasConfiguration").checked,
      requiredSelectionUnits: parseNullableInt(document.getElementById("requiredSelectionUnits").value),
      configurationMode: Number(document.getElementById("configurationMode").value || 0),
      productChannel: Number(document.getElementById("productChannel").value || 2),
      images: getImagesPayload()
    };
  }

  function parseNullableInt(value) {
    const clean = String(value || "").trim();
    if (!clean) return null;

    const num = Number(clean);
    return Number.isNaN(num) ? null : num;
  }

  async function onSubmit(event) {
    event.preventDefault();

    clearFormMessage();

    try {
      const payload = getPayload();

      if (!payload.categoryId) {
        showFormMessage("Seleccioná una categoría.", true);
        return;
      }

      if (!payload.name) {
        showFormMessage("Ingresá un nombre.", true);
        return;
      }

      if (payload.price < 0) {
        showFormMessage("El precio no puede ser negativo.", true);
        return;
      }

      const response = await fetch(
        apiUrl(`/api/admin/${encodeURIComponent(state.companySlug)}/products`),
        {
          method: "POST",
          headers: createAuthHeaders(),
          body: JSON.stringify(payload)
        }
      );

      const text = await response.text();
      const data = tryParseJson(text);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, text));
      }

      showFormMessage("Producto guardado correctamente.", false);
      resetFormKeepDefaults();
      await loadProducts();
    } catch (error) {
      console.error(error);
      showFormMessage(error.message || "No se pudo guardar el producto.", true);
    }
  }

  async function loadProducts() {
    clearListMessage();
    productsListEl.innerHTML = "Cargando...";

    try {
      const response = await fetch(
        apiUrl(`/api/admin/${encodeURIComponent(state.companySlug)}/products`),
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": "Bearer " + state.token
          }
        }
      );

      const text = await response.text();
      const data = tryParseJson(text);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, text));
      }

      state.products = Array.isArray(data) ? data : [];
      renderProducts();
    } catch (error) {
      console.error(error);
      productsListEl.innerHTML = "";
      showListMessage(error.message || "No se pudo cargar el listado.", true);
    }
  }

  function renderProducts() {
    productsListEl.innerHTML = "";

    if (!state.products.length) {
      productsListEl.innerHTML = "<div class='muted'>No hay productos cargados.</div>";
      return;
    }

    state.products.forEach(function (product) {
      const item = document.createElement("div");
      item.className = "product-item";

      const img = document.createElement("img");
      img.src = product.imageUrl || "";
      img.alt = product.name || "Producto";
      img.onerror = function () {
        img.src = "";
      };

      const content = document.createElement("div");
      content.className = "product-item-content";

      const title = document.createElement("div");
      title.className = "product-item-title";
      title.textContent = `${product.name || "Sin nombre"} - ${formatMoney(product.price)}`;

      const meta = document.createElement("div");
      meta.className = "product-item-meta";

      meta.appendChild(createBadge(product.categoryName || "Sin categoría", "badge-neutral"));
      meta.appendChild(createBadge(resolveChannelLabel(product.productChannel), "badge-amber"));
      meta.appendChild(createBadge(product.enabled ? "Habilitado" : "Deshabilitado", product.enabled ? "badge-green" : "badge-neutral"));

      content.appendChild(title);
      content.appendChild(meta);

      item.appendChild(img);
      item.appendChild(content);

      productsListEl.appendChild(item);
    });
  }

  function resolveChannelLabel(value) {
    const number = Number(value || 0);

    if (number === 2) return "Solo productos";
    if (number === 3) return "Ambos";

    return "Menú";
  }

  function createBadge(text, className) {
    const span = document.createElement("span");
    span.className = "badge " + className;
    span.textContent = text;
    return span;
  }

  function resetFormKeepDefaults() {
    formEl.reset();
    imagesContainerEl.innerHTML = "";
    addImageRow();
    document.getElementById("productChannel").value = "2";
    document.getElementById("configurationMode").value = "0";
    document.getElementById("enabled").checked = true;
    categorySelectEl.value = "";
  }

  function formatMoney(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(number);
  }

  function tryParseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function getErrorMessage(json, raw) {
    if (json && typeof json === "object") {
      if (json.message) return json.message;
      if (json.title) return json.title;
      if (json.error) return json.error;

      if (json.errors && typeof json.errors === "object") {
        const first = Object.values(json.errors)[0];
        if (Array.isArray(first) && first.length) return String(first[0]);
      }
    }

    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }

    return "Ocurrió un error.";
  }

  function showFormMessage(message, isError) {
    formMessageEl.textContent = message;
    formMessageEl.className = "message " + (isError ? "error" : "success");
  }

  function clearFormMessage() {
    formMessageEl.textContent = "";
    formMessageEl.className = "message hidden";
  }

  function showListMessage(message, isError) {
    listMessageEl.textContent = message;
    listMessageEl.className = "message " + (isError ? "error" : "success");
  }

  function clearListMessage() {
    listMessageEl.textContent = "";
    listMessageEl.className = "message hidden";
  }

  function escapeAttr(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
})();
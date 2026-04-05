(function () {
  "use strict";

  const DEV_WHATSAPP = "5491140733436";
  const SLUG_KEY = "menuonline_companySlug_products";
  const CONFIG_PATH = "/config.json";
  const MP_PENDING_KEY = "menuonline_products_mp_pending_order";
  const MP_RETURN_HANDLED_KEY = "menuonline_products_mp_return_handled";
  const PROMO_CATEGORY_NAME = "🔥 Promociones";

function isLocalHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getProductsSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const productsIndex = parts.findIndex(x => String(x).toLowerCase() === "products");

  if (productsIndex === -1) return "";

  const nextPart = (parts[productsIndex + 1] || "").trim();
  if (!nextPart) return "";

  const lower = nextPart.toLowerCase();

  if (
    lower === "index.html" ||
    lower === "index.htm" ||
    lower === "default.html" ||
    lower === "default.htm"
  ) {
    return "";
  }

  return nextPart;
}

function getProductsSlugFromQuery() {
  const qs = new URLSearchParams(window.location.search);
  return (qs.get("companySlug") || qs.get("c") || "").trim();
}

function requireProductsSlug() {
  const pathSlug = getProductsSlugFromPath();
  if (pathSlug) return pathSlug;

  if (isLocalHost()) {
    const querySlug = getProductsSlugFromQuery();
    if (querySlug) return querySlug;
  }

  location.replace("/404.html");
  return "";
}

  let CFG = {};

  const state = {
    companySlug: "",
    companyName: "",
    companyLogoUrl: "",
    companyWhatsapp: "",
    alias: "",
    turnos: [],
    isOpen: true,
    businessType: 1,
    deliveryAddress: {
      street: "",
      number: "",
      city: "",
      postalCode: "",
      betweenStreets: "",
      validatedAddress: "",
      lat: null,
      lng: null,
      distanceKm: null,
      zone: "",
      deliveryAmount: 0,
      available: false,
      validationMessage: ""
    },
    mapReady: false,
    map: null,
    mapMarker: null,
    mapGeocodeResults: [],

    coupon: {
      visible: false,
      code: "",
      couponId: null,
      valid: false,
      message: "",
      eligibleSubtotal: 0,
      discountAmount: 0,
      finalSubtotal: 0
    },

    menuOnlyEnabled: false,
    ordersEnabled: true,
    whatsappEnabled: false,
    transferEnabled: false,
    mercadoPagoEnabled: false,
    transferSurchargeEnabled: false,
    transferSurchargePercent: 0,
    mercadoPagoSurchargeEnabled: false,
    mercadoPagoSurchargePercent: 0,

    allProducts: [],
    filteredProducts: [],
    allCategories: [],
    activeCategory: "",

    cart: {},

    modalProduct: null,
    modalQty: 1,
    modalImages: [],
    modalIndex: 0,
    modalSelectedStockKey: null,
    modalSelectedVariantValues: {}
  };

  const els = {
    companyName: document.getElementById("companyName"),
    companyLogo: document.getElementById("companyLogo"),
    companyLogoFallback: document.getElementById("companyLogoFallback"),
    statusBadge: document.getElementById("statusBadge"),
    modeBadge: document.getElementById("modeBadge"),

    searchInput: document.getElementById("searchInput"),
    productsCount: document.getElementById("productsCount"),
    categoriesCount: document.getElementById("categoriesCount"),

    heroText: document.getElementById("heroText"),
    heroWhatsappBtn: document.getElementById("heroWhatsappBtn"),
    heroWhatsappBtnMobile: document.getElementById("heroWhatsappBtnMobile"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnDevWpp: document.getElementById("btnDevWpp"),

    scheduleSection: document.getElementById("scheduleSection"),
    scheduleTodayText: document.getElementById("scheduleTodayText"),
    toggleScheduleBtn: document.getElementById("toggleScheduleBtn"),
    scheduleList: document.getElementById("scheduleList"),

    categoryTabsWrap: document.getElementById("categoryTabsWrap"),
    categoryTabs: document.getElementById("categoryTabs"),

    loadingState: document.getElementById("loadingState"),
    errorState: document.getElementById("errorState"),
    emptyState: document.getElementById("emptyState"),
    productsSectionHeader: document.getElementById("productsSectionHeader"),
    productsSectionTitle: document.getElementById("productsSectionTitle"),
    productsSectionCount: document.getElementById("productsSectionCount"),
    productsContainer: document.getElementById("productsContainer"),

    cartBar: document.getElementById("cartBar"),
    cartBarAmount: document.getElementById("cartBarAmount"),
    cartBarItems: document.getElementById("cartBarItems"),
    openCartBtn: document.getElementById("openCartBtn"),

    summaryDeliveryRow: document.getElementById("summaryDeliveryRow"),
summaryDeliveryLabel: document.getElementById("summaryDeliveryLabel"),
summaryDelivery: document.getElementById("summaryDelivery"),

    productModal: document.getElementById("productModal"),
    modalCloseBtn: document.getElementById("modalCloseBtn"),
    galleryTrack: document.getElementById("galleryTrack"),
    galleryThumbs: document.getElementById("galleryThumbs"),
    galleryPrevBtn: document.getElementById("galleryPrevBtn"),
    galleryNextBtn: document.getElementById("galleryNextBtn"),
    modalCategory: document.getElementById("modalCategory"),
    modalTitle: document.getElementById("modalTitle"),
    modalPriceOld: document.getElementById("modalPriceOld"),
    modalPrice: document.getElementById("modalPrice"),
    modalBadges: document.getElementById("modalBadges"),
    modalDescription: document.getElementById("modalDescription"),
    modalConfigWrap: document.getElementById("modalConfigWrap"),
    modalConfigOptions: document.getElementById("modalConfigOptions"),
    modalStockWrap: document.getElementById("modalStockWrap"),
    modalStockOptions: document.getElementById("modalStockOptions"),
    modalStockHint: document.getElementById("modalStockHint"),
    modalQtyWrap: document.getElementById("modalQtyWrap"),
    modalQtyMinus: document.getElementById("modalQtyMinus"),
    modalQtyPlus: document.getElementById("modalQtyPlus"),
    modalQtyValue: document.getElementById("modalQtyValue"),
    modalAddCartBtn: document.getElementById("modalAddCartBtn"),
    modalWhatsappBtn: document.getElementById("modalWhatsappBtn"),

    couponBox: document.getElementById("couponBox"),
    couponCodeInput: document.getElementById("couponCodeInput"),
    applyCouponBtn: document.getElementById("applyCouponBtn"),
    removeCouponBtn: document.getElementById("removeCouponBtn"),
    couponMessage: document.getElementById("couponMessage"),
    couponAppliedBadge: document.getElementById("couponAppliedBadge"),
    summaryDiscountRow: document.getElementById("summaryDiscountRow"),
    summaryDiscount: document.getElementById("summaryDiscount"),

    checkoutModal: document.getElementById("checkoutModal"),
    checkoutCloseBtn: document.getElementById("checkoutCloseBtn"),
    cartEmptyState: document.getElementById("cartEmptyState"),
    cartItemsList: document.getElementById("cartItemsList"),
    customerName: document.getElementById("customerName"),
    customerWhatsapp: document.getElementById("customerWhatsapp"),
    customerAddress: document.getElementById("customerAddress"),
    deliveryType: document.getElementById("deliveryType"),

deliveryStreet: document.getElementById("deliveryStreet"),
deliveryNumber: document.getElementById("deliveryNumber"),
deliveryCity: document.getElementById("deliveryCity"),
deliveryPostalCode: document.getElementById("deliveryPostalCode"),
deliveryBetweenStreets: document.getElementById("deliveryBetweenStreets"),
verifyAddressBtn: document.getElementById("verifyAddressBtn"),
addressVerifiedBox: document.getElementById("addressVerifiedBox"),
addressVerifiedText: document.getElementById("addressVerifiedText"),
deliveryLat: document.getElementById("deliveryLat"),
deliveryLng: document.getElementById("deliveryLng"),

addressMapModal: document.getElementById("addressMapModal"),
mapCloseBtn: document.getElementById("mapCloseBtn"),
addressMap: document.getElementById("addressMap"),
mapSelectedAddressText: document.getElementById("mapSelectedAddressText"),
confirmMapAddressBtn: document.getElementById("confirmMapAddressBtn"),
retryMapSearchBtn: document.getElementById("retryMapSearchBtn"),

    paymentMethod: document.getElementById("paymentMethod"),
    aliasCard: document.getElementById("aliasCard"),
    aliasText: document.getElementById("aliasText"),
    copyAliasBtn: document.getElementById("copyAliasBtn"),
    summarySubtotal: document.getElementById("summarySubtotal"),
    summaryAdjustmentRow: document.getElementById("summaryAdjustmentRow"),
    summaryAdjustmentLabel: document.getElementById("summaryAdjustmentLabel"),
    summaryAdjustment: document.getElementById("summaryAdjustment"),
    summaryTotal: document.getElementById("summaryTotal"),
    confirmCheckoutBtn: document.getElementById("confirmCheckoutBtn"),

    appMessageModal: document.getElementById("appMessageModal"),
    appMessageBar: document.getElementById("appMessageBar"),
    appMessageIcon: document.getElementById("appMessageIcon"),
    appMessageTitle: document.getElementById("appMessageTitle"),
    appMessageText: document.getElementById("appMessageText"),
    appMessageBtn: document.getElementById("appMessageBtn")
  };

  function apiUrl(path) {
    const base = String(CFG.apiBaseUrl || "").replace(/\/+$/, "");
    return base + (String(path).startsWith("/") ? path : "/" + path);
  }

  function buildPublicApiPath(path, companySlug) {
    const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;
    return `/api/public/${encodeURIComponent(companySlug)}${cleanPath}`;
  }

  function buildProductsOrderPath(companySlug) {
    return `/api/public/${encodeURIComponent(companySlug)}/products/orders`;
  }

  function imgUrl(path) {
    const s = String(path || "").trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;

    if (s.includes("localhost:5600")) {
      try {
        const u = new URL(s);
        return apiUrl(u.pathname);
      } catch {}
    }

    return apiUrl(s.startsWith("/") ? s : "/" + s);
  }

  function toBool(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return !!value;
  }

  function sanitizePhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function formatMoneyShort(value) {
    return Number(value || 0).toLocaleString("es-AR");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function placeholderSvgDataUrl() {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stop-color="#f1f5f9"/>
            <stop offset="1" stop-color="#e2e8f0"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <circle cx="200" cy="160" r="54" fill="#cbd5e1"/>
        <rect x="110" y="240" width="180" height="24" rx="12" fill="#cbd5e1"/>
        <rect x="140" y="280" width="120" height="18" rx="9" fill="#e2e8f0"/>
      </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  async function loadConfig() {
    const res = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error("No pude leer config.json");
    CFG = await res.json();
    if (!CFG.apiBaseUrl) throw new Error("config.json sin apiBaseUrl");
  }

  function getSlugFromProductsPath() {
    const path = String(window.location.pathname || "").trim();
    const segments = path.split("/").filter(Boolean);

    if (!segments.length) return "";

    const normalized = segments.map(function (s) {
      return decodeURIComponent(String(s || "").trim());
    });

    const productsIndex = normalized.findIndex(function (s) {
      return s.toLowerCase() === "products";
    });

    if (productsIndex === -1) return "";

    const nextSegment = normalized[productsIndex + 1] || "";
    if (!nextSegment) return "";
    if (nextSegment.toLowerCase() === "index.html") return "";

    return nextSegment.trim();
  }

  function getCompanySlug() {
    const fromPath = getSlugFromProductsPath();
    if (fromPath && fromPath.toLowerCase() !== "index.html") {
      localStorage.setItem(SLUG_KEY, fromPath);
      return fromPath;
    }

    const qs = new URLSearchParams(window.location.search);
    const fromQuery = (qs.get("companySlug") || qs.get("c") || qs.get("slug") || "").trim();
    if (fromQuery && fromQuery.toLowerCase() !== "index.html") {
      localStorage.setItem(SLUG_KEY, fromQuery);
      return fromQuery;
    }

    const saved = (localStorage.getItem(SLUG_KEY) || "").trim();
    if (saved && saved.toLowerCase() !== "index.html") {
      return saved;
    }

    return "";
  }

  async function loadProducts(companySlug) {
    const response = await fetch(apiUrl(buildPublicApiPath("/products", companySlug)), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (response.status === 404) {
      throw new Error(`La empresa "${companySlug}" no existe.`);
    }

    if (!response.ok) {
      let msg = "No se pudo cargar el catálogo.";
      try {
        const text = await response.text();
        if (text) msg = text;
      } catch {}
      throw new Error(msg);
    }

    return await response.json();
  }

  function normalizeVariantGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) return [];

    return rawGroups
      .map(function (group) {
        return {
          optionId: Number(group.optionId ?? group.menuItemOptionId ?? group.id ?? 0),
          optionName: String(group.optionName ?? group.menuItemOptionName ?? group.name ?? "").trim(),
          variants: Array.isArray(group.variants)
            ? group.variants
                .map(function (variant) {
                  return {
                    variantId: Number(variant.variantId ?? variant.menuItemOptionVariantId ?? variant.id ?? 0),
                    variantName: String(variant.variantName ?? variant.name ?? "").trim()
                  };
                })
                .filter(function (variant) {
                  return variant.variantId > 0 && variant.variantName;
                })
            : []
        };
      })
      .filter(function (group) {
        return group.optionId > 0 && group.optionName;
      });
  }

  function normalizeVariantCombinations(rawCombinations) {
  if (!Array.isArray(rawCombinations)) return [];

  return rawCombinations.map(function (row, index) {
    const values = Array.isArray(row.values)
      ? row.values
          .map(function (value) {
            const rawVariantId =
              value.menuItemOptionVariantId ??
              value.variantId ??
              null;

            return {
              menuItemOptionId: Number(value.menuItemOptionId ?? value.optionId ?? 0),
              menuItemOptionVariantId:
                rawVariantId === null || rawVariantId === undefined || rawVariantId === ""
                  ? null
                  : Number(rawVariantId)
            };
          })
          .filter(function (value) {
            return value.menuItemOptionId > 0;
          })
      : [];

    return {
      id: Number(row.id ?? index + 1),
      enabled: row.enabled !== false,
      hasStock: row.hasStock !== false,
      stockCurrent:
        row.stockCurrent === null || row.stockCurrent === undefined
          ? null
          : Number(row.stockCurrent),
      lowStockThreshold:
        row.lowStockThreshold === null || row.lowStockThreshold === undefined
          ? null
          : Number(row.lowStockThreshold),
      values,
      imageUrl: row.imageUrl || row.ImageUrl || "",
      imageId: Number(row.imageId ?? row.ImageId ?? 0),
      imageIndex:
        row.imageIndex === null || row.imageIndex === undefined
          ? null
          : Number(row.imageIndex)
    };
  });
}

function getVariantSelectionSignature(values) {
  return (Array.isArray(values) ? values : [])
    .slice()
    .sort(function (a, b) {
      if (Number(a.menuItemOptionId) !== Number(b.menuItemOptionId)) {
        return Number(a.menuItemOptionId) - Number(b.menuItemOptionId);
      }

      const aVar = a.menuItemOptionVariantId == null ? -1 : Number(a.menuItemOptionVariantId);
      const bVar = b.menuItemOptionVariantId == null ? -1 : Number(b.menuItemOptionVariantId);
      return aVar - bVar;
    })
    .map(function (value) {
      return `${Number(value.menuItemOptionId)}:${value.menuItemOptionVariantId == null ? "null" : Number(value.menuItemOptionVariantId)}`;
    })
    .join("|");
}

  function getVariantCartKey(productId, values) {
    return `variant-${productId}-${getVariantSelectionSignature(values)}`;
  }

 function getVariantSelectionLabel(values, groups) {
  const normalizedGroups = normalizeVariantGroups(groups);

  return (Array.isArray(values) ? values : [])
    .map(function (value) {
      const optionId = Number(value.menuItemOptionId ?? 0);
      const variantId =
        value.menuItemOptionVariantId == null
          ? null
          : Number(value.menuItemOptionVariantId);

      const group = normalizedGroups.find(function (item) {
        return Number(item.optionId) === optionId;
      });

      if (!group) return "";

      if (variantId == null) {
        return group.optionName || "";
      }

      const variant = group.variants?.find(function (item) {
        return Number(item.variantId) === variantId;
      });

      return variant?.variantName || group.optionName || "";
    })
    .filter(Boolean)
    .join(" · ");
}

  function getProductVariantGroups(product) {
    return normalizeVariantGroups(product.variantGroups || []);
  }

  function getProductVariantCombinations(product) {
    return normalizeVariantCombinations(product.stockCombinations || product.combinations || []);
  }

function hasVariantStockConfigured(product) {
  const mode = Number(product.stockMode || 0);

  if (mode === 2 || mode === 3) return true;

  return false;
}

  function getLocalCartQtyForVariant(productId, values) {
    const key = getVariantCartKey(productId, values);
    return Number(state.cart[key]?.qty || 0);
  }

  function getLocalCartQtyForSimple(productId) {
    const key = getSimpleCartKey(productId);
    return Number(state.cart[key]?.qty || 0);
  }

  function getRemainingVariantStock(product, combination) {
    if (!combination || combination.hasStock === false) return null;
    const raw = combination.stockCurrent;
    if (raw === null || raw === undefined) return null;
    return Math.max(0, Number(raw) - getLocalCartQtyForVariant(product.id, combination.values || []));
  }

  function getRemainingSimpleStock(product) {
    if (product.hasStock !== true) return null;
    return Math.max(0, Number(product.stockCurrent || 0) - getLocalCartQtyForSimple(product.id));
  }

  function hasAnyVariantStockAvailable(product) {
    const combinations = getProductVariantCombinations(product).filter(function (item) {
      return item.enabled !== false;
    });

    if (!combinations.length) return true;

    return combinations.some(function (item) {
      const remaining = getRemainingVariantStock(product, item);
      return remaining === null || remaining > 0;
    });
  }

  function resolveModalImageIndexFromCombination(product, combination) {
    if (!product || !combination || !Array.isArray(product.images) || !product.images.length) return null;

    if (combination.imageIndex !== null && combination.imageIndex !== undefined && !Number.isNaN(Number(combination.imageIndex))) {
      const idx = Number(combination.imageIndex);
      if (idx >= 0 && idx < product.images.length) return idx;
    }

    if (combination.imageId > 0) {
      const foundIndex = product.images.findIndex(function (img) {
        return Number(img.id || 0) === Number(combination.imageId);
      });
      if (foundIndex >= 0) return foundIndex;
    }

    if (combination.imageUrl) {
      const normalizedTarget = normText(imgUrl(combination.imageUrl));
      const foundIndex = product.images.findIndex(function (img) {
        return normText(imgUrl(img.url || "")) === normalizedTarget;
      });
      if (foundIndex >= 0) return foundIndex;
    }

    return null;
  }

  function getProductStockSummaryLines(product) {
  const stock = resolveStockState(product);

  if (!stock.hasControl) {
    return [{ text: "Disponible", status: "success" }];
  }

  if (stock.mode === "variant") {
    const combinations = getProductVariantCombinations(product)
      .filter(function (item) {
        return item.enabled !== false;
      })
      .slice(0, 3);

    if (!combinations.length) {
      return [{
        text: Number(product.stockMode || 0) === 2 ? "Stock por subtipos" : "Stock por variantes",
        status: "neutral"
      }];
    }

    return combinations.map(function (combination) {
      const label = getVariantSelectionLabel(combination.values || [], product.variantGroups || []);
      const remaining = getRemainingVariantStock(product, combination);

      if (remaining === null) {
        return { text: `${label}`, status: "neutral" };
      }

      if (remaining <= 0) {
        return { text: `${label} · sin stock`, status: "danger" };
      }

      return {
        text: `${label} · ${remaining}`,
        status: remaining <= Number(combination.lowStockThreshold || 0) ? "warning" : "success"
      };
    });
  }

  const remaining = getRemainingSimpleStock(product);

  if (remaining === null) {
    return [{ text: "Disponible", status: "success" }];
  }

  if (remaining <= 0) {
    return [{ text: "Sin stock", status: "danger" }];
  }

  return [{ text: `Stock ${remaining}`, status: remaining <= 5 ? "warning" : "success" }];
}

  function getSummaryLineClass(status) {
    if (status === "danger") return "text-rose-600";
    if (status === "warning") return "text-amber-600";
    if (status === "success") return "text-emerald-600";
    return "text-slate-500";
  }

  function mapResponse(data) {
    const company = data.company || data.Company || data.negocio || data.Negocio || {};

    state.companyName =
      data.companyName ||
      data.CompanyName ||
      company.name ||
      company.Name ||
      company.nombre ||
      company.Nombre ||
      state.companySlug ||
      "Catálogo";

    state.companyLogoUrl =
      data.logoUrl ||
      data.LogoUrl ||
      company.logoUrl ||
      company.LogoUrl ||
      company.logo ||
      company.Logo ||
      "";

    state.companyWhatsapp =
      data.whatsapp ||
      data.Whatsapp ||
      company.whatsapp ||
      company.Whatsapp ||
      company.telefono ||
      company.Telefono ||
      "";

    state.alias =
      data.alias ||
      data.Alias ||
      company.alias ||
      company.Alias ||
      "";

    state.turnos =
      data.turnos ||
      data.Turnos ||
      company.turnos ||
      company.Turnos ||
      [];

    const rawMenuOnly = toBool(
      company.menuOnlyEnabled ??
      company.MenuOnlyEnabled ??
      company.featureMenuOnlyEnabled ??
      company.FeatureMenuOnlyEnabled ??
      data.menuOnlyEnabled ??
      data.MenuOnlyEnabled ??
      false
    );

    const rawOrdersEnabled = toBool(
      company.ordersEnabled ??
      company.OrdersEnabled ??
      company.featureOrdersEnabled ??
      company.FeatureOrdersEnabled ??
      data.ordersEnabled ??
      data.OrdersEnabled ??
      true
    );

    state.menuOnlyEnabled = rawMenuOnly;
    state.ordersEnabled = rawMenuOnly ? false : rawOrdersEnabled;

    state.transferEnabled = rawMenuOnly ? false : toBool(
      company.transferEnabled ??
      company.TransferEnabled ??
      data.transferEnabled ??
      data.TransferEnabled ??
      false
    );

    state.mercadoPagoEnabled = rawMenuOnly ? false : toBool(
      company.mercadoPagoEnabled ??
      company.MercadoPagoEnabled ??
      data.mercadoPagoEnabled ??
      data.MercadoPagoEnabled ??
      false
    );

    state.whatsappEnabled = rawMenuOnly
      ? false
      : toBool(
          company.whatsappEnabled ??
          company.WhatsappEnabled ??
          data.whatsappEnabled ??
          data.WhatsappEnabled ??
          !!sanitizePhone(state.companyWhatsapp)
        );

    state.transferSurchargeEnabled = toBool(
      company.transferSurchargeEnabled ??
      company.TransferSurchargeEnabled ??
      data.transferSurchargeEnabled ??
      data.TransferSurchargeEnabled ??
      false
    );

    state.transferSurchargePercent = Number(
      company.transferSurchargePercent ??
      company.TransferSurchargePercent ??
      data.transferSurchargePercent ??
      data.TransferSurchargePercent ??
      0
    );

    state.mercadoPagoSurchargeEnabled = toBool(
      company.mercadoPagoSurchargeEnabled ??
      company.MercadoPagoSurchargeEnabled ??
      data.mercadoPagoSurchargeEnabled ??
      data.MercadoPagoSurchargeEnabled ??
      false
    );

    state.mercadoPagoSurchargePercent = Number(
      company.mercadoPagoSurchargePercent ??
      company.MercadoPagoSurchargePercent ??
      data.mercadoPagoSurchargePercent ??
      data.MercadoPagoSurchargePercent ??
      0
    );

    state.businessType = Number(
  company.businessType ??
  company.BusinessType ??
  data.businessType ??
  data.BusinessType ??
  1
);

state.coupon.visible = state.businessType === 2;

    const rawProducts = data.products || data.Products || data.items || data.Items || [];

    state.allProducts = Array.isArray(rawProducts)
      ? rawProducts.map(normalizeProduct).filter(function (p) {
          return p.enabled !== false;
        })
      : [];

state.allCategories = buildCategoriesFromProducts(state.allProducts);
state.activeCategory = state.allCategories[0] || "";
state.filteredProducts = state.allProducts.slice();

    state.isOpen = validateScheduleOpen(state.turnos);
  }

 function normalizeProduct(product) {
  const imagesRaw = Array.isArray(product.images || product.Images)
    ? (product.images || product.Images)
    : [];

  const normalizedImages = imagesRaw
    .map(function (img, index) {
      return {
        id: img.id || img.Id || index + 1,
        url: img.url || img.Url || img.imageUrl || img.ImageUrl || "",
        isPrimary: toBool(img.isPrimary ?? img.IsPrimary),
        sortOrder: Number(img.sortOrder ?? img.SortOrder ?? img.order ?? img.Order ?? index)
      };
    })
    .filter(function (img) {
      return String(img.url || "").trim() !== "";
    })
      .sort(function (a, b) {

        const ao = Number(a.sortOrder ?? 9999);
        const bo = Number(b.sortOrder ?? 9999);

        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;

        return ao - bo;
      });

  const fallbackImage = product.imageUrl || product.ImageUrl || "";
  if (!normalizedImages.length && fallbackImage) {
    normalizedImages.push({
      id: 0,
      url: fallbackImage,
      isPrimary: true,
      sortOrder: 0
    });
  }

  const price = Number(product.price || product.Price || 0);
  const finalPrice = Number(product.finalPrice || product.FinalPrice || 0);
  const discountAmount = Number(product.discountAmount || product.DiscountAmount || 0);
  const discountPercentage = Number(product.discountPercentage || product.DiscountPercentage || 0);
  const hasPromotion = toBool(product.hasPromotion ?? product.HasPromotion ?? false);

  const rawStockCurrent = product.stockCurrent ?? product.StockCurrent ?? null;
  const stockMode = Number(product.stockMode ?? product.StockMode ?? 0);

  const rawVariantGroups =
    product.variantGroups ||
    product.VariantGroups ||
    product.stockVariantGroups ||
    product.StockVariantGroups ||
    [];

  const rawVariantCombinations =
    product.combinations ||
    product.Combinations ||
    product.stockCombinations ||
    product.StockCombinations ||
    [];

  const normalizedVariantGroups = normalizeVariantGroups(rawVariantGroups);

  const fallbackGroupsFromOptions =
    Array.isArray(product.options || product.Options)
      ? (product.options || product.Options).map(function (option) {
          return {
            optionId: Number(option.id || option.Id || 0),
            optionName: String(option.name || option.Name || "").trim(),
            variants: Array.isArray(option.variants || option.Variants)
              ? (option.variants || option.Variants).map(function (variant) {
                  return {
                    variantId: Number(variant.id || variant.Id || 0),
                    variantName: String(variant.name || variant.Name || "").trim()
                  };
                })
              : []
          };
        })
      : [];

  const effectiveVariantGroups =
    normalizedVariantGroups.length
      ? normalizedVariantGroups
      : normalizeVariantGroups(fallbackGroupsFromOptions);

  return {
    id: product.id || product.Id || 0,
    name: product.name || product.Name || "Producto",
    description: product.description || product.Description || "",
    categoryName: product.categoryName || product.CategoryName || "Sin categoría",
    price,
    finalPrice: finalPrice > 0 ? finalPrice : price,
    hasPromotion: hasPromotion && finalPrice > 0 && finalPrice < price,
    discountAmount,
    discountPercentage,
    promotionTitle: String(product.promotionTitle || product.PromotionTitle || "").trim(),
    promotionBadgeText: String(product.promotionBadgeText || product.PromotionBadgeText || "").trim(),
    enabled: toBool(product.enabled ?? product.Enabled ?? true),
    hasStock:
      typeof (product.hasStock ?? product.HasStock) === "boolean"
        ? toBool(product.hasStock ?? product.HasStock)
        : null,
    stockCurrent:
      rawStockCurrent === null || rawStockCurrent === undefined
        ? null
        : Number(rawStockCurrent),
    images: normalizedImages,
    hasConfiguration: toBool(product.hasConfiguration ?? product.HasConfiguration ?? false),
    stockMode,
    hasVariantStock: toBool(product.hasVariantStock ?? product.HasVariantStock ?? (stockMode === 2 || stockMode === 3)),
    variantGroups: effectiveVariantGroups,
    stockCombinations: normalizeVariantCombinations(rawVariantCombinations),
    categoryId: Number(product.categoryId || product.CategoryId || 0),
  };
}

function buildCategoriesFromProducts(products) {
  const set = new Set();

  products.forEach(function (product) {
    const name = String(product.categoryName || "").trim() || "Sin categoría";
    set.add(name);
  });

  const ordered = Array.from(set);
  const hasPromos = products.some(function (p) {
    return !!p.hasPromotion;
  });

  return hasPromos ? [PROMO_CATEGORY_NAME, ...ordered] : ordered;
}

  function parseShiftLabel(shift, dayMap) {
    const d = shift.dia ?? shift.Dia ?? shift.dayOfWeek ?? shift.DayOfWeek;
    if (d !== null && d !== undefined && d !== "") {
      const n = Number(d);
      if (!Number.isNaN(n) && n >= 0 && n <= 6) return dayMap[n];
    }

    const raw = String(shift.day ?? shift.Day ?? shift.days ?? shift.Days ?? "").trim();
    if (!raw) return "";
    if (raw.toLowerCase() === "todos") return "Lunes a Domingo";
    return raw;
  }

  function parseShiftHours(shift) {
    const a = shift.abre ?? shift.Abre ?? shift.from ?? shift.From ?? shift.open ?? shift.Open;
    const c = shift.cierra ?? shift.Cierra ?? shift.to ?? shift.To ?? shift.close ?? shift.Close;

    const fmt = function (v) {
      if (v === null || v === undefined) return "";
      if (typeof v === "number" && !Number.isNaN(v)) return String(v).padStart(2, "0") + ":00";
      return String(v).trim();
    };

    return { abre: fmt(a), cierra: fmt(c) };
  }

function dayLabelMatchesToday(label, dayIndex) {
  const normalize = function (value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const normalized = normalize(label);

  const days = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado"
  ];

  const today = days[dayIndex];
  if (!normalized) return false;

  if (normalized === "todos") return true;
  if (normalized.includes("lunes a domingo")) return true;
  if (normalized.includes("lunes a viernes")) return dayIndex >= 1 && dayIndex <= 5;
  if (normalized.includes("lunes a sabado")) return dayIndex >= 1 && dayIndex <= 6;

  if (normalized.includes(today)) return true;

  if (normalized.includes(",")) {
    return normalized.split(",").map(function (x) { return x.trim(); }).includes(today);
  }

  if (normalized.includes("-")) {
    const compact = normalized.replace(/\s+/g, "");
    if (compact === "lun-vie") return dayIndex >= 1 && dayIndex <= 5;
    if (compact === "lun-sab") return dayIndex >= 1 && dayIndex <= 6;
    if (compact === "lun-dom") return true;
  }

  return normalized === today;
}

  function hourTextToMinutes(text) {
    const value = String(text || "").trim();
    if (!value.includes(":")) return 0;
    const parts = value.split(":");
    return (Number(parts[0] || 0) * 60) + Number(parts[1] || 0);
  }

  function validateScheduleOpen(turnos) {
  const list = Array.isArray(turnos) ? turnos : [];
  if (!list.length) return true;

  const dayMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const now = new Date();
  const todayIndex = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const rows = [];
  list.forEach(function (shift) {
    const label = parseShiftLabel(shift, dayMap);
    const hours = parseShiftHours(shift);
    if (!label || !hours.abre || !hours.cierra) return;
    rows.push({ day: label, hours: `${hours.abre} - ${hours.cierra}` });
  });

  if (!rows.length) return true;

  const todayRows = rows.filter(function (row) {
    return dayLabelMatchesToday(row.day, todayIndex);
  });

  if (!todayRows.length) return false;

  return todayRows.some(function (row) {
    const parts = row.hours.split(" - ");
    const openMinutes = hourTextToMinutes(parts[0]);
    const closeMinutes = hourTextToMinutes(parts[1]);

    if (closeMinutes > openMinutes) {
      return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    }

    return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  });
}

  function buildScheduleRows() {
    const dayMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const rows = [];

    (Array.isArray(state.turnos) ? state.turnos : []).forEach(function (shift) {
      const label = parseShiftLabel(shift, dayMap);
      const hours = parseShiftHours(shift);
      if (!label || !hours.abre || !hours.cierra) return;

      rows.push({
        day: label,
        hours: `${hours.abre} - ${hours.cierra}`
      });
    });

    return rows;
  }

  function renderSchedule() {
    const rows = buildScheduleRows();

    if (!els.scheduleTodayText || !els.scheduleList || !els.toggleScheduleBtn) return;

    if (!rows.length) {
      els.scheduleTodayText.textContent = "Sin horarios";
      els.toggleScheduleBtn.classList.add("hidden");
      els.scheduleList.classList.add("hidden");
      els.scheduleList.innerHTML = "";
      return;
    }

    const todayIndex = new Date().getDay();
    const todayRows = rows.filter(function (row) {
      return dayLabelMatchesToday(row.day, todayIndex);
    });

    els.scheduleTodayText.textContent = todayRows.length
      ? todayRows.map(function (r) { return r.hours; }).join(" · ")
      : "Hoy cerrado";

    els.toggleScheduleBtn.classList.remove("hidden");

    els.scheduleList.innerHTML = rows.map(function (row) {
      return `
        <div class="px-4 py-3 flex items-center justify-between gap-3 text-sm">
          <span class="font-extrabold text-slate-900">${escapeHtml(row.day)}</span>
          <span class="font-semibold text-slate-500">${escapeHtml(row.hours)}</span>
        </div>
      `;
    }).join("");
  }

  function renderHeader() {
    document.title = state.companyName ? `${state.companyName} · Catálogo` : "Catálogo";

    if (els.companyName) {
      els.companyName.textContent = state.companyName || "Empresa";
    }

    const logo = imgUrl(state.companyLogoUrl);
    if (els.companyLogo && els.companyLogoFallback) {
      if (logo) {
        els.companyLogo.src = logo;
        els.companyLogo.classList.remove("hidden");
        els.companyLogoFallback.classList.add("hidden");
      } else {
        els.companyLogo.classList.add("hidden");
        els.companyLogoFallback.classList.remove("hidden");
      }
    }

    const visualOnly = state.menuOnlyEnabled || !state.ordersEnabled;

if (els.modeBadge) {

  const isMobile = window.innerWidth <= 640;

  els.modeBadge.className = "catalog-pill";

  if (visualOnly) {
    els.modeBadge.classList.add("bg-slate-100","text-slate-700","border","border-slate-200");
    els.modeBadge.textContent = isMobile
      ? "Catálogo Digital"
      : "Catálogo Digital";
  } else {
    els.modeBadge.classList.add("bg-amber-100","text-amber-700","border","border-amber-200");
    els.modeBadge.textContent = isMobile
      ? "Catálogo y Pedido Digital"
      : "Catálogo y Pedido Digital";
  }

  els.modeBadge.classList.remove("hidden");
}

    if (els.statusBadge) {
      els.statusBadge.className = "catalog-pill";
      if (state.isOpen) {
        els.statusBadge.classList.add("bg-emerald-100", "text-emerald-700", "border", "border-emerald-200");
        els.statusBadge.textContent = "abierto";
      } else {
        els.statusBadge.classList.add("bg-rose-100", "text-rose-700", "border", "border-rose-200");
        els.statusBadge.textContent = "cerrado";
      }
      els.statusBadge.classList.remove("hidden");
    }

    if (els.productsCount) {
      els.productsCount.textContent = String(state.allProducts.length);
    }

    if (els.categoriesCount) {
      els.categoriesCount.textContent = String(state.allCategories.length);
    }

    if (els.heroText) {
      els.heroText.textContent = visualOnly
        ? "Descubrí productos, revisá imágenes y consultá directamente al negocio."
        : "Descubrí productos, mirá fotos y agregalos al pedido en segundos.";
    }

    const showWhatsapp = !visualOnly && state.whatsappEnabled && !!sanitizePhone(state.companyWhatsapp);

    if (els.heroWhatsappBtn) {
      els.heroWhatsappBtn.classList.toggle("hidden", !showWhatsapp);
    }

    if (els.heroWhatsappBtnMobile) {
      els.heroWhatsappBtnMobile.classList.toggle("hidden", !showWhatsapp);
      els.heroWhatsappBtnMobile.classList.toggle("flex", showWhatsapp);
    }

    updateDeliveryModeUi();

    if (els.couponBox) {
  els.couponBox.classList.toggle("hidden", !state.coupon.visible);
}
  }

  function renderCategoryTabs() {
    if (!els.categoryTabs || !els.categoryTabsWrap) return;

    els.categoryTabs.innerHTML = "";

    if (!state.allCategories.length) {
      els.categoryTabsWrap.classList.add("hidden");
      return;
    }

    els.categoryTabsWrap.classList.remove("hidden");

    state.allCategories.forEach(function (category) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-pill" + (state.activeCategory === category ? " active" : "");
      btn.textContent = category;

      btn.addEventListener("click", function () {
        state.activeCategory = category;
        applyFilters(normText(els.searchInput?.value || ""));
        renderCategoryTabs();
      });

      els.categoryTabs.appendChild(btn);
    });
  }

function applyFilters(query) {
  let products = state.allProducts.slice();

  if (state.activeCategory === PROMO_CATEGORY_NAME) {
    products = products.filter(function (product) {
      return !!product.hasPromotion;
    });
  } else if (state.activeCategory) {
    products = products.filter(function (product) {
      return String(product.categoryName || "").trim() === state.activeCategory;
    });
  }

  if (query) {
    products = products.filter(function (product) {
      return (
        normText(product.name).includes(query) ||
        normText(product.description).includes(query) ||
        normText(product.categoryName).includes(query)
      );
    });
  }

  state.filteredProducts = products;
  renderProducts();
}

  function onSearchInput(event) {
    applyFilters(normText(event.target.value || ""));
  }

  function getEffectivePrice(product) {
    return Number(product.hasPromotion ? product.finalPrice : product.price) || 0;
  }

  function getPrimaryImageUrl(product) {
    if (!product || !Array.isArray(product.images) || !product.images.length) return "";
    const primary = product.images.find(function (img) { return img.isPrimary === true; });
    return primary ? primary.url || "" : product.images[0].url || "";
  }

  function getSimpleCartKey(productId) {
    return `simple-${productId}`;
  }

  function getProductCartQty(productId) {
    const simpleQty = getLocalCartQtyForSimple(productId);

    const variantQty = Object.values(state.cart).reduce(function (acc, line) {
      return acc + (Number(line.id) === Number(productId) && line.stockCombinationKey ? Number(line.qty || 0) : 0);
    }, 0);

    return Number(simpleQty || 0) + Number(variantQty || 0);
  }

  function addSimpleProduct(productId, qtyDelta) {
    if (state.menuOnlyEnabled || !state.ordersEnabled) return;

    const product = state.allProducts.find(function (p) {
      return Number(p.id) === Number(productId);
    });
    if (!product) return;

    if (hasVariantStockConfigured(product)) {
      openProductModal(product);
      return;
    }

    const remaining = getRemainingSimpleStock(product);
    if (qtyDelta > 0 && remaining !== null && remaining <= 0) {
      showAppMessage("Sin stock", "Este producto no tiene stock disponible.", "error");
      return;
    }

    const key = getSimpleCartKey(product.id);
    const unitPrice = getEffectivePrice(product);

    if (!state.cart[key]) {
      state.cart[key] = {
        key,
        id: product.id,
        name: product.name,
        categoryName: product.categoryName,
        qty: 0,
        unitPrice,
        price: unitPrice,
        selections: [],
        stockCombinationKey: null,
        stockLabel: ""
      };
    }

    if (qtyDelta > 0 && remaining !== null && state.cart[key].qty >= Number(product.stockCurrent || 0)) {
      showAppMessage("Sin stock", "No hay más stock disponible para este producto.", "error");
      return;
    }

    state.cart[key].qty += qtyDelta;

    if (state.cart[key].qty <= 0) {
      delete state.cart[key];
    }

    if (state.coupon.valid) {
  resetCouponState();
  updateCouponUi();
}

    updateCartBar();
    renderProducts();
    renderCheckoutItems();
    updateCheckoutSummary();

    if (state.modalProduct && Number(state.modalProduct.id) === Number(product.id)) {
      renderModalStockOptions();
    }
  }

  function addVariantProduct(product, combination, qtyDelta) {
  if (state.menuOnlyEnabled || !state.ordersEnabled) return;
  if (!product || !combination) return;

  const remaining = getRemainingVariantStock(product, combination);

  if (qtyDelta > 0 && remaining !== null && remaining <= 0) {
    showAppMessage("Sin stock", "Esa combinación no tiene stock disponible.", "error");
    return;
  }

  const key = getVariantCartKey(product.id, combination.values || []);
  const unitPrice = getEffectivePrice(product);
  const stockLabel = getVariantSelectionLabel(combination.values || [], product.variantGroups || []);

  if (!state.cart[key]) {
    state.cart[key] = {
      key,
      id: product.id,
      name: product.name,
      categoryName: product.categoryName,
      qty: 0,
      unitPrice,
      price: unitPrice,
      selections: (combination.values || []).map(function (value) {
        return {
          menuItemOptionId: Number(value.menuItemOptionId),
          menuItemOptionVariantId:
            value.menuItemOptionVariantId == null
              ? null
              : Number(value.menuItemOptionVariantId),
          quantity: 1
        };
      }),
      stockCombinationKey: key,
      stockLabel
    };
  }

  if (qtyDelta > 0 && remaining !== null && state.cart[key].qty >= Number(combination.stockCurrent || 0)) {
    showAppMessage("Sin stock", "No hay más stock disponible para esa combinación.", "error");
    return;
  }

  state.cart[key].qty += qtyDelta;

  if (state.cart[key].qty <= 0) {
    delete state.cart[key];
  }

  if (state.coupon.valid) {
    resetCouponState();
    updateCouponUi();
  }

  updateCartBar();
  renderProducts();
  renderCheckoutItems();
  updateCheckoutSummary();
  renderModalStockOptions();
}

function getStockBadgeHtml(product) {
  const stock = resolveStockState(product);

  if (!stock.hasControl) {
    return `<span class="card-stock-badge success">Disponible</span>`;
  }

  if (stock.mode === "variant") {
    return stock.available
      ? `<span class="card-stock-badge success">Con stock</span>`
      : `<span class="card-stock-badge danger">Sin stock</span>`;
  }

  const current = getRemainingSimpleStock(product);

  if (current !== null && current <= 0) {
    return `<span class="card-stock-badge danger">Sin stock</span>`;
  }

  if (current !== null && current <= 5) {
    return `<span class="card-stock-badge warning">Stock ${current}</span>`;
  }

  return `<span class="card-stock-badge success">Con stock</span>`;
}

 function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "catalog-card";

  const image = getPrimaryImageUrl(product);
  const price = getEffectivePrice(product);
  const qty = getProductCartQty(product.id);
  const visualOnly = state.menuOnlyEnabled || !state.ordersEnabled;
  const stock = resolveStockState(product);
  const noStock = !stock.available;
  const ph = placeholderSvgDataUrl();

  const hasPromotion =
    !!product.hasPromotion &&
    Number(product.finalPrice || 0) > 0 &&
    Number(product.finalPrice || 0) < Number(product.price || 0);

  const effectivePrice = hasPromotion
    ? Number(product.finalPrice || 0)
    : Number(product.price || 0);

  const discountAmount = Number(product.discountAmount || 0);
  const discountPercentage = Number(product.discountPercentage || 0);
  const badgeText = String(product.promotionBadgeText || "").trim();
  const promotionTitle = String(product.promotionTitle || "").trim();

  const promoDetailBadges = hasPromotion
    ? `
      <div class="mt-2 flex flex-wrap gap-2">
        <span class="promo-pill">
          <i class="fa-solid fa-bolt text-[9px]"></i>
          ${escapeHtml(badgeText || (discountPercentage > 0 ? `${Math.round(discountPercentage)}% OFF` : "PROMO"))}
        </span>

        ${
          promotionTitle
            ? `
              <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 bg-slate-100 border border-slate-200">
                ${escapeHtml(promotionTitle)}
              </span>
            `
            : ``
        }

        ${
          state.activeCategory === PROMO_CATEGORY_NAME && product.categoryName
            ? `
              <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 bg-slate-100 border border-slate-200">
                ${escapeHtml(product.categoryName)}
              </span>
            `
            : ``
        }
      </div>
    `
    : `
      ${
        state.activeCategory === PROMO_CATEGORY_NAME && product.categoryName
          ? `
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 bg-slate-100 border border-slate-200">
                ${escapeHtml(product.categoryName)}
              </span>
            </div>
          `
          : ``
      }
    `;

  const priceHtml = hasPromotion
    ? `
      <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Promo</div>
      <div class="promo-price-old">${formatCurrency(product.price)}</div>
      <div class="text-[1.8rem] font-black promo-price-new leading-none mt-1">${formatCurrency(effectivePrice)}</div>
      <div class="promo-saving">Ahorrás ${formatCurrency(discountAmount)}</div>
    `
    : `
      <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Precio</div>
      <div class="text-[1.8rem] font-black price-new leading-none mt-1">${formatCurrency(price)}</div>
    `;

  card.innerHTML = `
    <div class="relative aspect-[1/1] bg-slate-100 overflow-hidden">
      <img
        src="${escapeAttr(image ? imgUrl(image) : ph)}"
        alt="${escapeAttr(product.name)}"
        class="w-full h-full object-cover"
        onerror="this.src='${ph}'"
      />
    </div>

    <div class="p-5">
      <div class="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">
        ${escapeHtml(product.categoryName || "Sin categoría")}
      </div>

      <div class="mt-2 flex items-center justify-between gap-2">
        <h3 class="font-black tracking-tight text-slate-900 leading-tight">
          ${escapeHtml(product.name)}
        </h3>
        ${getStockBadgeHtml(product)}
      </div>

      ${promoDetailBadges}

      <p class="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2 min-h-[40px]">
        ${escapeHtml(product.description || "Sin descripción.")}
      </p>

      <div class="mt-4">
        ${priceHtml}
      </div>

      <div class="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow hover:-translate-y-0.5 transition-all"
          data-view-detail="${escapeAttr(product.id)}"
        >
          Ver detalle
        </button>

        ${
          visualOnly
            ? `<div class="text-xs font-extrabold text-slate-400 uppercase">Solo catálogo</div>`
            : noStock
              ? `<div class="text-xs font-extrabold text-rose-600 uppercase">Sin stock</div>`
              : `
                <div class="qty-shell inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2">
                  <button
                    type="button"
                    class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 border border-slate-200 hover:bg-slate-100 transition text-lg font-black"
                    data-minus="${escapeAttr(product.id)}"
                  >−</button>

                  <span class="font-black text-base min-w-[24px] text-center text-slate-900">${qty}</span>

                  <button
                    type="button"
                    class="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black active:scale-90 shadow-md shadow-amber-100 transition text-lg"
                    data-plus="${escapeAttr(product.id)}"
                  >+</button>
                </div>
              `
        }
      </div>
    </div>
  `;

  card.querySelector(`[data-view-detail="${CSS.escape(String(product.id))}"]`)?.addEventListener("click", function (e) {
    e.stopPropagation();
    openProductModal(product);
  });

  card.querySelector(`[data-minus="${CSS.escape(String(product.id))}"]`)?.addEventListener("click", function (e) {
    e.stopPropagation();
    addSimpleProduct(product.id, -1);
  });

  card.querySelector(`[data-plus="${CSS.escape(String(product.id))}"]`)?.addEventListener("click", function (e) {
    e.stopPropagation();
    if (hasVariantStockConfigured(product)) {
      openProductModal(product);
      return;
    }
    addSimpleProduct(product.id, 1);
  });

  card.addEventListener("click", function () {
    openProductModal(product);
  });

  return card;
}

 function renderProducts() {
  if (!els.productsContainer) return;

  if (els.loadingState) els.loadingState.classList.add("hidden");
  if (els.errorState) els.errorState.classList.add("hidden");

  els.productsContainer.innerHTML = "";

  if (!state.allProducts.length) {
    if (els.emptyState) els.emptyState.textContent = "No hay productos disponibles.";
    if (els.emptyState) els.emptyState.classList.remove("hidden");
    els.productsContainer.classList.add("hidden");
    els.productsSectionHeader.classList.add("hidden");
    return;
  }

  if (!state.filteredProducts.length) {
    if (els.emptyState) {
      els.emptyState.textContent =
        state.activeCategory === PROMO_CATEGORY_NAME
          ? "No hay promociones para mostrar."
          : "No hay productos para mostrar.";
    }

    if (els.emptyState) els.emptyState.classList.remove("hidden");
    els.productsContainer.classList.add("hidden");
    els.productsSectionHeader.classList.add("hidden");
    return;
  }

  if (els.emptyState) els.emptyState.classList.add("hidden");

  els.productsSectionHeader.classList.remove("hidden");
  els.productsContainer.classList.remove("hidden");

  if (els.productsSectionTitle) {
    els.productsSectionTitle.textContent = state.activeCategory || "Productos";
  }

  if (els.productsSectionCount) {
    const total = state.filteredProducts.length;
    els.productsSectionCount.textContent = `${total} producto${total !== 1 ? "s" : ""}`;
  }

  state.filteredProducts.forEach(function (product) {
    els.productsContainer.appendChild(createProductCard(product));
  });
}

  function renderModalGallery() {
  if (!els.galleryTrack || !els.galleryThumbs) return;

  const ph = placeholderSvgDataUrl();
  const images = state.modalImages.length ? state.modalImages : [{ url: "", id: 0 }];

  els.galleryTrack.innerHTML = images.map(function (image) {
    return `
      <div class="gallery-slide">
        <img
          src="${escapeAttr(image.url ? imgUrl(image.url) : ph)}"
          alt="${escapeAttr(state.modalProduct?.name || "Producto")}"
          onerror="this.src='${ph}'"
        />
      </div>
    `;
  }).join("");

  els.galleryTrack.style.transform = `translateX(-${state.modalIndex * 100}%)`;

  if (images.length > 1) {
    els.galleryPrevBtn?.classList.remove("hidden");
    els.galleryNextBtn?.classList.remove("hidden");
    els.galleryThumbs.classList.remove("hidden");

    els.galleryThumbs.innerHTML = `
      <div class="gallery-dots">
        ${images.map(function (_, idx) {
          return `
            <button
              type="button"
              class="gallery-dot ${idx === state.modalIndex ? "active" : ""}"
              data-dot-index="${idx}"
              aria-label="Ir a imagen ${idx + 1}">
            </button>
          `;
        }).join("")}
      </div>
    `;

    els.galleryThumbs.querySelectorAll("[data-dot-index]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.modalIndex = Number(btn.getAttribute("data-dot-index") || 0);
        renderModalGallery();
      });
    });
  } else {
    els.galleryPrevBtn?.classList.add("hidden");
    els.galleryNextBtn?.classList.add("hidden");
    els.galleryThumbs.classList.add("hidden");
    els.galleryThumbs.innerHTML = "";
  }
  bindGallerySwipe();
}

  function nextModalImage() {
    if (!state.modalImages.length) return;
    state.modalIndex = (state.modalIndex + 1) % state.modalImages.length;
    renderModalGallery();
  }

  function prevModalImage() {
    if (!state.modalImages.length) return;
    state.modalIndex = (state.modalIndex - 1 + state.modalImages.length) % state.modalImages.length;
    renderModalGallery();
  }

function updatePostalCodePlaceholder() {
  if (!els.deliveryPostalCode) return;

  if (window.innerWidth <= 767) {
    els.deliveryPostalCode.placeholder = "C.P";
  } else {
    els.deliveryPostalCode.placeholder = "Código postal";
  }
}

  let galleryTouchStartX = 0;
let galleryTouchEndX = 0;
let galleryTouchStartY = 0;
let galleryTouchEndY = 0;
let gallerySwipeBound = false;

function bindGallerySwipe() {
  if (!els.galleryTrack || gallerySwipeBound) return;
  gallerySwipeBound = true;

  els.galleryTrack.addEventListener("touchstart", function (e) {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    galleryTouchStartX = touch.clientX;
    galleryTouchStartY = touch.clientY;
  }, { passive: true });

  els.galleryTrack.addEventListener("touchend", function (e) {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    galleryTouchEndX = touch.clientX;
    galleryTouchEndY = touch.clientY;

    const diffX = galleryTouchEndX - galleryTouchStartX;
    const diffY = galleryTouchEndY - galleryTouchStartY;

    if (Math.abs(diffX) < 40) return;
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    if (diffX < 0) {
      nextModalImage();
    } else {
      prevModalImage();
    }
  }, { passive: true });
}

  function updateModalQty() {
    if (els.modalQtyValue) {
      els.modalQtyValue.textContent = String(state.modalQty);
    }
  }

  function renderModalConfig(product) {
    if (!els.modalConfigWrap || !els.modalConfigOptions) return;

    const groups = getProductVariantGroups(product);

    if (!groups.length) {
      els.modalConfigWrap.classList.add("hidden");
      els.modalConfigOptions.innerHTML = "";
      return;
    }

    if (hasVariantStockConfigured(product)) {
      els.modalConfigWrap.classList.add("hidden");
      els.modalConfigOptions.innerHTML = "";
      return;
    }

    els.modalConfigWrap.classList.remove("hidden");
    els.modalConfigOptions.innerHTML = groups.map(function (group) {
      return `<span class="badge-soft neutral">${escapeHtml(group.optionName)}</span>`;
    }).join("");
  }

 function renderModalStockOptions() {
  if (!els.modalStockWrap || !els.modalStockOptions || !state.modalProduct) return;

  const product = state.modalProduct;
  const stockMode = Number(product.stockMode || 0);
  const groups = getProductVariantGroups(product);
  const combinations = getProductVariantCombinations(product).filter(function (item) {
    return item.enabled !== false;
  });

  if (!hasVariantStockConfigured(product) || !combinations.length) {
    els.modalStockWrap.classList.add("hidden");
    els.modalStockOptions.innerHTML = "";
    return;
  }

  els.modalStockWrap.classList.remove("hidden");

  // SUBTIPOS
  if (stockMode === 2) {
    const chipsHtml = combinations.map(function (combination) {
      const key = getVariantCartKey(product.id, combination.values || []);
      const label = getVariantSelectionLabel(combination.values || [], product.variantGroups || []);
      const remaining = getRemainingVariantStock(product, combination);
      const disabled = remaining !== null && remaining <= 0;
      const selected = state.modalSelectedStockKey === key;

      return `
        <button
          type="button"
          class="stock-chip ${selected ? "active" : ""} ${disabled ? "disabled" : ""}"
          data-key="${escapeAttr(key)}">
          ${escapeHtml(label)}
        </button>
      `;
    }).join("");

    const selectedCombination = getSelectedVariantCombination();

    let stockHtml = "";
    if (selectedCombination) {
      const remaining = getRemainingVariantStock(product, selectedCombination);
      const text =
        remaining == null
          ? "Disponible"
          : remaining <= 0
            ? "Sin stock"
            : `${remaining} disponibles`;

      stockHtml = `
        <div class="stock-box">
          <span class="stock-pill">${escapeHtml(text)}</span>
        </div>
      `;
    }

    els.modalStockOptions.innerHTML = `
      <div class="stock-chip-wrap">
        ${chipsHtml}
      </div>
      ${stockHtml}
    `;

    els.modalStockOptions.querySelectorAll("[data-key]").forEach(function (btn, i) {
      const comb = combinations[i];

      btn.addEventListener("click", function () {
        const remaining = getRemainingVariantStock(product, comb);
        if (remaining !== null && remaining <= 0) return;

        state.modalSelectedStockKey = btn.dataset.key;
        state.modalSelectedVariantValues = {};
        state.modalQty = 1;

        updateModalQty();
        renderModalStockOptions();
        updateModalButtons();
      });
    });

    return;
  }

  if (combinations.length === 1) {

  state.modalSelectedVariantValues = {};

  (combinations[0].values || []).forEach(v=>{
    state.modalSelectedVariantValues[v.menuItemOptionId] = v.menuItemOptionVariantId;
  });

}

  // VARIANTES
  if (stockMode === 3) {
    const isCombinationMode = true;

    const groupHtml = groups.map(function (group, groupIndex) {
    const selectedVariantId = Number(state.modalSelectedVariantValues?.[group.optionId] || 0);
    const selectedMap = state.modalSelectedVariantValues || {};
    const previousGroupsSelectionMap = getPreviousGroupsSelectionMap(groups, groupIndex, selectedMap);

      const variantButtons = (group.variants || []).map(function (variant) {
      const optionId = Number(group.optionId);
      const variantId = Number(variant.variantId);
      const isSelected = selectedVariantId === variantId;

    const isAvailable = !isCombinationMode
      ? true
      : (
          groupIndex === 0
            ? isVariantUsedInAnyCombination(product, optionId, variantId)
            : isVariantAvailableForSelection(product, optionId, variantId, previousGroupsSelectionMap)
        );

      return `
        <button
          type="button"
          class="stock-chip ${isSelected ? "active" : ""} ${!isAvailable ? "disabled" : ""}"
          data-option-id="${optionId}"
          data-variant-id="${variantId}"
          ${isAvailable ? "" : "disabled"}>
          ${escapeHtml(variant.variantName)}
        </button>
      `;
    }).join("");

      return `
        <div class="mb-4">
          <div class="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold mb-2">
            ${escapeHtml(group.optionName)}
          </div>
          <div class="stock-chip-wrap">
            ${variantButtons}
          </div>
        </div>
      `;
    }).join("");

    const selectedCombination = getSelectedVariantCombination();

    let stockHtml = `
      <div class="text-xs text-slate-500 mt-2">
        Seleccioná una variante por grupo.
      </div>
    `;

    if (selectedCombination) {
      const remaining = getRemainingVariantStock(product, selectedCombination);
      const text =
        remaining == null
          ? "Disponible"
          : remaining <= 0
            ? "Sin stock"
            : `${remaining} disponibles`;

      stockHtml = `
        <div class="stock-box">
          <span class="stock-pill">${escapeHtml(text)}</span>
        </div>
      `;
    }

    els.modalStockOptions.innerHTML = `
      ${groupHtml}
      ${stockHtml}
    `;

els.modalStockOptions.querySelectorAll("[data-option-id][data-variant-id]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    if (btn.disabled) return;

    const optionId = Number(btn.getAttribute("data-option-id") || 0);
    const variantId = Number(btn.getAttribute("data-variant-id") || 0);

    if (!optionId || !variantId) return;

    const changedGroupIndex = groups.findIndex(function (g) {
      return Number(g.optionId) === optionId;
    });

    state.modalSelectedVariantValues = {
      ...(state.modalSelectedVariantValues || {}),
      [optionId]: variantId
    };

    state.modalSelectedVariantValues = cleanupNextGroupsSelection(
      product,
      groups,
      changedGroupIndex,
      state.modalSelectedVariantValues
    );

    state.modalQty = 1;

    updateModalQty();
    renderModalStockOptions();
    updateModalButtons();
  });
});

   return;
  }

  els.modalStockOptions.innerHTML = "";
}

function isVariantUsedInAnyCombination(product, optionId, variantId) {
  const combos = getAvailableStockCombinations(product);

  return combos.some(function (combo) {
    return (combo.values || []).some(function (v) {
      return Number(v.menuItemOptionId) === Number(optionId)
        && Number(v.menuItemOptionVariantId) === Number(variantId);
    });
  });
}

function getPreviousGroupsSelectionMap(groups, currentGroupIndex, selectedMap) {
  const map = {};
  const safeGroups = Array.isArray(groups) ? groups : [];

  for (let i = 0; i < currentGroupIndex; i += 1) {
    const optionId = Number(safeGroups[i]?.optionId || 0);
    const selectedValue = Number((selectedMap || {})[optionId] || 0);

    if (optionId > 0 && selectedValue > 0) {
      map[optionId] = selectedValue;
    }
  }

  return map;
}

function cleanupNextGroupsSelection(product, groups, changedGroupIndex, selectedMap) {
  const next = { ...(selectedMap || {}) };
  const safeGroups = Array.isArray(groups) ? groups : [];

  for (let i = changedGroupIndex + 1; i < safeGroups.length; i += 1) {
    const group = safeGroups[i];
    const optionId = Number(group?.optionId || 0);
    const variantId = Number(next[optionId] || 0);

    if (!optionId || !variantId) continue;

    const previousGroupsSelectionMap = getPreviousGroupsSelectionMap(safeGroups, i, next);

    const valid = isVariantAvailableForSelection(
      product,
      optionId,
      variantId,
      previousGroupsSelectionMap
    );

    if (!valid) {
      delete next[optionId];
    }
  }

  return next;
}

function getAvailableStockCombinations(product) {
  return getProductVariantCombinations(product).filter(function (c) {
    return !!c
      && c.enabled !== false
      && c.hasStock === true
      && Number(c.stockCurrent || 0) > 0
      && Array.isArray(c.values)
      && c.values.length > 0;
  });
}

function isVariantAvailableForSelection(product, optionId, variantId, currentSelection) {
  const combos = getAvailableStockCombinations(product);

  if (!combos.length) return false;

  return combos.some(function (combo) {
    const values = combo.values || [];

    const hasCandidate = values.some(function (v) {
      return Number(v.menuItemOptionId) === Number(optionId)
        && Number(v.menuItemOptionVariantId) === Number(variantId);
    });

    if (!hasCandidate) return false;

    return Object.entries(currentSelection || {}).every(function ([selectedOptionId, selectedVariantId]) {
      if (!selectedVariantId) return true;

      // ignorar la selección del mismo grupo que se está evaluando
      if (Number(selectedOptionId) === Number(optionId)) return true;

      return values.some(function (v) {
        return Number(v.menuItemOptionId) === Number(selectedOptionId)
          && Number(v.menuItemOptionVariantId) === Number(selectedVariantId);
      });
    });
  });
}

function cleanupInvalidVariantSelection(product, selectedMap) {
  const next = { ...(selectedMap || {}) };

  Object.keys(next).forEach(function (optionId) {
    const variantId = next[optionId];
    if (!variantId) return;

    const cloneWithoutCurrent = { ...next };
    delete cloneWithoutCurrent[optionId];

    const valid = isVariantAvailableForSelection(
      product,
      Number(optionId),
      Number(variantId),
      cloneWithoutCurrent
    );

    if (!valid) {
      delete next[optionId];
    }
  });

  return next;
}

function getSelectedVariantCombination() {
  if (!state.modalProduct) return null;

  const combinations = getProductVariantCombinations(state.modalProduct).filter(function (combination) {
    return combination.enabled !== false;
  });

  if (!combinations.length) return null;

  const stockMode = Number(state.modalProduct.stockMode || 0);

  // stock por subtipo: usa key directa
  if (stockMode === 2) {
    if (!state.modalSelectedStockKey) return null;

    return combinations.find(function (combination) {
      return getVariantCartKey(state.modalProduct.id, combination.values || []) === state.modalSelectedStockKey;
    }) || null;
  }

  // stock por variantes: arma la selección desde grupos
  if (stockMode === 3) {
    const selectedValues = Object.entries(state.modalSelectedVariantValues || {})
      .map(function ([optionId, variantId]) {
        return {
          menuItemOptionId: Number(optionId),
          menuItemOptionVariantId: Number(variantId)
        };
      })
      .filter(function (value) {
        return value.menuItemOptionId > 0 && value.menuItemOptionVariantId > 0;
      });

    if (!selectedValues.length) return null;

    const signature = getVariantSelectionSignature(selectedValues);

    return combinations.find(function (combination) {
      return getVariantSelectionSignature(combination.values || []) === signature;
    }) || null;
  }

  return null;
}

  function updateModalButtons() {
    if (!state.modalProduct) return;

    const visualOnly = state.menuOnlyEnabled || !state.ordersEnabled;
    const stock = resolveStockState(state.modalProduct);
    const hasVariantStock = stock.mode === "variant" && stock.hasControl;
    const noStock = !stock.available;
    const selectedCombination = getSelectedVariantCombination();

    if (els.modalQtyWrap) {
      els.modalQtyWrap.classList.toggle("hidden", visualOnly || noStock);
    }

    if (els.modalAddCartBtn) {
      els.modalAddCartBtn.classList.toggle("hidden", visualOnly || noStock);

      if (hasVariantStock) {
        const needsSelection = !selectedCombination;
        els.modalAddCartBtn.disabled = needsSelection;
        els.modalAddCartBtn.classList.toggle("opacity-50", needsSelection);
        els.modalAddCartBtn.classList.toggle("cursor-not-allowed", needsSelection);
      } else {
        els.modalAddCartBtn.disabled = false;
        els.modalAddCartBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  }

  function openProductModal(product) {
    state.modalProduct = product;
    state.modalImages = Array.isArray(product.images) ? product.images.slice() : [];
    state.modalIndex = 0;
    state.modalQty = 1;
    state.modalSelectedStockKey = null;
    state.modalSelectedVariantValues = {};

    if (els.modalCategory) {
      els.modalCategory.textContent = product.categoryName || "Sin categoría";
    }

    if (els.modalTitle) {
      els.modalTitle.textContent = product.name || "Producto";
    }

    if (els.modalPrice) {
      els.modalPrice.textContent = formatCurrency(getEffectivePrice(product));
    }

    if (els.modalPriceOld) {
      if (product.hasPromotion) {
        els.modalPriceOld.textContent = formatCurrency(product.price);
        els.modalPriceOld.classList.remove("hidden");
      } else {
        els.modalPriceOld.classList.add("hidden");
        els.modalPriceOld.textContent = "";
      }
    }

    if (els.modalDescription) {
      els.modalDescription.textContent = product.description || "Sin descripción.";
    }

    if (els.modalBadges) {
      const badges = [];

      if (product.hasPromotion) {
        badges.push(`<span class="promo-pill"><i class="fa-solid fa-bolt"></i> Promo</span>`);
        if (product.discountPercentage > 0) {
          badges.push(`<span class="badge-soft warning">${Math.round(product.discountPercentage)}% OFF</span>`);
        }
      }

      if (!hasVariantStockConfigured(product) && product.hasStock === true) {
        const current = getRemainingSimpleStock(product);
        if (current !== null && current <= 0) {
          badges.push(`<span class="badge-soft danger">Sin stock</span>`);
        } else if ((current ?? 0) <= 5) {
          badges.push(`<span class="badge-soft warning">Stock ${current}</span>`);
        } else {
          badges.push(`<span class="badge-soft success">Disponible</span>`);
        }
      }

      els.modalBadges.innerHTML = badges.join("");
    }

    const showWhatsapp = state.whatsappEnabled && !!sanitizePhone(state.companyWhatsapp);

    if (els.modalWhatsappBtn) {
      els.modalWhatsappBtn.classList.toggle("hidden", !showWhatsapp);
    }

    renderModalConfig(product);
    updateModalQty();
    renderModalGallery();
    renderModalStockOptions();
    updateModalButtons();

    if (els.productModal) {
      els.productModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeProductModal() {
    if (!els.productModal) return;
    els.productModal.classList.add("hidden");
    if (els.checkoutModal?.classList.contains("hidden")) {
      document.body.style.overflow = "";
    }
    state.modalProduct = null;
    state.modalImages = [];
    state.modalIndex = 0;
    state.modalQty = 1;
    state.modalSelectedStockKey = null;
    state.modalSelectedVariantValues = {};
  }

  function addModalProductToCart() {
    if (!state.modalProduct) return;

    const product = state.modalProduct;

    if (hasVariantStockConfigured(product)) {
      const selected = getSelectedVariantCombination();
      if (!selected) {
        showAppMessage("Seleccioná una variante", "Elegí la combinación de stock antes de agregar al pedido.", "info");
        return;
      }

      for (let i = 0; i < state.modalQty; i += 1) {
        addVariantProduct(product, selected, 1);
      }

      closeProductModal();
      return;
    }

    for (let i = 0; i < state.modalQty; i += 1) {
      addSimpleProduct(product.id, 1);
    }

    closeProductModal();
  }

  function contactByWhatsappFromModal() {
    if (!state.modalProduct) return;

    const phone = sanitizePhone(state.companyWhatsapp);
    if (!phone || !state.whatsappEnabled) {
      showAppMessage("WhatsApp no disponible", "Esta empresa no tiene WhatsApp configurado.", "info");
      return;
    }

    const selectedCombination = getSelectedVariantCombination();
    const suffix = selectedCombination
      ? ` (${getVariantSelectionLabel(selectedCombination.values || [], state.modalProduct.variantGroups || [])})`
      : "";

    const message = `Hola! Quiero consultar por *${state.modalProduct.name}*${suffix}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  }

function getCartTotals(paymentMethod) {
  let subtotal = 0;
  let items = 0;

  Object.values(state.cart).forEach(function (line) {
    const qty = Number(line.qty || 0);
    const price = Number(line.unitPrice || 0);
    subtotal += qty * price;
    items += qty;
  });

  subtotal = roundMoney(subtotal);

  const deliveryAmount =
    isOtrosBusiness() && isDeliverySelected()
      ? roundMoney(Number(state.deliveryAddress.deliveryAmount || 0))
      : 0;

  const percent = getPaymentAdjustmentPercent(paymentMethod || "Efectivo");
  const adjustment = roundMoney(subtotal * (percent / 100));

  const discount = state.coupon.valid
    ? roundMoney(Number(state.coupon.discountAmount || 0))
    : 0;

  let total = roundMoney(subtotal + deliveryAmount + adjustment - discount);
  if (total < 0) total = 0;

  return {
    items,
    subtotal,
    deliveryAmount,
    adjustmentPercent: percent,
    adjustment,
    discount,
    total
  };
}

  function resetCouponState() {
  state.coupon.code = "";
  state.coupon.couponId = null;
  state.coupon.valid = false;
  state.coupon.message = "";
  state.coupon.eligibleSubtotal = 0;
  state.coupon.discountAmount = 0;
  state.coupon.finalSubtotal = 0;
}

function clearAppliedCoupon(silent = true) {
  const hadCoupon = !!state.coupon.code || state.coupon.valid;

  resetCouponState();

  if (els.couponCodeInput) {
    els.couponCodeInput.value = "";
  }

  updateCouponUi();
  updateCheckoutSummary();

  if (!silent && hadCoupon) {
    showAppMessage("Cupón quitado", "Se quitó el cupón aplicado.", "info");
  }
}

function showCouponMessage(message, type) {
  if (!els.couponMessage) return;

  els.couponMessage.className = "mt-3 text-sm font-bold rounded-2xl px-4 py-3";

  if (type === "success") {
    els.couponMessage.classList.add("coupon-success");
  } else if (type === "error") {
    els.couponMessage.classList.add("coupon-error");
  } else {
    els.couponMessage.classList.add("coupon-info");
  }

  els.couponMessage.textContent = message || "";
}

function hideCouponMessage() {
  if (!els.couponMessage) return;
  els.couponMessage.className = "hidden mt-3 text-sm font-bold rounded-2xl px-4 py-3";
  els.couponMessage.textContent = "";
}

function updateCouponUi() {
  if (els.couponBox) {
    els.couponBox.classList.toggle("hidden", !state.coupon.visible);
  }

  if (els.couponAppliedBadge) {
    els.couponAppliedBadge.classList.toggle("hidden", !state.coupon.valid);
  }

  if (els.removeCouponBtn) {
    els.removeCouponBtn.classList.toggle("hidden", !state.coupon.valid);
  }

  if (els.applyCouponBtn) {
    els.applyCouponBtn.textContent = state.coupon.valid ? "Reaplicar" : "Aplicar";
  }

  if (state.coupon.valid) {
    showCouponMessage(
      state.coupon.message || `Cupón aplicado: ${state.coupon.code}`,
      "success"
    );
  } else {
    hideCouponMessage();
  }
}

function buildCouponValidationItems() {
  return Object.values(state.cart).map(function (line) {
    const product = state.allProducts.find(function (p) {
      return Number(p.id) === Number(line.id);
    });

    return {
      productId: Number(line.id || 0),
      categoryId: Number(product?.categoryId || 0),
      quantity: Number(line.qty || 0),
      unitPrice: Number(line.unitPrice || 0)
    };
  }).filter(function (x) {
    return x.productId > 0 && x.quantity > 0;
  });
}

async function apiValidateCoupon(code) {
  const resp = await fetch(apiUrl(buildPublicApiPath("/coupons/validate", state.companySlug)), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: String(code || "").trim(),
      items: buildCouponValidationItems()
    })
  });

  const data = await resp.json().catch(function () { return null; });

  if (!resp.ok) {
    throw new Error(data?.message || "No se pudo validar el cupón.");
  }

  return data;
}

async function applyCoupon() {
  if (!state.coupon.visible) return;

  const code = String(els.couponCodeInput?.value || "").trim().toUpperCase();

  if (!Object.keys(state.cart).length) {
    showCouponMessage("Primero agregá productos al pedido.", "error");
    return;
  }

  if (!code) {
    showCouponMessage("Ingresá un código de cupón.", "error");
    return;
  }

  try {
    if (els.applyCouponBtn) {
      els.applyCouponBtn.disabled = true;
      els.applyCouponBtn.textContent = "Aplicando...";
    }

    const result = await apiValidateCoupon(code);

    if (!result?.valid) {
      resetCouponState();
      updateCouponUi();
      showCouponMessage(result?.message || "Cupón inválido.", "error");
      updateCheckoutSummary();
      return;
    }

    state.coupon.code = result.couponCode || code;
    state.coupon.couponId = result.couponId || null;
    state.coupon.valid = !!result.valid;
    state.coupon.message = result.message || "Cupón aplicado correctamente.";
    state.coupon.eligibleSubtotal = Number(result.eligibleSubtotal || 0);
    state.coupon.discountAmount = Number(result.discountAmount || 0);
    state.coupon.finalSubtotal = Number(result.finalSubtotal || 0);

    updateCouponUi();
    updateCheckoutSummary();
  } catch (error) {
    resetCouponState();
    updateCouponUi();
    showCouponMessage(error.message || "No se pudo validar el cupón.", "error");
    updateCheckoutSummary();
  } finally {
    if (els.applyCouponBtn) {
      els.applyCouponBtn.disabled = false;
      els.applyCouponBtn.textContent = state.coupon.valid ? "Reaplicar" : "Aplicar";
    }
  }
}

  function getPaymentAdjustmentPercent(paymentMethod) {
    const value = String(paymentMethod || "").trim();

    if (value === "Transferencia") {
      return Number(state.transferSurchargeEnabled ? state.transferSurchargePercent || 0 : 0);
    }

    if (value === "MercadoPago") {
      return Number(state.mercadoPagoSurchargeEnabled ? state.mercadoPagoSurchargePercent || 0 : 0);
    }

    return 0;
  }

  function getPaymentAdjustmentLabel(paymentMethod, percent) {
    if (paymentMethod === "Transferencia") {
      return percent >= 0 ? "Ajuste transferencia / QR" : "Descuento transferencia / QR";
    }

    if (paymentMethod === "MercadoPago") {
      return percent >= 0 ? "Ajuste Mercado Pago" : "Descuento Mercado Pago";
    }

    return "Ajuste por pago";
  }

  function updateCartBar() {
    const visualOnly = state.menuOnlyEnabled || !state.ordersEnabled;

    if (!els.cartBar) return;

    if (visualOnly) {
      els.cartBar.classList.add("hidden");
      return;
    }

    const totals = getCartTotals("Efectivo");

    if (totals.items <= 0) {
      els.cartBar.classList.add("hidden");
      return;
    }

    if (els.cartBarAmount) {
      els.cartBarAmount.textContent = formatMoneyShort(totals.total);
    }

    if (els.cartBarItems) {
      els.cartBarItems.textContent = `${totals.items} item${totals.items !== 1 ? "s" : ""}`;
    }

    els.cartBar.classList.remove("hidden");
  }

  function isOtrosBusiness() {
  return Number(state.businessType || 0) === 2;
}

function isDeliverySelected() {
  if (!isOtrosBusiness()) return true;
  return String(els.deliveryType?.value || "delivery").trim().toLowerCase() !== "pickup";
}

function updateDeliveryModeUi() {
  const deliveryModeWrap = document.getElementById("deliveryModeWrap");
  const deliveryWrap = document.getElementById("deliveryAddressWrap");

  if (deliveryModeWrap) {
    deliveryModeWrap.classList.toggle("hidden", !isOtrosBusiness());
  }

  const showAddressFields = !isOtrosBusiness() || isDeliverySelected();

  if (deliveryWrap) {
    deliveryWrap.classList.toggle("hidden", !showAddressFields);
  }

  if (isOtrosBusiness() && !isDeliverySelected()) {
    resetValidatedAddress();
  }
}

function readDeliveryAddressForm() {
  return {
    street: String(els.deliveryStreet?.value || "").trim(),
    number: String(els.deliveryNumber?.value || "").trim(),
    city: String(els.deliveryCity?.value || "").trim(),
    postalCode: String(els.deliveryPostalCode?.value || "").trim(),
    betweenStreets: String(els.deliveryBetweenStreets?.value || "").trim()
  };
}

function buildDeliveryAddressQuery(addr) {
  const parts = [];

  const streetLine = `${addr.street || ""} ${addr.number || ""}`.trim();
  if (streetLine) parts.push(streetLine);
  if (addr.betweenStreets) parts.push(`Entre ${addr.betweenStreets}`);
  if (addr.city) parts.push(addr.city);
  if (addr.postalCode) parts.push(addr.postalCode);
  parts.push("Buenos Aires");
  parts.push("Argentina");

  return parts.filter(Boolean).join(", ");
}

function syncDeliveryAddressStateFromInputs() {
  const data = readDeliveryAddressForm();

  state.deliveryAddress.street = data.street;
  state.deliveryAddress.number = data.number;
  state.deliveryAddress.city = data.city;
  state.deliveryAddress.postalCode = data.postalCode;
  state.deliveryAddress.betweenStreets = data.betweenStreets;
}

function resetValidatedDeliveryLocation() {
  state.deliveryAddress.validatedAddress = "";
  state.deliveryAddress.lat = null;
  state.deliveryAddress.lng = null;

  if (els.validatedAddressText) {
    els.validatedAddressText.textContent = "Todavía no verificaste el domicilio.";
  }
}

function updateValidatedAddressUi() {
  if (!els.validatedAddressText) return;

  if (state.deliveryAddress.validatedAddress) {
    els.validatedAddressText.textContent = state.deliveryAddress.validatedAddress;
  } else {
    els.validatedAddressText.textContent = "Todavía no verificaste el domicilio.";
  }
}

async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!resp.ok) {
    throw new Error("No pude validar la dirección en el mapa.");
  }

  return await resp.json();
}

function ensureLeafletLoaded() {
  return new Promise(function (resolve, reject) {
    if (window.L) {
      resolve();
      return;
    }

    const cssId = "leaflet-css-runtime";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById("leaflet-js-runtime");
    if (existing) {
      existing.addEventListener("load", function () { resolve(); });
      existing.addEventListener("error", function () { reject(new Error("No pude cargar el mapa.")); });
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js-runtime";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = function () { resolve(); };
    script.onerror = function () { reject(new Error("No pude cargar el mapa.")); };
    document.body.appendChild(script);
  });
}

async function initDeliveryMap(lat, lng) {
  await ensureLeafletLoaded();

  if (!els.deliveryMap) {
    throw new Error("No encontré el contenedor del mapa.");
  }

  if (!state.map) {
    state.map = L.map(els.deliveryMap).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);

    state.mapMarker = L.marker([lat, lng], { draggable: true }).addTo(state.map);

marker.on("dragend", async function () {

  const pos = marker.getLatLng();

  try {

    const result = await validateDeliveryWithBackendByCoords(
      pos.lat,
      pos.lng
    );

    applyValidatedAddress(result);

  } catch (e) {

    console.warn("No se pudo recalcular zona");
  }

});

    state.mapReady = true;
  } else {
    state.map.setView([lat, lng], 16);
    if (state.mapMarker) {
      state.mapMarker.setLatLng([lat, lng]);
    }
  }

  setTimeout(function () {
    state.map.invalidateSize();
  }, 120);
}

function renderGeocodeResults(results) {
  if (!els.deliveryMapResults) return;

  if (!Array.isArray(results) || !results.length) {
    els.deliveryMapResults.innerHTML = `
      <div class="text-sm text-rose-600 font-bold">
        No encontré coincidencias para ese domicilio.
      </div>
    `;
    return;
  }

  els.deliveryMapResults.innerHTML = results.map(function (item, index) {
    return `
      <button
        type="button"
        class="w-full text-left px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
        data-geocode-index="${index}">
        <div class="text-sm font-bold text-slate-900">${escapeHtml(item.display_name || "")}</div>
      </button>
    `;
  }).join("");

  els.deliveryMapResults.querySelectorAll("[data-geocode-index]").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const index = Number(btn.getAttribute("data-geocode-index") || 0);
      const selected = state.mapGeocodeResults[index];
      if (!selected) return;

      const lat = Number(selected.lat);
      const lng = Number(selected.lon);

      state.deliveryAddress.validatedAddress = String(selected.display_name || "").trim();
      state.deliveryAddress.lat = lat;
      state.deliveryAddress.lng = lng;

      updateValidatedAddressUi();
      await initDeliveryMap(lat, lng);
    });
  });
}

async function openDeliveryMapModal() {
  syncDeliveryAddressStateFromInputs();

  const addr = readDeliveryAddressForm();

  if (!addr.street || !addr.number || !addr.city) {
    showAppMessage("Faltan datos", "Completá calle, altura y localidad antes de verificar el domicilio.", "error");
    return;
  }

  const query = buildDeliveryAddressQuery(addr);

  try {
    const results = await geocodeAddress(query);
    state.mapGeocodeResults = Array.isArray(results) ? results : [];

    if (!els.deliveryMapModal) return;

    els.deliveryMapModal.classList.remove("hidden");
    els.deliveryMapModal.classList.add("flex");
    document.body.style.overflow = "hidden";

    renderGeocodeResults(state.mapGeocodeResults);

    if (state.mapGeocodeResults.length) {
      const first = state.mapGeocodeResults[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);

      state.deliveryAddress.validatedAddress = String(first.display_name || "").trim();
      state.deliveryAddress.lat = lat;
      state.deliveryAddress.lng = lng;

      updateValidatedAddressUi();
      await initDeliveryMap(lat, lng);
    }
  } catch (error) {
    console.error(error);
    showAppMessage("No pude validar el domicilio", error.message || "Probá nuevamente.", "error");
  }
}

function closeDeliveryMapModal() {
  if (!els.deliveryMapModal) return;
  els.deliveryMapModal.classList.add("hidden");
  els.deliveryMapModal.classList.remove("flex");

  if (els.productModal?.classList.contains("hidden") && els.checkoutModal?.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function confirmDeliveryMapLocation() {
  if (!state.deliveryAddress.lat || !state.deliveryAddress.lng || !state.deliveryAddress.validatedAddress) {
    showAppMessage("Ubicación incompleta", "Primero elegí una ubicación válida en el mapa.", "error");
    return;
  }

  updateValidatedAddressUi();
  closeDeliveryMapModal();
  showAppMessage("Domicilio validado", "La ubicación quedó confirmada correctamente.", "success");
}

function isOtrosBusiness() {
  return Number(state.businessType || 0) === 2;
}

function readDeliveryAddressForm() {
  return {
    street: String(els.deliveryStreet?.value || "").trim(),
    number: String(els.deliveryNumber?.value || "").trim(),
    city: String(els.deliveryCity?.value || "").trim(),
    postalCode: String(els.deliveryPostalCode?.value || "").trim(),
    betweenStreets: String(els.deliveryBetweenStreets?.value || "").trim()
  };
}

function buildDeliveryAddressQuery(data) {
  const parts = [];
  const streetLine = `${data.street || ""} ${data.number || ""}`.trim();

  if (streetLine) parts.push(streetLine);
  if (data.betweenStreets) parts.push(`Entre ${data.betweenStreets}`);
  if (data.city) parts.push(data.city);
  if (data.postalCode) parts.push(data.postalCode);
  parts.push("Buenos Aires");
  parts.push("Argentina");

  return parts.filter(Boolean).join(", ");
}

function resetValidatedAddress() {
  state.deliveryAddress.validatedAddress = "";
  state.deliveryAddress.lat = null;
  state.deliveryAddress.lng = null;
  state.deliveryAddress.distanceKm = null;
  state.deliveryAddress.zone = "";
  state.deliveryAddress.deliveryAmount = 0;
  state.deliveryAddress.available = false;
  state.deliveryAddress.validationMessage = "";

  if (els.deliveryLat) els.deliveryLat.value = "";
  if (els.deliveryLng) els.deliveryLng.value = "";

  if (els.addressVerifiedBox) els.addressVerifiedBox.classList.add("hidden");
  if (els.addressVerifiedText) els.addressVerifiedText.textContent = "";
  if (els.mapSelectedAddressText) els.mapSelectedAddressText.textContent = "—";

  updateCheckoutSummary();
}

function applyValidatedAddress(result) {

  state.deliveryAddress.validatedAddress = result.normalizedAddress || "";
  state.deliveryAddress.lat = Number(result.lat || 0);
  state.deliveryAddress.lng = Number(result.lng || 0);
  state.deliveryAddress.distanceKm = Number(result.distanceKm || 0);
  state.deliveryAddress.zone = result.zone || "";
  state.deliveryAddress.deliveryAmount = Number(result.deliveryTotalAmount || 0);
  state.deliveryAddress.available = !!result.available;
  state.deliveryAddress.validationMessage = result.message || "";

  if (els.addressVerifiedText) {
    els.addressVerifiedText.textContent =
      result.normalizedAddress +
      (result.zone ? ` (${result.zone})` : "");
  }

  updateCheckoutSummary();
}

async function validateDeliveryWithBackend(address) {

  const url =
    `${CFG.apiBaseUrl}/api/public/${state.companySlug}/validate-delivery-address`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      address: address
    })
  });

  if (!response.ok)
    throw new Error("No se pudo validar el domicilio.");

  return await response.json();
}

async function geocodeDeliveryAddress() {
  const data = readDeliveryAddressForm();

  if (!data.street || !data.number || !data.city) {
    showAppMessage("Faltan datos", "Completá calle, altura y localidad.", "error");
    return null;
  }

  const query = buildDeliveryAddressQuery(data);

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("No pude validar el domicilio.");
  }

  const results = await response.json();
  if (!Array.isArray(results) || !results.length) {
    throw new Error("No encontré ese domicilio en el mapa.");
  }

  return results[0];
}

function ensureMap(lat, lng) {
  if (!window.L || !els.addressMap) {
    throw new Error("No pude iniciar el mapa.");
  }

  function syncMapSelectionText() {
    const currentText =
      state.deliveryAddress.validatedAddress ||
      buildDeliveryAddressQuery(readDeliveryAddressForm()) ||
      "—";

    if (els.mapSelectedAddressText) {
      els.mapSelectedAddressText.textContent = currentText;
    }
  }

  if (!state.map) {
    state.map = L.map(els.addressMap).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);

    state.mapMarker = L.marker([lat, lng], { draggable: true }).addTo(state.map);

    state.mapMarker.on("dragend", async function () {
  const pos = state.mapMarker.getLatLng();

  state.deliveryAddress.lat = Number(pos.lat);
  state.deliveryAddress.lng = Number(pos.lng);

  if (els.deliveryLat) els.deliveryLat.value = String(pos.lat);
  if (els.deliveryLng) els.deliveryLng.value = String(pos.lng);

  try {
    const newAddress = await reverseGeocodeLatLng(pos.lat, pos.lng);

    if (newAddress) {
      state.deliveryAddress.validatedAddress = newAddress;

      if (els.mapSelectedAddressText) {
        els.mapSelectedAddressText.textContent = newAddress;
      }
    }
  } catch (err) {
    console.error("reverseGeocode error", err);
  }
});

    syncMapSelectionText();

    setTimeout(function () {
      state.map.invalidateSize();
    }, 150);
  } else {
    state.map.setView([lat, lng], 16);
    state.mapMarker?.setLatLng([lat, lng]);
    syncMapSelectionText();

    setTimeout(function () {
      state.map.invalidateSize();
    }, 150);
  }
}

async function openAddressMapModal() {
  try {
    const result = await geocodeDeliveryAddress();

    if (!result) {
      throw new Error("No pude geocodificar el domicilio.");
    }

    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const displayName = String(result.display_name || "").trim();

    if (Number.isNaN(lat) || Number.isNaN(lng) || !displayName) {
      throw new Error("No encontré una ubicación válida para ese domicilio.");
    }

    const deliveryCheck = await validateDeliveryWithBackend(displayName);

    if (!deliveryCheck) {
      throw new Error("No se pudo validar el domicilio.");
    }

    if (!deliveryCheck.valid) {
      throw new Error(deliveryCheck.message || "No se pudo validar el domicilio.");
    }

    // NO bloquear si no entra en zona
    if (!deliveryCheck.available) {

      console.warn("Dirección fuera de zona:", deliveryCheck.message);

      showAppMessage(
        "Zona de entrega",
        deliveryCheck.message || "El costo de envío se confirmará con el vendedor.",
        "warning"
      );

    }
    const finalLat = Number(deliveryCheck.lat);
    const finalLng = Number(deliveryCheck.lng);
    const finalAddress = String(deliveryCheck.normalizedAddress || displayName).trim();

    if (Number.isNaN(finalLat) || Number.isNaN(finalLng) || !finalAddress) {
      throw new Error("La validación devolvió una ubicación inválida.");
    }

    applyValidatedAddress(deliveryCheck); 

    if (els.addressMapModal) {
      els.addressMapModal.classList.remove("hidden");
    }

    ensureMap(finalLat, finalLng);

    setTimeout(function () {
      state.map?.invalidateSize();
    }, 150);

  } catch (error) {
    console.error(error);
    showAppMessage(
      "No pude validar el domicilio",
      error.message || "Probá nuevamente.",
      "error"
    );
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

function closeAddressMapModal() {
  if (els.addressMapModal) {
    els.addressMapModal.classList.add("hidden");
  }
}

async function confirmMapAddress() {
  const lat = Number(state.deliveryAddress.lat);
  const lng = Number(state.deliveryAddress.lng);

  const selectedAddress =
    (els.mapSelectedAddressText?.textContent || "").trim();

  const finalAddress =
    selectedAddress && selectedAddress !== "—"
      ? selectedAddress
      : (state.deliveryAddress.validatedAddress || "").trim();

  if (Number.isNaN(lat) || Number.isNaN(lng) || !finalAddress) {
    showAppMessage(
      "Ubicación inválida",
      "Primero verificá correctamente el domicilio.",
      "error"
    );
    return;
  }

  try {
    const deliveryCheck = await validateDeliveryWithBackend(finalAddress);

    if (!deliveryCheck || !deliveryCheck.valid) {
      throw new Error(deliveryCheck?.message || "No se pudo validar el domicilio.");
    }

    state.deliveryAddress.validatedAddress = String(deliveryCheck.normalizedAddress || finalAddress).trim();
    state.deliveryAddress.lat = Number(deliveryCheck.lat || lat);
    state.deliveryAddress.lng = Number(deliveryCheck.lng || lng);
    state.deliveryAddress.distanceKm = Number(deliveryCheck.distanceKm || 0);
    state.deliveryAddress.zone = String(deliveryCheck.zone || "").trim();
    state.deliveryAddress.deliveryAmount = Number(deliveryCheck.deliveryTotalAmount || 0);
    state.deliveryAddress.available = !!deliveryCheck.available;
    state.deliveryAddress.validationMessage = String(deliveryCheck.message || "").trim();

    if (els.deliveryLat) els.deliveryLat.value = String(state.deliveryAddress.lat);
    if (els.deliveryLng) els.deliveryLng.value = String(state.deliveryAddress.lng);

    if (els.addressVerifiedText) {
      els.addressVerifiedText.textContent =
        state.deliveryAddress.validatedAddress +
        (state.deliveryAddress.zone ? ` (${state.deliveryAddress.zone})` : "");
    }

    if (els.addressVerifiedBox) {
      els.addressVerifiedBox.classList.remove("hidden");
    }

    updateCheckoutSummary();

    if (els.addressMapModal) {
      els.addressMapModal.classList.add("hidden");
    }

    showAppMessage(
      "Domicilio confirmado",
      "La ubicación se guardó correctamente.",
      "success"
    );
  } catch (err) {
    console.error(err);
    showAppMessage(
      "No pude validar el domicilio",
      err?.message || "Probá nuevamente.",
      "error"
    );
  }
}

async function reverseGeocodeLatLng(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error("No pude obtener la dirección del punto seleccionado.");
  }

  const data = await res.json();
  return String(data?.display_name || "").trim();
}

async function retryAddressSearch() {
  if (!state.mapInstance) {
    await openAddressMapModal();
    return;
  }

  await openAddressMapModal();
}

function buildCheckoutItemsPayload() {
  return Object.values(state.cart).map(function (line) {
    return {
      menuItemId: line.id,
      qty: Number(line.qty || 0),
      note: line.stockLabel ? `Variante: ${line.stockLabel}` : "",
      selections: Array.isArray(line.selections)
        ? line.selections.map(function (selection) {
            return {
              menuItemOptionId: Number(selection.menuItemOptionId),
              menuItemOptionVariantId:
                selection.menuItemOptionVariantId == null
                  ? null
                  : Number(selection.menuItemOptionVariantId),
              quantity: Number(selection.quantity || 1)
            };
          })
        : []
    };
  });
}

  function buildWhatsAppOrderMessage(ctx) {
    const totals = getCartTotals(ctx.paymentMethod);
    let msg = `*✅ PEDIDO RECIBIDO*`;

    if (ctx.orderNumber) {
      msg += ` *#${ctx.orderNumber}*`;
    }

    msg += `\n\n*Cliente:* ${ctx.customerName}`;
    msg += `\n*Dirección:* ${ctx.address}`;
    msg += `\n*Pago:* ${ctx.paymentMethod}`;
    msg += `\n--------------------------\n`;

    Object.values(state.cart).forEach(function (line) {
      const variantText = line.stockLabel ? ` (${line.stockLabel})` : "";
      msg += `• ${line.qty} x ${line.name}${variantText} ($${formatMoneyShort(Number(line.qty || 0) * Number(line.unitPrice || 0))})\n`;
    });

    if (totals.adjustmentPercent !== 0) {
      msg += `--------------------------\n`;
      msg += `*Subtotal:* $${formatMoneyShort(totals.subtotal)}\n`;
      msg += `*${getPaymentAdjustmentLabel(ctx.paymentMethod, totals.adjustmentPercent)}:* $${formatMoneyShort(totals.adjustment)}\n`;
    }

    if (state.coupon.valid && Number(state.coupon.discountAmount || 0) > 0) {
  msg += `--------------------------\n`;
  msg += `*Cupón:* ${state.coupon.code}\n`;
  msg += `*Descuento:* -$${formatMoneyShort(state.coupon.discountAmount)}\n`;
}

    msg += `--------------------------\n*TOTAL: $${formatMoneyShort(totals.total)}*`;

    if (ctx.paymentMethod === "Transferencia" && state.alias && state.transferEnabled) {
      msg += `\n*Alias:* ${state.alias}`;
    }

    msg += `\n\nGracias 🙌`;
    return msg;
  }

  function savePendingMercadoPagoOrder(data) {
    localStorage.setItem(MP_PENDING_KEY, JSON.stringify(data));
    localStorage.removeItem(MP_RETURN_HANDLED_KEY);
  }

  function getPendingMercadoPagoOrder() {
    try {
      const raw = localStorage.getItem(MP_PENDING_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearPendingMercadoPagoOrder() {
    localStorage.removeItem(MP_PENDING_KEY);
    localStorage.removeItem(MP_RETURN_HANDLED_KEY);
  }

  function markMercadoPagoReturnHandled(paymentId) {
    localStorage.setItem(MP_RETURN_HANDLED_KEY, paymentId || "1");
  }

  function wasMercadoPagoReturnHandled(paymentId) {
    const val = localStorage.getItem(MP_RETURN_HANDLED_KEY);
    if (!val) return false;
    if (!paymentId) return val === "1";
    return val === paymentId;
  }

  function cleanMercadoPagoQueryParams() {
    const url = new URL(window.location.href);
    [
      "collection_id", "collection_status", "payment_id", "status", "external_reference",
      "merchant_order_id", "preference_id", "payment_type", "site_id", "processing_mode"
    ].forEach(function (k) {
      url.searchParams.delete(k);
    });

    window.history.replaceState({}, document.title, url.toString());
  }

async function createOrderAndResolve(ctx) {
  const phone = sanitizePhone(state.companyWhatsapp);

  const payload = {
    customerName: ctx.name,
    customerWhatsapp: ctx.whatsapp,
    address: ctx.address,
    paymentMethod: ctx.paymentMethod,
    couponCode: state.coupon.valid ? state.coupon.code : null,
    items: buildCheckoutItemsPayload()
  };

if (isOtrosBusiness()) {
  const isDelivery = isDeliverySelected();

  payload.deliveryType = isDelivery ? "delivery" : "pickup";

  payload.deliveryStreet = isDelivery ? String(els.deliveryStreet?.value || "").trim() : null;
  payload.deliveryNumber = isDelivery ? String(els.deliveryNumber?.value || "").trim() : null;
  payload.deliveryCity = isDelivery ? String(els.deliveryCity?.value || "").trim() : null;
  payload.deliveryPostalCode = isDelivery ? String(els.deliveryPostalCode?.value || "").trim() : null;
  payload.deliveryBetweenStreets = isDelivery ? String(els.deliveryBetweenStreets?.value || "").trim() : null;

  payload.validatedAddress = isDelivery ? String(state.deliveryAddress.validatedAddress || "").trim() : null;
  payload.deliveryLat = isDelivery && state.deliveryAddress.lat != null ? Number(state.deliveryAddress.lat) : null;
  payload.deliveryLng = isDelivery && state.deliveryAddress.lng != null ? Number(state.deliveryAddress.lng) : null;
  payload.deliveryDistanceKm = isDelivery && state.deliveryAddress.distanceKm != null ? Number(state.deliveryAddress.distanceKm) : null;
  payload.deliveryZoneLabel = isDelivery ? String(state.deliveryAddress.zone || "").trim() : null;
  payload.deliveryAmount = isDelivery ? Number(state.deliveryAddress.deliveryAmount || 0) : 0;
}

if (isOtrosBusiness() && isDeliverySelected()) {
  if (!state.deliveryAddress.validatedAddress) {
    showAppMessage(
      "Domicilio pendiente",
      "Primero tenés que verificar y confirmar el domicilio en el mapa.",
      "error"
    );
    return;
  }

  if (!state.deliveryAddress.available) {
    showAppMessage(
      "Zona no disponible",
      state.deliveryAddress.validationMessage || "No realizamos envíos a esa zona.",
      "error"
    );
    return;
  }
}
  try {
    const resp = await fetch(apiUrl(buildProductsOrderPath(state.companySlug)), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }

    if (!resp.ok) {
      const message = data?.message || data?.error || "No se pudo registrar el pedido. Probá de nuevo.";
      showAppMessage("No se pudo registrar el pedido", message, "error");
      return;
    }

    const message = buildWhatsAppOrderMessage({
      customerName: ctx.name,
      address: ctx.address,
      paymentMethod: ctx.paymentMethod,
      orderNumber: data?.orderNumber || data?.orderCode || ""
    });

    state.cart = {};
    updateCartBar();
    renderProducts();
    closeCheckout();

    if (state.whatsappEnabled && phone) {
      window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    } else {
      showAppMessage("Pedido registrado", "El pedido se registró correctamente.", "success");
    }
  } catch (error) {
    console.error(error);
    showAppMessage("Sin conexión", "No hay conexión con el servidor.", "error");
  }
}

  async function startMercadoPagoCheckout(ctx) {
    if (!state.mercadoPagoEnabled) {
      showAppMessage("Mercado Pago no disponible", "Mercado Pago no está habilitado en esta empresa.", "error");
      return;
    }

    try {
      const phone = sanitizePhone(state.companyWhatsapp);

      savePendingMercadoPagoOrder({
        companySlug: state.companySlug,
        companyWhatsapp: phone,
        customerName: ctx.name,
        customerWhatsapp: ctx.whatsapp,
        address: ctx.address,
        paymentMethod: ctx.paymentMethod,
        message: buildWhatsAppOrderMessage({
          customerName: ctx.name,
          address: ctx.address,
          paymentMethod: ctx.paymentMethod,
          orderNumber: ""
        }),
        createdAt: new Date().toISOString()
      });

      const resp = await fetch(apiUrl(buildPublicApiPath("/payments/mercadopago", state.companySlug)), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  customerName: ctx.name,
  customerWhatsapp: ctx.whatsapp,
  address: ctx.address,
  couponCode: state.coupon.valid ? state.coupon.code : null,
  items: buildCheckoutItemsPayload(),

  deliveryType: isOtrosBusiness()
    ? (isDeliverySelected() ? "delivery" : "pickup")
    : null,

  deliveryStreet: isOtrosBusiness() && isDeliverySelected() ? String(els.deliveryStreet?.value || "").trim() : null,
  deliveryNumber: isOtrosBusiness() && isDeliverySelected() ? String(els.deliveryNumber?.value || "").trim() : null,
  deliveryCity: isOtrosBusiness() && isDeliverySelected() ? String(els.deliveryCity?.value || "").trim() : null,
  deliveryPostalCode: isOtrosBusiness() && isDeliverySelected() ? String(els.deliveryPostalCode?.value || "").trim() : null,
  deliveryBetweenStreets: isOtrosBusiness() && isDeliverySelected() ? String(els.deliveryBetweenStreets?.value || "").trim() : null,

  validatedAddress: isOtrosBusiness() && isDeliverySelected()
    ? String(state.deliveryAddress.validatedAddress || "").trim()
    : null,

  deliveryLat: isOtrosBusiness() && isDeliverySelected() && state.deliveryAddress.lat != null
    ? Number(state.deliveryAddress.lat)
    : null,

  deliveryLng: isOtrosBusiness() && isDeliverySelected() && state.deliveryAddress.lng != null
    ? Number(state.deliveryAddress.lng)
    : null,

  deliveryDistanceKm: isOtrosBusiness() && isDeliverySelected() && state.deliveryAddress.distanceKm != null
    ? Number(state.deliveryAddress.distanceKm)
    : null,

  deliveryZoneLabel: isOtrosBusiness() && isDeliverySelected()
    ? String(state.deliveryAddress.zone || "").trim()
    : null,

  deliveryAmount: isOtrosBusiness() && isDeliverySelected()
    ? Number(state.deliveryAddress.deliveryAmount || 0)
    : 0
})
      });

      if (!resp.ok) {
        const err = await resp.text().catch(function () { return ""; });
        console.error("MercadoPago error:", err);
        showAppMessage("No se pudo iniciar el pago", "No se pudo iniciar el pago con Mercado Pago.", "error");
        return;
      }

      const data = await resp.json();

      if (!data?.initPoint) {
        showAppMessage("Link de pago no disponible", "No se recibió el link de pago.", "error");
        return;
      }

      const pending = getPendingMercadoPagoOrder();
      if (pending) {
        pending.createdOrderNumber = data.orderNumber || "";
        pending.message = buildWhatsAppOrderMessage({
          customerName: ctx.name,
          address: ctx.address,
          paymentMethod: ctx.paymentMethod,
          orderNumber: data.orderNumber || ""
        });
        savePendingMercadoPagoOrder(pending);
      }

      window.location.href = data.initPoint;
    } catch (error) {
      console.error(error);
      showAppMessage("Sin conexión", "No hay conexión con el servidor.", "error");
    }
  }

  async function handleMercadoPagoReturn() {
    const qs = new URLSearchParams(window.location.search);
    const collectionStatus = (qs.get("collection_status") || qs.get("status") || "").trim().toLowerCase();
    const paymentId = (qs.get("payment_id") || qs.get("collection_id") || "").trim();

    if (!collectionStatus) return;
    if (wasMercadoPagoReturnHandled(paymentId)) return;

    const pending = getPendingMercadoPagoOrder();
    if (!pending) {
      markMercadoPagoReturnHandled(paymentId);
      cleanMercadoPagoQueryParams();
      return;
    }

    if (collectionStatus === "approved") {
      const phone = sanitizePhone(state.companyWhatsapp || pending.companyWhatsapp);
      markMercadoPagoReturnHandled(paymentId);
      cleanMercadoPagoQueryParams();
      clearPendingMercadoPagoOrder();

      state.cart = {};
      updateCartBar();
      closeCheckout();
      renderProducts();

      if (phone && pending.message) {
        window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(pending.message)}`;
      } else {
        showAppMessage("Pago aprobado", "El pago fue aprobado correctamente.", "success");
      }
      return;
    }

    if (collectionStatus === "pending" || collectionStatus === "in_process") {
      showAppMessage("Pago pendiente", "Tu pago quedó pendiente. Cuando se confirme podés volver a intentar o contactar al local.", "info");
      markMercadoPagoReturnHandled(paymentId);
      cleanMercadoPagoQueryParams();
      return;
    }

    if (collectionStatus === "rejected" || collectionStatus === "cancelled" || collectionStatus === "cancelled_by_user") {
      showAppMessage("Pago rechazado", "El pago no fue aprobado. Podés intentar nuevamente.", "error");
      clearPendingMercadoPagoOrder();
      cleanMercadoPagoQueryParams();
    }
  }

  function renderPaymentOptions() {
    if (!els.paymentMethod) return;

    const visualOnly = state.menuOnlyEnabled || !state.ordersEnabled;
    const options = [];

    const fmtPct = function (n) {
      const num = Number(n || 0);
      return num > 0 ? `+${num}%` : `${num}%`;
    };

    if (!visualOnly) {
      options.push(`<option value="Efectivo">💵 Efectivo</option>`);

      if (state.transferEnabled) {
        const p = Number(state.transferSurchargePercent || 0);
        const label = state.transferSurchargeEnabled && p !== 0
          ? `💳 Transferencia / QR (${fmtPct(p)})`
          : "💳 Transferencia / QR";
        options.push(`<option value="Transferencia">${label}</option>`);
      }

      if (state.mercadoPagoEnabled) {
        const p = Number(state.mercadoPagoSurchargePercent || 0);
        const label = state.mercadoPagoSurchargeEnabled && p !== 0
          ? `🟦 Mercado Pago (${fmtPct(p)})`
          : "🟦 Mercado Pago";
        options.push(`<option value="MercadoPago">${label}</option>`);
      }
    }

    if (!options.length) {
      els.paymentMethod.innerHTML = `<option value="">No disponible</option>`;
      els.paymentMethod.disabled = true;
    } else {
      els.paymentMethod.innerHTML = options.join("");
      els.paymentMethod.disabled = false;
    }
  }

  function getSelectedPaymentMethod() {
    return els.paymentMethod ? String(els.paymentMethod.value || "Efectivo") : "Efectivo";
  }

  function renderCheckoutItems() {
    if (!els.cartItemsList || !els.cartEmptyState) return;

    const lines = Object.values(state.cart);

    if (!lines.length) {
      els.cartEmptyState.classList.remove("hidden");
      els.cartItemsList.innerHTML = "";
      return;
    }

    els.cartEmptyState.classList.add("hidden");

    els.cartItemsList.innerHTML = lines.map(function (line) {
      return `
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-black text-slate-900">${escapeHtml(line.name)}</div>
              <div class="text-xs text-slate-500 mt-1">${escapeHtml(line.categoryName || "")}</div>
              ${
                line.stockLabel
                  ? `<div class="text-xs text-slate-400 mt-1 font-bold uppercase tracking-[0.12em]">${escapeHtml(line.stockLabel)}</div>`
                  : ``
              }
            </div>

            <div class="text-right shrink-0">
              <div class="text-sm font-black text-amber-600">${formatCurrency(Number(line.qty || 0) * Number(line.unitPrice || 0))}</div>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between gap-3">
            <div class="qty-shell inline-flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-2 py-2">
              <button
                type="button"
                class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 border border-slate-200 hover:bg-slate-100 transition text-lg font-black"
                data-checkout-minus="${escapeAttr(line.key)}"
              >−</button>

              <span class="font-black text-base min-w-[24px] text-center text-slate-900">${Number(line.qty || 0)}</span>

              <button
                type="button"
                class="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black active:scale-90 shadow-md shadow-amber-100 transition text-lg"
                data-checkout-plus="${escapeAttr(line.key)}"
              >+</button>
            </div>

            <button
              type="button"
              class="text-xs font-black text-rose-600 uppercase"
              data-checkout-remove="${escapeAttr(line.key)}"
            >
              Quitar
            </button>
          </div>
        </div>
      `;
    }).join("");

    els.cartItemsList.querySelectorAll("[data-checkout-minus]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        modifyCartLine(btn.getAttribute("data-checkout-minus"), -1);
      });
    });

    els.cartItemsList.querySelectorAll("[data-checkout-plus]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        modifyCartLine(btn.getAttribute("data-checkout-plus"), 1);
      });
    });

    els.cartItemsList.querySelectorAll("[data-checkout-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeCartLine(btn.getAttribute("data-checkout-remove"));
      });
    });
  }

  function modifyCartLine(key, delta) {
    const line = state.cart[key];
    if (!line) return;

    const product = state.allProducts.find(function (item) {
      return Number(item.id) === Number(line.id);
    });
    if (!product) return;

    if (delta > 0) {
      if (line.stockCombinationKey) {
        const selectedCombination = getProductVariantCombinations(product).find(function (combination) {
          return getVariantCartKey(product.id, combination.values || []) === line.stockCombinationKey;
        });

        if (!selectedCombination) return;

        addVariantProduct(product, selectedCombination, 1);
        return;
      }

      addSimpleProduct(product.id, 1);
      return;
    }

    line.qty += delta;

    if (line.qty <= 0) {
      delete state.cart[key];
    }

    renderCheckoutItems();
    updateCheckoutSummary();
    updateCartBar();
    renderProducts();

    if (state.modalProduct && Number(state.modalProduct.id) === Number(product.id)) {
      renderModalStockOptions();
    }

    if (!Object.keys(state.cart).length) {
      closeCheckout();
    }
  }

  function removeCartLine(key) {
    if (!state.cart[key]) return;

    const productId = Number(state.cart[key].id);
    delete state.cart[key];

    renderCheckoutItems();
    updateCheckoutSummary();
    updateCartBar();
    renderProducts();

    if (state.modalProduct && Number(state.modalProduct.id) === productId) {
      renderModalStockOptions();
    }

    if (!Object.keys(state.cart).length) {
      closeCheckout();
    }
  }

 function resolveStockState(product) {
  const stockMode = Number(product?.stockMode || 0);
  const combinations = getProductVariantCombinations(product).filter(function (item) {
    return item.enabled !== false;
  });

  if (stockMode === 2 || stockMode === 3) {
    if (!combinations.length) {
      return {
        mode: "variant",
        hasControl: true,
        available: true
      };
    }

    const availableCombinations = combinations.filter(function (item) {
      const remaining = getRemainingVariantStock(product, item);
      return remaining === null || remaining > 0;
    });

    return {
      mode: "variant",
      hasControl: true,
      available: availableCombinations.length > 0
    };
  }

  if (stockMode === 1 || product.hasStock === true) {
    const remaining = getRemainingSimpleStock(product);

    return {
      mode: "simple",
      hasControl: true,
      available: remaining === null || remaining > 0
    };
  }

  return {
    mode: "none",
    hasControl: false,
    available: true
  };
}

function getStockBadgeHtml(product) {
  const stock = resolveStockState(product);

  if (!stock.hasControl) {
    return `<span class="badge-soft success">Disponible</span>`;
  }

  if (stock.mode === "variant") {
    return stock.available
      ? `<span class="badge-soft success">Con stock</span>`
      : `<span class="badge-soft danger">Sin stock</span>`;
  }

  const current = getRemainingSimpleStock(product);

  if ((current ?? 0) <= 0) {
    return `<span class="badge-soft danger">Sin stock</span>`;
  }

  if ((current ?? 0) <= 5) {
    return `<span class="badge-soft warning">Stock ${current}</span>`;
  }

  return `<span class="badge-soft success">Con Stock</span>`;
}

function getProductStockSummaryLines(product) {
  const stock = resolveStockState(product);

  if (!stock.hasControl) {
    return [{ text: "Disponible", status: "success" }];
  }

  if (stock.mode === "variant") {
    const combinations = getProductVariantCombinations(product)
      .filter(function (item) {
        return item.enabled !== false;
      })
      .slice(0, 3);

    if (!combinations.length) {
      return [{
        text: Number(product.stockMode || 0) === 2 ? "Stock por subtipos" : "Stock por variantes",
        status: "neutral"
      }];
    }

    return combinations.map(function (combination) {
      const label = getVariantSelectionLabel(combination.values || [], product.variantGroups || []);
      const remaining = getRemainingVariantStock(product, combination);

      if (remaining === null) {
        return { text: `${label}`, status: "neutral" };
      }

      if (remaining <= 0) {
        return { text: `${label} · sin stock`, status: "danger" };
      }

      return {
        text: `${label} · ${remaining}`,
        status: remaining <= Number(combination.lowStockThreshold || 0) ? "warning" : "success"
      };
    });
  }

  const remaining = getRemainingSimpleStock(product);

  if (remaining === null) {
    return [{ text: "Disponible", status: "success" }];
  }

  if (remaining <= 0) {
    return [{ text: "Sin stock", status: "danger" }];
  }

  return [{ text: `Stock ${remaining}`, status: remaining <= 5 ? "warning" : "success" }];
}

function updateCheckoutSummary() {
  if (
    !els.summarySubtotal ||
    !els.summaryTotal ||
    !els.summaryAdjustmentRow ||
    !els.summaryAdjustment ||
    !els.summaryAdjustmentLabel
  ) {
    return;
  }

  const paymentMethod = getSelectedPaymentMethod();
  const totals = getCartTotals(paymentMethod);

  els.summarySubtotal.textContent = formatCurrency(totals.subtotal);
  els.summaryTotal.textContent = formatCurrency(totals.total);

  if (els.summaryDeliveryRow && els.summaryDelivery) {
    const showDelivery = isOtrosBusiness() && isDeliverySelected();
    els.summaryDeliveryRow.classList.toggle("hidden", !showDelivery);
    els.summaryDelivery.textContent = formatCurrency(totals.deliveryAmount || 0);

    if (els.summaryDeliveryLabel) {
      els.summaryDeliveryLabel.textContent = state.deliveryAddress.zone
        ? `Envío (${state.deliveryAddress.zone})`
        : "Envío";
    }
  }

  els.summaryAdjustmentRow.classList.toggle("hidden", totals.adjustmentPercent === 0);
  els.summaryAdjustment.textContent = formatCurrency(totals.adjustment);
  els.summaryAdjustmentLabel.textContent = getPaymentAdjustmentLabel(paymentMethod, totals.adjustmentPercent);

  if (els.summaryDiscountRow && els.summaryDiscount) {
    els.summaryDiscountRow.classList.toggle("hidden", !(state.coupon.valid && totals.discount > 0));
    els.summaryDiscount.textContent = `- ${formatCurrency(totals.discount)}`;
  }

  const showAlias = paymentMethod === "Transferencia" && !!String(state.alias || "").trim() && state.transferEnabled;
  els.aliasCard?.classList.toggle("hidden", !showAlias);
  if (els.aliasText) {
    els.aliasText.textContent = state.alias || "";
  }

  if (els.couponBox) {
    els.couponBox.classList.toggle("hidden", !state.coupon.visible);
  }

  if (els.confirmCheckoutBtn) {
    els.confirmCheckoutBtn.innerHTML = paymentMethod === "MercadoPago"
      ? `IR A PAGAR <i class="fa-solid fa-arrow-right ml-1"></i>`
      : `ENVIAR PEDIDO <i class="fa-brands fa-whatsapp ml-1"></i>`;
  }
}

  async function copyAlias() {
    const value = String(state.alias || "").trim();
    if (!value) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        showAppMessage("Alias copiado", "El alias se copió correctamente.", "success");
        return;
      }
    } catch {}

    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    try {
      document.execCommand("copy");
      showAppMessage("Alias copiado", "El alias se copió correctamente.", "success");
    } catch {
      window.prompt("Copiá el alias:", value);
    } finally {
      document.body.removeChild(ta);
    }
  }

  function openCheckout() {
    if (state.menuOnlyEnabled || !state.ordersEnabled) return;
    if (!Object.keys(state.cart).length) return;
    if (!els.checkoutModal) return;

    renderPaymentOptions();
    renderCheckoutItems();
    updateCheckoutSummary();
    updateCouponUi();

    els.checkoutModal.classList.remove("hidden");
    updatePostalCodePlaceholder();
    document.body.style.overflow = "hidden";
  }

  function closeCheckout() {
    if (!els.checkoutModal) return;
    els.checkoutModal.classList.add("hidden");
    if (els.productModal?.classList.contains("hidden")) {
      document.body.style.overflow = "";
    }
  }

  async function confirmCheckout() {
    if (state.menuOnlyEnabled || !state.ordersEnabled) {
      showAppMessage("Pedidos deshabilitados", "Esta empresa no tiene pedidos habilitados.", "info");
      return;
    }

    const name = String(els.customerName?.value || "").trim();
    const whatsapp = String(els.customerWhatsapp?.value || "").trim();
    const paymentMethod = getSelectedPaymentMethod();
    const cartLines = Object.values(state.cart);

    if (!cartLines.length) {
      showAppMessage("Carrito vacío", "Agregá al menos un producto.", "error");
      return;
    }

    if (!name || !whatsapp) {
      showAppMessage("Faltan datos", "Completá tu nombre y WhatsApp.", "error");
      return;
    }

    let address = String(els.customerAddress?.value || "").trim();

    if (isOtrosBusiness()) {
      syncDeliveryAddressStateFromInputs();

      if (isDeliverySelected()) {
        if (!state.deliveryAddress.street || !state.deliveryAddress.number || !state.deliveryAddress.city) {
          showAppMessage("Falta domicilio", "Completá calle, altura y localidad.", "error");
          return;
        }

        if (!state.deliveryAddress.validatedAddress) {
          showAppMessage("Validá el domicilio", "Primero verificá el domicilio en el mapa.", "error");
          return;
        }

        if (!state.deliveryAddress.available) {
          showAppMessage(
            "Fuera de zona",
            state.deliveryAddress.validationMessage || "La dirección está fuera de la zona de entrega.",
            "error"
          );
          return;
        }

        address = state.deliveryAddress.validatedAddress;
      } else {
        address = "Retira en el local";
      }
    }

    if (!address) {
      address = "Sin dirección";
    }

    if (paymentMethod === "MercadoPago") {
      await startMercadoPagoCheckout({ name, whatsapp, address, paymentMethod });
      return;
    }

    await createOrderAndResolve({ name, whatsapp, address, paymentMethod });
  }

  function showAppMessage(title, message, type) {
    if (!els.appMessageModal) return;

    const styles = {
      error: {
        bar: "#ef4444",
        bg: "#fff1f2",
        color: "#be123c",
        icon: '<i class="fa-solid fa-circle-exclamation"></i>'
      },
      success: {
        bar: "#10b981",
        bg: "#ecfdf5",
        color: "#059669",
        icon: '<i class="fa-solid fa-circle-check"></i>'
      },
      info: {
        bar: "#f59e0b",
        bg: "#fff7ed",
        color: "#d97706",
        icon: '<i class="fa-solid fa-circle-info"></i>'
      }
    };

    const cfg = styles[type] || styles.info;

    if (els.appMessageTitle) els.appMessageTitle.textContent = title || "Atención";
    if (els.appMessageText) els.appMessageText.textContent = message || "Ocurrió un error inesperado.";
    if (els.appMessageBar) els.appMessageBar.style.background = cfg.bar;
    if (els.appMessageIcon) {
      els.appMessageIcon.style.background = cfg.bg;
      els.appMessageIcon.style.color = cfg.color;
      els.appMessageIcon.innerHTML = cfg.icon;
    }

    els.appMessageModal.classList.remove("hidden");
    els.appMessageModal.classList.add("flex");
  }

  function hideAppMessage() {
    if (!els.appMessageModal) return;
    els.appMessageModal.classList.add("hidden");
    els.appMessageModal.classList.remove("flex");
  }

  function openCompanyWhatsapp() {
    const phone = sanitizePhone(state.companyWhatsapp);
    if (!phone || !state.whatsappEnabled) {
      showAppMessage("WhatsApp no disponible", "Esta empresa no tiene WhatsApp configurado.", "info");
      return;
    }

    const msg = state.menuOnlyEnabled || !state.ordersEnabled
      ? `Hola! Quiero consultar por el catálogo de *${state.companyName}*`
      : `Hola! Quiero hacer un pedido en *${state.companyName}*`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function initDevFooter() {
    if (!els.btnDevWpp) return;

    const devPhone = sanitizePhone(DEV_WHATSAPP);
    if (!devPhone) return;

    els.btnDevWpp.addEventListener("click", function () {
      const msg = "Hola! Quiero un catálogo online como este para mi negocio.";
      window.open(`https://wa.me/${devPhone}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  }

  function bindEvents() {
    els.searchInput?.addEventListener("input", onSearchInput);

    els.openCartBtn?.addEventListener("click", openCheckout);

    els.heroWhatsappBtn?.addEventListener("click", openCompanyWhatsapp);
    els.heroWhatsappBtnMobile?.addEventListener("click", openCompanyWhatsapp);

    els.btnRefresh?.addEventListener("click", function () {
      window.location.reload();
    });

    els.toggleScheduleBtn?.addEventListener("click", function () {
      const hidden = els.scheduleList?.classList.contains("hidden");
      els.scheduleList?.classList.toggle("hidden");
      const icon = els.toggleScheduleBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-chevron-down", !hidden);
        icon.classList.toggle("fa-chevron-up", hidden);
      }
    });

    els.productModal?.addEventListener("click", function (event) {
      const target = event.target;
      if (target && target.getAttribute("data-close-modal") === "1") {
        closeProductModal();
      }
    });

    els.verifyAddressBtn?.addEventListener("click", openAddressMapModal);
    els.mapCloseBtn?.addEventListener("click", closeAddressMapModal);
    els.confirmMapAddressBtn?.addEventListener("click", confirmMapAddress);
    els.retryMapSearchBtn?.addEventListener("click", retryAddressSearch);
    els.deliveryType?.addEventListener("change", updateDeliveryModeUi);

    els.addressMapModal?.addEventListener("click", function (event) {
      if (event.target === els.addressMapModal || event.target?.getAttribute("data-close-map") === "1") {
        closeAddressMapModal();
      }
    });

    [
      els.deliveryStreet,
      els.deliveryNumber,
      els.deliveryCity,
      els.deliveryPostalCode,
      els.deliveryBetweenStreets
    ].forEach(function (input) {
      input?.addEventListener("input", function () {
        syncDeliveryAddressStateFromInputs();
        resetValidatedAddress();
      });
    });
    els.modalCloseBtn?.addEventListener("click", closeProductModal);
    els.galleryPrevBtn?.addEventListener("click", prevModalImage);
    els.galleryNextBtn?.addEventListener("click", nextModalImage);

    els.modalQtyMinus?.addEventListener("click", function () {
      if (!state.modalProduct) return;

      state.modalQty = Math.max(1, Number(state.modalQty || 1) - 1);
      updateModalQty();
    });

    els.modalQtyPlus?.addEventListener("click", function () {
      if (!state.modalProduct) return;

      if (hasVariantStockConfigured(state.modalProduct)) {
        const selected = getSelectedVariantCombination();
        if (!selected) {
          showAppMessage("Seleccioná una variante", "Elegí primero la combinación de stock.", "info");
          return;
        }

        const remaining = getRemainingVariantStock(state.modalProduct, selected);
        if (remaining !== null && Number(state.modalQty || 1) >= remaining) {
          showAppMessage("Sin stock", "No podés superar el stock disponible para esa combinación.", "error");
          return;
        }
      } else {
        const remainingSimple = getRemainingSimpleStock(state.modalProduct);
        if (remainingSimple !== null && Number(state.modalQty || 1) >= remainingSimple) {
          showAppMessage("Sin stock", "No podés superar el stock disponible para este producto.", "error");
          return;
        }
      }

      state.modalQty = Number(state.modalQty || 1) + 1;
      updateModalQty();
    });

    els.modalAddCartBtn?.addEventListener("click", addModalProductToCart);
    els.modalWhatsappBtn?.addEventListener("click", contactByWhatsappFromModal);

    els.checkoutCloseBtn?.addEventListener("click", closeCheckout);
    els.checkoutModal?.addEventListener("click", function (event) {
      const target = event.target;
      if (target && target.getAttribute("data-close-checkout") === "1") {
        closeCheckout();
      }
    });

    els.paymentMethod?.addEventListener("change", updateCheckoutSummary);
    els.applyCouponBtn?.addEventListener("click", applyCoupon);

els.removeCouponBtn?.addEventListener("click", function () {
  clearAppliedCoupon(false);
});

els.couponCodeInput?.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    applyCoupon();
  }
});
    els.copyAliasBtn?.addEventListener("click", copyAlias);
    els.confirmCheckoutBtn?.addEventListener("click", confirmCheckout);

    els.appMessageBtn?.addEventListener("click", hideAppMessage);
    els.appMessageModal?.addEventListener("click", function (event) {
      if (event.target === els.appMessageModal) {
        hideAppMessage();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (els.productModal && !els.productModal.classList.contains("hidden")) closeProductModal();
        if (els.checkoutModal && !els.checkoutModal.classList.contains("hidden")) closeCheckout();
        if (els.appMessageModal && !els.appMessageModal.classList.contains("hidden")) hideAppMessage();
      }
    });
  }

  async function init() {
    try {
      await loadConfig();

      const slug = requireProductsSlug();
      if (!slug) return;

      state.companySlug = slug;

      const data = await loadProducts(slug);
      mapResponse(data);

      renderHeader();
      renderSchedule();
      renderCategoryTabs();
      applyFilters(normText(els.searchInput?.value || ""));
      renderProducts();
      renderPaymentOptions();
      updateCartBar();
      bindEvents();
      initDevFooter();
      updateDeliveryModeUi();
      updateValidatedAddressUi();
      await handleMercadoPagoReturn();
    } catch (error) {
      console.error(error);

      if (els.loadingState) els.loadingState.classList.add("hidden");
      if (els.emptyState) els.emptyState.classList.add("hidden");
      if (els.productsContainer) els.productsContainer.classList.add("hidden");
      if (els.productsSectionHeader) els.productsSectionHeader.classList.add("hidden");

      if (els.errorState) {
        els.errorState.textContent = error.message || "No se pudieron cargar los productos.";
        els.errorState.classList.remove("hidden");
      } else {
        showAppMessage("Error", error.message || "No se pudieron cargar los productos.", "error");
      }
    }
  }

  window.addEventListener("load", init);
})();
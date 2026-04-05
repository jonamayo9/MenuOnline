const CONFIG_PATH = "/config.json";

    const TOKEN_KEY = "menuonline_token";
    const AUTH_KEY  = "menuonline_authorization";
    const SLUG_KEY  = "menuonline_companySlug";
    const EMAIL_KEY = "menuonline_email";

    const LOGIN_PAGE = "/Admin/login.html";

    const BUSINESS_GASTRONOMIA = 1;
    const BUSINESS_OTROS = 2;

    let activeToast = null;
    let currentPublicMenuUrl = "";
    let currentCompanyName = "";
    let currentCompanyLogoUrl = "";
    let qrCodeInstance = null;
    let printQrCodeInstance = null;
    let appConfig = null;
    let currentBusinessType = BUSINESS_GASTRONOMIA;

    function toast(message, type = "info", ms = 1600){
      const container = document.getElementById("toastContainer");
      if(activeToast){
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
      el.style.cssText = `${colors[type]}color:white;`;
      el.innerHTML = `<span style="font-weight:800;font-size:14px;">${icon}</span><span style="font-size:13px;font-weight:500;">${message}</span>`;
      container.appendChild(el);
      activeToast = el;

      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));

      setTimeout(() => {
        if(activeToast !== el) return;
        el.classList.remove("show");
        setTimeout(() => {
          if(activeToast === el) activeToast = null;
          el.remove();
        }, 200);
      }, ms);
    }

    function logout(){
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AUTH_KEY);
      location.replace(LOGIN_PAGE);
    }

    async function loadConfig(){
      const res = await fetch(CONFIG_PATH, { cache: "no-store" });
      if(!res.ok) throw new Error("No pude leer config.json");
      return await res.json();
    }

    function getCompanySlug(){
      const qs = new URLSearchParams(location.search);
      const fromQuery = (qs.get("companySlug") || qs.get("c") || "").trim();
      if(fromQuery) return fromQuery;
      return (localStorage.getItem(SLUG_KEY) || "").trim();
    }

    function getCompanyInitial(name){
      const safe = String(name || "").trim();
      if(!safe) return "M";
      const parts = safe.split(/\s+/).filter(Boolean);
      if(parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
      return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
    }

    function resolveCompanyDisplayName(slug){
      return currentCompanyName || slug || "Mi Empresa";
    }

    function normalizeTemplateValue(value, slug){
      return String(value || "").replaceAll("{slug}", encodeURIComponent(slug));
    }

    function ensureAbsoluteBase(protocol, rootDomain){
      const safeRoot = String(rootDomain || "").trim();
      if(!safeRoot){
        return window.location.origin.replace(/\/$/, "");
      }

      if(/^https?:\/\//i.test(safeRoot)){
        return safeRoot.replace(/\/$/, "");
      }

      const safeProtocol = String(protocol || window.location.protocol.replace(":", "") || "https")
        .replace(":", "")
        .trim() || "https";

      return `${safeProtocol}://${safeRoot}`.replace(/\/$/, "");
    }

    function buildPublicPathFromTemplate(template, slug, fallbackTemplate){
      const rawTemplate = String(template || fallbackTemplate || "").trim();
      if(!rawTemplate) return "";
      const normalized = rawTemplate.startsWith("/") ? rawTemplate : `/${rawTemplate}`;
      return normalizeTemplateValue(normalized, slug);
    }

    function buildPublicUrlFromConfig(mode, slug, pathTemplate, fallbackTemplate){
      if(!slug || !appConfig) return "";

      const safeMode = String(mode || "path").trim().toLowerCase();
      const protocol = appConfig.publicMenuProtocol || "https";
      const rootDomain = appConfig.publicMenuRootDomain || "";

      if(safeMode === "subdomain"){
        if(!rootDomain) return "";
        const safeProtocol = String(protocol).replace(":", "").trim() || "https";
        const safeSubPath = String(appConfig.publicMenuSubdomainPath || "/").trim() || "/";
        const subPath = safeSubPath.startsWith("/") ? safeSubPath : `/${safeSubPath}`;
        return `${safeProtocol}://${encodeURIComponent(slug)}.${rootDomain}${subPath}`;
      }

      const baseOrigin = ensureAbsoluteBase(protocol, rootDomain);
      const safePath = buildPublicPathFromTemplate(pathTemplate, slug, fallbackTemplate);
      if(!safePath) return "";
      return new URL(safePath, `${baseOrigin}/`).toString();
    }

    function buildPublicMenuUrl(slug){
      return buildPublicUrlFromConfig(
        appConfig?.publicMenuMode,
        slug,
        appConfig?.publicMenuPathTemplate,
        "/menu/{slug}"
      );
    }

    function buildPublicProductsUrl(slug){
      return buildPublicUrlFromConfig(
        appConfig?.publicProductsMode || appConfig?.publicMenuMode,
        slug,
        appConfig?.publicProductsPathTemplate,
        "/products/{slug}"
      );
    }

    function buildCurrentPublicUrl(slug, businessType){
      return Number(businessType) === BUSINESS_OTROS
        ? buildPublicProductsUrl(slug)
        : buildPublicMenuUrl(slug);
    }

    function setCardVisible(id, visible){
      const el = document.getElementById(id);
      if(!el) return;
      el.classList.toggle("hidden", !visible);
    }

    function setHomeModulesLoading(isReady){
      const el = document.getElementById("homeModules");
      if(!el) return;
      el.style.display = isReady ? "grid" : "none";
    }

    function saveFeaturesInLocalStorage(features){ return; }
    function saveUserPermissionsInLocalStorage(me){ return; }
    function readFeaturesFromLocalStorage(){ return null; }
    function readPermissionsFromLocalStorage(){ return null; }

    function clearStoredAccessState(){
      localStorage.removeItem("menuonline_featureOrdersEnabled");
      localStorage.removeItem("menuonline_featureProductsEnabled");
      localStorage.removeItem("menuonline_featureCategoriesEnabled");
      localStorage.removeItem("menuonline_featureShiftsEnabled");
      localStorage.removeItem("menuonline_featureDashboardEnabled");
      localStorage.removeItem("menuonline_featureTableManagementEnabled");
      localStorage.removeItem("menuonline_canAccessOrders");
      localStorage.removeItem("menuonline_canAccessProducts");
      localStorage.removeItem("menuonline_canAccessCategories");
      localStorage.removeItem("menuonline_canAccessShifts");
      localStorage.removeItem("menuonline_canAccessDashboard");
      localStorage.removeItem("menuonline_canAccessTablesWaiter");
      localStorage.removeItem("menuonline_canAccessTableConfig");
      localStorage.removeItem("menuonline_canAccessTableDashboard");
      localStorage.removeItem("menuonline_canAccessCompanySettings");
      localStorage.removeItem("menuonline_canAccessPriceAdjustments");
      localStorage.removeItem("menuonline_canAccessPromotions");
    }

    function setQrCompanyVisual(name, logoUrl){
      const img = document.getElementById("menuQrCompanyLogo");
      const fallback = document.getElementById("menuQrCompanyLogoFallback");
      const title = document.getElementById("menuQrCompanyTitle");

      if(title) title.textContent = name || "Mi Empresa";
      if(fallback) fallback.textContent = getCompanyInitial(name);

      if(!img) return;

      img.onload = function(){
        img.style.display = "block";
        img.classList.remove("hidden");
        if(fallback) fallback.style.display = "none";
      };

      img.onerror = function(){
        img.style.display = "none";
        img.classList.add("hidden");
        if(fallback) fallback.style.display = "";
      };

      if(logoUrl && String(logoUrl).trim()){
        img.src = logoUrl;
      } else {
        img.removeAttribute("src");
        img.style.display = "none";
        if(fallback) fallback.style.display = "";
      }
    }

    function setPrintCompanyVisual(name, logoUrl){
      const img = document.getElementById("printCompanyLogo");
      const fallback = document.getElementById("printCompanyLogoFallback");
      const title = document.getElementById("printCompanyTitle");

      if(title) title.textContent = name || "Mi Empresa";
      if(fallback) fallback.textContent = getCompanyInitial(name);

      if(!img) return;

      img.onload = function(){
        img.style.display = "block";
        if(fallback) fallback.style.display = "none";
      };

      img.onerror = function(){
        img.style.display = "none";
        if(fallback) fallback.style.display = "block";
      };

      if(logoUrl && String(logoUrl).trim()){
        img.src = logoUrl;
      } else {
        img.removeAttribute("src");
        img.style.display = "none";
        if(fallback) fallback.style.display = "block";
      }
    }

    function setLinkOrToast(el, url, message){
      if(!el) return;

      if(!url){
        if(el.tagName === "A"){
          el.href = "#";
          el.target = "";
          el.rel = "";
        }
        el.onclick = function(e){
          e.preventDefault();
          toast(message || "No hay URL pública configurada para esta empresa.", "error", 2200);
        };
        return;
      }

      if(el.tagName === "A"){
        el.href = url;
        el.target = "_blank";
        el.rel = "noopener";
      }
      el.onclick = null;
    }

    function setOrdersCardByBusinessType(businessType){
      const isOtros = Number(businessType) === BUSINESS_OTROS;
      const card = document.getElementById("cardOrders");
      const title = document.getElementById("cardOrdersTitle");
      const desc = document.getElementById("cardOrdersDesc");
      const hint = document.getElementById("cardOrdersHint");

      if(card){
        card.href = isOtros ? "../products/product-order.html" : "./admin-order.html";
      }

      if(title) title.textContent = "Gestión de pedido";
      if(desc) desc.textContent = isOtros
        ? "Ver, preparar y cambiar estados de los pedidos de productos."
        : "Ver, tomar, imprimir y cambiar estados.";
      if(hint) hint.textContent = isOtros
        ? "Usa el flujo exclusivo de pedidos de productos."
        : "Gestión diaria de pedidos del local.";
    }

  function setDashboardCardByBusinessType(businessType){
    const isOtros = Number(businessType) === BUSINESS_OTROS;

    const card = document.getElementById("cardDashboard");
    const title = document.getElementById("cardDashboardTitle");
    const desc = document.getElementById("cardDashboardDesc");
    const hint = document.getElementById("cardDashboardHint");

    if (card) {
      card.href = isOtros
        ? "./summary.html"
        : "./admin-resumen.html";
    }

    if (title) {
      title.textContent = isOtros
        ? "Centro de costos"
        : "Resumen diario";
    }

    if (desc) {
      desc.textContent = isOtros
        ? "Ventas por período, cupones, promociones y medios de pago del catálogo."
        : "Pedidos del día, estados y total vendido.";
    }

    if (hint) {
      hint.textContent = isOtros
        ? "Vista comercial y operativa del catálogo."
        : "Vista rápida de la operación diaria del local.";
    }
  }

    function setPublicEntryCardByBusinessType(businessType){
      const isOtros = Number(businessType) === BUSINESS_OTROS;

      const publicEntryTitle = document.getElementById("publicEntryTitle");
      const publicEntryDesc = document.getElementById("publicEntryDesc");
      const publicEntryHint = document.getElementById("publicEntryHint");
      const publicEntryAction = document.getElementById("publicEntryAction");
      const publicButton = document.getElementById("publicMenuButton");

      const qrTitle = document.getElementById("cardQrTitle");
      const qrDesc = document.getElementById("cardQrDesc");
      const qrHint = document.getElementById("cardQrHint");

      const qrModalSubtitle = document.getElementById("menuQrCompanySubtitle");
      const printSubtitle = document.getElementById("printCompanySubtitle");

      const badgeProducts = document.getElementById("badgeProducts");
      const badgeCategories = document.getElementById("badgeCategories");

      if(publicEntryTitle) publicEntryTitle.textContent = isOtros ? "Catálogo público" : "Menú público";
      if(publicEntryDesc) publicEntryDesc.textContent = isOtros
        ? "Abrir la página pública visible para tus clientes."
        : "Abrir la página pública visible para tus clientes.";
      if(publicEntryHint) publicEntryHint.textContent = isOtros
        ? "Ideal para revisar cómo lo ve el cliente final en el catálogo."
        : "Ideal para revisar cómo lo ve el cliente final en el menú.";
      if(publicEntryAction) publicEntryAction.textContent = isOtros ? "Abrir catálogo" : "Abrir menú";

      if(publicButton) publicButton.textContent = isOtros ? "Ver catálogo público" : "Ver menú público";

      if(qrTitle) qrTitle.textContent = isOtros ? "QR del catálogo" : "QR del menú";
      if(qrDesc) qrDesc.textContent = isOtros
        ? "Código QR para que tus clientes vean el catálogo."
        : "Código QR para que tus clientes vean el menú.";
      if(qrHint) qrHint.textContent = isOtros
        ? "Pantalla lista para que el cliente escanee y abra el catálogo."
        : "Pantalla lista para que el cliente escanee desde el mostrador o mesa.";

      const subtitle = isOtros
        ? "Escaneá el código para ver el catálogo"
        : "Escaneá el código para ver el menú";

      if(qrModalSubtitle) qrModalSubtitle.textContent = subtitle;
      if(printSubtitle) printSubtitle.textContent = subtitle;

      if(badgeProducts) badgeProducts.textContent = isOtros ? "Catálogo" : "Menú";
      if(badgeCategories) badgeCategories.textContent = isOtros ? "Catálogo" : "Menú";
    }

    function setCurrentPublicAccess(slug, businessType){
      currentPublicMenuUrl = buildCurrentPublicUrl(slug, businessType);

      setLinkOrToast(
        document.getElementById("publicEntryLink"),
        currentPublicMenuUrl,
        "No hay URL pública configurada para esta empresa."
      );

      setLinkOrToast(
        document.getElementById("publicMenuButton"),
        currentPublicMenuUrl,
        "No hay URL pública configurada para esta empresa."
      );
    }

    function setTablesCards(features, permissions){
      const featureEnabled = !!features?.featureTableManagementEnabled;
      const canUseTables = !!permissions?.canAccessTablesWaiter || !!permissions?.canAccessTableConfig || !!permissions?.canAccessTableDashboard;
      const canConfigTables = !!permissions?.canAccessTableConfig || !!permissions?.canAccessTableDashboard;

      setCardVisible("cardTables", featureEnabled && canUseTables);
      setCardVisible("cardTablesConfig", featureEnabled && canConfigTables);

      if(featureEnabled && canUseTables){
        const hint = document.getElementById("tablesCardHint");
        const card = document.getElementById("cardTables");

        if(permissions?.canAccessTablesWaiter && !permissions?.canAccessTableConfig && !permissions?.canAccessTableDashboard){
          hint.textContent = "Acceso de mozo para operar mesas.";
          card.href = "./tables/tables.html";
        } else if(permissions?.canAccessTableDashboard){
          hint.textContent = "Acceso a operación, configuración y dashboard del salón.";
          card.href = "./tables/tables.html";
        } else if(permissions?.canAccessTableConfig){
          hint.textContent = "Acceso a operación y configuración de mesas.";
          card.href = "./tables/tables.html";
        } else {
          hint.textContent = "Operación de mesas y atención del salón.";
          card.href = "./tables/tables.html";
        }
      }
    }

    function setQrCardVisibility(features, permissions){
      const canSeeQr =
        features?.featureProductsEnabled === true &&
        (permissions?.canAccessProducts === true || permissions?.canAccessCategories === true);

      setCardVisible("cardMenuQr", canSeeQr);
    }

    function setHomeModules(features, permissions, businessType){
  const safeBusinessType = Number(businessType || BUSINESS_GASTRONOMIA);

  const safeFeatures = {
    featureOrdersEnabled: features?.featureOrdersEnabled === true,
    featureProductsEnabled: features?.featureProductsEnabled === true,
    featureCategoriesEnabled: features?.featureCategoriesEnabled === true,
    featureShiftsEnabled: features?.featureShiftsEnabled === true,
    featureDashboardEnabled: features?.featureDashboardEnabled === true,
    featureTableManagementEnabled: features?.featureTableManagementEnabled === true
  };

  const safePermissions = {
    canAccessOrders: permissions?.canAccessOrders === true,
    canAccessProducts: permissions?.canAccessProducts === true,
    canAccessCategories: permissions?.canAccessCategories === true,
    canAccessShifts: permissions?.canAccessShifts === true,
    canAccessDashboard: permissions?.canAccessDashboard === true,
    canAccessTablesWaiter: permissions?.canAccessTablesWaiter === true,
    canAccessTableConfig: permissions?.canAccessTableConfig === true,
    canAccessTableDashboard: permissions?.canAccessTableDashboard === true,
    canAccessCompanySettings: permissions?.canAccessCompanySettings === true
  };

  const canManageCatalog =
    safeFeatures.featureProductsEnabled &&
    safeFeatures.featureCategoriesEnabled &&
    safePermissions.canAccessProducts &&
    safePermissions.canAccessCategories;

  setOrdersCardByBusinessType(safeBusinessType);
  setDashboardCardByBusinessType(safeBusinessType);
  setPublicEntryCardByBusinessType(safeBusinessType);

  setCardVisible("cardOrders", safeFeatures.featureOrdersEnabled && safePermissions.canAccessOrders);
  setCardVisible("cardProducts", safeFeatures.featureProductsEnabled && safePermissions.canAccessProducts);
  setCardVisible("cardCategories", safeFeatures.featureCategoriesEnabled && safePermissions.canAccessCategories);

  setCardVisible("cardPriceAdjustments", canManageCatalog);
  setCardVisible("cardPromotions", canManageCatalog);
  setCardVisible("cardCoupons", safeBusinessType === BUSINESS_OTROS && canManageCatalog);

  setCardVisible("cardDashboard", safeFeatures.featureDashboardEnabled && safePermissions.canAccessDashboard);
  setCardVisible("publicEntryLink", true);
  setCardVisible("cardConfig", safePermissions.canAccessCompanySettings);

  setTablesCards(safeFeatures, safePermissions);
  setQrCardVisibility(safeFeatures, safePermissions);
}

    function buildAbsoluteMenuUrl(){
      return currentPublicMenuUrl || "";
    }

    async function fetchAuth(url, options = {}){
      const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(AUTH_KEY);
      if(!token){
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

      if(res.status === 401 || res.status === 403){
        logout();
        return null;
      }

      return res;
    }

    async function apiGetAdminMe(config){
      const url = `${config.apiBaseUrl}/api/admin/me`;
      const res = await fetchAuth(url);
      if(!res || !res.ok) return null;
      return await res.json().catch(() => null);
    }

    function buildQr(targetId, text, size){
      const container = document.getElementById(targetId);
      if(!container) return null;
      container.innerHTML = "";
      return new QRCode(container, {
        text,
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel.H
      });
    }

    function syncPrintSheet(){
      const absoluteMenuUrl = buildAbsoluteMenuUrl();
      const safeName = resolveCompanyDisplayName(getCompanySlug());
      const safeLogo = currentCompanyLogoUrl || "";
      setPrintCompanyVisual(safeName, safeLogo);
      printQrCodeInstance = buildQr("printQrCode", absoluteMenuUrl, 520);
    }

    function openMenuQrModal(){
      if(!currentPublicMenuUrl){
        toast("No hay URL pública configurada para esta empresa.", "error", 2200);
        return;
      }

      const modal = document.getElementById("menuQrModal");
      const absoluteMenuUrl = buildAbsoluteMenuUrl();
      const safeName = resolveCompanyDisplayName(getCompanySlug());

      setQrCompanyVisual(safeName, currentCompanyLogoUrl || "");
      qrCodeInstance = buildQr("menuQrCode", absoluteMenuUrl, 380);
      syncPrintSheet();

      modal.classList.add("open");
      document.body.classList.add("overflow-hidden");
    }

    function closeMenuQrModal(){
      const modal = document.getElementById("menuQrModal");
      modal.classList.remove("open");
      document.body.classList.remove("overflow-hidden");
    }

    function printMenuQr(){
      if(!currentPublicMenuUrl){
        toast("No hay QR para imprimir.", "error", 1800);
        return;
      }
      syncPrintSheet();
      window.print();
    }

    (function bindQrModalEvents(){
      const qrCard = document.getElementById("cardMenuQr");
      const btnClose = document.getElementById("btnCloseQrModal");
      const overlay = document.getElementById("menuQrOverlay");
      const btnPrint = document.getElementById("btnPrintQrModal");

      if(qrCard) qrCard.addEventListener("click", openMenuQrModal);
      if(btnClose) btnClose.addEventListener("click", closeMenuQrModal);
      if(overlay) overlay.addEventListener("click", closeMenuQrModal);
      if(btnPrint) btnPrint.addEventListener("click", printMenuQr);

      document.addEventListener("keydown", (e) => {
        if(e.key === "Escape") closeMenuQrModal();
      });
    })();

    (async function init(){
      const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(AUTH_KEY);
      if(!token){
        location.replace(LOGIN_PAGE);
        return;
      }

      const btnLogout = document.getElementById("btnLogout");
      if(btnLogout){
        btnLogout.addEventListener("click", logout);
      }

      setHomeModulesLoading(false);
      setHomeModules({}, {}, currentBusinessType);

      const slug = getCompanySlug() || "—";
      const email = localStorage.getItem(EMAIL_KEY) || "—";

      document.getElementById("companyLabel").textContent = slug;
      document.getElementById("emailLabel").textContent = email;
      currentCompanyName = slug === "—" ? "" : slug;

      try{
        appConfig = await loadConfig();

        const me = await apiGetAdminMe(appConfig);

        if(me){
          currentBusinessType = Number(me.businessType || BUSINESS_GASTRONOMIA);

          const features = {
            featureOrdersEnabled: me?.featureOrdersEnabled === true,
            featureProductsEnabled: me?.featureProductsEnabled === true,
            featureCategoriesEnabled: me?.featureCategoriesEnabled === true,
            featureShiftsEnabled: me?.featureShiftsEnabled === true,
            featureDashboardEnabled: me?.featureDashboardEnabled === true,
            featureTableManagementEnabled: me?.featureTableManagementEnabled === true
          };

          const permissions = {
            canAccessOrders: me?.canAccessOrders === true,
            canAccessProducts: me?.canAccessProducts === true,
            canAccessCategories: me?.canAccessCategories === true,
            canAccessShifts: me?.canAccessShifts === true,
            canAccessDashboard: me?.canAccessDashboard === true,
            canAccessTablesWaiter: me?.canAccessTablesWaiter === true,
            canAccessTableConfig: me?.canAccessTableConfig === true,
            canAccessTableDashboard: me?.canAccessTableDashboard === true,
            canAccessCompanySettings: me?.canAccessCompanySettings === true,
            canAccessPriceAdjustments: me?.canAccessPriceAdjustments === true,
            canAccessPromotions: me?.canAccessPromotions === true
          };

          saveFeaturesInLocalStorage(features);
          saveUserPermissionsInLocalStorage(me);

          currentCompanyName =
            me.companyName ||
            me.companyDisplayName ||
            me.companySlug ||
            currentCompanyName ||
            "";

          currentCompanyLogoUrl =
            me.companyLogoUrl ||
            me.logoUrl ||
            me.logo ||
            "";

          const effectiveSlug = me.companySlug || (slug === "—" ? "" : slug);

          setCurrentPublicAccess(effectiveSlug, currentBusinessType);
          setHomeModules(features, permissions, currentBusinessType);
          console.log({
          businessType: currentBusinessType,
          meCompanySlug: me?.companySlug,
          localSlug: slug,
          effectiveSlug,
          publicMenuPathTemplate: appConfig?.publicMenuPathTemplate,
          publicProductsPathTemplate: appConfig?.publicProductsPathTemplate,
          finalPublicUrl: buildCurrentPublicUrl(effectiveSlug, currentBusinessType)
        });

          if(me.companySlug && me.companySlug !== slug && slug === "—"){
            document.getElementById("companyLabel").textContent = me.companySlug;
          }

          if(me.email && email === "—"){
            document.getElementById("emailLabel").textContent = me.email;
          }

          if(currentCompanyName){
            document.getElementById("companyLabel").textContent = currentCompanyName;
          }
        } else {
          setCurrentPublicAccess("", currentBusinessType);
          setHomeModules({}, {}, currentBusinessType);
        }
      } catch(e){
        console.error(e);
        toast("No pude cargar config.json", "error", 2000);
        setCurrentPublicAccess("", currentBusinessType);
        setHomeModules({}, {}, currentBusinessType);
      } finally {
        setHomeModulesLoading(true);
      }
    })();
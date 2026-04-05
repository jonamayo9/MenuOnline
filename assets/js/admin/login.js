// PROD
    //const CONFIG_PATH = "/MenuOnline/config.json";
    // DEV
    const CONFIG_PATH = "../config.json";

    const AFTER_LOGIN_REDIRECT_ADMIN = "/Admin/home.html";
    const AFTER_LOGIN_REDIRECT_SUPER = "/SuperAdmin/companies.html";

    const TOKEN_KEY = "menuonline_token";
    const SLUG_KEY  = "menuonline_companySlug";
    const EMAIL_KEY = "menuonline_email";
    const EXP_KEY   = "menuonline_token_exp_utc";
    const IS_SUPER_KEY = "menuonline_isSuperAdmin";

    let activeToast = null;

    function toast(message, type="info", ms=1600){
      const container = document.getElementById("toastContainer");
      if(activeToast){ activeToast.remove(); activeToast = null; }

      const colors = { success:"bg-emerald-500", error:"bg-rose-500", info:"bg-slate-900" };
      const icon = type==="success" ? "✓" : type==="error" ? "⚠" : "⏳";

      const el = document.createElement("div");
      el.className = `${colors[type]} text-white px-6 py-5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]
                      transform transition-all duration-200 scale-95 opacity-0 pointer-events-auto`;
      el.innerHTML = `<div class="text-lg font-bold leading-none">${icon}</div>
                      <div class="text-sm font-semibold">${message}</div>`;
      container.appendChild(el);
      activeToast = el;

      requestAnimationFrame(()=> el.classList.remove("scale-95","opacity-0"));

      setTimeout(()=>{
        if(activeToast !== el) return;
        el.classList.add("scale-95","opacity-0");
        setTimeout(()=>{ if(activeToast===el) activeToast=null; el.remove(); }, 200);
      }, ms);
    }

    function setMessage(msg, type="error"){
      const box = document.getElementById("errorBox");

      if(!msg){
        box.classList.add("hidden");
        box.textContent = "";
        return;
      }

      box.className = "errorBoxBase";

      if(type === "success"){
        box.classList.add("bg-emerald-50","border","border-emerald-200","text-emerald-800");
      }else{
        box.classList.add("bg-rose-50","border","border-rose-100","text-rose-800");
      }

      box.textContent = msg;
      box.classList.remove("hidden");
    }

    function clearSession(){
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SLUG_KEY);
      localStorage.removeItem(EMAIL_KEY);
      localStorage.removeItem(EXP_KEY);
      localStorage.removeItem(IS_SUPER_KEY);
      localStorage.removeItem("menuonline_role");
    }

    async function loadConfig(){
      const res = await fetch(CONFIG_PATH, { cache: "no-store" });
      if(!res.ok) throw new Error("No pude leer config.json");
      return await res.json();
    }

    function parseJwt(token){
      try{
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(atob(base64).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join(""));
        return JSON.parse(json);
      }catch{
        return null;
      }
    }

    function isTokenValid(token){
      const payload = parseJwt(token);
      const exp = payload?.exp;
      if(!exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return exp > now;
    }

    function getRoleFromToken(token){
      const p = parseJwt(token);
      return p?.role || p?.Role || null;
    }

    async function doLogin(apiBaseUrl, email, password){
      const body = { email, password };

      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if(!res.ok){
        let msg = "No pude iniciar sesión";
        try{ msg = (await res.json())?.message || msg; }catch{}
        throw new Error(msg);
      }

      const data = await res.json();
      if(!data?.accessToken) throw new Error("No recibí accessToken");

      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(EMAIL_KEY, email);

      if(data.expiresAtUtc) localStorage.setItem(EXP_KEY, data.expiresAtUtc);
      else localStorage.removeItem(EXP_KEY);

      const role = String(data.role || "").toLowerCase();
      localStorage.setItem("menuonline_role", data.role || "");

      const isSuperFinal = role === "superadmin";
      localStorage.setItem(IS_SUPER_KEY, isSuperFinal ? "true" : "false");

      if(!isSuperFinal){
        if(data.companySlug) localStorage.setItem(SLUG_KEY, data.companySlug);
      } else {
        localStorage.removeItem(SLUG_KEY);
      }

      if(!isTokenValid(data.accessToken)){
        clearSession();
        throw new Error("Token inválido o sin vencimiento (exp).");
      }

      const target = isSuperFinal ? AFTER_LOGIN_REDIRECT_SUPER : AFTER_LOGIN_REDIRECT_ADMIN;
      setTimeout(()=> location.href = target, 350);

      return { isSuper: isSuperFinal };
    }

    (async function init(){
      try{
        const cfg = await loadConfig();
        const api = cfg.apiBaseUrl || "—";
        document.getElementById("pillApi").textContent = `API: ${api}`;

        const lastEmail = localStorage.getItem(EMAIL_KEY);
        if(lastEmail) document.getElementById("email").value = lastEmail;

        const t = localStorage.getItem(TOKEN_KEY);
        if(t && isTokenValid(t)){
          const role = getRoleFromToken(t);
          const isSuper = String(role).toLowerCase() === "superadmin";
          localStorage.setItem(IS_SUPER_KEY, isSuper ? "true" : "false");
          location.href = isSuper ? AFTER_LOGIN_REDIRECT_SUPER : AFTER_LOGIN_REDIRECT_ADMIN;
          return;
        } else if (t) {
          clearSession();
        }

        document.getElementById("btnClearSession").addEventListener("click", () => {
          clearSession();
          toast("Sesión borrada ✅", "success", 1200);
        });

        document.getElementById("btnLogin").addEventListener("click", async () => {
          setMessage(null);

          const email = document.getElementById("email").value.trim();
          const password = document.getElementById("password").value;

          if(!email || !password){
            setMessage("Completá email y contraseña.");
            return;
          }

          try{
            await doLogin(cfg.apiBaseUrl, email, password);
            setMessage("Bienvenido al sistema ✅", "success");
          }catch(e){
            console.error(e);
            setMessage(e.message || "Error al ingresar", "error");
          }
        });

        ["email","password"].forEach(id => {
          const el = document.getElementById(id);
          if(!el) return;
          el.addEventListener("keydown", (e) => {
            if(e.key === "Enter") document.getElementById("btnLogin").click();
          });
        });

      }catch(e){
        console.error(e);
        setMessage("No pude cargar configuración. Revisá config.json", "error");
        toast("Error cargando config", "error", 2000);
      }
    })();
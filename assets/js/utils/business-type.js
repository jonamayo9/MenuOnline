const BUSINESS_TYPE_KEY = "menuonline_business_type";

const BUSINESS_TYPES = {
  GASTRONOMIA: 1,
  OTROS: 2,
};

function getBusinessType() {
  const value = Number(localStorage.getItem(BUSINESS_TYPE_KEY));

  if (!value) return null; // superadmin

  return value;
}

function setBusinessType(value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(BUSINESS_TYPE_KEY);
    return;
  }

  localStorage.setItem(BUSINESS_TYPE_KEY, String(Number(value)));
}

function isSuperAdmin() {
  return getBusinessType() === null;
}

function isGastronomia() {
  return getBusinessType() === BUSINESS_TYPES.GASTRONOMIA;
}

function isOtros() {
  return getBusinessType() === BUSINESS_TYPES.OTROS;
}

window.BusinessTypeStore = {
  TYPES: BUSINESS_TYPES,
  get: getBusinessType,
  set: setBusinessType,
  isSuperAdmin,
  isGastronomia,
  isOtros,
};
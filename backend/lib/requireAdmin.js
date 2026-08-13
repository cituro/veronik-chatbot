// Middleware Express pentru autentificarea din panoul de admin.
//
// Exista doua niveluri, pe doua parole separate:
// - ADMIN_PASSWORD: parola data clientului - acces la setari, documentatie,
//   scanare site, surse, cod de instalare.
// - SUPER_ADMIN_PASSWORD: parola ta, separata - acces la tot ce are clientul,
//   plus sectiuni doar pentru tine (ex: Consum API).
//
// Daca SUPER_ADMIN_PASSWORD nu e setata pe o instanta, ADMIN_PASSWORD conteaza
// automat si ca super admin (compatibilitate cu instantele mai vechi, unde
// exista o singura parola pentru tot).
function checkPassword(provided) {
  if (!provided) return null;
  const superPassword = process.env.SUPER_ADMIN_PASSWORD || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (superPassword && provided === superPassword) return "super";
  if (adminPassword && provided === adminPassword) return "admin";
  return null;
}

function isSuperAdminLevel(level) {
  // daca nu exista o parola separata de super admin configurata, orice
  // conectare valida (nivel "admin") conteaza si ca super admin
  if (!process.env.SUPER_ADMIN_PASSWORD) return level === "admin" || level === "super";
  return level === "super";
}

function requireAdmin(req, res, next) {
  const level = checkPassword(req.header("x-admin-password") || "");
  if (!level) {
    return res.status(401).json({ error: "Parola de administrare lipsa sau incorecta." });
  }
  req.adminLevel = level;
  req.isSuperAdmin = isSuperAdminLevel(level);
  next();
}

function requireSuperAdmin(req, res, next) {
  const level = checkPassword(req.header("x-admin-password") || "");
  if (!level) {
    return res.status(401).json({ error: "Parola de administrare lipsa sau incorecta." });
  }
  if (!isSuperAdminLevel(level)) {
    return res.status(403).json({ error: "Acces permis doar cu parola de super admin." });
  }
  next();
}

module.exports = requireAdmin;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.isSuperAdminLevel = isSuperAdminLevel;
module.exports.checkPassword = checkPassword;

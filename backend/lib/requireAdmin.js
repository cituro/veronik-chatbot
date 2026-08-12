// Middleware Express: cere parola de administrare in header-ul x-admin-password.
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const provided = req.header("x-admin-password") || "";
  if (!expected || provided !== expected) {
    return res.status(401).json({ error: "Parola de administrare lipsa sau incorecta." });
  }
  next();
}

module.exports = requireAdmin;

/* Middlewares de autenticación y autorización. */
import { verificarToken } from "./token.js";

export function requerirToken(req, res, next) {
  const encabezado = req.headers.authorization ?? "";
  const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try {
    req.auth = verificarToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requerirRol(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.rol)) {
      return res.status(403).json({ error: "Rol no autorizado para esta operación" });
    }
    next();
  };
}

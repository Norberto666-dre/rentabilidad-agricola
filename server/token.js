/* JWT: generación y verificación de tokens de sesión. */
import jwt from "jsonwebtoken";

export const SECRETO = process.env.JWT_SECRET || "rentagro-demo-secret-cambiar-en-produccion";
export const DURACION = "12h";

export function generarToken(usuario, empresaId) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol, empresaId }, SECRETO, { expiresIn: DURACION });
}

export function verificarToken(token) {
  return jwt.verify(token, SECRETO);
}

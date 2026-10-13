/* Utilidades del servidor (ids, fecha). */
let contador = 0;

export function uid(prefijo = "x") {
  contador = (contador + 1) % 1296;
  return `${prefijo}${Date.now().toString(36)}${contador.toString(36).padStart(2, "0")}`;
}

export function ahoraISO() {
  return new Date().toISOString().slice(0, 19);
}

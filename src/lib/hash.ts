/* Hash de contraseñas en el modo caché local (sin API).
   bcryptjs es JS puro y se importa dinámicamente: solo pesa si se usa. */

let bcryptMod: typeof import("bcryptjs") | null = null;

async function cargarBcrypt() {
  if (!bcryptMod) bcryptMod = await import("bcryptjs");
  return bcryptMod;
}

export function pareceBcrypt(valor: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(valor);
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await cargarBcrypt();
  return bcrypt.hash(password, 10);
}

export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  if (!pareceBcrypt(guardado)) return password === guardado;
  const bcrypt = await cargarBcrypt();
  return bcrypt.compare(password, guardado);
}

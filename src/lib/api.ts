/* Cliente HTTP del API (fetch con timeout, token y errores tipados).
   En dev, Vite proxy redirige /api a 127.0.0.1:5174; en prod/Electron
   el Express sirve el mismo origen. */

const TOKEN_KEY = "rentabilidad-agricola-token-v1";

export class ApiError extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
  }
}

export function leerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* modo privado */
  }
}

export function borrarToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* modo privado */
  }
}

export interface SaludApi {
  ok: boolean;
  mongo: boolean;
  version: string;
}

export interface ResultadoLogin {
  token: string;
  usuario: { id: string; nombre: string; apellido: string; correo: string; rol: string };
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const token = leerToken();
    const res = await fetch(ruta, {
      ...opciones,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((opciones.headers as Record<string, string>) ?? {}),
      },
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const cuerpo = (await res.json()) as { error?: string; detalle?: string[] };
        if (cuerpo.error) msg = cuerpo.detalle?.length ? `${cuerpo.error}: ${cuerpo.detalle[0]}` : cuerpo.error;
      } catch {
        /* sin cuerpo JSON */
      }
      throw new ApiError(msg, res.status);
    }
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(t);
  }
}

export const api = {
  salud: () => pedir<SaludApi>("/api/health", {}, 4000),

  login: (correo: string, password: string) =>
    pedir<ResultadoLogin>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, password }),
    }, 8000),

  registro: (datos: {
    nombre: string;
    apellido: string;
    correo: string;
    password: string;
    telefono?: string;
    rol: "CAPTURISTA" | "CONTADOR";
  }) =>
    pedir<ResultadoLogin>("/api/auth/registro", {
      method: "POST",
      body: JSON.stringify(datos),
    }, 8000),

  obtenerSnapshot: <T>(timeoutMs = 10_000) => pedir<T>("/api/snapshot", {}, timeoutMs),

  enviarSnapshot: (db: unknown, timeoutMs = 15_000) =>
    pedir<{ ok: boolean }>("/api/snapshot", {
      method: "PUT",
      body: JSON.stringify(db),
    }, timeoutMs),
};

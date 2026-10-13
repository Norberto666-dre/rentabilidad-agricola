import semilla from "../data/db.json";
import type { Bitacora, DB } from "../types";

const KEY = "rentabilidad-agricola-db-v1";

export function cargarDB(): DB {
  const base = structuredClone(semilla) as DB;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const guardada = JSON.parse(raw) as Partial<Record<keyof DB, unknown>>;
    // La BD guardada puede venir de una versión anterior: se conservan los
    // datos del usuario y se rellenan colecciones/campos nuevos con la semilla.
    const out = { ...base } as Record<string, unknown>;
    for (const k of Object.keys(base) as (keyof DB)[]) {
      const v = guardada[k];
      if (v !== undefined) out[k] = v;
    }
    out.empresa = { ...(base.empresa as object), ...((guardada.empresa as object) ?? {}) };
    const planesGuardados = guardada.planes as DB["planes"] | undefined;
    if (planesGuardados?.some((p) => p.codigo === undefined || p.incluyeReportes === undefined)) {
      out.planes = base.planes;
    }
    const usuariosGuardados = guardada.usuarios as DB["usuarios"] | undefined;
    if (usuariosGuardados) {
      out.usuarios = usuariosGuardados.map((u) => ({
        ...base.usuarios.find((x) => x.id === u.id),
        ...u,
        ultimoAcceso: u.ultimoAcceso ?? null,
      }));
    }
    return out as unknown as DB;
  } catch {
    /* JSON corrupto: se usa la semilla */
    return base;
  }
}

export function guardarDB(db: DB): void {
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* Guardado por debounce: serializa la BD solo cuando deja de haber cambios
   (en vez de en cada mutación). withFlush=True fuerza la escritura pendiente. */
let dbPendiente: DB | null = null;
let timerGuardado: number | null = null;

export function programarGuardado(db: DB, esperaMs = 500): void {
  dbPendiente = db;
  if (timerGuardado !== null) window.clearTimeout(timerGuardado);
  timerGuardado = window.setTimeout(() => {
    timerGuardado = null;
    if (dbPendiente) {
      try {
        guardarDB(dbPendiente);
      } catch {
        /* modo privado: no se persiste */
      }
      dbPendiente = null;
    }
  }, esperaMs);
}

export function guardarPendienteAhora(): void {
  if (timerGuardado !== null) {
    window.clearTimeout(timerGuardado);
    timerGuardado = null;
  }
  if (dbPendiente) {
    try {
      guardarDB(dbPendiente);
    } catch {
      /* modo privado */
    }
    dbPendiente = null;
  }
}

export function reiniciarDB(): DB {
  const db = structuredClone(semilla) as DB;
  guardarDB(db);
  return db;
}

export function registrarBitacora(
  db: DB,
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId: string,
  valorAnterior: string | null = null,
  valorNuevo: string | null = null,
): DB {
  const entrada: Bitacora = {
    id: `b${Date.now().toString(36)}`,
    empresaId: db.empresa.id,
    usuarioId,
    accion,
    entidad,
    entidadId,
    valorAnterior,
    valorNuevo,
    fecha: new Date().toISOString().slice(0, 19),
  };
  return { ...db, bitacora: [entrada, ...db.bitacora] };
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import seed from "../data/db.json";
import { PERMISOS_POR_ROL, permisosPlan, type AlertaGenerada, type Permiso, type Rol, type Sesion, type DB, type Usuario } from "../types";
import { cargarDB, programarGuardado, guardarPendienteAhora, reiniciarDB, registrarBitacora } from "../lib/db";
import { api, ApiError, borrarToken, guardarToken, leerToken } from "../lib/api";
import { hashPassword, verificarPassword } from "../lib/hash";
import { DURACION_TOAST, uid } from "../lib/format";
import { generarAlertas } from "../lib/calc";

export interface Toast {
  id: string;
  mensaje: string;
  tipo: "exito" | "error" | "info";
}

export type Tema = "claro" | "oscuro";
export type ModoPersistencia = "mongo" | "local";

interface Ctx {
  db: DB;
  sesion: Sesion | null;
  usuario: Usuario | null;
  empresaVencida: boolean;
  modo: ModoPersistencia;
  puede: (p: Permiso) => boolean;
  iniciarSesion: (correo: string, password: string) => Promise<{ ok: boolean; rol?: Rol }>;
  registrarCuenta: (datos: {
    nombre: string;
    apellido: string;
    correo: string;
    password: string;
    telefono?: string;
    rol: "CAPTURISTA" | "CONTADOR";
  }) => Promise<{ ok: boolean; error?: string }>;
  cerrarSesion: () => void;
  actualizar: (fn: (db: DB) => DB) => void;
  registrar: (accion: string, entidad: string, entidadId: string, anterior?: string | null, nuevo?: string | null) => void;
  reiniciarDatos: () => void;
  toasts: Toast[];
  notificar: (mensaje: string, tipo?: Toast["tipo"]) => void;
  descartarToast: (id: string) => void;
  alertas: AlertaGenerada[];
  alertasNoLeidas: number;
  marcarAlertasLeidas: () => void;
  tema: Tema;
  alternarTema: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

const SESION_KEY = "rentabilidad-agricola-sesion-v1";
const TEMA_KEY = "rentabilidad-agricola-tema";
const LEIDAS_KEY = "rentabilidad-agricola-alertas-leidas-v1";

function leerLeidas(): string[] {
  try {
    const raw = localStorage.getItem(LEIDAS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function leerSesion(): Sesion | null {
  try {
    const raw = localStorage.getItem(SESION_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(TEMA_KEY);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch {
    /* sin persistencia se usa la preferencia del sistema */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => cargarDB());
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tema, setTema] = useState<Tema>(() => leerTema());
  const [leidas, setLeidas] = useState<string[]>(() => leerLeidas());
  const [tick, setTick] = useState(0);
  const [modo, setModo] = useState<ModoPersistencia>("local");

  /* ref del estado actual para usar dentro de callbacks sin recrearlos */
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);
  const modoRef = useRef(modo);
  useEffect(() => { modoRef.current = modo; }, [modo]);
  const sesionRef = useRef(sesion);
  useEffect(() => { sesionRef.current = sesion; }, [sesion]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "oscuro");
    try {
      localStorage.setItem(TEMA_KEY, tema);
    } catch {
      /* modo privado: no se persiste */
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((t) => (t === "claro" ? "oscuro" : "claro"));
  }, []);

  const usuario = useMemo(
    () => (sesion ? (db.usuarios.find((u) => u.id === sesion.usuarioId) ?? null) : null),
    [db.usuarios, sesion],
  );

  const empresaVencida =
    db.empresa.estado === "VENCIDA" || db.empresa.estado === "CANCELADA";

  /* permisos efectivos = rol ∩ plan de suscripción */
  const permisosPlanActual = useMemo(
    () => permisosPlan(db.planes.find((p) => p.id === db.empresa.planId)?.codigo),
    [db.planes, db.empresa.planId],
  );

  const notificar = useCallback((mensaje: string, tipo: Toast["tipo"] = "exito") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, mensaje, tipo }].slice(-3));
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      DURACION_TOAST[tipo],
    );
  }, []);

  const descartarToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ---- sincronización: guarda en local por debounce y, si hay API+Mongo,
         envía el snapshot por la misma pausa (una sola petición por calma) ---- */
  const timerSyncRef = useRef<number | undefined>(undefined);
  const sincronizar = useCallback((dbNuevo: DB) => {
    programarGuardado(dbNuevo);
    if (modoRef.current !== "mongo" || !leerToken()) return;
    window.clearTimeout(timerSyncRef.current);
    timerSyncRef.current = window.setTimeout(() => {
      void api.enviarSnapshot(dbNuevo).catch(() => {
        /* si falla la sincronización remota, los datos locales siguen intactos */
      });
    }, 700);
  }, []);

  /* fuerza el guardado local y el envío remoto (p.ej. antes de salir) */
  const vaciarPendientes = useCallback(() => {
    guardarPendienteAhora();
    if (modoRef.current === "mongo" && leerToken()) {
      window.clearTimeout(timerSyncRef.current);
      void api.enviarSnapshot(dbRef.current).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", vaciarPendientes);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") vaciarPendientes();
    });
    return () => window.removeEventListener("beforeunload", vaciarPendientes);
  }, [vaciarPendientes]);

  const actualizar = useCallback(
    (fn: (db: DB) => DB) => {
      setDb((prev) => {
        const next = fn(prev);
        sincronizar(next);
        return next;
      });
    },
    [sincronizar],
  );

  const registrar = useCallback(
    (
      accion: string,
      entidad: string,
      entidadId: string,
      anterior: string | null = null,
      nuevo: string | null = null,
    ) => {
      if (!sesionRef.current) return;
      setDb((prev) => {
        const next = registrarBitacora(prev, sesionRef.current!.usuarioId, accion, entidad, entidadId, anterior, nuevo);
        sincronizar(next);
        return next;
      });
    },
    [sincronizar],
  );

  /* ---- arranque: si el API tiene Mongo, adopta el snapshot remoto ---- */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const salud = await api.salud();
        if (cancelado || !salud?.mongo) return;
        if (!leerToken()) return; /* sin sesión no hay token: se queda en local */
        const snapshot = await api.obtenerSnapshot<DB>();
        if (cancelado) return;
        setDb(snapshot);
        guardarPendienteAhora();
        try {
          localStorage.setItem(LEIDAS_KEY, "[]");
          setLeidas([]);
        } catch {
          /* modo privado */
        }
        setModo("mongo");
      } catch {
        /* API sin Mongo o sin token: modo local */
      }
    })();
    return () => { cancelado = true; };
  }, []);

  /* ---- alertas "en tiempo real": recalculan ante cada cambio de datos
         y cada 60 s (vencimientos dependen del reloj) ---- */
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(i);
  }, []);

  const alertas = useMemo(() => generarAlertas(db), [db, tick]);

  const alertasNoLeidas = useMemo(
    () => alertas.filter((a) => !leidas.includes(a.id)).length,
    [alertas, leidas],
  );

  const marcarAlertasLeidas = useCallback(() => {
    const ids = alertas.map((a) => a.id);
    setLeidas(ids);
    try {
      localStorage.setItem(LEIDAS_KEY, JSON.stringify(ids));
    } catch {
      /* modo privado: no se persiste */
    }
  }, [alertas]);

  /* avisos automáticos cuando aparece una alerta nueva (ALTA/MEDIA) */
  const alertasPrevias = useRef<string[] | null>(null);
  useEffect(() => {
    const actuales = alertas.map((a) => a.id);
    const anteriores = alertasPrevias.current;
    alertasPrevias.current = actuales;
    if (!anteriores) return;
    const veAlertas =
      sesion &&
      PERMISOS_POR_ROL[sesion.rol].includes("reporte:ver") &&
      permisosPlanActual.includes("reporte:ver");
    if (!veAlertas) return;
    const nuevas = alertas.filter(
      (a) =>
        !anteriores.includes(a.id) &&
        !leidas.includes(a.id) &&
        (a.severidad === "ALTA" || a.severidad === "MEDIA"),
    );
    nuevas.slice(0, 2).forEach((a) => {
      const texto = `${a.tipo}: ${a.mensaje}`;
      notificar(texto.length > 145 ? `${texto.slice(0, 145)}…` : texto, "info");
    });
  }, [alertas, sesion, leidas, notificar, permisosPlanActual]);

  /* login: intenta la API (bcrypt server) y, si no responde, valida en local */
  const iniciarSesion = useCallback(
    async (correo: string, password: string): Promise<{ ok: boolean; rol?: Rol }> => {
      const correoLimpio = correo.trim().toLowerCase();
      /* 1) API */
      try {
        const r = await api.login(correoLimpio, password);
        guardarToken(r.token);
        const rol = r.usuario.rol as Rol;
        const s: Sesion = { usuarioId: r.usuario.id, rol, empresaId: dbRef.current.empresa.id };
        localStorage.setItem(SESION_KEY, JSON.stringify(s));
        setSesion(s);
        setModo("mongo");
        /* adopta el snapshot remoto en segundo plano */
        void api.obtenerSnapshot<DB>()
          .then((snap) => {
            if (sesionRef.current?.usuarioId === s.usuarioId) {
              setDb(snap);
              guardarPendienteAhora();
            }
          })
          .catch(() => undefined);
        return { ok: true, rol };
      } catch (e) {
        /* credenciales rechazadas por el servidor: no se intenta local */
        if (e instanceof ApiError && e.status === 401) return { ok: false };
        if (e instanceof ApiError && e.status === 429) return { ok: false };
      }
      /* 2) local (sin API) */
      const u = dbRef.current.usuarios.find((x) => x.correo.toLowerCase() === correoLimpio && x.activo);
      if (!u || !(await verificarPassword(password, u.password))) return { ok: false };
      const s: Sesion = { usuarioId: u.id, rol: u.rol, empresaId: dbRef.current.empresa.id };
      localStorage.setItem(SESION_KEY, JSON.stringify(s));
      setSesion(s);
      const ahora = new Date().toISOString().slice(0, 19);
      setDb((prev) => {
        const conAcceso: DB = {
          ...prev,
          usuarios: prev.usuarios.map((x) => (x.id === u.id ? { ...x, ultimoAcceso: ahora } : x)),
        };
        const next = registrarBitacora(conAcceso, u.id, "INICIO_SESION", "Sesion", "-", null, null);
        sincronizar(next);
        return next;
      });
      return { ok: true, rol: u.rol };
    },
    [sincronizar],
  );

  /* registro público: intenta la API, si no responde crea la cuenta local */
  const registrarCuenta = useCallback(
    async (datos: {
      nombre: string;
      apellido: string;
      correo: string;
      password: string;
      telefono?: string;
      rol: "CAPTURISTA" | "CONTADOR";
    }): Promise<{ ok: boolean; error?: string }> => {
      const correoLimpio = datos.correo.trim().toLowerCase();
      try {
        const r = await api.registro({ ...datos, correo: correoLimpio });
        guardarToken(r.token);
        /* la sesión se activa con iniciarSesion; aquí solo se registra la cuenta */
        return { ok: true };
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) return { ok: false, error: "Ese correo ya está registrado." };
        if (e instanceof ApiError && e.status !== undefined) return { ok: false, error: e.message };
      }
      /* local */
      if (dbRef.current.usuarios.some((x) => x.correo.toLowerCase() === correoLimpio)) {
        return { ok: false, error: "Ese correo ya está registrado." };
      }
      const id = uid("u");
      const hash = await hashPassword(datos.password);
      setDb((prev) => {
        const nuevo: Usuario = {
          id,
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          correo: correoLimpio,
          telefono: datos.telefono?.trim() ?? "",
          rol: datos.rol,
          password: hash,
          activo: true,
          creadoEn: new Date().toISOString().slice(0, 19),
          ultimoAcceso: null,
        };
        const next = { ...prev, usuarios: [...prev.usuarios, nuevo] };
        sincronizar(next);
        return next;
      });
      return { ok: true };
    },
    [sincronizar],
  );

  const cerrarSesion = useCallback(() => {
    guardarPendienteAhora();
    borrarToken();
    localStorage.removeItem(SESION_KEY);
    setSesion(null);
    setModo("local");
  }, []);

  const puede = useCallback(
    (p: Permiso) =>
      sesion
        ? PERMISOS_POR_ROL[sesion.rol].includes(p) && permisosPlanActual.includes(p)
        : false,
    [sesion, permisosPlanActual],
  );

  const reiniciarDatos = useCallback(() => {
    const dbNuevo = reiniciarDB();
    setDb(dbNuevo);
    sincronizar(dbNuevo);
    notificar("Datos de ejemplo restaurados", "info");
  }, [notificar, sincronizar]);

  const value: Ctx = {
    db,
    sesion,
    usuario,
    empresaVencida,
    modo,
    puede,
    iniciarSesion,
    registrarCuenta,
    cerrarSesion,
    actualizar,
    registrar,
    reiniciarDatos,
    toasts,
    notificar,
    descartarToast,
    alertas,
    alertasNoLeidas,
    marcarAlertasLeidas,
    tema,
    alternarTema,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp fuera de AppProvider");
  return ctx;
}

export { seed };

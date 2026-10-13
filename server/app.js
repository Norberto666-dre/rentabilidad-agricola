/* Aplicación Express: seguridad, rutas API y servido del build (SPA). */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import { estado } from "./mongo.js";
import { rutasAuth } from "./rutas-auth.js";
import { rutasSnapshot } from "./rutas-snapshot.js";
import { rutasColecciones } from "./rutas-colecciones.js";
import { requerirToken, requerirRol } from "./middleware-auth.js";
import { restaurarSemilla } from "./seed.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const esLocal = (origen) =>
  !origen || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);

export function crearApp(modelos) {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: (o, cb) => cb(null, esLocal(o)) }));
  app.use(express.json({ limit: "4mb" }));

  const limiteGeneral = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });
  const limiteAuth = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, mongo: estado.conectado, version: "1.0.0" });
  });

  app.use("/api/auth", limiteAuth, rutasAuth(modelos));
  app.use("/api/snapshot", limiteGeneral, rutasSnapshot(modelos));
  app.use("/api/admin", limiteGeneral, requerirToken, requerirRol("ADMIN"), (req, res, next) => {
    if (req.method === "POST" && req.path === "/reset") {
      restaurarSemilla(modelos)
        .then((ok) => res.json({ ok, mensaje: ok ? "Semilla restaurada" : "BD ya con datos" }))
        .catch(next);
      return;
    }
    next();
  });
  app.use("/api", limiteGeneral, rutasColecciones(modelos));

  /* build estático + fallback SPA */
  const dist = join(raiz, "dist");
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
  }
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const index = join(dist, "index.html");
    if (existsSync(index)) return res.sendFile(index);
    res.status(503).json({ error: "Build no encontrado: ejecuta npm run build" });
  });

  /* errores: zod/ErrorValidacion → 400; el resto → 500 genérico */
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalle: err.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`),
      });
    }
    if (err?.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    if (err?.type === "entity.too.large") {
      return res.status(413).json({ error: "Cuerpo demasiado grande" });
    }
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}

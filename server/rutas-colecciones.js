/* CRUD genérico con whitelist de colecciones, filtros permitidos y límites. */
import { Router } from "express";
import { COLECCIONES } from "./spec.js";
import { esquemasColecciones } from "./validacion.js";
import { requerirToken, requerirRol } from "./middleware-auth.js";

const LIMITE_DEFECTO = 500;
const LIMITE_MAX = 2000;

function modeloDe(modelos, nombre) {
  return COLECCIONES[nombre] ? modelos[nombre] : null;
}

export function rutasColecciones(modelos) {
  const r = Router();
  r.use(requerirToken);

  /* filtros: solo campos declarados como filtrables */
  function construirFiltro(nombre, query) {
    const permitidos = new Set(COLECCIONES[nombre].filtrables);
    const filtro = {};
    for (const [campo, valor] of Object.entries(query)) {
      if (!permitidos.has(campo)) continue;
      filtro[campo] = valor === "true" ? true : valor === "false" ? false : valor;
    }
    return filtro;
  }

  r.get("/:coleccion", async (req, res, next) => {
    try {
      const m = modeloDe(modelos, req.params.coleccion);
      if (!m) return res.status(404).json({ error: "Colección no existe" });
      const limite = Math.min(Number(req.query._limite) || LIMITE_DEFECTO, LIMITE_MAX);
      const desde = Math.max(Number(req.query._desde) || 0, 0);
      const docs = await m
        .find(construirFiltro(req.params.coleccion, req.query))
        .sort({ _id: 1 })
        .skip(desde)
        .limit(limite)
        .lean();
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  r.get("/:coleccion/:id", async (req, res, next) => {
    try {
      const m = modeloDe(modelos, req.params.coleccion);
      if (!m) return res.status(404).json({ error: "Colección no existe" });
      const doc = await m.findOne({ id: req.params.id }).lean();
      if (!doc) return res.status(404).json({ error: "Documento no encontrado" });
      res.json(doc);
    } catch (e) {
      next(e);
    }
  });

  r.post("/:coleccion", async (req, res, next) => {
    try {
      const nombre = req.params.coleccion;
      const m = modeloDe(modelos, nombre);
      if (!m) return res.status(404).json({ error: "Colección no existe" });
      const datos = esquemasColecciones[nombre].parse(req.body);
      const existe = await m.findOne({ id: datos.id }).lean();
      if (existe) return res.status(409).json({ error: `Ya existe ${nombre}/${datos.id}` });
      await m.create(datos);
      res.status(201).json(datos);
    } catch (e) {
      next(e);
    }
  });

  r.put("/:coleccion/:id", async (req, res, next) => {
    try {
      const nombre = req.params.coleccion;
      const m = modeloDe(modelos, nombre);
      if (!m) return res.status(404).json({ error: "Colección no existe" });
      const datos = esquemasColecciones[nombre].parse({ ...req.body, id: req.params.id });
      const r = await m.replaceOne({ id: req.params.id }, datos, { upsert: true });
      res.json({ ok: true, id: req.params.id, upserted: r.upsertedCount === 1 });
    } catch (e) {
      next(e);
    }
  });

  r.delete("/:coleccion/:id", requerirRol("ADMIN"), async (req, res, next) => {
    try {
      const m = modeloDe(modelos, req.params.coleccion);
      if (!m) return res.status(404).json({ error: "Colección no existe" });
      const r = await m.deleteOne({ id: req.params.id });
      if (r.deletedCount === 0) return res.status(404).json({ error: "Documento no encontrado" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return r;
}

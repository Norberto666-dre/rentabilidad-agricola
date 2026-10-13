/* Snapshot completo: GET carga todo en una sola consulta; PUT persiste el
   estado del cliente con bulkWrite (reemplazo por colección). */
import { Router } from "express";
import { COLECCIONES } from "./spec.js";
import { validarSnapshot } from "./validacion.js";
import { requerirToken } from "./middleware-auth.js";

const NOMBRES = Object.keys(COLECCIONES);
let escribiendo = Promise.resolve();

export function rutasSnapshot(modelos) {
  const r = Router();
  r.use(requerirToken);

  r.get("/", async (req, res, next) => {
    try {
      const [empresa, ...coleccionDocs] = await Promise.all([
        modelos.empresa.findOne({}).lean(),
        ...NOMBRES.map((n) => modelos[n].find({}).lean()),
      ]);
      const salida = { empresa };
      NOMBRES.forEach((n, i) => { salida[n] = coleccionDocs[i]; });
      res.json(salida);
    } catch (e) {
      next(e);
    }
  });

  r.put("/", async (req, res, next) => {
    try {
      const datos = validarSnapshot(req.body);
      const operaciones = [];
      for (const nombre of NOMBRES) {
        if (datos[nombre] === undefined) continue;
        const docs = datos[nombre].map(({ _id, ...d }) => d);
        operaciones.push(async () => {
          await modelos[nombre].deleteMany({});
          if (docs.length > 0) await modelos[nombre].insertMany(docs, { ordered: false });
        });
      }
      if (datos.empresa) {
        operaciones.push(async () => {
          await modelos.empresa.updateOne(
            { id: datos.empresa.id },
            { $set: datos.empresa },
            { upsert: true },
          );
        });
      }
      escribiendo = escribiendo.then(() => Promise.all(operaciones.map((op) => op())));
      await escribiendo;
      res.json({ ok: true, guardadoEn: new Date().toISOString() });
    } catch (e) {
      next(e);
    }
  });

  return r;
}

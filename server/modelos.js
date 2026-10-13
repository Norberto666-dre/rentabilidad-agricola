/* Modelos mongoose generados desde server/spec.js (colecciones explícitas). */
import mongoose from "mongoose";
import { COLECCIONES } from "./spec.js";

const TIPOS = {
  s: String,
  f: String,
  n: Number,
  b: Boolean,
  r: String,
  a: mongoose.Schema.Types.Mixed,
};

export function crearModelos() {
  const modelos = {};
  for (const [nombre, spec] of Object.entries(COLECCIONES)) {
    const def = { id: { type: String, required: true, unique: true } };
    for (const [campo, tipo] of Object.entries(spec.campos)) {
      if (campo === "id") continue;
      def[campo] = { type: TIPOS[tipo] ?? mongoose.Schema.Types.Mixed };
    }
    const schema = new mongoose.Schema(def, { strict: false, collection: nombre, versionKey: false });
    for (const idx of spec.indices ?? []) schema.index(idx);
    modelos[nombre] = mongoose.models[nombre] ?? mongoose.model(nombre, schema, nombre);
  }
  const schemaEmpresa = new mongoose.Schema(
    { id: String, nombre: String, razonSocial: String, rfc: String, correo: String, telefono: String, direccion: String, planId: String, estado: String, suscripcionVence: String, moneda: String },
    { strict: false, collection: "empresa", versionKey: false },
  );
  modelos.empresa = mongoose.models.empresa ?? mongoose.model("empresa", schemaEmpresa, "empresa");
  return modelos;
}

/* Construcción de esquemas zod desde server/spec.js (validación de entrada). */
import { z } from "zod";
import { COLECCIONES, esquemaEmpresa } from "./spec.js";

function campoZod(tipo) {
  switch (tipo) {
    case "s": return z.string();
    case "f": return z.string();
    case "n": return z.number().finite();
    case "b": return z.boolean();
    case "r": return z.string().nullish();
    default: return z.any();
  }
}

function construir(spec) {
  const shape = {};
  for (const [campo, tipo] of Object.entries(spec.campos)) {
    let zc = campoZod(tipo);
    if (spec.maxLen?.[campo] && (tipo === "s" || tipo === "f")) zc = zc.max(spec.maxLen[campo]);
    if (spec.enums?.[campo]) zc = z.enum(spec.enums[campo]);
    if (spec.requeridos.includes(campo)) shape[campo] = zc;
    else shape[campo] = zc.nullish();
  }
  for (const correo of spec.email ?? []) {
    if (shape[correo]) shape[correo] = shape[correo].refine((v) => v == null || /.+@.+\..+/.test(v), "correo inválido");
  }
  return z.looseObject(shape);
}

export const esquemasColecciones = Object.fromEntries(
  Object.entries(COLECCIONES).map(([nombre, spec]) => [nombre, construir(spec)]),
);

export const esquemaEmpresaZod = construir(esquemaEmpresa);

export const esquemaSnapshot = z.looseObject({
  empresa: esquemaEmpresaZod.optional(),
});

const LIMITE_DOCS = 20_000;

export class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.status = 400;
  }
}

/* Valida un snapshot completo: objetos por colección conocida, ids presentes. */
export function validarSnapshot(body) {
  const base = esquemaSnapshot.parse(body);
  for (const [nombre, docs] of Object.entries(base)) {
    if (nombre === "empresa") continue;
    if (!esquemasColecciones[nombre]) throw new ErrorValidacion(`Colección desconocida: ${nombre}`);
    if (!Array.isArray(docs)) throw new ErrorValidacion(`"${nombre}" debe ser un arreglo`);
    if (docs.length > LIMITE_DOCS) throw new ErrorValidacion(`"${nombre}" excede el límite de ${LIMITE_DOCS} documentos`);
    for (const doc of docs) {
      if (!doc || typeof doc !== "object" || typeof doc.id !== "string" || !doc.id)
        throw new ErrorValidacion(`"${nombre}" tiene un documento sin id`);
      esquemasColecciones[nombre].parse(doc);
    }
  }
  return base;
}

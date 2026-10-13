/* Si la colección usuarios está vacía, siembra los datos de src/data/db.json
   con las contraseñas hasheadas con bcrypt. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function sembrarSiVacio(modelos) {
  const cuenta = await modelos.usuarios.estimatedDocumentCount();
  if (cuenta > 0) return false;

  const db = JSON.parse(readFileSync(join(raiz, "src", "data", "db.json"), "utf8"));
  const hash = await bcrypt.hash("demo1234", 10);

  for (const [nombre, docs] of Object.entries(db)) {
    if (!Array.isArray(docs)) continue;
    const limpios = docs.map((d) => ({ ...d }));
    if (nombre === "usuarios") {
      for (const u of limpios) u.password = hash;
    }
    if (limpios.length > 0) await modelos[nombre].insertMany(limpios, { ordered: false });
  }
  if (db.empresa) {
    await modelos.empresa.updateOne({ id: db.empresa.id }, { $set: db.empresa }, { upsert: true });
  }
  return true;
}

export async function restaurarSemilla(modelos) {
  for (const nombre of Object.keys(modelos)) {
    if (nombre === "empresa") continue;
    await modelos[nombre].deleteMany({});
  }
  await modelos.empresa.deleteMany({});
  return sembrarSiVacio(modelos);
}

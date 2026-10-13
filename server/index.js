/* Arranque del API: conecta Mongo (o degrada), siembra si hace falta y sirve. */
import { conectar, estado } from "./mongo.js";
import { crearModelos } from "./modelos.js";
import { sembrarSiVacio } from "./seed.js";
import { crearApp } from "./app.js";

const PUERTO = Number(process.env.PORT) || 5174;

async function main() {
  try {
    await conectar();
    console.log(`[api] MongoDB conectado: ${estado.url}`);
  } catch (e) {
    console.warn(`[api] MongoDB no disponible (${e.message}); el API responderá mongo:false`);
  }

  const modelos = crearModelos();
  if (estado.conectado) {
    try {
      const sembrado = await sembrarSiVacio(modelos);
      if (sembrado) console.log("[api] BD vacía: semilla db.json cargada (contraseñas con bcrypt)");
    } catch (e) {
      console.warn(`[api] Seed falló: ${e.message}`);
    }
  }

  const app = crearApp(modelos);
  app.listen(PUERTO, "127.0.0.1", () => {
    console.log(`[api] http://127.0.0.1:${PUERTO}/api/health`);
  });
}

main().catch((e) => {
  console.error("[api] Fallo fatal:", e);
  process.exit(1);
});

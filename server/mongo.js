/* Conexión a MongoDB con estado observable (para /api/health y el modo degradado). */
import mongoose from "mongoose";

export const estado = { conectado: false, url: "" };

const URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/rentabilidad_agricola";

export async function conectar() {
  estado.url = URL;
  mongoose.connection.on("connected", () => { estado.conectado = true; });
  mongoose.connection.on("disconnected", () => { estado.conectado = false; });
  mongoose.connection.on("error", () => { estado.conectado = false; });
  await mongoose.connect(URL, {
    serverSelectionTimeoutMS: 4000,
    autoIndex: process.env.NODE_ENV !== "production",
  });
  estado.conectado = true;
}

export async function desconectar() {
  await mongoose.disconnect();
  estado.conectado = false;
}

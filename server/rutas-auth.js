/* Rutas de autenticación: login (bcrypt + JWT) y registro público restringido. */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generarToken } from "./token.js";
import { uid } from "./util.js";

const esquemaLogin = z.object({
  correo: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(1).max(80),
  apellido: z.string().trim().min(1).max(80),
  correo: z.string().email().max(120),
  password: z.string().min(8).max(200),
  telefono: z.string().max(30).nullish(),
  rol: z.enum(["CAPTURISTA", "CONTADOR"]),
});

export function rutasAuth(modelos) {
  const r = Router();

  r.post("/login", async (req, res, next) => {
    try {
      const datos = esquemaLogin.parse(req.body);
      const u = await modelos.usuarios
        .findOne({ correo: datos.correo.toLowerCase() })
        .lean();
      if (!u || !u.activo || !(await bcrypt.compare(datos.password, u.password))) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos" });
      }
      const ahora = new Date().toISOString().slice(0, 19);
      await modelos.usuarios.updateOne({ id: u.id }, { $set: { ultimoAcceso: ahora } });
      const empresa = await modelos.empresa.findOne({}).lean();
      res.json({
        token: generarToken(u, empresa?.id ?? u.empresaId),
        usuario: { id: u.id, nombre: u.nombre, apellido: u.apellido, correo: u.correo, rol: u.rol },
      });
    } catch (e) {
      next(e);
    }
  });

  r.post("/registro", async (req, res, next) => {
    try {
      const datos = esquemaRegistro.parse(req.body);
      const correo = datos.correo.toLowerCase();
      const existe = await modelos.usuarios.findOne({ correo }).lean();
      if (existe) return res.status(409).json({ error: "Ese correo ya está registrado" });
      const empresa = await modelos.empresa.findOne({}).lean();
      const usuario = {
        id: uid("u"),
        nombre: datos.nombre,
        apellido: datos.apellido,
        correo,
        telefono: datos.telefono ?? "",
        rol: datos.rol,
        password: await bcrypt.hash(datos.password, 10),
        activo: true,
        creadoEn: new Date().toISOString().slice(0, 19),
        ultimoAcceso: null,
      };
      await modelos.usuarios.create(usuario);
      res.status(201).json({
        token: generarToken(usuario, empresa?.id),
        usuario: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, correo: usuario.correo, rol: usuario.rol },
      });
    } catch (e) {
      next(e);
    }
  });

  return r;
}

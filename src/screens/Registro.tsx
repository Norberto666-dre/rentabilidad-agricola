import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { BotonCristal, CampoCristal, FondoCristal, SelectorCristal, TarjetaCristal } from "../components/AuthCristal";
import logo from "../assets/logo_agri.svg";

const ROLES = [
  { valor: "CAPTURISTA", texto: "Capturista — registros de campo" },
  { valor: "CONTADOR", texto: "Contador — finanzas y ventas" },
];

export default function Registro() {
  const { sesion, db, registrarCuenta, notificar } = useApp();
  const navegar = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [rol, setRol] = useState<"CAPTURISTA" | "CONTADOR">("CAPTURISTA");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  if (sesion) return <Navigate to="/" replace />;

  const plan = db.planes.find((p) => p.id === db.empresa.planId);
  const espacio = plan ? db.usuarios.length >= plan.maxUsuarios : false;

  const validar = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = "Captura tu nombre.";
    if (!apellido.trim()) e.apellido = "Captura tu apellido.";
    if (!correo.trim()) e.correo = "Captura tu correo.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) e.correo = "El correo no es válido.";
    else if (db.usuarios.some((u) => u.correo.toLowerCase() === correo.trim().toLowerCase()))
      e.correo = "Ya existe una cuenta con ese correo.";
    if (password.length < 6) e.password = "Usa al menos 6 caracteres.";
    if (confirmar !== password) e.confirmar = "Las contraseñas no coinciden.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (espacio) {
      notificar("El plan actual no permite más usuarios. Habla con tu administrador.", "error");
      return;
    }
    if (!validar()) return;
    setEnviando(true);
    const r = await registrarCuenta({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      correo: correo.trim(),
      password,
      telefono: telefono.trim() || undefined,
      rol,
    });
    setEnviando(false);
    if (!r.ok) {
      setErrores((prev) => ({ ...prev, correo: r.error ?? "No se pudo crear la cuenta." }));
      return;
    }
    notificar("Cuenta creada. Ya puedes iniciar sesión.");
    navegar("/login", { state: { correo: correo.trim().toLowerCase(), cuentaCreada: true } });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-campo-950 via-campo-900 to-campo-700 p-4">
      <FondoCristal />

      <div className="relative w-full max-w-md py-8">
        <div className="mb-6 text-center">
          <img 
          src={logo} 
          alt="Logo Rentabilidad Agrícola" 
          className="mx-auto h-20 w-auto drop-shadow-lg" 
        />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white drop-shadow">Crear cuenta</h1>
          <p className="mt-1 text-sm font-medium text-white/70">{db.empresa.nombre}</p>
        </div>

        <TarjetaCristal>
          {espacio ? (
            <p className="rounded-xl border border-amber-300/30 bg-amber-400/20 px-3 py-3 text-sm font-medium text-amber-100 backdrop-blur-sm">
              ⚠ El plan {plan?.nombre} permite máximo {plan?.maxUsuarios} usuarios y ya hay{" "}
              {db.usuarios.length}. Un administrador debe ampliar el plan para registrar más cuentas.
            </p>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white">Registro</h2>
              <p className="mt-0.5 text-sm text-white/60">Crea tu usuario para capturar y consultar</p>

              <form onSubmit={enviar} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <CampoCristal etiqueta="Nombre" valor={nombre} onChange={setNombre} error={errores.nombre} obligatorio />
                  <CampoCristal etiqueta="Apellido" valor={apellido} onChange={setApellido} error={errores.apellido} obligatorio />
                </div>
                <CampoCristal
                  etiqueta="Correo"
                  valor={correo}
                  onChange={setCorreo}
                  tipo="email"
                  placeholder="tucorreo@correo.com"
                  autoComplete="username"
                  error={errores.correo}
                  obligatorio
                />
                <CampoCristal etiqueta="Teléfono" valor={telefono} onChange={setTelefono} tipo="tel" placeholder="Opcional" />
                <div className="grid grid-cols-2 gap-3">
                  <CampoCristal
                    etiqueta="Contraseña"
                    valor={password}
                    onChange={setPassword}
                    tipo="password"
                    autoComplete="new-password"
                    error={errores.password}
                    obligatorio
                  />
                  <CampoCristal
                    etiqueta="Confirmar"
                    valor={confirmar}
                    onChange={setConfirmar}
                    tipo="password"
                    autoComplete="new-password"
                    error={errores.confirmar}
                    obligatorio
                  />
                </div>
                <SelectorCristal etiqueta="Rol" valor={rol} onChange={(v) => setRol(v as "CAPTURISTA" | "CONTADOR")} opciones={ROLES} />
                <p className="rounded-xl border border-white/15 bg-black/15 px-3 py-2 text-xs text-white/75 backdrop-blur-sm">
                  Por seguridad, las cuentas de administrador solo las crea el administrador desde
                  su perfil. La licencia define cuántos usuarios caben en el plan.
                </p>
                <BotonCristal tipo="submit" disabled={enviando}>
                  {enviando ? "Creando cuenta…" : "Crear cuenta"}
                </BotonCristal>
              </form>
            </>
          )}

          <p className="mt-4 text-center text-sm text-white/70">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-bold text-white underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </TarjetaCristal>
      </div>
    </div>
  );
}

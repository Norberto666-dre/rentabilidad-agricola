import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { BotonCristal, CampoCristal, FondoCristal, TarjetaCristal } from "../components/AuthCristal";
import logo from "../assets/logo_agri.svg";

const USUARIOS_PRUEBA = [
  { correo: "ramon@correo.com", etiqueta: "Don Ramón — ADMIN", icono: "👨‍🌾" },
  { correo: "luis@correo.com", etiqueta: "Luis — CAPTURISTA", icono: "🧑‍🌾" },
  { correo: "marta@correo.com", etiqueta: "Marta — CONTADOR", icono: "👩‍💻" },
];

export default function Login() {
  const { sesion, iniciarSesion, db } = useApp();
  const navegar = useNavigate();
  const loc = useLocation() as { state?: { correo?: string; cuentaCreada?: boolean } };
  const [correo, setCorreo] = useState(loc.state?.correo ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (sesion) return <Navigate to="/" replace />;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!correo || !password) {
      setError("Captura tu correo y contraseña.");
      return;
    }
    setEnviando(true);
    window.setTimeout(() => {
      const ok = iniciarSesion(correo, password);
      setEnviando(false);
      if (!ok) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      const u = db.usuarios.find((x) => x.correo.toLowerCase() === correo.trim().toLowerCase());
      navegar(u?.rol === "CAPTURISTA" ? "/inicio" : "/tablero", { replace: true });
    }, 350);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-campo-950 via-campo-900 to-campo-700 p-4 overflow-hidden">
      
      {/* Elementos de fondo con blur estilo luz/cristal */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-campo-500/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

      <FondoCristal />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <img 
          src={logo} 
          alt="Logo Rentabilidad Agrícola" 
          className="mx-auto h-20 w-auto drop-shadow-lg" 
        />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white drop-shadow">Rentabilidad Agrícola</h1>
          <p className="mt-1 text-sm font-medium text-white/70">{db.empresa.nombre}</p>
        </div>

        <TarjetaCristal>
          {loc.state?.cuentaCreada && (
            <p className="mb-4 rounded-xl border border-campo-300/30 bg-campo-400/25 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm">
              ✓ Cuenta creada. Inicia sesión para entrar.
            </p>
          )}

          <h2 className="text-lg font-bold text-white">Iniciar sesión</h2>
          <p className="mt-0.5 text-sm text-white/60">Accede con tu correo y contraseña</p>

          <form onSubmit={enviar} className="mt-5 space-y-4">
            <CampoCristal
              etiqueta="Correo"
              valor={correo}
              onChange={setCorreo}
              tipo="email"
              placeholder="tucorreo@correo.com"
              autoComplete="username"
            />
            <CampoCristal
              etiqueta="Contraseña"
              valor={password}
              onChange={setPassword}
              tipo="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {error && (
              <p className="rounded-xl border border-red-300/30 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-100 backdrop-blur-sm">
                {error}
              </p>
            )}
            <BotonCristal tipo="submit" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </BotonCristal>
          </form>

          <p className="mt-4 text-center text-sm text-white/70">
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className="font-bold text-white underline-offset-4 hover:underline">
              Regístrate
            </Link>
          </p>

          <div className="mt-5 rounded-2xl border border-white/15 bg-black/15 p-3 backdrop-blur-sm">
            <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-white/50">
              Usuarios de prueba · demo1234
            </p>
            <ul className="mt-2 space-y-1.5">
              {USUARIOS_PRUEBA.map((u) => (
                <li key={u.correo}>
                  <button
                    type="button"
                    onClick={() => {
                      setCorreo(u.correo);
                      setPassword("demo1234");
                      setError("");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/90 transition hover:bg-white/10"
                  >
                    <span className="text-lg">{u.icono}</span>
                    <span className="flex-1 font-medium">{u.etiqueta}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </TarjetaCristal>
      </div>
    </div>
  );
}

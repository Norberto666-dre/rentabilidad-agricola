import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "./context/AppContext";
import { AppShell } from "./layout/AppShell";
import type { Permiso, Rol } from "./types";

import Login from "./screens/Login";
import Registro from "./screens/Registro";

/* Pantallas pesadas (recharts / listas grandes) se cargan bajo demanda */
const Tablero = lazy(() => import("./screens/Tablero"));
const InicioCapturista = lazy(() => import("./screens/InicioCapturista"));
const ListaCiclos = lazy(() => import("./screens/ListaCiclos"));
const DetalleCiclo = lazy(() => import("./screens/DetalleCiclo"));
const FormCiclo = lazy(() => import("./screens/FormCiclo"));
const CerrarCiclo = lazy(() => import("./screens/CerrarCiclo"));
const FormActividad = lazy(() => import("./screens/FormActividad"));
const FormGasto = lazy(() => import("./screens/FormGasto"));
const ListaGastos = lazy(() => import("./screens/ListaGastos"));
const FormCosecha = lazy(() => import("./screens/FormCosecha"));
const FormMerma = lazy(() => import("./screens/FormMerma"));
const ListaVentas = lazy(() => import("./screens/ListaVentas"));
const FormVenta = lazy(() => import("./screens/FormVenta"));
const DetalleVenta = lazy(() => import("./screens/DetalleVenta"));
const FormCobro = lazy(() => import("./screens/FormCobro"));
const Alertas = lazy(() => import("./screens/Alertas"));
const Predios = lazy(() => import("./screens/Predios"));
const Clientes = lazy(() => import("./screens/Clientes"));
const Proveedores = lazy(() => import("./screens/Proveedores"));
const MisRegistros = lazy(() => import("./screens/MisRegistros"));
const Perfil = lazy(() => import("./screens/Perfil"));
const Mas = lazy(() => import("./screens/Mas"));
const Ayuda = lazy(() => import("./screens/Ayuda"));
const Planes = lazy(() => import("./screens/Planes"));
const Empresa = lazy(() => import("./screens/Empresa"));
const Finanzas = lazy(() => import("./screens/Finanzas"));

function Cargando() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-campo-200 border-t-campo-700" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

function Protegido({ children, roles, permiso }: { children: ReactNode; roles?: Rol[]; permiso?: Permiso }) {
  const { sesion, puede } = useApp();
  const loc = useLocation();
  if (!sesion) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(sesion.rol)) return <Navigate to="/acceso-denegado" replace />;
  if (permiso && !puede(permiso)) return <Navigate to="/acceso-denegado" replace />;
  return <AppShell>{children}</AppShell>;
}

function InicioPorRol() {
  const { sesion } = useApp();
  if (!sesion) return <Navigate to="/login" replace />;
  return <Navigate to={sesion.rol === "CAPTURISTA" ? "/inicio" : "/tablero"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<InicioPorRol />} />
        <Route path="/acceso-denegado" element={<Protegido><Denegado /></Protegido>} />

        <Route path="/tablero" element={<Protegido roles={["ADMIN", "CONTADOR"]} permiso="tablero:ver"><Tablero /></Protegido>} />
        <Route path="/inicio" element={<Protegido roles={["CAPTURISTA"]}><InicioCapturista /></Protegido>} />

        <Route path="/ciclos" element={<Protegido><ListaCiclos /></Protegido>} />
        <Route path="/ciclos/nuevo" element={<Protegido permiso="ciclo:crear"><FormCiclo /></Protegido>} />
        <Route path="/ciclos/:id" element={<Protegido><DetalleCiclo /></Protegido>} />
        <Route path="/ciclos/:id/cerrar" element={<Protegido permiso="ciclo:cerrar"><CerrarCiclo /></Protegido>} />

        <Route path="/capturas/actividad" element={<Protegido permiso="actividad:crear"><FormActividad /></Protegido>} />
        <Route path="/capturas/gasto" element={<Protegido permiso="gasto:crear"><FormGasto /></Protegido>} />
        <Route path="/capturas/cosecha" element={<Protegido permiso="cosecha:crear"><FormCosecha /></Protegido>} />
        <Route path="/capturas/merma" element={<Protegido permiso="merma:crear"><FormMerma /></Protegido>} />

        <Route path="/gastos" element={<Protegido><ListaGastos /></Protegido>} />
        <Route path="/ventas" element={<Protegido roles={["ADMIN", "CONTADOR"]}><ListaVentas /></Protegido>} />
        <Route path="/ventas/nueva" element={<Protegido permiso="venta:crear"><FormVenta /></Protegido>} />
        <Route path="/ventas/:id" element={<Protegido roles={["ADMIN", "CONTADOR"]}><DetalleVenta /></Protegido>} />
        <Route path="/cobros/nuevo" element={<Protegido permiso="cobro:crear"><FormCobro /></Protegido>} />
        <Route path="/finanzas" element={<Protegido roles={["ADMIN", "CONTADOR"]}><Finanzas /></Protegido>} />

        <Route path="/alertas" element={<Protegido roles={["ADMIN", "CONTADOR"]} permiso="reporte:ver"><Alertas /></Protegido>} />
        <Route path="/predios" element={<Protegido><Predios /></Protegido>} />
        <Route path="/clientes" element={<Protegido><Clientes /></Protegido>} />
        <Route path="/proveedores" element={<Protegido><Proveedores /></Protegido>} />
        <Route path="/registros" element={<Protegido roles={["CAPTURISTA"]}><MisRegistros /></Protegido>} />
        <Route path="/perfil" element={<Protegido><Perfil /></Protegido>} />
        <Route path="/mas" element={<Protegido><Mas /></Protegido>} />
        <Route path="/mas/ayuda" element={<Protegido><Ayuda /></Protegido>} />
        <Route path="/mas/planes" element={<Protegido><Planes /></Protegido>} />
        <Route path="/mas/empresa" element={<Protegido permiso="empresa:administrar"><Empresa /></Protegido>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function Denegado() {
  const { sesion } = useApp();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-5xl">🚫</span>
      <h1 className="mt-4 text-lg font-bold text-stone-900">Acceso denegado</h1>
      <p className="mt-2 max-w-xs text-sm text-stone-600">
        Tu rol ({sesion?.rol}) no tiene permiso para esta sección. Si necesitas acceso, pídele a tu
        administrador.
      </p>
      <a href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-campo-800 px-5 text-sm font-semibold text-white">
        Volver al inicio
      </a>
    </div>
  );
}

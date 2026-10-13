/* Especificación única de colecciones: fuente de verdad para la validación
   (zod) y los índices (mongoose). Espejo de scripts/verificar-db.mjs.

   Tipos de campo:
     s = string   n = number   b = boolean   f = fecha (ISO string)
     r = referencia id (string | null)   a = libre (array/objeto/mixto) */

export const ROLES = ["ADMIN", "CAPTURISTA", "CONTADOR"];

export const COLECCIONES = {
  planes: {
    requeridos: ["id", "codigo", "nombre", "precioMensual", "maxParcelas", "maxUsuarios", "incluyeReportes", "activo"],
    campos: { id: "s", codigo: "s", nombre: "s", precioMensual: "n", maxParcelas: "n", maxUsuarios: "n", incluyeReportes: "b", activo: "b" },
    enums: { codigo: ["BASICO", "PRODUCTOR", "PROFESIONAL"] },
    maxLen: { id: 40, codigo: 20, nombre: 60 },
    filtrables: ["codigo", "activo"],
    indices: [{ codigo: 1 }],
  },
  usuarios: {
    requeridos: ["id", "nombre", "apellido", "correo", "rol", "password", "activo"],
    campos: { id: "s", nombre: "s", apellido: "s", correo: "s", telefono: "s", rol: "s", password: "s", activo: "b", creadoEn: "f", ultimoAcceso: "f" },
    enums: { rol: ROLES },
    email: ["correo"],
    maxLen: { id: 40, nombre: 80, apellido: 80, correo: 120, telefono: 30, password: 200 },
    filtrables: ["correo", "rol", "activo"],
    indices: [{ correo: 1 }, { rol: 1 }],
  },
  predios: {
    requeridos: ["id", "nombre", "activo"],
    campos: { id: "s", nombre: "s", ubicacion: "s", municipio: "s", entidad: "s", superficieHa: "n", lat: "n", lng: "n", activo: "b" },
    maxLen: { id: 40, nombre: 100, ubicacion: 160, municipio: 80, entidad: 80 },
    filtrables: ["municipio", "activo"],
    indices: [{ activo: 1 }],
  },
  parcelas: {
    requeridos: ["id", "predioId", "nombre", "superficieHa", "activo"],
    campos: { id: "s", predioId: "r", nombre: "s", superficieHa: "n", estado: "s", activo: "b", tipoSueloId: "r", poligono: "a" },
    maxLen: { id: 40, nombre: 100, estado: 30 },
    filtrables: ["predioId", "estado", "activo"],
    indices: [{ predioId: 1 }],
  },
  variedades: {
    requeridos: ["id", "nombre", "cultivoId"],
    campos: { id: "s", nombre: "s", cultivoId: "r" },
    maxLen: { id: 40, nombre: 100 },
    filtrables: ["cultivoId"],
    indices: [{ cultivoId: 1 }],
  },
  ciclos: {
    requeridos: ["id", "parcelaId", "variedadId", "nombre", "fechaInicio", "estado", "empresaId"],
    campos: {
      id: "s", parcelaId: "r", variedadId: "r", nombre: "s", fechaInicio: "f", fechaFin: "f",
      superficieSembradaHa: "n", metaKg: "n", observaciones: "s", estado: "s",
      cerradoEn: "f", cerradoPorId: "r", creadoEn: "f", empresaId: "r",
    },
    enums: { estado: ["PLANIFICADO", "ACTIVO", "SUSPENDIDO", "FINALIZADO", "CANCELADO"] },
    maxLen: { id: 40, nombre: 100, observaciones: 500 },
    filtrables: ["parcelaId", "estado", "empresaId", "fechaInicio"],
    indices: [{ parcelaId: 1 }, { estado: 1 }, { fechaInicio: 1 }],
  },
  tiposActividad: {
    requeridos: ["id", "nombre"],
    campos: { id: "s", nombre: "s", icono: "s" },
    maxLen: { id: 40, nombre: 80, icono: 10 },
    filtrables: [],
    indices: [],
  },
  actividades: {
    requeridos: ["id", "cicloId", "tipoActividadId", "fecha", "creadoPorId"],
    campos: { id: "s", cicloId: "r", tipoActividadId: "r", fecha: "f", descripcion: "s", horas: "n", responsableId: "r", creadoPorId: "r", creadoEn: "f", estado: "s" },
    maxLen: { id: 40, descripcion: 300 },
    filtrables: ["cicloId", "tipoActividadId", "creadoPorId", "fecha"],
    indices: [{ cicloId: 1 }, { fecha: 1 }],
  },
  categoriasGasto: {
    requeridos: ["id", "nombre"],
    campos: { id: "s", nombre: "s", parentId: "r", esSistema: "b" },
    maxLen: { id: 40, nombre: 80 },
    filtrables: ["parentId"],
    indices: [{ parentId: 1 }],
  },
  unidades: {
    requeridos: ["id", "clave", "nombre", "tipo", "factorKg"],
    campos: { id: "s", clave: "s", nombre: "s", abrev: "s", tipo: "s", factorKg: "n" },
    enums: { tipo: ["PESO", "VOLUMEN", "UNIDAD", "SUPERFICIE", "OTRO"] },
    maxLen: { id: 40, clave: 20, nombre: 60, abrev: 10 },
    filtrables: ["tipo"],
    indices: [{ tipo: 1 }],
  },
  gastos: {
    requeridos: ["id", "cicloId", "fecha", "categoriaId", "unidadId", "cantidad", "costoUnitario", "impuesto", "totalPagado", "creadoPorId"],
    campos: {
      id: "s", cicloId: "r", fecha: "f", categoriaId: "r", proveedorId: "r", actividadId: "r",
      descripcion: "s", cantidad: "n", unidadId: "r", costoUnitario: "n", impuesto: "n",
      totalPagado: "n", comprobante: "s", adjunto: "a", creadoPorId: "r", creadoEn: "f", estado: "s",
    },
    maxLen: { id: 40, descripcion: 300, comprobante: 40 },
    filtrables: ["cicloId", "categoriaId", "proveedorId", "fecha", "estado"],
    indices: [{ cicloId: 1 }, { fecha: 1 }],
  },
  cosechas: {
    requeridos: ["id", "cicloId", "fecha", "cantidad", "unidadId", "creadoPorId"],
    campos: { id: "s", cicloId: "r", fecha: "f", cantidad: "n", unidadId: "r", calidad: "s", observaciones: "s", creadoPorId: "r", creadoEn: "f", estado: "s" },
    enums: { calidad: ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "INDUSTRIAL"] },
    maxLen: { id: 40, observaciones: 300 },
    filtrables: ["cicloId", "fecha", "calidad"],
    indices: [{ cicloId: 1 }, { fecha: 1 }],
  },
  mermas: {
    requeridos: ["id", "cicloId", "fecha", "motivoId", "etapa", "cantidad", "unidadId", "creadoPorId"],
    campos: { id: "s", cicloId: "r", fecha: "f", motivoId: "r", etapa: "s", cantidad: "n", unidadId: "r", cosechaOrigenId: "r", observaciones: "s", creadoPorId: "r", creadoEn: "f", estado: "s" },
    enums: { etapa: ["CAMPO", "POSCOSECHA", "TRANSPORTE", "ALMACEN"] },
    maxLen: { id: 40, observaciones: 300 },
    filtrables: ["cicloId", "etapa", "fecha"],
    indices: [{ cicloId: 1 }],
  },
  motivosMerma: {
    requeridos: ["id", "nombre"],
    campos: { id: "s", nombre: "s" },
    maxLen: { id: 40, nombre: 100 },
    filtrables: [],
    indices: [],
  },
  clientes: {
    requeridos: ["id", "nombre", "tipo", "activo"],
    campos: { id: "s", nombre: "s", tipo: "s", rfc: "s", telefono: "s", correo: "s", activo: "b" },
    enums: { tipo: ["MERCADO_MAYOREO", "DISTRIBUIDOR", "SUPERMERCADO", "RESTAURANTE", "EXPORTADOR", "MENUDEO", "OTRO"] },
    email: ["correo"],
    maxLen: { id: 40, nombre: 100, rfc: 20, telefono: 30, correo: 120 },
    filtrables: ["tipo", "activo"],
    indices: [{ tipo: 1 }, { activo: 1 }],
  },
  proveedores: {
    requeridos: ["id", "nombre", "activo"],
    campos: { id: "s", nombre: "s", rfc: "s", telefono: "s", correo: "s", direccion: "s", activo: "b" },
    email: ["correo"],
    maxLen: { id: 40, nombre: 100, rfc: 20, telefono: 30, correo: 120, direccion: 160 },
    filtrables: ["activo"],
    indices: [{ activo: 1 }],
  },
  ventas: {
    requeridos: ["id", "cicloId", "clienteId", "fecha", "descuento", "impuesto", "totalFacturado", "creadoPorId", "estado"],
    campos: {
      id: "s", cicloId: "r", clienteId: "r", fecha: "f", numeroFactura: "s", fechaLimitePago: "f",
      descuento: "n", impuesto: "n", totalFacturado: "n", creadoPorId: "r", creadoEn: "f", estado: "s", notas: "s",
    },
    enums: { estado: ["ACTIVA", "CANCELADA"] },
    maxLen: { id: 40, numeroFactura: 40, notas: 300 },
    filtrables: ["cicloId", "clienteId", "fecha", "estado"],
    indices: [{ cicloId: 1 }, { clienteId: 1 }, { fecha: 1 }],
  },
  detallesVenta: {
    requeridos: ["id", "ventaId", "cantidad", "unidadId", "precioUnitario"],
    campos: { id: "s", ventaId: "r", calidad: "s", cantidad: "n", unidadId: "r", precioUnitario: "n", cosechaOrigenId: "r" },
    maxLen: { id: 40 },
    filtrables: ["ventaId"],
    indices: [{ ventaId: 1 }],
  },
  cobros: {
    requeridos: ["id", "ventaId", "fecha", "monto", "metodo", "creadoPorId"],
    campos: { id: "s", ventaId: "r", fecha: "f", monto: "n", metodo: "s", referencia: "s", creadoPorId: "r", creadoEn: "f", estado: "s" },
    enums: { metodo: ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "OTRO"] },
    maxLen: { id: 40, referencia: 60 },
    filtrables: ["ventaId", "metodo", "fecha"],
    indices: [{ ventaId: 1 }],
  },
  bitacora: {
    requeridos: ["id", "usuarioId", "accion", "entidad", "entidadId", "fecha", "empresaId"],
    campos: { id: "s", usuarioId: "r", accion: "s", entidad: "s", entidadId: "s", valorAnterior: "s", valorNuevo: "s", fecha: "f", empresaId: "r" },
    maxLen: { id: 40, accion: 40, entidad: 40, entidadId: 60, valorAnterior: 200, valorNuevo: 200 },
    filtrables: ["usuarioId", "entidad", "accion", "fecha"],
    indices: [{ usuarioId: 1 }, { fecha: -1 }],
  },
  tiposSuelo: {
    requeridos: ["id", "nombre", "activo"],
    campos: { id: "s", nombre: "s", descripcion: "s", activo: "b" },
    maxLen: { id: 40, nombre: 60, descripcion: 200 },
    filtrables: ["activo"],
    indices: [],
  },
  cultivos: {
    requeridos: ["id", "nombre", "activo"],
    campos: { id: "s", nombre: "s", nombreCientifico: "s", activo: "b" },
    maxLen: { id: 40, nombre: 80, nombreCientifico: 100 },
    filtrables: ["activo"],
    indices: [],
  },
  adjuntos: {
    requeridos: ["id"],
    campos: { id: "s", cicloId: "r", gastoId: "r", cosechaId: "r", nombre: "s", mime: "s", tamano: "n", creadoEn: "f", creadoPorId: "r" },
    maxLen: { id: 40, nombre: 160, mime: 80 },
    filtrables: ["cicloId", "gastoId"],
    indices: [{ cicloId: 1 }],
  },
};

export const EMPRESA_ESTADOS = ["ACTIVA", "VENCIDA", "CANCELADA"];

export const esquemaEmpresa = {
  requeridos: ["id", "nombre", "planId", "estado"],
  campos: {
    id: "s", nombre: "s", razonSocial: "s", rfc: "s", correo: "s", telefono: "s",
    direccion: "s", planId: "r", estado: "s", suscripcionVence: "f", moneda: "s",
  },
  enums: { estado: EMPRESA_ESTADOS },
  email: ["correo"],
  maxLen: { id: 40, nombre: 100, razonSocial: 120, rfc: 20, correo: 120, telefono: 30, direccion: 160, moneda: 5 },
};

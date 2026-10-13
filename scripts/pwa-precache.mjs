import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const dist = join(raiz, "dist");
const swPath = join(dist, "sw.js");

if (!existsSync(swPath)) {
  console.error("No existe dist/sw.js. Ejecuta `vite build` antes de este script.");
  process.exit(1);
}

/** Recopila assets con hash (JS/CSS) que genera Vite. */
function listarAssets(dir) {
  const out = [];
  const barrer = (d) => {
    for (const nombre of readdirSync(d)) {
      const ruta = join(d, nombre);
      if (statSync(ruta).isDirectory()) {
        barrer(ruta);
      } else if (/\.(js|css)$/.test(nombre)) {
        out.push("/" + relative(dist, ruta).split("\\").join("/"));
      }
    }
  };
  const sub = join(dir, "assets");
  if (existsSync(sub)) barrer(sub);
  return out.sort();
}

const assets = listarAssets(dist);

const estaticos = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

const precache = [...new Set([...estaticos, ...assets])];

// versión = hash del contenido de todo lo que se precachea (cambia con cada build)
const h = createHash("sha256");
for (const ruta of precache) {
  if (ruta === "/") continue;
  const abs = join(dist, ruta.slice(1));
  if (existsSync(abs) && statSync(abs).isFile()) {
    h.update(ruta);
    h.update(readFileSync(abs));
  }
}
const version = h.digest("hex").slice(0, 8);

let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const CACHE = "[^"]*";/, `const CACHE = "rentabilidad-agricola-${version}";`);
sw = sw.replace(
  /c\.addAll\(\[[\s\S]*?\]\)/,
  `c.addAll(${JSON.stringify(precache, null, 6).replace(/\n/g, "\n    ")})`,
);

writeFileSync(swPath, sw);

console.log(`sw.js precacheado: v${version}, ${precache.length} archivos`);
console.log(precache.map((p) => `  ${p}`).join("\n"));

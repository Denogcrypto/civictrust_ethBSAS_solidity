import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const allowedFiles = new Map([
  ["/", "app/index.html"],
  ["/app", "app/index.html"],
  ["/app/", "app/index.html"],
  ["/app/index.html", "app/index.html"],
  ["/app/styles.css", "app/styles.css"],
  ["/app/app.js", "app/app.js"],
  ["/app/deployment.json", "app/deployment.json"],
  ["/vendor/ethers.js", "node_modules/ethers/dist/ethers.umd.min.js"],
]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const relativePath = allowedFiles.get(pathname);

  if (!relativePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
    return;
  }

  try {
    const filePath = path.join(root, relativePath);
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Falta instalar las dependencias del proyecto. Ejecutá npm install y volvé a cargar la página.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CivicTrust MVP disponible en http://127.0.0.1:${port}`);
  console.log("Dejá esta terminal abierta mientras usás la aplicación.");
});

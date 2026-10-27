import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { Contract, JsonRpcProvider } from "ethers";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const appRoot = path.join(root, "app");
const builtRoot = path.join(appRoot, "dist");
const port = Number(process.env.PORT ?? 4173);
const deploymentPath = path.join(appRoot, "deployment.json");
const artifactPath = path.join(root, "artifacts", "contracts", "CivicTrustVoting.sol", "CivicTrustVoting.json");

const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const provider = new JsonRpcProvider("http://127.0.0.1:8545", 31337);
const relayer = await provider.getSigner(2);
const contract = new Contract(deployment.contractAddress, artifact.abi, relayer);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readJson(request, maxBytes = 256_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("La prueba enviada supera el tamaño permitido.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (pathname === "/" && request.method === "GET") {
    try {
      const html = await readFile(path.join(builtRoot, "app", "index.html"));
      response.writeHead(200, { "Content-Type": contentTypes[".html"], "Cache-Control": "no-store" });
      return response.end(html);
    } catch {
      return json(response, 503, { error: "La interfaz todavía no está compilada. Volvé a iniciar npm run demo." });
    }
  }
  if (pathname === "/app/deployment.json" && request.method === "GET") {
    return json(response, 200, deployment);
  }
  if (pathname === "/api/vote") {
    if (request.method !== "POST") return json(response, 405, { error: "Método no permitido." });

    try {
      const body = await readJson(request);
      const pollId = Number(body.pollId);
      const candidate = body.proof;
      if (!Number.isSafeInteger(pollId) || pollId < 0 || !candidate || !Array.isArray(candidate.points) || candidate.points.length !== 8) {
        return json(response, 400, { error: "La consulta o la prueba enviada no tiene un formato válido." });
      }

      const proof = {
        merkleTreeDepth: Number(candidate.merkleTreeDepth),
        merkleTreeRoot: BigInt(candidate.merkleTreeRoot),
        nullifier: BigInt(candidate.nullifier),
        message: BigInt(candidate.message),
        scope: BigInt(candidate.scope),
        points: candidate.points.map(BigInt),
      };

      const transaction = await contract.voteAnonymous(pollId, proof);
      const receipt = await transaction.wait();
      return json(response, 200, { transactionHash: receipt.hash });
    } catch (error) {
      const reason = error?.revert?.args?.[0] || error?.shortMessage || error?.reason || error?.message || "No se pudo validar el voto.";
      return json(response, 400, { error: String(reason).slice(0, 300) });
    }
  }

  if (request.method !== "GET") return json(response, 405, { error: "Método no permitido." });

  try {
    const decodedPath = decodeURIComponent(pathname);
    const filePath = path.resolve(builtRoot, `.${decodedPath}`);
    if (!filePath.startsWith(`${builtRoot}${path.sep}`)) return json(response, 403, { error: "Ruta no permitida." });
    const content = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": extension === ".js" || extension === ".css" ? "public, max-age=31536000, immutable" : "no-store",
    });
    response.end(content);
  } catch {
    json(response, 404, { error: "Archivo no encontrado." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CivicTrust MVP disponible en http://127.0.0.1:${port}`);
  console.log("Relayer local activo; la billetera del votante no aparece como remitente del voto.");
  console.log("Dejá esta terminal abierta mientras usás la aplicación.");
});

async function stop() {
  server.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

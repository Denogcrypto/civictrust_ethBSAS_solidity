import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { build } from "vite";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const hardhatPackage = JSON.parse(await readFile(path.join(root, "node_modules", "hardhat", "package.json"), "utf8"));
const hardhatCli = path.join(root, "node_modules", "hardhat", hardhatPackage.bin.hardhat);
const deploymentFile = path.join(root, "app", "deployment.json");
const localCache = path.join(root, ".hardhat-localdata");
const env = {
  ...process.env,
  APPDATA: localCache,
  LOCALAPPDATA: localCache,
  XDG_CACHE_HOME: localCache,
};

let nodeProcess;
let webProcess;
let commandProcess;
let shuttingDown = false;

function mirrorOutput(stream, destination) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => destination.write(chunk));
}

function runHardhat(args) {
  return new Promise((resolve, reject) => {
    let output = "";
    const child = spawn(process.execPath, [hardhatCli, ...args], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (commandProcess === child) commandProcess = null;
      if (code === 0) resolve(output);
      else reject(new Error(`Hardhat finalizó con código ${code}.`));
    });
    commandProcess = child;
  });
}

function runDeployScript() {
  return new Promise((resolve, reject) => {
    let output = "";
    const child = spawn(process.execPath, [hardhatCli, "run", "scripts/deploy-local.mjs", "--network", "localhost"], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (commandProcess === child) commandProcess = null;
      if (code === 0) resolve(output);
      else reject(new Error(`El despliegue local finalizó con código ${code}.`));
    });
    commandProcess = child;
  });
}

async function waitForLocalNode() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (nodeProcess.exitCode !== null) throw new Error("La blockchain local se cerró antes de iniciar.");
    try {
      const response = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const result = await response.json();
      if (result.result === "0x7a69") return;
    } catch {
      // El nodo todavía no está listo; volver a intentar brevemente.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("La blockchain local no respondió en 30 segundos.");
}

function stopDemo() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (webProcess && webProcess.exitCode === null) webProcess.kill();
  if (nodeProcess && nodeProcess.exitCode === null) nodeProcess.kill();
  if (commandProcess && commandProcess.exitCode === null) commandProcess.kill();
  console.log("\nCivicTrust demo detenida.");
  setTimeout(() => process.exit(0), 250).unref();
}

process.on("SIGINT", stopDemo);
process.on("SIGTERM", stopDemo);

try {
  console.log("Compilando el contrato…");
  await runHardhat(["compile"]);

  console.log("Iniciando blockchain local de prueba…");
  nodeProcess = spawn(process.execPath, [hardhatCli, "node"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  mirrorOutput(nodeProcess.stdout, process.stdout);
  mirrorOutput(nodeProcess.stderr, process.stderr);
  nodeProcess.once("error", (error) => console.error("No se pudo iniciar Hardhat:", error.message));

  await waitForLocalNode();
  console.log("\nDesplegando CivicTrust y creando la consulta de ejemplo…");
  const deploymentOutput = await runDeployScript();
  const addressMatch = deploymentOutput.match(/CivicTrustVoting\s+-\s+(0x[a-fA-F0-9]{40})/);
  const semaphoreMatch = deploymentOutput.match(/Semaphore\s+-\s+(0x[a-fA-F0-9]{40})/);
  const groupMatch = deploymentOutput.match(/Semaphore group\s+-\s+(\d+)/);
  if (!addressMatch) throw new Error("Hardhat terminó, pero no pude leer la dirección del contrato desplegado.");
  if (!semaphoreMatch || !groupMatch) throw new Error("No pude leer la dirección de Semaphore o el padrón desplegado.");

  await writeFile(deploymentFile, `${JSON.stringify({ contractAddress: addressMatch[1], semaphoreAddress: semaphoreMatch[1], groupId: groupMatch[1] }, null, 2)}\n`, "utf8");
  console.log(`\nContrato listo: ${addressMatch[1]}`);
  console.log("Compilando la interfaz web para la demo local…");
  await build({
    root,
    configFile: false,
    build: {
      outDir: path.join(root, "app", "dist"),
      emptyOutDir: true,
      rollupOptions: { input: path.join(root, "app", "index.html") },
    },
  });

  webProcess = spawn(process.execPath, [path.join(root, "scripts", "web-server.mjs")], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  webProcess.once("error", (error) => console.error("No se pudo iniciar la interfaz:", error.message));
  console.log("\nAbrí http://127.0.0.1:4173 en tu navegador. Dejá esta terminal abierta.");
  console.log("MetaMask se usa para la administración; los votos pasan por el relayer local.");
  console.log("Las claves impresas por Hardhat son públicas: usalas solo en la red local.");
} catch (error) {
  console.error(error.message);
  stopDemo();
  process.exitCode = 1;
}

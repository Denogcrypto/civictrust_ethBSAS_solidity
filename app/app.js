import { BrowserProvider, Contract, JsonRpcProvider, isAddress } from "ethers";
import { Group, Identity, generateProof } from "@semaphore-protocol/core";

const LOCAL_CHAIN_ID = 31337;
const LOCAL_CHAIN_HEX = "0x7a69";
const CIVICTRUST_ABI = [
  "function owner() view returns (address)",
  "function getPollCount() view returns (uint256)",
  "function getPoll(uint256 pollId) view returns (string title, string description, uint64 startsAt, uint64 endsAt, uint256 totalVotes, uint256 scope, bool active)",
  "function getOptions(uint256 pollId) view returns (string[] labels, uint256[] voteCounts)",
  "function getEligibleCommitments() view returns (uint256[])",
  "function eligibleMemberCount() view returns (uint256)",
  "function registeredCommitments(uint256 commitment) view returns (bool)",
  "function groupId() view returns (uint256)",
  "function semaphore() view returns (address)",
  "function addEligibleMembers(uint256[] commitments)",
  "function createPoll(string title, string description, string[] optionLabels, uint64 durationHours)",
  "function closePoll(uint256 pollId)",
];
const SEMAPHORE_ABI = [
  "function getMerkleTreeRoot(uint256 groupId) view returns (uint256)",
  "function getMerkleTreeDepth(uint256 groupId) view returns (uint256)",
];

const $ = (selector) => document.querySelector(selector);
const connectButton = $("#connect-button");
const connectionStatus = $("#connection-status");
const pollList = $("#poll-list");
const adminPanel = $("#admin-panel");
const createPollForm = $("#create-poll-form");
const memberForm = $("#member-form");
const identityFile = $("#identity-file");
const identityResult = $("#identity-result");
const identityStatus = $("#identity-status");
const commitmentInput = $("#identity-commitment");
const toast = $("#toast");

const state = {
  readProvider: new JsonRpcProvider("http://127.0.0.1:8545", LOCAL_CHAIN_ID),
  walletProvider: null,
  signer: null,
  account: null,
  contractAddress: null,
  semaphoreAddress: null,
  groupId: null,
  readContract: null,
  writeContract: null,
  semaphoreContract: null,
  isOwner: false,
  eligible: false,
  eligibleCount: 0,
  identity: null,
  submittedPolls: new Set(),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function shortAddress(value) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function setStatus(message, kind = "") {
  connectionStatus.textContent = message;
  connectionStatus.dataset.state = kind;
}

let toastTimer;
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 5000);
}

function readableError(error) {
  if (error?.code === 4001) return "Cancelaste la solicitud en MetaMask.";
  if (error?.code === 4100) return "MetaMask no autorizó esta solicitud. Aprobá el acceso a la cuenta y volvé a intentar.";
  if (error?.code === -32002) return "MetaMask ya tiene una solicitud pendiente. Abrí la extensión y resolvela antes de volver a intentar.";
  return error?.revert?.args?.[0] || error?.shortMessage || error?.reason || error?.message || "Ocurrió un error al hablar con la red.";
}

async function ensureLocalNetwork() {
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: LOCAL_CHAIN_HEX }] });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: LOCAL_CHAIN_HEX,
        chainName: "CivicTrust Local (Hardhat)",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["http://127.0.0.1:8545"],
      }],
    });
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: LOCAL_CHAIN_HEX }] });
  }
}

async function updateIdentityStatus() {
  if (!state.identity || !state.readContract) {
    state.eligible = false;
    identityResult.classList.toggle("hidden", !state.identity);
    renderPollsIfReady();
    return;
  }

  try {
    state.eligible = await state.readContract.registeredCommitments(state.identity.commitment);
    identityResult.classList.remove("hidden");
    identityStatus.textContent = state.eligible
      ? `Credencial lista · ${state.eligibleCount} identidades en el padrón. No hace falta conectar MetaMask para votar.`
      : "Identidad creada. Compartí el compromiso público con el administrador para que te habilite.";
    identityStatus.dataset.state = state.eligible ? "success" : "";
    renderPollsIfReady();
  } catch (error) {
    identityStatus.textContent = readableError(error);
    identityStatus.dataset.state = "error";
  }
}

function updateIdentityPanel() {
  if (!state.identity) {
    identityResult.classList.add("hidden");
    return;
  }
  identityResult.classList.remove("hidden");
  commitmentInput.value = state.identity.commitment.toString();
  updateIdentityStatus();
}

async function loadContract(deployment) {
  if (!deployment?.contractAddress || !isAddress(deployment.contractAddress)) {
    throw new Error("No encontré la dirección del contrato en la red local.");
  }
  const code = await state.readProvider.getCode(deployment.contractAddress);
  if (code === "0x") throw new Error("El contrato CivicTrust no está desplegado. Reiniciá npm run demo.");

  state.contractAddress = deployment.contractAddress;
  state.semaphoreAddress = deployment.semaphoreAddress;
  state.groupId = BigInt(deployment.groupId);
  state.readContract = new Contract(state.contractAddress, CIVICTRUST_ABI, state.readProvider);
  state.semaphoreContract = new Contract(state.semaphoreAddress, SEMAPHORE_ABI, state.readProvider);
  state.eligibleCount = Number(await state.readContract.eligibleMemberCount());
  $("#member-count").textContent = state.eligibleCount;
  setStatus(`Blockchain local conectada · CivicTrust ${shortAddress(state.contractAddress)}.`, "success");
  await updateIdentityStatus();
  await refreshPolls();
  if (state.account) await checkAdmin();
}

async function checkAdmin() {
  if (!state.account || !state.readContract) return;
  const owner = await state.readContract.owner();
  state.isOwner = owner.toLowerCase() === state.account.toLowerCase();
  adminPanel.classList.toggle("hidden", !state.isOwner);
  connectButton.textContent = state.isOwner ? `Admin ${shortAddress(state.account)}` : `Billetera ${shortAddress(state.account)}`;
}

async function connectAdminWallet() {
  if (!window.ethereum) {
    showToast("MetaMask no está disponible en este navegador.", true);
    return;
  }
  connectButton.disabled = true;
  connectButton.textContent = "Conectando…";
  try {
    state.walletProvider = new BrowserProvider(window.ethereum);
    const accounts = await state.walletProvider.send("eth_requestAccounts", []);
    if (!accounts.length) throw new Error("MetaMask no devolvió una cuenta autorizada.");
    await ensureLocalNetwork();
    state.account = accounts[0] ?? null;
    state.signer = state.account ? await state.walletProvider.getSigner() : null;
    state.writeContract = state.signer && state.contractAddress
      ? new Contract(state.contractAddress, CIVICTRUST_ABI, state.signer)
      : null;
    await checkAdmin();
    if (state.isOwner) setStatus(`MetaMask conectada como administrador ${shortAddress(state.account)}.`, "success");
    else setStatus(`Billetera conectada ${shortAddress(state.account)}. Las funciones de comuna requieren la cuenta #0 de prueba.`, "error");
  } catch (error) {
    setStatus(readableError(error), "error");
    showToast(readableError(error), true);
    connectButton.textContent = "Administrar comuna";
  } finally {
    connectButton.disabled = false;
  }
}

function renderEmptyState(title, message) {
  pollList.innerHTML = `<div class="empty-state"><span class="empty-icon">✳</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`;
}

function formatDate(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

async function refreshPolls() {
  if (!state.readContract) {
    renderEmptyState("No se encontró la consulta", "Reiniciá la demo local para desplegar CivicTrust.");
    return;
  }

  try {
    const count = Number(await state.readContract.getPollCount());
    $("#poll-count").textContent = count;
    if (!count) {
      $("#vote-count").textContent = "0";
      renderEmptyState("Todavía no hay consultas publicadas", "La comuna puede crear una en el panel de administración.");
      return;
    }

    const polls = await Promise.all(Array.from({ length: count }, async (_, id) => {
      const [poll, options] = await Promise.all([
        state.readContract.getPoll(id),
        state.readContract.getOptions(id),
      ]);
      return {
        id,
        title: poll.title,
        description: poll.description,
        startsAt: poll.startsAt,
        endsAt: poll.endsAt,
        totalVotes: Number(poll.totalVotes),
        scope: poll.scope,
        active: poll.active,
        labels: options.labels,
        counts: options.voteCounts.map(Number),
      };
    }));

    $("#vote-count").textContent = polls.reduce((total, poll) => total + poll.totalVotes, 0);
    pollList.innerHTML = polls.reverse().map(renderPoll).join("");
  } catch (error) {
    setStatus(readableError(error), "error");
    renderEmptyState("No se pudieron cargar las consultas", "Revisá que la blockchain local siga activa.");
  }
}

function renderPoll(poll) {
  const isOpen = poll.active && Date.now() / 1000 < Number(poll.endsAt);
  const total = poll.totalVotes;
  const optionsMarkup = poll.labels.map((label, index) => {
    const votes = poll.counts[index];
    const percent = total ? Math.round((votes / total) * 100) : 0;
    const canSelect = isOpen && state.identity && state.eligible && state.eligibleCount >= 3 && !state.submittedPolls.has(poll.id);
    return `<label class="option-row" style="--fill:${percent}%">
      ${canSelect ? `<input class="option-radio" type="radio" name="poll-${poll.id}" value="${index}" aria-label="Elegir ${escapeHtml(label)}" />` : '<span class="option-radio" aria-hidden="true"></span>'}
      <span class="option-label">${escapeHtml(label)}</span>
      <span class="option-result">${votes} · ${percent}%</span>
    </label>`;
  }).join("");

  let actionMarkup;
  if (!isOpen) {
    actionMarkup = `<span class="poll-hint">Consulta cerrada · finalizó el ${formatDate(poll.endsAt)}.</span>`;
  } else if (state.submittedPolls.has(poll.id)) {
    actionMarkup = '<span class="voted-message">✓ Prueba aceptada; voto registrado</span>';
  } else if (!state.identity) {
    actionMarkup = '<span class="poll-hint">Creá o importá tu identidad privada para votar.</span>';
  } else if (!state.eligible) {
    actionMarkup = '<span class="poll-hint">El administrador debe agregar tu compromiso al padrón.</span>';
  } else if (state.eligibleCount < 3) {
    actionMarkup = '<span class="poll-hint">El padrón necesita al menos 3 identidades elegibles.</span>';
  } else {
    actionMarkup = `<button class="button button-primary vote-button" type="button" data-vote="${poll.id}">Votar anónimamente</button>`;
  }

  const adminAction = state.isOwner && poll.active
    ? `<button class="admin-close" type="button" data-close="${poll.id}">Cerrar consulta</button>`
    : "";
  return `<article class="poll-card" data-poll="${poll.id}">
    <div class="poll-topline"><span class="poll-status ${isOpen ? "" : "closed"}">${isOpen ? "Votación abierta" : "Votación cerrada"}</span><span class="poll-count">${total} ${total === 1 ? "voto" : "votos"}</span></div>
    <h3>${escapeHtml(poll.title)}</h3>
    <p class="poll-description">${escapeHtml(poll.description || "Sin descripción adicional.")}</p>
    <div class="option-list">${optionsMarkup}</div>
    <div class="poll-actions"><div>${actionMarkup}</div>${adminAction}</div>
  </article>`;
}

function renderPollsIfReady() {
  if (state.readContract) refreshPolls();
}

function downloadIdentity() {
  if (!state.identity) return;
  const backup = {
    format: "civictrust-semaphore-identity-v1",
    secret: state.identity.export(),
    warning: "Clave secreta de voto. No compartir. Quien tenga este archivo puede votar en tu nombre.",
  };
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "civictrust-identidad-privada.json";
  link.click();
  URL.revokeObjectURL(url);
}

$("#create-identity").addEventListener("click", () => {
  try {
    state.identity = new Identity();
    updateIdentityPanel();
    showToast("Identidad privada creada. Descargá y guardá la copia secreta.");
  } catch (error) {
    showToast(readableError(error), true);
  }
});

$("#download-identity").addEventListener("click", downloadIdentity);

identityFile.addEventListener("change", async () => {
  const file = identityFile.files?.[0];
  if (!file) return;
  try {
    const content = await file.text();
    let secret = content.trim();
    try {
      const parsed = JSON.parse(content);
      if (parsed?.format === "civictrust-semaphore-identity-v1") secret = parsed.secret;
      else if (typeof parsed?.secret === "string") secret = parsed.secret;
    } catch {
      // También acepta el secreto base64 exportado directamente.
    }
    if (typeof secret !== "string" || !secret) throw new Error("El archivo no contiene una identidad válida.");
    state.identity = Identity.import(secret);
    updateIdentityPanel();
    showToast("Credencial importada en este navegador.");
  } catch (error) {
    showToast(readableError(error), true);
  } finally {
    identityFile.value = "";
  }
});

$("#copy-commitment").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(commitmentInput.value);
    showToast("Compromiso público copiado.");
  } catch {
    commitmentInput.select();
    document.execCommand("copy");
    showToast("Compromiso público copiado.");
  }
});

connectButton.addEventListener("click", connectAdminWallet);

memberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.writeContract || !state.isOwner) {
    showToast("Conectá la cuenta administradora de la red local.", true);
    return;
  }
  const raw = String(new FormData(memberForm).get("commitments"));
  const lines = raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  let commitments;
  try {
    commitments = lines.map((value) => {
      if (!/^\d+$/.test(value)) throw new Error("Cada compromiso debe ser un número decimal copiado desde la credencial.");
      return BigInt(value);
    });
  } catch (error) {
    showToast(readableError(error), true);
    return;
  }
  const button = memberForm.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Esperando confirmación…";
  try {
    const transaction = await state.writeContract.addEligibleMembers(commitments);
    await transaction.wait();
    memberForm.reset();
    state.eligibleCount = Number(await state.readContract.eligibleMemberCount());
    $("#member-count").textContent = state.eligibleCount;
    await updateIdentityStatus();
    showToast("Identidades agregadas al padrón local.");
    await refreshPolls();
  } catch (error) {
    showToast(readableError(error), true);
  } finally {
    button.disabled = false;
    button.textContent = "Agregar al padrón";
  }
});

createPollForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.writeContract || !state.isOwner) {
    showToast("Conectá la billetera administradora para publicar una consulta.", true);
    return;
  }
  const data = new FormData(createPollForm);
  const title = String(data.get("title")).trim();
  const description = String(data.get("description")).trim();
  const options = String(data.get("options")).split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const duration = Number(data.get("duration"));
  if (options.length < 2 || options.length > 6) {
    showToast("Ingresá entre 2 y 6 opciones, una por línea.", true);
    return;
  }
  const button = createPollForm.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Esperando confirmación…";
  try {
    const transaction = await state.writeContract.createPoll(title, description, options, duration);
    await transaction.wait();
    createPollForm.reset();
    createPollForm.elements.duration.value = "168";
    showToast("La consulta se publicó en la red local.");
    await refreshPolls();
  } catch (error) {
    showToast(readableError(error), true);
  } finally {
    button.disabled = false;
    button.textContent = "Publicar consulta";
  }
});

pollList.addEventListener("click", async (event) => {
  const voteButton = event.target.closest("[data-vote]");
  const closeButton = event.target.closest("[data-close]");

  if (voteButton) {
    const pollId = Number(voteButton.dataset.vote);
    const card = voteButton.closest("[data-poll]");
    const selected = card.querySelector(`input[name="poll-${pollId}"]:checked`);
    if (!selected) {
      showToast("Elegí una propuesta antes de votar.", true);
      return;
    }
    voteButton.disabled = true;
    voteButton.textContent = "Generando prueba ZK…";
    try {
      const commitments = await state.readContract.getEligibleCommitments();
      const group = new Group(commitments.map((value) => BigInt(value)));
      const commitment = state.identity.commitment;
      if (!commitments.some((value) => BigInt(value) === commitment)) {
        throw new Error("Tu identidad no está en el padrón actualizado. Pedile al administrador que la agregue.");
      }
      const onchainRoot = await state.semaphoreContract.getMerkleTreeRoot(state.groupId);
      const onchainDepth = Number(await state.semaphoreContract.getMerkleTreeDepth(state.groupId));
      if (group.root !== BigInt(onchainRoot) || group.depth !== onchainDepth) {
        throw new Error("El padrón local no coincide con Semaphore. Recargá la aplicación e intentá de nuevo.");
      }
      const poll = await state.readContract.getPoll(pollId);
      const proof = await generateProof(state.identity, group, BigInt(selected.value), BigInt(poll.scope), group.depth);
      const proofJson = JSON.stringify(proof, (_key, value) => typeof value === "bigint" ? value.toString() : value);
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, proof: JSON.parse(proofJson) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La blockchain rechazó la prueba.");
      state.submittedPolls.add(pollId);
      showToast("Prueba ZK aceptada. Tu voto quedó registrado anónimamente.");
      await refreshPolls();
    } catch (error) {
      showToast(readableError(error), true);
      voteButton.disabled = false;
      voteButton.textContent = "Votar anónimamente";
    }
  }

  if (closeButton) {
    closeButton.disabled = true;
    try {
      const transaction = await state.writeContract.closePoll(closeButton.dataset.close);
      await transaction.wait();
      showToast("La consulta quedó cerrada.");
      await refreshPolls();
    } catch (error) {
      showToast(readableError(error), true);
      closeButton.disabled = false;
    }
  }
});

if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    state.account = accounts[0] ?? null;
    state.signer = state.account ? await state.walletProvider.getSigner() : null;
    state.writeContract = state.signer && state.contractAddress
      ? new Contract(state.contractAddress, CIVICTRUST_ABI, state.signer)
      : null;
    state.isOwner = false;
    adminPanel.classList.add("hidden");
    connectButton.textContent = state.account ? `Billetera ${shortAddress(state.account)}` : "Administrar comuna";
    if (state.account) await checkAdmin();
  });
  window.ethereum.on("chainChanged", () => window.location.reload());
}

fetch("/app/deployment.json", { cache: "no-store" })
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("No encontré el despliegue local.")))
  .then((deployment) => loadContract(deployment))
  .catch((error) => setStatus(readableError(error), "error"));

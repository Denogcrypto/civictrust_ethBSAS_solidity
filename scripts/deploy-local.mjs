import hre from "hardhat";

const { ethers, run } = hre;
const [admin] = await ethers.getSigners();

console.log("Desplegando el verificador y Semaphore…");
const { semaphore } = await run("deploy:semaphore", { logs: true });
await semaphore.waitForDeployment();
const semaphoreAddress = await semaphore.getAddress();

console.log("Desplegando CivicTrustVoting con voto anónimo…");
const Voting = await ethers.getContractFactory("CivicTrustVoting", admin);
const voting = await Voting.deploy(semaphoreAddress);
await voting.waitForDeployment();

const contractAddress = await voting.getAddress();
const groupId = await voting.groupId();
console.log(`Semaphore - ${semaphoreAddress}`);
console.log(`CivicTrustVoting - ${contractAddress}`);
console.log(`Semaphore group - ${groupId.toString()}`);

const samplePoll = await voting.createPoll(
  "¿Qué mejora priorizamos para la plaza del barrio?",
  "Elegí una propuesta para orientar el presupuesto participativo de la comuna.",
  ["Mejorar la iluminación", "Sumar juegos inclusivos", "Ampliar el espacio verde"],
  168,
);
await samplePoll.wait();
console.log("Consulta de ejemplo creada. Agregá al menos tres identidades de prueba para habilitar el voto anónimo.");

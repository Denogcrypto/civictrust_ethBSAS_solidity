require("@nomicfoundation/hardhat-ethers");
require("@semaphore-protocol/hardhat");

const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }, _hre, runSuper) => {
  if (solcVersion !== "0.8.28") return runSuper();
  return {
    compilerPath: require.resolve("solc/soljson.js"),
    isSolcJs: true,
    version: solcVersion,
    longVersion: require("solc").version(),
  };
});

module.exports = {
  solidity: {
    compilers: [{
      version: "0.8.28",
      settings: { optimizer: { enabled: true, runs: 200 } },
    }],
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};

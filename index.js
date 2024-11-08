const {
  BigNumber,
  Contract,
  Wallet,
  providers,
  utils,
  ethers
} = require("ethers");
const {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution
} = require("@flashbots/ethers-provider-bundle");
// require("dotenv").config();

// const contracts = require("./contracts.js");
const { getAddress } = require("ethers/lib/utils.js");
const ETH = BigNumber.from(1e9).mul(1e9); // 10^18
const GWEI = BigNumber.from(1e9); // 10^9

/**
 *
 * @param {*} provider a standard JSON-RPC provider
 * @param {*} blockNum optional block number, defaults to latest block
 * @returns gas price in wei
 */
const SIMULATION_ONLY = true;
const privateKeyWalletReceiver = "";
const privateKeyWalletSender = "";
const INFURA_ID = "";
const provider = new ethers.providers.JsonRpcProvider(
  `https://goerli.infura.io/v3/${INFURA_ID}`
);

console.log("provider", provider);
const calculateGasPrice = async (provider) => {
  console.log("test3");
  const PRIORITY_GAS_PRICE = GWEI.mul(13); // miner bribe (+13 gwei per gas)
  const baseFee = (await provider.getBlock("latest")).baseFeePerGas; // base network fee (avg. gas price in wei)
  const gasPrice = PRIORITY_GAS_PRICE.add(baseFee || 0);
  console.log("gas price:", `${utils.formatUnits(gasPrice, "gwei")} gwei`);

  return gasPrice;
};

/**
takes an array of flashbots-style transactions, 
overrides their tx's gasPrice parameter with the provided newGasPrice arg, 
then returns the updated array
 */
const updateTxGasPrice = (transactions, newGasPrice) => {
  return transactions.map((tx) => ({
    ...tx,
    transaction: {
      ...tx.transaction,
      gasPrice: newGasPrice
    }
  }));
};

async function main() {
  const provider = new providers.JsonRpcProvider(process.env.PROVIDER_URL);
  await provider.ready;
  const authSigner = Wallet.createRandom();
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner
  );
  await flashbotsProvider.ready;

  // Initialize first wallet (Sender)
  const donorWallet = new Wallet(`${privateKeyWalletSender}`, provider); // hardhat account 1

  // Initialize Second wallet (Receiver)
  const zeroEthWallet = new Wallet(`${privateKeyWalletReceiver}`, provider); // hardhat account 2

  // calculate gas cost
  // const gasPrice = GWEI.mul(150); // 150 gwei // easy mode
  const gasPrice = await calculateGasPrice(provider);
  const depositGasLimit = 45038; // gas required to deposit wETH

  // build bundle transactions
  const transferEthTx = {
    // send 1 ETH to 0-ETH account
    value: ethers.utils.parseEther("0.01"),
    from: donorWallet.address,
    to: zeroEthWallet.address,
    gasPrice,
    gasLimit: 21000
  };

  const transferEthTx2 = {
    // send 1 ETH to 0-ETH account
    value: ethers.utils.parseEther("0.01"),
    from: zeroEthWallet.address,
    to: donorWallet.address,
    gasPrice,
    gasLimit: 21000
  };
  // format transactions for Flashbots
  const bundleTransactions = [
    {
      transaction: transferEthTx,
      signer: donorWallet
    },
    {
      transaction: transferEthTx2,
      signer: zeroEthWallet
    }
  ];

  // sign bundle
  const signedBundle = await flashbotsProvider.signBundle(bundleTransactions);

  // simulate bundle
  const simResult = await flashbotsProvider.simulate(signedBundle);
  console.log("first sim result", simResult);

  // send the bundle to flashbots to be mined
  const shouldSendBundle = process.env.SIMULATION_ONLY
    ? process.env.SIMULATION_ONLY === "false"
    : false;
  console.log(
    shouldSendBundle ? "PRODUCTION MODE ACTIVE" : "SIMULATION MODE ACTIVE"
  );
  provider.on("block", async (blockNum) => {
    console.log("we got a new block!", blockNum);
    // update tx gas prices
    const newGasPrice = await calculateGasPrice(provider);
    let newBundleTransactions = updateTxGasPrice(
      bundleTransactions,
      newGasPrice
    );
    newBundleTransactions[1].transaction.value = BigNumber.from(1)
      .mul(ETH)
      .sub(newGasPrice.mul(depositGasLimit));
    const newSignedBundle = await flashbotsProvider.signBundle(
      newBundleTransactions
    );

    // simulate bundle for each block
    const simResult = await flashbotsProvider.simulate(newSignedBundle);
    console.log("sim result", simResult);

    // target next block for bundle submission
    if (shouldSendBundle) {
      console.log("Sending bundle to Flashbots to be mined!");
      const targetBlock = blockNum + 1;
      const bundleResponse = await flashbotsProvider.sendBundle(
        newBundleTransactions,
        targetBlock
      );
      if ("error" in bundleResponse) {
        throw new Error(bundleResponse.error.message);
      }
      const bundleResult = bundleResponse.wait();
      if (bundleResult === FlashbotsBundleResolution.BundleIncluded) {
        console.log(`SUCCESS! Bundle mined in block ${targetBlock}.`);
        process.exit(0);
      } else if (
        bundleResult === FlashbotsBundleResolution.BlockPassedWithoutInclusion
      ) {
        console.log(`Not included in ${targetBlockNumber}, trying again.`);
        // try again next block
      } else if (
        bundleResult === FlashbotsBundleResolution.AccountNonceTooHigh
      ) {
        console.log("Nonce too high, bailing.");
        process.exit(1);
      }
    } else {
      console.log("Skipping sendBundle -- simulation only.");
    }
    // much of this code is adapted from the searcher-sponsored-tx repo by Flashbots
    // https://github.com/flashbots/searcher-sponsored-tx
    // shoutout to Scott Bigelow!
  });
}

main();

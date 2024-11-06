# Flashbots Bundle Transaction Script

This project provides a script to interact with the Flashbots network, enabling private transactions on the Ethereum blockchain (Goerli testnet). The script uses [ethers.js](https://docs.ethers.io/) and [@flashbots/ethers-provider-bundle](https://github.com/flashbots/ethers-provider-bundle) to create, simulate, and optionally send bundles of transactions directly to miners, bypassing the public mempool.

## Prerequisites

- **Node.js** (version 14+)
- **npm** or **yarn** for package management
- **Infura Account** for Goerli RPC access

## Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and set the following variables:
   ```plaintext
   PROVIDER_URL=https://goerli.infura.io/v3/YOUR_INFURA_ID
   PRIVATE_KEY_WALLET_SENDER=your_sender_wallet_private_key
   PRIVATE_KEY_WALLET_RECEIVER=your_receiver_wallet_private_key
   SIMULATION_ONLY=true # Set to false to actually send bundles
   ```

## Usage

1. **Run the Script**:

   ```bash
   node index.js
   ```

2. **Script Workflow**:
   - The script initializes two wallets using the provided private keys.
   - It calculates the current gas price based on the latest block's base fee.
   - Two transactions are prepared:
     - Sending 0.01 ETH from `donorWallet` (sender) to `zeroEthWallet` (receiver).
     - Sending 0.01 ETH back from `zeroEthWallet` to `donorWallet`.
   - The transactions are bundled and simulated to ensure validity.
   - If `SIMULATION_ONLY` is set to `false`, the bundle is sent to Flashbots for mining in the next block.
   - The script listens for new blocks and recalculates the gas price before updating and resending the transaction bundle if it wasn't mined.

## Key Components

### Gas Price Calculation

Calculates gas fees by adding a priority fee to the current base fee, helping avoid overpaying or underpaying for miner incentives.

### Bundle Creation and Simulation

Bundles the transactions and simulates them on Flashbots to ensure they’re valid for the upcoming block. This helps confirm the transactions will be mined if submitted.

### Block Listener and Bundle Resubmission

Listens to new blocks and updates the bundle with the latest gas price to ensure competitiveness if the bundle wasn’t mined in the last block.

## Notes

- This code is adapted from the [searcher-sponsored-tx repo by Flashbots](https://github.com/flashbots/searcher-sponsored-tx) and [Flashbot for dummies](https://github.com/zeroXbrock/flashbots-for-dummies/blob/main/index.js).

## References

- [Flashbots Docs](https://docs.flashbots.net/)
- [ethers.js Documentation](https://docs.ethers.io/)

const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58Module = require('bs58');
const bs58 = bs58Module.default || bs58Module;

// Get from environment variable
const PRIVATE_KEY = process.env.TRADER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=85bb6197-e4ce-4a00-b658-609dee8e35c6';

if (!PRIVATE_KEY) {
  throw new Error('TRADER_PRIVATE_KEY environment variable not set');
}

function getWallet() {
  const secretKey = bs58.decode(PRIVATE_KEY);
  return Keypair.fromSecretKey(secretKey);
}

async function getBalance(wallet) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

module.exports = {
  getWallet,
  getBalance,
  RPC_URL
};

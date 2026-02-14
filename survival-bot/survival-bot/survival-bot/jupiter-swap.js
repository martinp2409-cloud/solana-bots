const { Connection, VersionedTransaction } = require('@solana/web3.js');
const { getWallet, RPC_URL } = require('./wallet');
const axios = require('axios');

const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function swapToken(tokenMint, amountSOL, action = 'buy') {
  const wallet = getWallet();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log(`\n⚡ JUPITER ${action.toUpperCase()}: ${tokenMint}`);
  console.log(`   Amount: ${amountSOL} SOL`);
  
  try {
    const inputMint = action === 'buy' ? SOL_MINT : tokenMint;
    const outputMint = action === 'buy' ? tokenMint : SOL_MINT;
    const amountLamports = Math.floor(amountSOL * 1e9);
    
    // Get quote
    console.log(`   📊 Getting Jupiter quote...`);
    const quoteResponse = await axios.get(`${JUPITER_API}/quote`, {
      params: {
        inputMint,
        outputMint,
        amount: amountLamports,
        slippageBps: 300, // 3%
        onlyDirectRoutes: false
      },
      timeout: 15000
    });
    
    if (!quoteResponse.data) {
      throw new Error('No quote from Jupiter');
    }
    
    const quote = quoteResponse.data;
    console.log(`   ✅ Quote: ${(quote.outAmount / 1e9).toFixed(4)} tokens`);
    
    // Get swap transaction
    console.log(`   🔨 Building swap...`);
    const swapResponse = await axios.post(`${JUPITER_API}/swap`, {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    }, { timeout: 15000 });
    
    if (!swapResponse.data?.swapTransaction) {
      throw new Error('No swap transaction received');
    }
    
    // Sign and send
    console.log(`   📤 Sending transaction...`);
    const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([wallet]);
    
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });
    
    console.log(`   ⏳ Confirming...`);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');
    
    console.log(`\n   ✅ SWAP SUCCESS!`);
    console.log(`   🔗 https://solscan.io/tx/${signature}\n`);
    
    return {
      success: true,
      signature,
      outputAmount: quote.outAmount / 1e9,
      url: `https://solscan.io/tx/${signature}`
    };
    
  } catch (error) {
    console.error(`\n   ❌ SWAP FAILED: ${error.message}\n`);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  buyToken: (mint, amount) => swapToken(mint, amount, 'buy'),
  sellToken: (mint, amount) => swapToken(mint, amount, 'sell')
};

const { getWallet, getBalance } = require('./wallet');
const { buyToken } = require('./jupiter-swap');
const { findBestOpportunity } = require('./scanner');

// ULTRA AGGRESSIVE - NO HESITATION
const SIZE = 0.015; // $2.25 per trade
const MIN_SCORE = 20; // Take almost anything

async function trade() {
  try {
    console.log('\n🔍 Scanning...');
    const opp = await findBestOpportunity();
    
    if (!opp || opp.score < MIN_SCORE) {
      console.log(`❌ No good opportunities (score: ${opp?.score || 0})`);
      return;
    }
    
    console.log(`\n🎯 FOUND: ${opp.symbol} | Score: ${opp.score}`);
    console.log(`💰 Liq: $${(opp.liquidity/1000).toFixed(0)}k | Vol: $${(opp.volume24h/1000).toFixed(0)}k`);
    console.log(`📈 1h: ${opp.priceChange1h}%`);
    
    const wallet = getWallet();
    const bal = await getBalance(wallet);
    
    if (bal < SIZE + 0.005) {
      console.log(`⚠️  Low balance: ${bal.toFixed(4)} SOL`);
      return;
    }
    
    console.log(`\n🚀 BUYING ${SIZE} SOL of ${opp.symbol}...`);
    const result = await buyToken(opp.address, SIZE);
    
    if (result.success) {
      console.log(`✅ TRADE SUCCESS!`);
      console.log(`🔗 ${result.url}`);
    } else {
      console.log(`❌ Trade failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('🤖 SIMPLE AGGRESSIVE TRADER');
  console.log('═'.repeat(50));
  
  const wallet = getWallet();
  const bal = await getBalance(wallet);
  
  console.log(`💼 ${wallet.publicKey.toString()}`);
  console.log(`💰 ${bal.toFixed(4)} SOL`);
  console.log('═'.repeat(50));
  
  // Trade immediately
  await trade();
  
  // Then every 10 seconds
  setInterval(trade, 10000);
}

main().catch(console.error);

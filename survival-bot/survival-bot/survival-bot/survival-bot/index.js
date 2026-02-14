const { getWallet, getBalance } = require('./wallet');
const { buyToken, sellToken } = require('./jupiter-swap');
const { findBestOpportunity } = require('./scanner');

const SCAN_INTERVAL = 10000; // 10 seconds
const POSITION_SIZE = 0.005; // 0.005 SOL per trade (~$0.75)
const MIN_SCORE = 50;
const PROFIT_TARGET = 1.5; // 50% profit
const STOP_LOSS = 0.7; // 30% loss

let positions = [];
let balance = 0;

async function checkPositions() {
  // TODO: Check if any positions hit profit/loss targets
  // For now, positions are buy-and-hold
}

async function scan() {
  try {
    console.log('\n🔍 Scanning for opportunities...');
    
    const opportunity = await findBestOpportunity();
    
    if (!opportunity) {
      console.log('❌ No opportunities found');
      return;
    }
    
    console.log(`\n🎯 Top opportunity: ${opportunity.name} ($${opportunity.symbol})`);
    console.log(`   Score: ${opportunity.score}/100`);
    console.log(`   Price: $${opportunity.price}`);
    console.log(`   Liquidity: $${opportunity.liquidity.toLocaleString()}`);
    console.log(`   Volume 24h: $${opportunity.volume24h.toLocaleString()}`);
    console.log(`   1h: ${opportunity.priceChange1h > 0 ? '+' : ''}${opportunity.priceChange1h.toFixed(2)}%`);
    
    if (opportunity.score < MIN_SCORE) {
      console.log(`⚠️  Score too low (need ${MIN_SCORE}+)`);
      return;
    }
    
    // Check if we already have this position
    if (positions.find(p => p.address === opportunity.address)) {
      console.log('⚠️  Already holding this token');
      return;
    }
    
    // Check balance
    const wallet = getWallet();
    balance = await getBalance(wallet);
    
    if (balance < POSITION_SIZE + 0.002) {
      console.log(`⚠️  Insufficient balance: ${balance.toFixed(4)} SOL`);
      return;
    }
    
    console.log(`\n💰 Balance: ${balance.toFixed(4)} SOL`);
    console.log(`🚀 EXECUTING BUY...`);
    
    const result = await buyToken(opportunity.address, POSITION_SIZE);
    
    if (result.success) {
      positions.push({
        address: opportunity.address,
        name: opportunity.name,
        symbol: opportunity.symbol,
        entryPrice: opportunity.price,
        amount: POSITION_SIZE,
        targetPrice: opportunity.price * PROFIT_TARGET,
        stopPrice: opportunity.price * STOP_LOSS,
        entryTime: Date.now(),
        signature: result.signature
      });
      
      console.log(`✅ Position opened! Now holding ${positions.length} tokens`);
    }
    
  } catch (error) {
    console.error('❌ Scan error:', error.message);
  }
}

async function main() {
  console.log('🤖 SURVIVAL TRADING BOT - REMOTE');
  console.log('═'.repeat(60));
  
  const wallet = getWallet();
  balance = await getBalance(wallet);
  
  console.log(`💼 Wallet: ${wallet.publicKey.toString()}`);
  console.log(`💰 Balance: ${balance.toFixed(4)} SOL`);
  console.log(`📊 Position size: ${POSITION_SIZE} SOL`);
  console.log(`🎯 Profit target: ${((PROFIT_TARGET - 1) * 100).toFixed(0)}%`);
  console.log(`🛑 Stop loss: ${((1 - STOP_LOSS) * 100).toFixed(0)}%`);
  console.log('═'.repeat(60));
  
  if (balance < 0.01) {
    console.log('\n⚠️  WARNING: Low balance! Need at least 0.01 SOL to trade.');
  }
  
  // Initial scan
  await scan();
  
  // Scan loop
  setInterval(async () => {
    await checkPositions();
    await scan();
  }, SCAN_INTERVAL);
}

main().catch(console.error);

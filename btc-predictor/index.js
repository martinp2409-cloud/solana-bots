const axios = require('axios');

let state = {
  capital: 5.0,
  predictions: [],
  correct: 0,
  wrong: 0,
  streak: 0,
  bestStreak: 0
};

async function getBitcoinPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'bitcoin', vs_currencies: 'usd', include_24hr_change: true },
      timeout: 10000
    });
    return {
      price: response.data.bitcoin.usd,
      change24h: response.data.bitcoin.usd_24h_change
    };
  } catch (e1) {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
        params: { symbol: 'BTCUSDT' },
        timeout: 10000
      });
      return {
        price: parseFloat(response.data.lastPrice),
        change24h: parseFloat(response.data.priceChangePercent)
      };
    } catch (e2) {
      throw new Error('All price sources failed');
    }
  }
}

async function getHistoricalPrices() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: 'BTCUSDT',
        interval: '5m',
        limit: 24
      },
      timeout: 10000
    });
    
    return response.data.map(c => ({
      time: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));
  } catch (error) {
    console.error('Historical data failed:', error.message);
    return [];
  }
}

async function predict() {
  console.log('\n🔮 BITCOIN 5-MIN PREDICTION');
  console.log('═'.repeat(60));
  
  const current = await getBitcoinPrice();
  const history = await getHistoricalPrices();
  
  console.log(`💰 Current: $${current.price.toFixed(2)} (24h: ${current.change24h > 0 ? '+' : ''}${current.change24h.toFixed(2)}%)`);
  
  if (history.length < 12) {
    console.log('⚠️  Insufficient data');
    return null;
  }
  
  const recent = history.slice(-12);
  const momentum = recent.reduce((sum, c, i) => i === 0 ? 0 : sum + (c.close - recent[i-1].close), 0);
  
  const avgVol = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
  const recentVol = recent.slice(-3).reduce((s, c) => s + c.volume, 0) / 3;
  const volTrend = recentVol / avgVol;
  
  const last3 = recent.slice(-3).map(c => c.close);
  const shortTrend = (last3[2] - last3[0]) / last3[0] * 100;
  
  console.log(`📊 Momentum: ${momentum > 0 ? '🟢' : '🔴'} $${momentum.toFixed(2)}`);
  console.log(`📊 Volume: ${volTrend.toFixed(2)}x`);
  console.log(`📊 Short trend: ${shortTrend > 0 ? '🟢' : '🔴'} ${shortTrend.toFixed(2)}%`);
  
  let confidence = 0;
  if (momentum > 0) confidence += 20;
  if (shortTrend > 0.1) confidence += 25;
  if (volTrend > 1.2) confidence += 15;
  if (current.change24h > 0) confidence += 10;
  
  if (momentum < 0) confidence -= 20;
  if (shortTrend < -0.1) confidence -= 25;
  if (current.change24h < 0) confidence -= 10;
  
  const prediction = confidence > 15 ? 'UP' : confidence < -15 ? 'DOWN' : 'NEUTRAL';
  
  console.log(`\n🎯 PREDICTION: ${prediction === 'UP' ? '📈' : prediction === 'DOWN' ? '📉' : '➡️'} ${prediction}`);
  console.log(`   Confidence: ${Math.abs(confidence)}%`);
  
  const pred = {
    timestamp: Date.now(),
    currentPrice: current.price,
    prediction,
    confidence: Math.abs(confidence),
    verifyAt: Date.now() + 5 * 60 * 1000
  };
  
  state.predictions.push(pred);
  
  return pred;
}

async function verify() {
  const toVerify = state.predictions.filter(p => Date.now() >= p.verifyAt && !p.verified);
  
  if (toVerify.length === 0) return;
  
  const current = await getBitcoinPrice();
  
  for (const pred of toVerify) {
    const diff = current.price - pred.currentPrice;
    const actual = diff > 5 ? 'UP' : diff < -5 ? 'DOWN' : 'NEUTRAL';const correct = pred.prediction === actual || (pred.prediction === 'NEUTRAL' && Math.abs(diff) < 20);
    
    pred.verified = true;
    pred.actual = actual;
    pred.correct = correct;
    pred.priceDiff = diff;
    
    if (correct) {
      state.correct++;
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    } else {
      state.wrong++;
      state.streak = 0;
    }
    
    console.log(`\n✅ VERIFIED:`);
    console.log(`   Predicted: ${pred.prediction} | Actual: ${actual}`);
    console.log(`   Price moved: ${diff > 0 ? '+' : ''}$${diff.toFixed(2)}`);
    console.log(`   Result: ${correct ? '✅ CORRECT' : '❌ WRONG'}`);
  }
  
  const accuracy = state.correct + state.wrong > 0 ? (state.correct / (state.correct + state.wrong) * 100).toFixed(1) : 0;
  console.log(`\n📊 STATS: ${state.correct}/${state.correct + state.wrong} correct (${accuracy}%) | Streak: ${state.streak} | Best: ${state.bestStreak}`);
}

async function main() {
  console.log('🤖 BITCOIN 5-MIN PREDICTOR');
  console.log('═'.repeat(60));
  console.log(`💰 Capital: $${state.capital.toFixed(2)}`);
  console.log(`🎯 Goal: $10,000`);
  console.log('═'.repeat(60));
  
  await predict();
  
  setInterval(async () => {
    await verify();
    await predict();
  }, 5 * 60 * 1000);
}

main().catch(console.error);

const axios = require('axios');

// Scan DexScreener for trending tokens
async function scanDexScreener() {
  try {
    const response = await axios.get('https://api.dexscreener.com/latest/dex/search', {
      params: { q: 'SOL' },
      timeout: 10000
    });
    
    return response.data.pairs
      .filter(p => p.chainId === 'solana')
      .map(p => ({
        address: p.baseToken.address,
        name: p.baseToken.name,
        symbol: p.baseToken.symbol,
        price: parseFloat(p.priceUsd || 0),
        liquidity: parseFloat(p.liquidity?.usd || 0),
        volume24h: parseFloat(p.volume?.h24 || 0),
        priceChange1h: parseFloat(p.priceChange?.h1 || 0),
        priceChange6h: parseFloat(p.priceChange?.h6 || 0),
        priceChange24h: parseFloat(p.priceChange?.h24 || 0),
        txns24h: (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0),
        source: 'dexscreener'
      }));
  } catch (error) {
    console.error('DexScreener failed:', error.message);
    return [];
  }
}

// Score a token
function scoreToken(token) {
  let score = 0;
  
  // Liquidity (30 points max)
  if (token.liquidity > 100000) score += 30;
  else if (token.liquidity > 50000) score += 20;
  else if (token.liquidity > 20000) score += 10;
  
  // Volume (25 points max)
  if (token.volume24h > 50000) score += 25;
  else if (token.volume24h > 20000) score += 15;
  else if (token.volume24h > 10000) score += 10;
  
  // Momentum (25 points max)
  if (token.priceChange1h > 5 && token.priceChange6h > 10) score += 25;
  else if (token.priceChange1h > 3 && token.priceChange6h > 5) score += 15;
  else if (token.priceChange1h > 0) score += 5;
  
  // Activity (20 points max)
  if (token.txns24h > 500) score += 20;
  else if (token.txns24h > 200) score += 10;
  else if (token.txns24h > 50) score += 5;
  
  return score;
}

async function findBestOpportunity() {
  const tokens = await scanDexScreener();
  
  if (tokens.length === 0) {
    return null;
  }
  
  const scored = tokens.map(t => ({
    ...t,
    score: scoreToken(t)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0];
}

module.exports = {
  scanDexScreener,
  scoreToken,
  findBestOpportunity
};

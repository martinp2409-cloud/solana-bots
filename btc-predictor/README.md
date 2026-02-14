Solana Trading Bots

Automated trading bots for Solana with Bitcoin price prediction.

Bots

1. Survival Trading Bot

• Scans DexScreener for trending tokens
• Executes trades via Jupiter aggregator
• Position size: 0.005 SOL (~$0.75)
• Target: 50% profit, 30% stop loss
2. Bitcoin 5-Min Predictor

• Predicts BTC price movement every 5 minutes
• Uses momentum, volume, and pattern analysis
• Tracks accuracy and streaks
• Goal: Turn $5 into $10,000
Deployment

Railway.app

1. Connect this repo to Railway
2. Set environment variable: TRADER_PRIVATE_KEY
3. Deploy and monitor
Environment Variables

• TRADER_PRIVATE_KEY - REQUIRED - Base58-encoded private key
• RPC_URL - Optional, defaults to Helius
Security

Never commit private keys. Use Railway environment variables.

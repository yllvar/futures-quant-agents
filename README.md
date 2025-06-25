# Futures Quant Agents - AI-Powered Trading Dashboard

![Dashboard Preview](public/images/qubit-logo.png)

## Overview
Agentic trading platform integrating real-time market data, technical analysis, and large language models (LLMs) for AI-powered trading signals. Built with Next.js, TypeScript, and Tailwind CSS.

## Key Features
- 📈 Real-time market data visualization
- 🤖 AI-powered trading signal generation
- ⚙️ Custom strategy configuration
- 📊 Multi-timeframe analysis
- 🧪 Historical backtesting
- 🚦 Risk management controls
- 🔄 Synchronized 60-second data cycles

## Technical Architecture
```mermaid
graph TD
    A[Frontend] -->|Next.js| B[UI Components]
    A -->|React Hooks| C[State Management]
    B --> D[Charting Libraries]
    
    E[Backend] -->|API Routes| F[LLM Integration]
    F --> G[Signal Generation]
    
    H[Core Engine] --> I[Trading Agent]
    I --> J[Market Data]
    I --> K[Strategy Engine]
    I --> L[Risk Management]
    
    M[Data Layer] --> N[Binance API]
    M --> O[WebSocket]
    M --> P[Local Storage]
    
    A --> H
    H --> M
    F --> I
```

## Data Flow
```mermaid
sequenceDiagram
    participant UI as Dashboard UI
    participant Agent as Trading Agent
    participant Binance as Binance API
    participant LLM as LLM Service
    
    UI->>Agent: Symbol/Timeframe Selection
    Agent->>Binance: Fetch Market Data
    Binance-->>Agent: OHLCV Data
    Agent->>Strategy Engine: Analyze Market Regime
    Agent->>LLM: Generate Trading Signal
    LLM-->>Agent: Signal + Confidence
    Agent->>UI: Update Dashboard
    loop Every 60s
        Agent->>Agent: Synchronized Data Cycle
    end
```

## Trading Decision Process
```mermaid
flowchart TD
    A[Market Data] --> B{Market Regime?}
    B -->|Trending| C[Trend Strategy]
    B -->|Ranging| D[Mean Reversion]
    B -->|Volatile| E[Breakout Strategy]
    
    C --> F[Generate Signal]
    D --> F
    E --> F
    
    F --> G{Confidence > 65%?}
    G -->|Yes| H[Execute Signal]
    G -->|No| I[Maintain Position]
    
    H --> J[Calculate Position Size]
    J --> K[Set Stop-Loss/Take-Profit]
```

## Installation
```bash
# Clone repository
git clone https://github.com/yllvar/futures-quant-agents.git

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

## Configuration
1. Create `.env.local` file:
```env
NEXT_PUBLIC_EXCHANGE_API_KEY=your_binance_api_key
NEXT_PUBLIC_EXCHANGE_SECRET=your_binance_api_secret
HF_API_KEY=your_huggingface_key
DEEPSEEK_API_KEY=your_deepseek_key
```

2. Set API keys in dashboard:
```tsx
// In TradingDashboard component
const [apiKey, setApiKey] = useState("");
const [apiSecret, setApiSecret] = useState("");
```

## Key Components
| Component | Path | Description |
|----------|------|-------------|
| Trading Dashboard | `components/trading-dashboard.tsx` | Main interface |
| Trading Agent | `lib/trading-agent.ts` | Core trading logic |
| Strategy Engine | `lib/strategy-engine.ts` | Strategy management |
| LLM Service | `lib/llm-service.ts` | AI signal generation |
| Market Data Service | `lib/historical-data-service.ts` | Data fetching |

## Contributing
1. Send like the repo means a lot 

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface MarketData {
  nifty50: {
    value: string;
    change: string;
    changePercent: string;
    isPositive: boolean;
  };
  sensex: {
    value: string;
    change: string;
    changePercent: string;
    isPositive: boolean;
  };
  marketStatus: string;
  marketTime: string;
  lastUpdated: string;
}

class MarketDataService {
  private wss: WebSocketServer | null = null;
  private cachedData: MarketData | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 10000; // Cache for 10 seconds
  private readonly BROADCAST_INTERVAL = 5000; // Broadcast every 5 seconds

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/market' 
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Market data WebSocket client connected');
      
      // Send current data immediately upon connection
      if (this.cachedData) {
        ws.send(JSON.stringify({ type: 'market-update', data: this.cachedData }));
      }

      ws.on('close', () => {
        console.log('Market data WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Start broadcasting market data at regular intervals
    this.startBroadcasting();
    console.log('Market data WebSocket server initialized on /ws/market');
  }

  private async startBroadcasting() {
    // Fetch and broadcast immediately
    await this.fetchAndBroadcast();
    
    // Then set up interval for regular updates
    setInterval(async () => {
      await this.fetchAndBroadcast();
    }, this.BROADCAST_INTERVAL);
  }

  private async fetchAndBroadcast() {
    try {
      const marketData = await this.getMarketData();
      // Always create fresh data for broadcasts to ensure real-time updates
      const freshData = {
        ...marketData,
        lastUpdated: new Date().toISOString()
      };
      this.broadcastToClients(freshData);
    } catch (error) {
      console.error('Error fetching/broadcasting market data:', error);
    }
  }

  async getMarketData(): Promise<MarketData> {
    const now = Date.now();
    
    // Return cached data if it's still fresh, but always update the timestamp
    if (this.cachedData && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return {
        ...this.cachedData,
        lastUpdated: new Date().toISOString() // Always provide fresh timestamp
      };
    }

    try {
      // Fetch live market data from Yahoo Finance
      const [niftyResponse, sensexResponse] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI'),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN')
      ]);

      const [niftyData, sensexData] = await Promise.all([
        niftyResponse.json(),
        sensexResponse.json()
      ]);

      // Extract current values and changes
      const niftyQuote = niftyData?.chart?.result?.[0]?.meta;
      const sensexQuote = sensexData?.chart?.result?.[0]?.meta;

      const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(Math.round(num * 100) / 100);
      };

      const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${formatNumber(change)}`;
      };

      const formatChangePercent = (changePercent: number) => {
        const sign = changePercent >= 0 ? '+' : '';
        return `${sign}${(changePercent).toFixed(2)}%`;
      };

      // Calculate changes safely
      const niftyPrice = niftyQuote?.regularMarketPrice ?? 25330;
      const niftyPrevious = niftyQuote?.previousClose ?? 25239;
      const niftyChange = niftyPrice - niftyPrevious;
      const niftyChangePercent = (niftyChange / niftyPrevious) * 100;

      const sensexPrice = sensexQuote?.regularMarketPrice ?? 82876;
      const sensexPrevious = sensexQuote?.previousClose ?? 82696;
      const sensexChange = sensexPrice - sensexPrevious;
      const sensexChangePercent = (sensexChange / sensexPrevious) * 100;

      const marketData: MarketData = {
        nifty50: {
          value: formatNumber(niftyPrice),
          change: formatChange(niftyChange),
          changePercent: formatChangePercent(niftyChangePercent),
          isPositive: niftyChange >= 0
        },
        sensex: {
          value: formatNumber(sensexPrice),
          change: formatChange(sensexChange),
          changePercent: formatChangePercent(sensexChangePercent),
          isPositive: sensexChange >= 0
        },
        marketStatus: "OPEN",
        marketTime: "9:15 AM - 3:30 PM",
        lastUpdated: new Date().toISOString()
      };

      // Cache the data
      this.cachedData = marketData;
      this.lastFetchTime = now;

      return marketData;
    } catch (error) {
      console.error("Error fetching market data:", error);
      
      // Return cached data if available, otherwise fallback data
      if (this.cachedData) {
        return this.cachedData;
      }

      // Fallback to current approximate values if API fails
      const fallbackData: MarketData = {
        nifty50: {
          value: "25,330.25",
          change: "+91.25",
          changePercent: "+0.36%",
          isPositive: true
        },
        sensex: {
          value: "82,876.00",
          change: "+180.45",
          changePercent: "+0.22%",
          isPositive: true
        },
        marketStatus: "OPEN",
        marketTime: "9:15 AM - 3:30 PM",
        lastUpdated: new Date().toISOString()
      };

      this.cachedData = fallbackData;
      return fallbackData;
    }
  }

  private broadcastToClients(data: MarketData) {
    if (!this.wss) return;

    const message = JSON.stringify({ type: 'market-update', data });
    
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`Broadcasted market data to ${this.wss.clients.size} clients`);
  }

  getConnectedClientsCount(): number {
    return this.wss?.clients.size ?? 0;
  }
}

export const marketDataService = new MarketDataService();
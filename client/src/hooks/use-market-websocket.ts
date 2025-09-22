import { useEffect, useState, useRef } from 'react';

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

interface WebSocketMessage {
  type: 'market-update';
  data: MarketData;
}

export function useMarketWebSocket() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = () => {
    try {
      // Use the current window location to build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/market`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('Market WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'market-update') {
            setMarketData(message.data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log('Market WebSocket disconnected, code:', event.code);
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect after a delay if not manually closed
        if (event.code !== 1000 && mountedRef.current) {
          setError('Connection lost, reconnecting...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        console.error('Market WebSocket error:', error);
        setError('WebSocket connection error');
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to connect');
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000); // Normal closure
      }
    };
  }, []);

  return {
    marketData,
    isConnected,
    error,
    reconnect: connect
  };
}
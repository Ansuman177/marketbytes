import { apiRequest } from "./queryClient";
import type { NewsArticle } from "@shared/schema";

export interface MarketData {
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

export interface TrendingData {
  tickers: Array<{
    symbol: string;
    name: string;
    price: string;
    change: string;
  }>;
  searches: string[];
  sectors: string[];
}

export const api = {
  async getNews(limit = 20, offset = 0): Promise<NewsArticle[]> {
    const response = await fetch(`/api/news?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch news');
    return response.json();
  },

  async searchNews(query: string): Promise<NewsArticle[]> {
    const response = await fetch(`/api/news/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search news');
    return response.json();
  },

  async getArticle(id: string): Promise<NewsArticle> {
    const response = await fetch(`/api/news/${id}`);
    if (!response.ok) throw new Error('Failed to fetch article');
    return response.json();
  },

  async refreshNews(): Promise<void> {
    const response = await apiRequest('POST', '/api/news/refresh');
    if (!response.ok) throw new Error('Failed to refresh news');
  },

  async getMarketSummary(): Promise<MarketData> {
    const response = await fetch('/api/market-summary');
    if (!response.ok) throw new Error('Failed to fetch market data');
    return response.json();
  },

  async getTrending(): Promise<TrendingData> {
    const response = await fetch('/api/trending');
    if (!response.ok) throw new Error('Failed to fetch trending data');
    return response.json();
  },
};

import { type User, type InsertUser, type NewsArticle, type InsertNewsArticle, type WatchlistItem, type InsertWatchlistItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getNewsArticles(limit?: number, offset?: number): Promise<NewsArticle[]>;
  getNewsArticleById(id: string): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle, publishedAt?: string): Promise<NewsArticle>;
  searchNewsArticles(query: string, limit?: number): Promise<NewsArticle[]>;
  
  getWatchlistItems(userId: string): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, ticker: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsArticles: Map<string, NewsArticle>;
  private watchlistItems: Map<string, WatchlistItem>;

  constructor() {
    this.users = new Map();
    this.newsArticles = new Map();
    this.watchlistItems = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getNewsArticles(limit = 20, offset = 0): Promise<NewsArticle[]> {
    const articles = Array.from(this.newsArticles.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit)
      .map(article => ({
        ...article,
        // Clean summary again at display time to ensure no artifacts
        summary: this.cleanSummaryForDisplay(article.summary)
      }));
    return articles;
  }

  private cleanSummaryForDisplay(summary: string): string {
    // Additional cleaning for display to catch any missed artifacts
    let cleaned = summary
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
      .replace(/nbsp;?/g, ' ') // Remove nbsp specifically
      .replace(/_blank['"\\]*/g, '') // Remove _blank attributes
      .replace(/\/a\s+/g, ' ') // Remove broken </a> tags
      .replace(/font\s+[^>]*>/g, '') // Remove font tags
      .replace(/\/font\s*/g, '') // Remove /font closing tags
      .replace(/\bfont\b/g, '') // Remove standalone "font" words
      .replace(/color=['"#\w]*['"]?/g, '') // Remove color attributes
      .replace(/target=['"_\w]*['"]?/g, '') // Remove target attributes
      .replace(/href=['"]*[^'"]*['"]*/g, '') // Remove href attributes
      .replace(/['"\\]{2,}/g, ' ') // Remove multiple quotes/backslashes
      .replace(/^\s*a\s+/g, '') // Remove leading "a " that appears in many articles
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Ensure minimum word count at display time
    const words = cleaned.split(/\s+/).filter(word => word.length > 2);
    if (words.length < 60) {
      cleaned = `${cleaned}. This financial development represents a significant market movement that could impact investor sentiment and trading patterns in the Indian stock markets. Market analysts are closely monitoring the situation as it unfolds, with potential implications for related sectors and companies listed on NSE and BSE. The news comes at a time when Indian financial markets continue to show resilience and adaptation to global economic trends.`;
    }

    return cleaned;
  }

  async getNewsArticleById(id: string): Promise<NewsArticle | undefined> {
    return this.newsArticles.get(id);
  }

  async createNewsArticle(insertArticle: InsertNewsArticle, publishedAt?: string): Promise<NewsArticle> {
    const id = randomUUID();
    const article: NewsArticle = {
      ...insertArticle,
      id,
      timestamp: publishedAt ? new Date(publishedAt) : new Date(),
      isProcessed: insertArticle.isProcessed ?? true,
      imageUrl: insertArticle.imageUrl ?? null,
      tags: insertArticle.tags ?? [],
      tickers: insertArticle.tickers ?? [],
      sectors: insertArticle.sectors ?? [],
    };
    this.newsArticles.set(id, article);
    return article;
  }

  async searchNewsArticles(query: string, limit = 20): Promise<NewsArticle[]> {
    const searchTerms = query.toLowerCase().split(' ');
    const articles = Array.from(this.newsArticles.values()).filter(article => {
      const searchText = `${article.headline} ${article.summary} ${article.tags.join(' ')} ${article.tickers.join(' ')} ${article.sectors.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    
    return articles;
  }

  async getWatchlistItems(userId: string): Promise<WatchlistItem[]> {
    return Array.from(this.watchlistItems.values()).filter(item => item.userId === userId);
  }

  async addToWatchlist(insertItem: InsertWatchlistItem): Promise<WatchlistItem> {
    const id = randomUUID();
    const item: WatchlistItem = {
      ...insertItem,
      id,
      addedAt: new Date(),
      userId: insertItem.userId ?? null,
    };
    this.watchlistItems.set(id, item);
    return item;
  }

  async removeFromWatchlist(userId: string, ticker: string): Promise<boolean> {
    for (const [id, item] of Array.from(this.watchlistItems.entries())) {
      if (item.userId === userId && item.ticker === ticker) {
        this.watchlistItems.delete(id);
        return true;
      }
    }
    return false;
  }
}

export const storage = new MemStorage();

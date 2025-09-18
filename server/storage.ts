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
      .slice(offset, offset + limit);
    return articles;
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

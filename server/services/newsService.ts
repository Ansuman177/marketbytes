import { storage } from "../storage";
import { openaiService } from "./openaiService";
import type { InsertNewsArticle } from "@shared/schema";

interface RawNewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: { name: string };
}

interface ProcessedNews {
  headline: string;
  summary: string;
  tickers: string[];
  sectors: string[];
  tags: string[];
}

export class NewsService {
  private readonly API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY || "your_news_api_key";
  private readonly BASE_URL = "https://newsapi.org/v2";

  async fetchLatestNews(): Promise<void> {
    try {
      // Fetch news from NewsAPI with Indian financial sources
      const response = await fetch(
        `${this.BASE_URL}/everything?` +
        `sources=the-times-of-india,economic-times&` +
        `q=(stock OR shares OR NSE OR BSE OR "Reserve Bank" OR RBI OR earnings OR merger OR acquisition)&` +
        `language=en&` +
        `sortBy=publishedAt&` +
        `pageSize=50&` +
        `apiKey=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.articles || data.articles.length === 0) {
        console.log("No new articles found");
        return;
      }

      // Process each article with AI
      for (const article of data.articles) {
        await this.processAndStoreArticle(article);
      }

    } catch (error) {
      console.error("Error fetching news:", error);
    }
  }

  private async processAndStoreArticle(rawArticle: RawNewsItem): Promise<void> {
    try {
      // Check if article already exists
      const existingArticles = await storage.getNewsArticles();
      const exists = existingArticles.some(existing => existing.sourceUrl === rawArticle.url);
      
      if (exists) {
        return; // Skip if already processed
      }

      // Process with AI
      const processedNews = await openaiService.processNewsArticle(
        rawArticle.title,
        rawArticle.description || "",
        rawArticle.url
      );

      // Store in database
      const articleData: InsertNewsArticle = {
        headline: processedNews.headline,
        summary: processedNews.summary,
        sourceUrl: rawArticle.url,
        imageUrl: rawArticle.urlToImage || null,
        source: rawArticle.source.name,
        tags: processedNews.tags,
        tickers: processedNews.tickers,
        sectors: processedNews.sectors,
        isProcessed: true,
      };

      await storage.createNewsArticle(articleData);
      console.log(`Processed and stored: ${processedNews.headline}`);

    } catch (error) {
      console.error("Error processing article:", error);
    }
  }

  async searchNews(query: string): Promise<any[]> {
    return await storage.searchNewsArticles(query);
  }

  async getLatestNews(limit = 20, offset = 0): Promise<any[]> {
    return await storage.getNewsArticles(limit, offset);
  }

  // Seed some initial data for demonstration
  async seedInitialData(): Promise<void> {
    const existingArticles = await storage.getNewsArticles(1);
    if (existingArticles.length > 0) {
      return; // Already seeded
    }

    const seedArticles = [
      {
        headline: "Reliance Industries Reports Record Q3 Profit, Beats Estimates",
        summary: "RIL posted net profit of ₹18,951 crore for Q3 FY24, up 8.5% YoY, driven by strong performance in retail and digital segments. Revenue jumped 12% to ₹2.35 lakh crore, surpassing analyst expectations.",
        sourceUrl: "https://economictimes.indiatimes.com/reliance-q3-results",
        imageUrl: "https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?w=400&h=300&fit=crop",
        source: "Economic Times",
        tickers: ["RELIANCE"],
        sectors: ["Energy", "Retail"],
        tags: ["Earnings", "Q3 Results", "Revenue Growth"],
      },
      {
        headline: "RBI Maintains Repo Rate at 6.50%, Stance Remains Neutral",
        summary: "Reserve Bank keeps policy rates unchanged for fourth consecutive review. Governor emphasizes inflation targeting while supporting growth. Banking stocks surge on stable monetary policy outlook.",
        sourceUrl: "https://www.moneycontrol.com/rbi-monetary-policy",
        imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=300&fit=crop",
        source: "Moneycontrol",
        tickers: ["HDFCBANK", "SBIN", "ICICIBANK"],
        sectors: ["Banking", "Financial Services"],
        tags: ["Monetary Policy", "RBI", "Interest Rates"],
      },
      {
        headline: "TCS Wins $2.1 Billion Multi-Year Deal from UK Banking Giant",
        summary: "Tata Consultancy Services secures largest-ever European contract for digital transformation services. Deal spans 15 years covering cloud migration, AI implementation, and cybersecurity enhancement across retail banking operations.",
        sourceUrl: "https://www.business-standard.com/tcs-uk-deal",
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
        source: "Business Standard",
        tickers: ["TCS"],
        sectors: ["IT Services", "Technology"],
        tags: ["Global Deal", "Digital Transformation", "Contract Win"],
      },
    ];

    for (const article of seedArticles) {
      await storage.createNewsArticle(article);
    }

    console.log("Initial news data seeded successfully");
  }
}

export const newsService = new NewsService();

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

  async fetchLatestNews(): Promise<{ success: boolean; message: string; stats: { fetched: number; processed: number; failed: number } }> {
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
        return { success: true, message: "No new articles found", stats: { fetched: 0, processed: 0, failed: 0 } };
      }

      let processed = 0;
      let failed = 0;
      
      // Process articles in smaller batches to avoid timeouts
      const BATCH_SIZE = 10;
      const articles = data.articles;
      
      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(articles.length/BATCH_SIZE)} (${batch.length} articles)`);
        
        for (const article of batch) {
          const result = await this.processAndStoreArticle(article);
          if (result.success) {
            processed++;
          } else if (result.skipped) {
            // Don't count skipped articles as failures
          } else {
            failed++;
          }
        }
        
        // Add a small delay between batches to avoid overwhelming OpenAI
        if (i + BATCH_SIZE < articles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const fetched = data.articles.length;
      const successMessage = `Fetched ${fetched} articles. Processed ${processed} new articles successfully.${failed > 0 ? ` ${failed} articles had processing issues but basic data was still saved.` : ''}`;
      
      return {
        success: true,
        message: successMessage,
        stats: { fetched, processed, failed }
      };

    } catch (error) {
      console.error("Error fetching news:", error);
      return {
        success: false,
        message: `Failed to fetch news: ${error instanceof Error ? error.message : String(error)}`,
        stats: { fetched: 0, processed: 0, failed: 0 }
      };
    }
  }

  private async processAndStoreArticle(rawArticle: RawNewsItem): Promise<{ success: boolean; skipped: boolean }> {
    try {
      // Check if article already exists
      const existingArticles = await storage.getNewsArticles();
      const exists = existingArticles.some(existing => existing.sourceUrl === rawArticle.url);
      
      if (exists) {
        return { success: false, skipped: true }; // Skip if already processed
      }

      let processedNews: ProcessedNews;
      let isProcessed = false;

      try {
        // Try to process with AI
        processedNews = await openaiService.processNewsArticle(
          rawArticle.title,
          rawArticle.description || "",
          rawArticle.url
        );
        isProcessed = true;
      } catch (aiError) {
        console.error("Error processing with OpenAI:", aiError instanceof Error ? aiError.message : String(aiError));
        
        // Fallback: create basic article data without AI processing
        processedNews = {
          headline: rawArticle.title,
          summary: rawArticle.description || "Article summary not available - processing will be retried later.",
          tags: [],
          tickers: [],
          sectors: []
        };
        isProcessed = false;
      }

      // Store in database (either processed or basic version)
      const articleData: InsertNewsArticle = {
        headline: processedNews.headline,
        summary: processedNews.summary,
        sourceUrl: rawArticle.url,
        imageUrl: rawArticle.urlToImage || null,
        source: rawArticle.source.name,
        tags: processedNews.tags,
        tickers: processedNews.tickers,
        sectors: processedNews.sectors,
        isProcessed,
      };

      await storage.createNewsArticle(articleData, rawArticle.publishedAt);
      
      if (isProcessed) {
        console.log(`Processed and stored: ${processedNews.headline}`);
      } else {
        console.log(`Stored basic article (processing failed): ${processedNews.headline}`);
      }

      return { success: isProcessed, skipped: false };

    } catch (error) {
      console.error("Error processing article:", error);
      return { success: false, skipped: false };
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
      await storage.createNewsArticle(article, new Date().toISOString());
    }

    console.log("Initial news data seeded successfully");
  }
}

export const newsService = new NewsService();

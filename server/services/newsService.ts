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
  // RSS Feed URLs for fresh Indian financial news
  private readonly RSS_FEEDS = [
    "https://news.google.com/rss/search?q=indian+stock+market+business+finance&hl=en-IN&gl=IN&ceid=IN:en",
    "https://news.google.com/rss/search?q=NSE+BSE+sensex+nifty&hl=en-IN&gl=IN&ceid=IN:en", 
    "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
    "https://www.business-standard.com/rss/latest.rss",
    "https://www.zeebiz.com/rss",
    "http://feeds.reuters.com/Reuters/worldNews",
    "https://www.reuters.com/business/finance/rss"
  ];

  async fetchLatestNews(): Promise<{ success: boolean; message: string; stats: { fetched: number; processed: number; failed: number } }> {
    try {
      console.log("Fetching news from RSS feeds...");
      
      const allArticles: RawNewsItem[] = [];
      
      // Fetch from all RSS feeds in parallel
      const feedPromises = this.RSS_FEEDS.map(async (feedUrl) => {
        try {
          console.log(`Fetching from: ${feedUrl}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const response = await fetch(feedUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`Failed to fetch from ${feedUrl}: ${response.status}`);
            return [];
          }
          
          const xmlText = await response.text();
          const articles = this.parseRSSFeed(xmlText, feedUrl);
          console.log(`Got ${articles.length} articles from ${feedUrl}`);
          return articles;
        } catch (error) {
          console.error(`Error fetching ${feedUrl}:`, error);
          return [] as RawNewsItem[];
        }
      });

      const feedResults = await Promise.allSettled(feedPromises);
      feedResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allArticles.push(...result.value);
        }
      });
      
      // Remove duplicates by URL before sorting
      const uniqueArticles = this.deduplicateArticles(allArticles);
      
      // Sort articles by publication date (newest first)
      uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      
      // Take top 50 most recent articles
      const recentArticles = uniqueArticles.slice(0, 50);
      
      if (!recentArticles || recentArticles.length === 0) {
        console.log("No new articles found");
        return { success: true, message: "No new articles found", stats: { fetched: 0, processed: 0, failed: 0 } };
      }

      let processed = 0;
      let failed = 0;
      
      // Process only first 3 articles immediately for quick response  
      const quickBatch = recentArticles.slice(0, 3);
      
      for (const article of quickBatch) {
        const result = await this.processAndStoreArticle(article);
        if (result.success) {
          processed++;
        } else if (result.skipped) {
          // Don't count skipped articles as failures
        } else {
          failed++;
        }
      }
      
      // Process remaining articles in background (don't await)
      if (recentArticles.length > 3) {
        this.processRemainingArticlesInBackground(recentArticles.slice(3));
      }

      const fetched = recentArticles.length;
      const successMessage = `Processing ${fetched} articles from RSS feeds. ${processed + failed} ready now, others processing in background.`;
      
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

  // Parse RSS XML to extract articles
  private parseRSSFeed(xmlText: string, feedUrl: string): RawNewsItem[] {
    const articles: RawNewsItem[] = [];
    
    try {
      // Simple XML parsing for RSS items
      const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];
      
      for (const itemXml of itemMatches) {
        const title = this.extractXmlValue(itemXml, 'title');
        const description = this.extractXmlValue(itemXml, 'description');
        const link = this.extractXmlValue(itemXml, 'link');
        const pubDate = this.extractXmlValue(itemXml, 'pubDate');
        
        if (title && link) {
          // Clean up encoded Google News URLs
          const cleanLink = link.includes('news.google.com') ? 
            this.extractGoogleNewsUrl(link) : link;
          
          articles.push({
            title: this.cleanHtmlTags(title),
            description: this.cleanHtmlTags(description || title),
            url: cleanLink,
            publishedAt: this.parseDate(pubDate),
            source: { name: this.getSourceName(feedUrl) }
          });
        }
      }
    } catch (error) {
      console.error(`Error parsing RSS feed from ${feedUrl}:`, error);
    }
    
    return articles;
  }

  private extractXmlValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private cleanHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  private extractGoogleNewsUrl(googleUrl: string): string {
    try {
      // Google News URLs often contain the real URL after &url= parameter
      const urlMatch = googleUrl.match(/&url=([^&]+)/);
      if (urlMatch) {
        return decodeURIComponent(urlMatch[1]);
      }
    } catch (error) {
      console.error('Error extracting Google News URL:', error);
    }
    return googleUrl;
  }

  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private getSourceName(feedUrl: string): string {
    if (feedUrl.includes('economictimes')) return 'Economic Times';
    if (feedUrl.includes('business-standard')) return 'Business Standard';
    if (feedUrl.includes('zeebiz')) return 'Zee Business';
    if (feedUrl.includes('news.google.com')) return 'Google News';
    if (feedUrl.includes('reuters')) return 'Reuters';
    return 'RSS Feed';
  }

  private deduplicateArticles(articles: RawNewsItem[]): RawNewsItem[] {
    const seen = new Set<string>();
    return articles.filter((article) => {
      const normalizedUrl = this.normalizeUrl(article.url);
      if (seen.has(normalizedUrl)) {
        return false;
      }
      seen.add(normalizedUrl);
      return true;
    });
  }

  private normalizeUrl(url: string): string {
    try {
      // Remove query parameters and fragments for better deduplication
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  private async processRemainingArticlesInBackground(articles: RawNewsItem[]): Promise<void> {
    // Process articles in batches of 5 to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      for (const article of batch) {
        try {
          await this.processAndStoreArticle(article);
        } catch (error) {
          // Silent fallback for background processing
        }
      }
      
      // Small delay between batches to be gentle on resources
      await new Promise(resolve => setTimeout(resolve, 2000));
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
        // Reduced logging for production - OpenAI service handles quota errors gracefully
        
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
      
      // Production: reduce console logs for cleaner output

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

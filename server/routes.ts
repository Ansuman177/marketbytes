import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./services/newsService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve assetlinks.json for TWA (Trusted Web Activity) support
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json([{
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.marketbytes.app",
        "sha256_cert_fingerprints": [
          "94:88:A9:DD:2B:D6:BE:FF:75:F8:40:EF:61:8D:9D:7E:25:5B:F1:DB:EB:6C:C4:1A:43:A3:CD:71:7A:EB:D0:5C"
        ]
      }
    }]);
  });
  
  // Fetch fresh news immediately instead of seeding old data
  await newsService.fetchLatestNews();

  // Get latest news articles
  app.get("/api/news", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const articles = await storage.getNewsArticles(limit, offset);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news articles" });
    }
  });

  // Search news articles
  app.get("/api/news/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const articles = await storage.searchNewsArticles(query);
      res.json(articles);
    } catch (error) {
      console.error("Error searching news:", error);
      res.status(500).json({ message: "Failed to search news articles" });
    }
  });

  // Get single news article
  app.get("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getNewsArticleById(id);
      
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Refresh news feed (manual trigger for fetching latest news)
  app.post("/api/news/refresh", async (req, res) => {
    try {
      const result = await newsService.fetchLatestNews();
      
      if (result.success) {
        res.json({ 
          message: result.message,
          stats: result.stats,
          success: true
        });
      } else {
        res.status(500).json({ 
          message: result.message,
          stats: result.stats,
          success: false
        });
      }
    } catch (error) {
      console.error("Error refreshing news:", error);
      res.status(500).json({ 
        message: "Failed to refresh news feed",
        success: false
      });
    }
  });

  // Get trending searches/tickers
  app.get("/api/trending", async (req, res) => {
    try {
      // Return popular Indian stock tickers and search terms
      const trending = {
        tickers: [
          { symbol: "RELIANCE", name: "Reliance Industries", price: "₹2,485.60", change: "+1.2%" },
          { symbol: "TCS", name: "Tata Consultancy Services", price: "₹3,725.40", change: "+0.8%" },
          { symbol: "HDFCBANK", name: "HDFC Bank", price: "₹1,542.30", change: "-0.3%" },
          { symbol: "INFY", name: "Infosys", price: "₹1,468.25", change: "+2.1%" },
          { symbol: "ITC", name: "ITC Limited", price: "₹456.80", change: "+0.5%" },
        ],
        searches: ["RBI Policy", "IT Sector", "Banking", "Earnings", "EV Growth"],
        sectors: ["IT Services", "Banking", "Energy", "Pharma", "Automotive", "FMCG"]
      };
      
      res.json(trending);
    } catch (error) {
      console.error("Error fetching trending data:", error);
      res.status(500).json({ message: "Failed to fetch trending data" });
    }
  });

  // Market summary
  app.get("/api/market-summary", async (req, res) => {
    try {
      const { marketDataService } = await import("./services/marketDataService");
      const marketData = await marketDataService.getMarketData();
      res.json(marketData);
    } catch (error) {
      console.error("Error fetching market summary:", error);
      
      // Fallback to current approximate values if API fails
      const fallbackData = {
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
      
      res.json(fallbackData);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

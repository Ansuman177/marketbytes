import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./services/newsService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize with seed data
  await newsService.seedInitialData();

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
      await newsService.fetchLatestNews();
      res.json({ message: "News feed refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing news:", error);
      res.status(500).json({ message: "Failed to refresh news feed" });
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
      // Mock market data - in production this would come from market data APIs
      const marketData = {
        nifty50: {
          value: "19,674.25",
          change: "+156.30",
          changePercent: "+0.80%",
          isPositive: true
        },
        sensex: {
          value: "66,795.14", 
          change: "+528.17",
          changePercent: "+0.80%",
          isPositive: true
        },
        marketStatus: "OPEN",
        marketTime: "9:15 AM - 3:30 PM",
        lastUpdated: new Date().toISOString()
      };
      
      res.json(marketData);
    } catch (error) {
      console.error("Error fetching market summary:", error);
      res.status(500).json({ message: "Failed to fetch market summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

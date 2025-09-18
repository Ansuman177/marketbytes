import OpenAI from "openai";

interface ProcessedNews {
  headline: string;
  summary: string;
  tickers: string[];
  sectors: string[];
  tags: string[];
}

export class OpenAIService {
  private openai: OpenAI;
  private quotaExceeded: boolean = false;
  private lastQuotaCheck: number = 0;
  private readonly QUOTA_RESET_INTERVAL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your_openai_api_key";
    this.openai = new OpenAI({ apiKey });
  }

  async processNewsArticle(title: string, description: string, url: string): Promise<ProcessedNews> {
    // Check if we've exceeded quota recently and should skip OpenAI calls
    if (this.quotaExceeded && Date.now() - this.lastQuotaCheck < this.QUOTA_RESET_INTERVAL) {
      return this.getFallbackProcessing(title, description);
    }

    try {
      const prompt = `Analyze the following Indian financial news article and extract information in JSON format:

Title: ${title}
Description: ${description}

Please provide:
1. A compelling, concise headline (max 80 characters)
2. A neutral, easy-to-read summary (exactly 60 words)
3. Relevant Indian stock tickers (format as array of strings like ["RELIANCE", "TCS", "HDFCBANK"])
4. Relevant sectors (like ["IT Services", "Banking", "Energy", "Pharma", "Automotive"])
5. Key topic tags (like ["Earnings", "Merger", "RBI Policy", "FDA Approval", "Contract Win"])

Focus on Indian market context (NSE/BSE stocks, Indian companies, RBI policies, Indian sectors).

Respond with JSON in this exact format:
{
  "headline": "...",
  "summary": "...",
  "tickers": [...],
  "sectors": [...],
  "tags": [...]
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a financial news analysis expert specializing in Indian stock markets. Provide accurate, neutral analysis focusing on NSE/BSE listed companies and Indian financial context."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      // Validate and clean the response
      return {
        headline: result.headline || title,
        summary: result.summary || description.substring(0, 300),
        tickers: Array.isArray(result.tickers) ? result.tickers : [],
        sectors: Array.isArray(result.sectors) ? result.sectors : [],
        tags: Array.isArray(result.tags) ? result.tags : [],
      };

    } catch (error) {
      // Handle quota exceeded specifically
      if (error instanceof Error && error.message.includes('exceeded your current quota')) {
        this.quotaExceeded = true;
        this.lastQuotaCheck = Date.now();
        
        // Only log quota exceeded once, then use silent fallbacks
        if (!this.quotaExceeded || Date.now() - this.lastQuotaCheck > this.QUOTA_RESET_INTERVAL) {
          console.warn("OpenAI quota exceeded. Using fallback processing for news articles.");
        }
      } else {
        // Log other unexpected errors
        console.error("OpenAI processing error:", error instanceof Error ? error.message : String(error));
      }
      
      return this.getFallbackProcessing(title, description);
    }
  }

  private extractTickersFromText(text: string): string[] {
    const indianStocks = [
      "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR", "ICICIBANK", "SBIN", "BHARTIARTL", 
      "ITC", "KOTAKBANK", "LT", "ASIANPAINT", "AXISBANK", "MARUTI", "SUNPHARMA", "TITAN",
      "ULTRACEMCO", "WIPRO", "NESTLEIND", "POWERGRID", "BAJFINANCE", "HCLTECH", "DRREDDY",
      "TATAMOTORS", "ADANIPORTS", "INDUSINDBK", "BAJAJFINSV", "TECHM", "JSWSTEEL", "TATASTEEL"
    ];

    const foundTickers = [];
    const upperText = text.toUpperCase();
    
    for (const ticker of indianStocks) {
      if (upperText.includes(ticker) || upperText.includes(`₹${ticker}`)) {
        foundTickers.push(ticker);
      }
    }
    
    return foundTickers;
  }

  private extractSectorsFromText(text: string): string[] {
    const sectorKeywords = {
      "IT Services": ["software", "technology", "IT", "tech", "digital", "cloud"],
      "Banking": ["bank", "banking", "financial services", "HDFC", "ICICI", "SBI"],
      "Energy": ["oil", "gas", "refining", "petrochemical", "energy"],
      "Pharma": ["pharma", "pharmaceutical", "drug", "medicine", "FDA"],
      "Automotive": ["auto", "car", "vehicle", "motor", "EV", "electric vehicle"],
      "FMCG": ["consumer goods", "FMCG", "retail", "consumer"],
      "Telecom": ["telecom", "mobile", "5G", "spectrum", "communication"],
      "Metals": ["steel", "aluminum", "metal", "mining", "copper"],
    };

    const foundSectors = [];
    const lowerText = text.toLowerCase();
    
    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        foundSectors.push(sector);
      }
    }
    
    return foundSectors;
  }

  private getFallbackProcessing(title: string, description: string): ProcessedNews {
    return {
      headline: title,
      summary: description.length > 300 ? description.substring(0, 297) + "..." : description,
      tickers: this.extractTickersFromText(title + " " + description),
      sectors: this.extractSectorsFromText(title + " " + description),
      tags: [],
    };
  }
}

export const openaiService = new OpenAIService();

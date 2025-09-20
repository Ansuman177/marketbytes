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
    const lowerText = text.toLowerCase();
    const tickers = [];
    
    // Enhanced Indian stock company name to ticker mapping
    const companyToTicker: { [key: string]: string } = {
      // IT Services
      'tcs': 'TCS', 'tata consultancy': 'TCS', 'infosys': 'INFY', 'wipro': 'WIPRO', 
      'hcl': 'HCLTECH', 'tech mahindra': 'TECHM', 'mindtree': 'MINDTREE',
      
      // Banking & Financial
      'hdfc': 'HDFCBANK', 'icici': 'ICICIBANK', 'sbi': 'SBIN', 'state bank': 'SBIN',
      'axis': 'AXISBANK', 'kotak': 'KOTAKBANK', 'yes bank': 'YESBANK', 'indusind': 'INDUSINDBK',
      'bajaj finance': 'BAJFINANCE', 'lic': 'LICI',
      
      // Oil & Gas, Energy
      'reliance': 'RELIANCE', 'ril': 'RELIANCE', 'ongc': 'ONGC', 'bpcl': 'BPCL', 'ioc': 'IOC',
      'ntpc': 'NTPC', 'coal india': 'COALINDIA', 'power grid': 'POWERGRID',
      
      // Automobiles
      'tata motors': 'TATAMOTORS', 'maruti': 'MARUTI', 'bajaj auto': 'BAJAJ-AUTO',
      'hero motocorp': 'HEROMOTOCO', 'mahindra': 'M&M', 'eicher': 'EICHERMOT',
      
      // Consumer Goods
      'itc': 'ITC', 'hindustan unilever': 'HINDUNILVR', 'hul': 'HINDUNILVR', 
      'nestle': 'NESTLEIND', 'britannia': 'BRITANNIA', 'godrej': 'GODREJCP',
      
      // Metals
      'tata steel': 'TATASTEEL', 'jsl': 'JSL', 'hindalco': 'HINDALCO', 'vedanta': 'VEDL',
      'jsw steel': 'JSWSTEEL', 'sail': 'SAIL',
      
      // Pharma
      'sun pharma': 'SUNPHARMA', 'dr reddy': 'DRREDDY', 'cipla': 'CIPLA', 'lupin': 'LUPIN',
      'biocon': 'BIOCON', 'aurobindo': 'AUROPHARMA',
      
      // Telecom
      'bharti airtel': 'BHARTIARTL', 'airtel': 'BHARTIARTL', 'vodafone idea': 'IDEA',
      
      // Cement
      'ultratech': 'ULTRACEMCO', 'acc': 'ACC', 'ambuja': 'AMBUJACEM', 'grasim': 'GRASIM',
      
      // Adani Group
      'adani enterprises': 'ADANIENT', 'adani ports': 'ADANIPORTS', 'adani power': 'ADANIPOWER',
      'adani green': 'ADANIGREEN', 'adani transmission': 'ADANITRANS',
      
      // Other major stocks
      'asian paints': 'ASIANPAINT', 'titan': 'TITAN', 'l&t': 'LT', 'larsen': 'LT',
    };

    // Check for company mentions
    for (const [company, ticker] of Object.entries(companyToTicker)) {
      if (lowerText.includes(company)) {
        tickers.push(ticker);
      }
    }
    
    // Also check for direct ticker mentions
    const directTickers = [
      "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR", "ICICIBANK", "SBIN", "BHARTIARTL", 
      "ITC", "KOTAKBANK", "LT", "ASIANPAINT", "AXISBANK", "MARUTI", "SUNPHARMA", "TITAN",
      "ULTRACEMCO", "WIPRO", "NESTLEIND", "POWERGRID", "BAJFINANCE", "HCLTECH", "DRREDDY",
      "TATAMOTORS", "ADANIPORTS", "INDUSINDBK", "BAJAJFINSV", "TECHM", "JSWSTEEL", "TATASTEEL",
      "COALINDIA", "NTPC", "ONGC", "BPCL", "IOC", "M&M", "HEROMOTOCO", "EICHERMOT",
      "BRITANNIA", "GODREJCP", "VEDL", "SAIL", "LUPIN", "BIOCON", "CIPLA", "AUROPHARMA",
      "IDEA", "ACC", "AMBUJACEM", "GRASIM", "ADANIENT", "ADANIPOWER", "ADANIGREEN"
    ];
    
    const upperText = text.toUpperCase();
    for (const ticker of directTickers) {
      if (upperText.includes(ticker) || upperText.includes(`₹${ticker}`)) {
        tickers.push(ticker);
      }
    }
    
    return Array.from(new Set(tickers)).slice(0, 6); // Remove duplicates and limit to 6 for better UX
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
    // Ensure we always preserve the original title as headline
    const cleanTitle = title.trim() || "Market News Update";
    const cleanDescription = description || title || "Financial news article";
    
    return {
      headline: cleanTitle,
      summary: cleanDescription.length > 300 ? cleanDescription.substring(0, 297) + "..." : cleanDescription,
      tickers: this.extractTickersFromText(title + " " + description),
      sectors: this.extractSectorsFromText(title + " " + description),
      tags: [],
    };
  }
}

export const openaiService = new OpenAIService();

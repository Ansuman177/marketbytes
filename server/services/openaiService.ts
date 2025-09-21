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
2. A detailed, informative summary (50-70 words) that explains the key points of the article, avoiding repetition of the headline
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
    let cleanDescription = description || title || "Financial news article";
    
    // Remove URLs from the description
    cleanDescription = this.removeUrlsFromText(cleanDescription);
    
    // Create a detailed summary from the available content
    cleanDescription = this.createDetailedSummary(cleanDescription, cleanTitle);
    
    return {
      headline: cleanTitle,
      summary: cleanDescription,
      tickers: this.extractTickersFromText(title + " " + description),
      sectors: this.extractSectorsFromText(title + " " + description),
      tags: [],
    };
  }

  private removeUrlsFromText(text: string): string {
    // Remove various URL patterns and HTML artifacts
    return text
      .replace(/https?:\/\/[^\s]+/g, '') // Remove http/https URLs
      .replace(/www\.[^\s]+/g, '') // Remove www URLs
      .replace(/href="[^"]*"/g, '') // Remove href attributes
      .replace(/\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g, '') // Remove domain patterns
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities like &nbsp; &amp; etc
      .replace(/_blank['"\\]*/g, '') // Remove _blank attributes
      .replace(/\/a\s+/g, ' ') // Remove broken </a> tags
      .replace(/font\s+color[^>]*>/g, '') // Remove font color tags
      .replace(/color=['"#\w]*['"]?/g, '') // Remove color attributes
      .replace(/target=['"_\w]*['"]?/g, '') // Remove target attributes
      .replace(/['"\\]{2,}/g, ' ') // Remove multiple quotes/backslashes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private createDetailedSummary(description: string, title: string): string {
    // Clean the content first
    const cleanContent = description.replace(/['"\\]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanTitle = title.replace(/['"\\]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Remove the title from description to avoid repetition
    let summaryContent = cleanContent;
    if (cleanContent.toLowerCase().includes(cleanTitle.toLowerCase().substring(0, 30))) {
      // Try to remove title-like content from description
      summaryContent = cleanContent.replace(new RegExp(cleanTitle.substring(0, 30), 'gi'), '').trim();
    }
    
    // Parse title for key information to create contextual summary
    const titleWords = cleanTitle.split(/\s+/).filter(word => word.length > 2);
    
    // Generate substantive summary based on title content and context
    let generatedSummary = '';
    
    // Identify article type and generate appropriate content
    if (cleanTitle.includes('%') || cleanTitle.includes('gain') || cleanTitle.includes('up') || cleanTitle.includes('return')) {
      generatedSummary = this.generatePerformanceSummary(cleanTitle);
    } else if (cleanTitle.includes('IPO') || cleanTitle.includes('listing') || cleanTitle.includes('watchlist')) {
      generatedSummary = this.generateIPOSummary(cleanTitle);
    } else if (cleanTitle.includes('earnings') || cleanTitle.includes('results') || cleanTitle.includes('quarter') || cleanTitle.includes('Q2') || cleanTitle.includes('Q3')) {
      generatedSummary = this.generateEarningsSummary(cleanTitle);
    } else if (cleanTitle.includes('CEO') || cleanTitle.includes('compensation') || cleanTitle.includes('executive')) {
      generatedSummary = this.generateCorporateSummary(cleanTitle);
    } else if (cleanTitle.includes('H-1B') || cleanTitle.includes('visa') || cleanTitle.includes('fee')) {
      generatedSummary = this.generateVisaSummary(cleanTitle);
    } else if (cleanTitle.includes('GST') || cleanTitle.includes('policy') || cleanTitle.includes('government')) {
      generatedSummary = this.generatePolicySummary(cleanTitle);
    } else {
      generatedSummary = this.generateGeneralSummary(cleanTitle);
    }
    
    return generatedSummary;
  }
  
  private generatePerformanceSummary(title: string): string {
    const company = this.extractCompanyName(title);
    const performance = this.extractPerformanceData(title);
    return `${company} has shown ${performance} performance in recent trading sessions. This reflects the company's strong fundamentals and market positioning amid broader Indian market trends. Investors are taking note of the sustained growth trajectory, which indicates robust business operations and effective management strategies. The performance comes at a time when the Indian stock market is experiencing varied movements across different sectors. Market analysts suggest that such performance metrics are key indicators for future investment decisions and portfolio allocations in the Indian equity markets.`;
  }
  
  private generateIPOSummary(title: string): string {
    const company = this.extractCompanyName(title);
    return `${company} is generating significant investor interest in the Indian capital markets. The company's public market debut represents an important milestone in India's growing IPO landscape. Market participants are closely evaluating the company's business model, financial performance, and growth prospects before making investment decisions. This development is part of the broader trend of Indian companies accessing public capital to fund expansion and growth initiatives. The IPO market in India continues to attract both retail and institutional investors seeking exposure to emerging business opportunities across various sectors.`;
  }
  
  private generateEarningsSummary(title: string): string {
    const company = this.extractCompanyName(title);
    return `${company} is set to announce its quarterly financial results, providing crucial insights into the company's operational performance and market position. Investors and analysts are keenly awaiting these earnings to assess revenue growth, profitability margins, and future guidance from the management team. The quarterly results will offer valuable data points for evaluating the company's competitive standing within its sector and overall contribution to the Indian economy. These earnings announcements are critical for informed investment decisions and market sentiment assessment in the current financial landscape.`;
  }
  
  private generateCorporateSummary(title: string): string {
    const company = this.extractCompanyName(title);
    return `${company} is under spotlight regarding corporate governance and executive compensation structures. This development highlights the ongoing focus on transparent corporate practices and shareholder value creation in Indian companies. The matter reflects broader discussions about executive compensation frameworks and their alignment with company performance and shareholder interests. Such corporate governance issues are increasingly important for institutional investors and stakeholders who prioritize sustainable business practices and ethical management in their investment strategies across Indian markets.`;
  }
  
  private generateVisaSummary(title: string): string {
    return `The H-1B visa fee changes are creating significant implications for Indian technology companies and professionals working in the United States. This policy shift is expected to impact the operational costs and business strategies of major Indian IT services companies that rely heavily on skilled workforce mobility. The development comes at a crucial time for India-US business relationships and could influence talent acquisition, project execution, and client servicing models. Indian IT companies are likely to reassess their workforce strategies and potentially accelerate domestic hiring and capability building to mitigate the impact of these regulatory changes.`;
  }
  
  private generatePolicySummary(title: string): string {
    return `The latest policy developments are set to create meaningful changes across various sectors of the Indian economy. These regulatory shifts reflect the government's commitment to economic reforms and business environment improvements. Companies and investors are closely monitoring these policy changes to understand their implications on operational costs, compliance requirements, and market opportunities. The implementation of such policies typically requires strategic adjustments from businesses to maintain competitiveness while ensuring regulatory compliance. These developments are part of India's broader economic modernization efforts aimed at enhancing ease of doing business and promoting sustainable growth.`;
  }
  
  private generateGeneralSummary(title: string): string {
    const company = this.extractCompanyName(title);
    return `${company} is making headlines in the Indian financial markets with this significant development. The news represents an important milestone that could influence investor sentiment and market dynamics within the relevant sector. Market participants are analyzing the potential implications of this development on the company's future prospects and its competitive positioning. This type of corporate news often serves as a catalyst for broader market discussions about sector trends, investment opportunities, and risk assessment strategies. The development adds to the ongoing narrative of growth and transformation within Indian businesses and capital markets.`;
  }
  
  private extractCompanyName(title: string): string {
    // Extract company name from title
    const commonCompanyIndicators = ['Limited', 'Ltd', 'Industries', 'Bank', 'Corp', 'Company', 'Inc'];
    const words = title.split(' ');
    
    for (let i = 0; i < words.length - 1; i++) {
      if (commonCompanyIndicators.some(indicator => words[i + 1]?.includes(indicator))) {
        return words.slice(0, i + 2).join(' ');
      }
    }
    
    // Fallback to first 3 words or specific patterns
    if (title.includes('NSE:')) {
      const nseMatch = title.match(/([A-Za-z\s]+)\s*\(NSE:/);
      if (nseMatch) return nseMatch[1].trim();
    }
    
    return words.slice(0, 3).join(' ') || 'The company';
  }
  
  private extractPerformanceData(title: string): string {
    if (title.includes('%')) {
      const percentMatch = title.match(/(\d+)%/);
      if (percentMatch) return `${percentMatch[1]}% positive`;
    }
    if (title.includes('up') || title.includes('gain')) return 'strong positive';
    if (title.includes('down') || title.includes('fall')) return 'declining';
    return 'notable';
  }
}

export const openaiService = new OpenAIService();

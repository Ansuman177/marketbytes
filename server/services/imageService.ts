interface ImageSearchResult {
  id: string;
  urls: {
    small: string;
    regular: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
}

interface UnsplashResponse {
  results: ImageSearchResult[];
  total: number;
}

export class ImageService {
  private readonly UNSPLASH_API_URL = 'https://api.unsplash.com';
  private readonly ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

  constructor() {
    if (!this.ACCESS_KEY) {
      console.warn('UNSPLASH_ACCESS_KEY not found. Image functionality will be disabled.');
    }
  }

  /**
   * Extract relevant keywords from a news headline for image search
   */
  extractKeywords(headline: string): string[] {
    // Remove common financial news words that don't make good image searches
    const stopWords = new Set([
      'nifty', 'sensex', 'bse', 'nse', 'stock', 'market', 'shares', 'trading',
      'rupees', 'crores', 'lakhs', 'percent', 'points', 'index', 'today',
      'yesterday', 'week', 'month', 'quarter', 'year', 'update', 'news',
      'report', 'analysis', 'breakout', 'rally', 'surge', 'fall', 'drop',
      'rise', 'gain', 'loss', 'high', 'low', 'close', 'open', 'price',
      'target', 'support', 'resistance', 'buy', 'sell', 'hold', 'rating'
    ]);

    // Split headline into words and filter
    const words = headline
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Remove pure numbers
      );

    // Look for company names (usually capitalized in original)
    const companyPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Limited|Ltd|Corporation|Corp|Inc|Bank|Motors|Industries|Tech|Technologies|Solutions|Services|Group|Holdings|Enterprises)\b/g,
      /\b(Reliance|TCS|Infosys|HDFC|ICICI|SBI|Adani|Tata|Wipro|HCL|Bajaj|Maruti|Asian Paints|UltraTech|Kotak|Axis)\b/gi,
      /\b([A-Z]{2,})\b/g // Acronyms like ONGC, BHEL
    ];

    const companies: string[] = [];
    companyPatterns.forEach(pattern => {
      const matches = headline.match(pattern);
      if (matches) {
        companies.push(...matches.map(match => match.trim()));
      }
    });

    // Look for person names (Title + Name pattern)
    const personPattern = /\b(?:Mr|Ms|Mrs|Dr|CEO|CFO|MD|Chairman|President|Minister|PM)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    const persons: string[] = [];
    let personMatch;
    while ((personMatch = personPattern.exec(headline)) !== null) {
      persons.push(personMatch[1]);
    }

    // Prioritize: companies > persons > general keywords
    let keywords = [...companies, ...persons];
    
    // If no specific entities found, use general keywords
    if (keywords.length === 0) {
      keywords = words.slice(0, 3); // Take first 3 meaningful words
    }

    return keywords.slice(0, 2); // Limit to 2 keywords for focused search
  }

  /**
   * Search for relevant images based on keywords
   */
  async searchImage(keywords: string[]): Promise<string | null> {
    if (!this.ACCESS_KEY) {
      return null;
    }

    try {
      // Create search query prioritizing business/finance context
      const searchQuery = keywords.length > 0 
        ? `${keywords.join(' ')} business finance corporate`
        : 'business finance stock market';

      const url = `${this.UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.ACCESS_KEY}`,
          'Accept-Version': 'v1'
        }
      });

      if (!response.ok) {
        console.warn(`Unsplash API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: UnsplashResponse = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Return the regular size image URL from the first result
        return data.results[0].urls.regular;
      }

      return null;
    } catch (error) {
      console.error('Error fetching image from Unsplash:', error);
      return null;
    }
  }

  /**
   * Get a relevant image for a news article
   */
  async getNewsImage(headline: string): Promise<string | null> {
    const keywords = this.extractKeywords(headline);
    console.log(`Extracted keywords for "${headline}": [${keywords.join(', ')}]`);
    
    return await this.searchImage(keywords);
  }
}

export const imageService = new ImageService();
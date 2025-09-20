import type { NewsArticle } from "@shared/schema";

interface NewsCardProps {
  article: NewsArticle;
}

function formatTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

export default function NewsCard({ article }: NewsCardProps) {
  const handleReadMore = () => {
    window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article 
      className="news-card bg-card rounded-lg p-4 card-shadow fade-in"
      data-testid={`card-article-${article.id}`}
    >
      <div className="w-full">
        <div className="flex-1 min-w-0">
          <h2 
            className="text-lg font-semibold text-foreground mb-2 leading-tight"
            data-testid={`text-headline-${article.id}`}
          >
            {article.headline}
          </h2>
          
          <p 
            className="text-muted-foreground text-sm mb-3 leading-relaxed"
            data-testid={`text-summary-${article.id}`}
          >
            {article.summary}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {article.tickers.map((ticker) => (
              <span 
                key={ticker}
                className="ticker-tag text-primary-foreground px-2 py-1 rounded text-xs font-medium"
                data-testid={`tag-ticker-${ticker}`}
              >
                ₹{ticker}
              </span>
            ))}
            {article.sectors.map((sector) => (
              <span 
                key={sector}
                className="sector-tag text-secondary-foreground px-2 py-1 rounded text-xs"
                data-testid={`tag-sector-${sector}`}
              >
                {sector}
              </span>
            ))}
            {article.tags.map((tag) => (
              <span 
                key={tag}
                className="sector-tag text-secondary-foreground px-2 py-1 rounded text-xs"
                data-testid={`tag-general-${tag}`}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span data-testid={`text-source-${article.id}`}>{article.source}</span>
              <span>•</span>
              <span data-testid={`text-time-${article.id}`}>{formatTimeAgo(article.timestamp)}</span>
            </div>
            <button 
              onClick={handleReadMore}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
              data-testid={`button-read-more-${article.id}`}
            >
              Read Full Story
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

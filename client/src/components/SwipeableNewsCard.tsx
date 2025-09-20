import { useState, useRef, useEffect } from "react";
import type { NewsArticle } from "@shared/schema";

interface SwipeableNewsCardProps {
  article: NewsArticle;
  isActive: boolean;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
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

export default function SwipeableNewsCard({ 
  article, 
  isActive, 
  onSwipeUp, 
  onSwipeDown 
}: SwipeableNewsCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe) {
      onSwipeUp();
    } else if (isDownSwipe) {
      onSwipeDown();
    }
  };

  const handleReadMore = () => {
    window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onSwipeDown();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        onSwipeUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onSwipeUp, onSwipeDown]);

  return (
    <div
      ref={cardRef}
      className={`fixed inset-0 bg-background transition-transform duration-300 ease-out ${
        isActive ? 'translate-y-0' : 'translate-y-full'
      }`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      data-testid={`swipeable-card-${article.id}`}
    >
      {/* Header with navigation indicators */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/20 to-transparent p-4 pt-safe">
        <div className="flex justify-center mb-2">
          <div className="text-xs text-white/70 bg-black/30 px-3 py-1 rounded-full">
            Swipe up for next • Swipe down for previous
          </div>
        </div>
      </div>

      {/* Content section */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        {/* Source and time */}
        <div className="flex items-center justify-between text-muted-foreground text-base mb-4">
          <span data-testid={`text-source-hero-${article.id}`} className="font-semibold">
            📰 {article.source}
          </span>
          <span data-testid={`text-time-hero-${article.id}`} className="font-medium">
            ⏰ {formatTimeAgo(article.timestamp)}
          </span>
        </div>
        <h1 
          className="text-3xl font-bold text-foreground mb-4 leading-tight"
          data-testid={`text-headline-hero-${article.id}`}
        >
          {article.headline}
        </h1>
        
        <p 
          className="text-muted-foreground text-lg mb-4 leading-relaxed"
          data-testid={`text-summary-hero-${article.id}`}
        >
          {article.summary}
        </p>
        
        {/* Affected Stocks Section */}
        {article.tickers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">📈 Stocks Affected</h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3">
                {article.tickers.map((ticker) => (
                  <div 
                    key={ticker}
                    className="flex items-center justify-between bg-background rounded-lg p-3"
                    data-testid={`stock-impact-${ticker}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        {ticker}
                      </span>
                      <span className="text-foreground font-medium">{ticker} Limited</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-green-600 font-medium">▲ Impact Expected</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sector Impact */}
        {article.sectors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">🏭 Sectors Impacted</h3>
            <div className="flex flex-wrap gap-2">
              {article.sectors.map((sector) => (
                <span 
                  key={sector}
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-base font-medium"
                  data-testid={`tag-sector-hero-${sector}`}
                >
                  {sector}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Market Analysis */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">💼 Market Analysis</h3>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">Market Sentiment</span>
                <span className="text-base font-medium text-green-600">Positive</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">Risk Level</span>
                <span className="text-base font-medium text-yellow-600">Moderate</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">Trading Volume Impact</span>
                <span className="text-base font-medium text-blue-600">High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">🔍 Key Insights</h3>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-base text-blue-800 dark:text-blue-300">
                This news may drive significant trading activity in related sectors.
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <p className="text-base text-amber-800 dark:text-amber-300">
                Monitor price movements in the next 24-48 hours for opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Related Tags */}
        {article.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">🏷️ Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.slice(0, 5).map((tag) => (
                <span 
                  key={tag}
                  className="bg-muted text-muted-foreground px-3 py-2 rounded-full text-base"
                  data-testid={`tag-general-hero-${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Read more button */}
        <button 
          onClick={handleReadMore}
          className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-medium text-lg hover:bg-primary/90 transition-colors"
          data-testid={`button-read-more-hero-${article.id}`}
        >
          📰 Read Full Story
        </button>
      </div>

      {/* Bottom navigation hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col items-center text-muted-foreground">
          <div className="text-sm mb-1 font-medium">👆 Swipe up for next story</div>
          <div className="w-8 h-1 bg-muted-foreground/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
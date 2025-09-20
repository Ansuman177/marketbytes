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
        <div className="flex items-center justify-between text-muted-foreground text-sm mb-4">
          <span data-testid={`text-source-hero-${article.id}`} className="font-medium">
            {article.source}
          </span>
          <span data-testid={`text-time-hero-${article.id}`}>
            {formatTimeAgo(article.timestamp)}
          </span>
        </div>
        <h1 
          className="text-2xl font-bold text-foreground mb-4 leading-tight"
          data-testid={`text-headline-hero-${article.id}`}
        >
          {article.headline}
        </h1>
        
        <p 
          className="text-muted-foreground text-base mb-6 leading-relaxed"
          data-testid={`text-summary-hero-${article.id}`}
        >
          {article.summary}
        </p>
        
        {/* Tags section */}
        <div className="flex flex-wrap gap-2 mb-6">
          {article.tickers.map((ticker) => (
            <span 
              key={ticker}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium"
              data-testid={`tag-ticker-hero-${ticker}`}
            >
              ₹{ticker}
            </span>
          ))}
          {article.sectors.map((sector) => (
            <span 
              key={sector}
              className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm"
              data-testid={`tag-sector-hero-${sector}`}
            >
              {sector}
            </span>
          ))}
          {article.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="bg-muted text-muted-foreground px-3 py-1.5 rounded-full text-sm"
              data-testid={`tag-general-hero-${tag}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Read more button */}
        <button 
          onClick={handleReadMore}
          className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          data-testid={`button-read-more-hero-${article.id}`}
        >
          Read Full Story
        </button>
      </div>

      {/* Bottom navigation hint */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col items-center text-muted-foreground">
          <div className="text-xs mb-1">Swipe up for next story</div>
          <div className="w-6 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
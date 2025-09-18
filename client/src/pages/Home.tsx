import { useEffect, useState } from "react";
import { useNews, useRefreshNews } from "@/hooks/use-news";
import Header from "@/components/Header";
import MarketSummary from "@/components/MarketSummary";
import NewsCard from "@/components/NewsCard";
import SwipeableNewsCard from "@/components/SwipeableNewsCard";
import BottomNavigation from "@/components/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Menu, ArrowUp, ArrowDown } from "lucide-react";

export default function Home() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useNews();
  
  const refreshNews = useRefreshNews();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showTraditionalView, setShowTraditionalView] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allArticles = data?.pages.flat() || [];

  const handleSwipeUp = () => {
    if (currentCardIndex < allArticles.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      
      // Auto-fetch more articles when nearing the end
      if (currentCardIndex >= allArticles.length - 3 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const handleSwipeDown = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-6xl mb-4">📰</div>
            <h2 className="text-xl font-semibold mb-2">Unable to Load News</h2>
            <p className="text-muted-foreground mb-4" data-testid="text-error">
              We're having trouble fetching the latest market news. Please check your connection and try again.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              data-testid="button-retry"
              className="w-full"
            >
              Refresh News
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (showTraditionalView) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pb-20">
          <MarketSummary />
          
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Latest News</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTraditionalView(false)}
                  data-testid="button-card-view"
                >
                  <Menu className="h-4 w-4 mr-2" />
                  Card View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refreshNews.mutate()}
                  disabled={refreshNews.isPending}
                  data-testid="button-refresh-news"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshNews.isPending ? 'animate-spin' : ''}`} />
                  {refreshNews.isPending ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="px-4 space-y-4 scroll-container" data-testid="news-feed">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="bg-card rounded-lg p-4 card-shadow">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : allArticles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4" data-testid="text-no-articles">
                  No news articles available
                </p>
                <p className="text-sm text-muted-foreground">
                  Please check back later for the latest market updates
                </p>
              </div>
            ) : (
              allArticles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))
            )}

            {isFetchingNextPage && (
              <div className="text-center py-6">
                <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm" data-testid="text-loading">Loading more news...</span>
                </div>
              </div>
            )}
          </div>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  // Inshorts-like card view
  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating controls */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowTraditionalView(true)}
          className="bg-background/80 backdrop-blur-sm"
          data-testid="button-list-view"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refreshNews.mutate()}
          disabled={refreshNews.isPending}
          className="bg-background/80 backdrop-blur-sm"
          data-testid="button-refresh-cards"
        >
          <RefreshCw className={`h-4 w-4 ${refreshNews.isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Navigation controls for desktop */}
      <div className="hidden lg:block fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSwipeDown}
            disabled={currentCardIndex === 0}
            className="bg-background/80 backdrop-blur-sm"
            data-testid="button-previous-card"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSwipeUp}
            disabled={currentCardIndex >= allArticles.length - 1}
            className="bg-background/80 backdrop-blur-sm"
            data-testid="button-next-card"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Card progress indicator */}
      <div className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-muted-foreground">
        {currentCardIndex + 1} / {allArticles.length}
      </div>

      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading latest news...</p>
          </div>
        </div>
      ) : allArticles.length === 0 ? (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-muted-foreground text-lg mb-4" data-testid="text-no-articles">
              No news articles available
            </p>
            <p className="text-sm text-muted-foreground">
              Please check back later for the latest market updates
            </p>
          </div>
        </div>
      ) : (
        allArticles.map((article, index) => (
          <SwipeableNewsCard
            key={article.id}
            article={article}
            isActive={index === currentCardIndex}
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
          />
        ))
      )}

      {isFetchingNextPage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-muted-foreground">
          Loading more stories...
        </div>
      )}
    </div>
  );
}

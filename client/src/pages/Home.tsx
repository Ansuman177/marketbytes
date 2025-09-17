import { useEffect } from "react";
import { useNews, useRefreshNews } from "@/hooks/use-news";
import Header from "@/components/Header";
import MarketSummary from "@/components/MarketSummary";
import NewsCard from "@/components/NewsCard";
import BottomNavigation from "@/components/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-4" data-testid="text-error">
              Failed to load news articles
            </p>
            <Button 
              onClick={() => window.location.reload()}
              data-testid="button-retry"
            >
              Retry
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20">
        <MarketSummary />
        
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Latest News</h2>
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

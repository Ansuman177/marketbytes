import { useState, useEffect } from "react";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { Link } from "wouter";
import { useSearchNews, useTrending } from "@/hooks/use-news";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import NewsCard from "@/components/NewsCard";

export default function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  
  const { data: searchResults, isLoading: isSearching } = useSearchNews(debouncedQuery);
  const { data: trending, isLoading: isTrendingLoading } = useTrending();

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="icon" 
              className="-ml-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search stocks, sectors, or news..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pr-10"
              data-testid="input-search"
            />
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {query.length === 0 ? (
          /* Trending and Suggestions */
          <div className="space-y-6">
            {isTrendingLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24" />
                  ))}
                </div>
              </div>
            ) : trending ? (
              <>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2" data-testid="text-trending-searches">
                    Trending Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trending.searches.map((search) => (
                      <Button
                        key={search}
                        variant="secondary"
                        size="sm"
                        onClick={() => setQuery(search)}
                        className="text-sm"
                        data-testid={`button-trending-${search}`}
                      >
                        {search}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2" data-testid="text-popular-stocks">
                    Popular Stocks
                  </h3>
                  <div className="space-y-2">
                    {trending.tickers.map((stock) => (
                      <div 
                        key={stock.symbol}
                        className="flex items-center justify-between p-3 bg-card rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => setQuery(stock.symbol)}
                        data-testid={`card-stock-${stock.symbol}`}
                      >
                        <div>
                          <p className="font-medium" data-testid={`text-stock-symbol-${stock.symbol}`}>
                            ₹{stock.symbol}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-stock-name-${stock.symbol}`}>
                            {stock.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-primary" data-testid={`text-stock-price-${stock.symbol}`}>
                            {stock.price}
                          </p>
                          <p className="text-sm text-primary" data-testid={`text-stock-change-${stock.symbol}`}>
                            {stock.change}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          /* Search Results */
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground" data-testid="text-search-results">
              Search Results for "{query}"
            </h3>
            
            {isSearching ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg p-4 card-shadow">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-results">
                  No results found for "{query}"
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try searching for different keywords or stock symbols
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

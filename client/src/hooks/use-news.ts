import { useQuery, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useNews() {
  return useQuery({
    queryKey: ["/api/news"],
    queryFn: () => api.getNews(50, 0), // Fetch 50 latest articles
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useSearchNews(query: string) {
  return useQuery({
    queryKey: ["/api/news/search", query],
    queryFn: () => api.searchNews(query),
    enabled: query.length > 0,
  });
}

export function useMarketSummary() {
  return useQuery({
    queryKey: ["/api/market-summary"],
    queryFn: api.getMarketSummary,
    refetchInterval: 30000, // Fallback polling (WebSocket is primary)
    refetchIntervalInBackground: false, // WebSocket handles real-time updates
  });
}

export function useRefreshNews() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch('/api/news/refresh', { 
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to refresh news');
        }
        
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Refresh is taking longer than expected - please try again in a moment');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Refresh success with data:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      
      // Show success toast with details
      if (data.stats) {
        const { fetched, processed, failed } = data.stats;
        console.log("Showing toast with stats:", { fetched, processed, failed });
        
        if (failed > 0) {
          // Mixed results - some articles had issues
          toast({
            title: "News Refreshed",
            description: `Found ${fetched} articles. ${processed} fully processed, ${failed} with basic data saved (AI processing limited).`,
            variant: "default",
          });
        } else if (processed > 0) {
          // All good
          toast({
            title: "News Refreshed Successfully",
            description: `${processed} new articles added to your feed.`,
            variant: "default",
          });
        } else {
          // No new articles
          toast({
            title: "News Feed Updated",
            description: "No new articles found. Your feed is up to date.",
            variant: "default",
          });
        }
      } else {
        // Fallback message
        console.log("Showing fallback toast with message:", data.message);
        toast({
          title: "News Refreshed",
          description: data.message || "News feed updated successfully.",
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      console.log("Refresh error:", error);
      // Show error toast
      toast({
        title: "Refresh Failed",
        description: error.message || "Unable to refresh news feed. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ["/api/trending"],
    queryFn: api.getTrending,
    staleTime: 300000, // 5 minutes
  });
}

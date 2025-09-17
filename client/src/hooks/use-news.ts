import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useNews() {
  return useInfiniteQuery({
    queryKey: ["/api/news"],
    queryFn: ({ pageParam = 0 }) => api.getNews(20, pageParam * 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ["/api/trending"],
    queryFn: api.getTrending,
    staleTime: 300000, // 5 minutes
  });
}

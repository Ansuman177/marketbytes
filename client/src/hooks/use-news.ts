import { useQuery, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export function useNews() {
  return useInfiniteQuery({
    queryKey: ["/api/news"],
    queryFn: ({ pageParam = 0 }) => api.getNews(20, pageParam * 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useRefreshNews() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/news/refresh', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh news');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
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

import { useMarketSummary } from "@/hooks/use-news";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketSummary() {
  const { data: marketData, isLoading } = useMarketSummary();

  if (isLoading) {
    return (
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
          </div>
          <Skeleton className="h-12 w-24" />
        </div>
      </div>
    );
  }

  if (!marketData) return null;

  return (
    <div className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground" data-testid="text-nifty-label">NIFTY 50</p>
            <p className={`font-semibold ${marketData.nifty50.isPositive ? 'market-status-positive' : 'market-status-negative'}`} data-testid="text-nifty-value">
              {marketData.nifty50.value}
            </p>
            <p className={`text-xs ${marketData.nifty50.isPositive ? 'market-status-positive' : 'market-status-negative'}`} data-testid="text-nifty-change">
              {marketData.nifty50.change} ({marketData.nifty50.changePercent})
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground" data-testid="text-sensex-label">SENSEX</p>
            <p className={`font-semibold ${marketData.sensex.isPositive ? 'market-status-positive' : 'market-status-negative'}`} data-testid="text-sensex-value">
              {marketData.sensex.value}
            </p>
            <p className={`text-xs ${marketData.sensex.isPositive ? 'market-status-positive' : 'market-status-negative'}`} data-testid="text-sensex-change">
              {marketData.sensex.change} ({marketData.sensex.changePercent})
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground" data-testid="text-market-status">{marketData.marketStatus} Market</p>
          <p className="text-xs text-primary" data-testid="text-market-time">{marketData.marketTime}</p>
        </div>
      </div>
    </div>
  );
}

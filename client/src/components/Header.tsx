import { ChartLine, Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChartLine className="text-primary-foreground text-sm h-4 w-4" />
          </div>
          <h1 className="text-xl font-bold text-foreground" data-testid="app-title">MarketBytes</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" data-testid="live-indicator"></div>
            <span className="text-xs text-muted-foreground">LIVE</span>
          </div>
          <button 
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            data-testid="button-notifications"
          >
            <Bell className="text-muted-foreground h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

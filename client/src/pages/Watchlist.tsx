import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Bookmark, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Watchlist() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pb-20 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" data-testid="text-watchlist-title">My Watchlist</h2>
          <Button size="sm" data-testid="button-add-watchlist">
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
            Your watchlist is empty
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto" data-testid="text-empty-description">
            Add stocks and companies to your watchlist to track their latest news and updates.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button data-testid="button-add-first-stock">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Stock
            </Button>
            <Link href="/search">
              <Button variant="outline" className="w-full" data-testid="button-browse-stocks">
                Browse Popular Stocks
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

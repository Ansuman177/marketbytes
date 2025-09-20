import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface DisclaimerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisclaimerPopup({ isOpen, onClose }: DisclaimerPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-6" data-testid="disclaimer-popup">
        {/* Custom close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          data-testid="button-close-disclaimer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="space-y-4">
          {/* Main message */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-primary">
              Today's Savings – Tomorrow's Earnings, Start Building Your Future Today!
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Ansuman Kumar
            </p>
          </div>

          {/* Disclaimer section */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-center">Disclaimer</h3>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This app is for educational and informational purposes only.</p>
              
              <p>The information displayed may not reflect the most current or accurate market values.</p>
              
              <p>We do not guarantee the accuracy, completeness, or timeliness of the information provided.</p>
              
              <p>Please consult official sources or financial advisors before making any investment decisions.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Maximize, Minimize, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ReaderTopBarProps {
  title: string;
  subtitle?: string;
  onOpenSettings: () => void;
  onOpenSearch?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  visible: boolean;
  rightSlot?: React.ReactNode;
}

export function ReaderTopBar({
  title,
  subtitle,
  onOpenSettings,
  onOpenSearch,
  isFullscreen,
  onToggleFullscreen,
  visible,
  rightSlot,
}: ReaderTopBarProps) {
  const router = useRouter();

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur-sm transition-transform duration-300 sm:px-5",
          visible ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              aria-label="Back to library"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to home</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate font-display text-sm font-semibold sm:text-base">
            {title}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {rightSlot}

        {onOpenSearch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSearch}
                aria-label="Search in book"
              >
                <Search className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-[18px] w-[18px]" />
              ) : (
                <Maximize className="h-[18px] w-[18px]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fullscreen</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              aria-label="Reading settings"
            >
              <Settings2 className="h-[18px] w-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Display settings</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

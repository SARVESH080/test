"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accept?: string;
  onFile?: (file: File) => void;
  onClick?: () => void;
  delay?: number;
  isDragActive?: boolean;
}

export function UploadCard({
  icon,
  title,
  description,
  accept,
  onFile,
  onClick,
  delay = 0,
  isDragActive,
}: UploadCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onFile) onFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      onClick={() => {
        if (onFile) inputRef.current?.click();
        if (onClick) onClick();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "bookmark-ribbon group relative cursor-pointer rounded-xl border border-border bg-card p-7 sm:p-8 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl hover:border-accent/40",
        (dragOver || isDragActive) && "border-accent ring-2 ring-accent/30 -translate-y-1 shadow-xl"
      )}
    >
      {onFile && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      )}
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </motion.div>
  );
}

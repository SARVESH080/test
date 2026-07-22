"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePaginationOptions {
  /** Dependencies that should trigger a re-measure + repagination (font size, width, etc). */
  deps: unknown[];
}

interface UsePaginationResult {
  frameRef: React.RefObject<HTMLDivElement | null>;
  columnsRef: React.RefObject<HTMLDivElement | null>;
  page: number;
  totalPages: number;
  goTo: (page: number) => void;
  next: () => void;
  prev: () => void;
  /** 0..1 fraction of scroll position, stable across repagination */
  fraction: number;
  setFractionAnchor: (fraction: number) => void;
}

/**
 * Implements Kindle-style pagination on top of a CSS multi-column layout.
 * The outer `frameRef` element owns padding/sizing (page margins); the inner
 * `columnsRef` element is the multi-column flow that gets translated in
 * page-width increments. Keeping padding on the non-columned frame avoids
 * the classic "only first/last column gets margin" CSS columns pitfall.
 */
export function usePagination({ deps }: UsePaginationOptions): UsePaginationResult {
  const frameRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pendingFraction = useRef<number | null>(null);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const columns = columnsRef.current;
    if (!frame || !columns) return;

    const pageWidth = frame.clientWidth;
    if (pageWidth <= 0) return;

    columns.style.columnWidth = `${pageWidth}px`;
    columns.style.width = `${pageWidth}px`;
    columns.style.height = `${frame.clientHeight}px`;

    // Force reflow before measuring scrollWidth
    const scrollWidth = columns.scrollWidth;
    const pages = Math.max(1, Math.round(scrollWidth / pageWidth));
    setTotalPages(pages);

    if (pendingFraction.current !== null) {
      const target = Math.round(pendingFraction.current * (pages - 1));
      setPage(Math.min(Math.max(target, 0), pages - 1));
      pendingFraction.current = null;
    } else {
      setPage((prev) => Math.min(prev, pages - 1));
    }
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(() => measure());
    if (frameRef.current) observer.observe(frameRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  const goTo = useCallback(
    (target: number) => {
      setPage(Math.min(Math.max(target, 0), totalPages - 1));
    },
    [totalPages]
  );

  const next = useCallback(() => goTo(page + 1), [goTo, page]);
  const prev = useCallback(() => goTo(page - 1), [goTo, page]);

  const fraction = totalPages > 1 ? page / (totalPages - 1) : 0;

  const setFractionAnchor = useCallback((f: number) => {
    pendingFraction.current = f;
  }, []);

  return {
    frameRef,
    columnsRef,
    page,
    totalPages,
    goTo,
    next,
    prev,
    fraction,
    setFractionAnchor,
  };
}

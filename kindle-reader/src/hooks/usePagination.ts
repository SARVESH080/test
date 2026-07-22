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
  /** The measured width (in px) of a single page, i.e. frame's content box minus its own padding. */
  pageWidth: number;
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
  const [pageWidth, setPageWidth] = useState(0);
  const pendingFraction = useRef<number | null>(null);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const columns = columnsRef.current;
    if (!frame || !columns) return;

    // `frame` owns the padding (page margins) and `columns` sits inside that
    // padding, so the space actually available to a page is the frame's
    // content box, NOT frame.clientWidth/clientHeight (which — for a
    // border-box element — measure content+padding together). Using the
    // padded box directly here was the root cause of pages being cropped:
    // columns ended up sized wider/taller than the visible area by exactly
    // the padding amount and got clipped by the frame's overflow-hidden.
    const cs = getComputedStyle(frame);
    const paddingX = parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
    const paddingY = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
    const width = frame.clientWidth - paddingX;
    const height = frame.clientHeight - paddingY;
    if (width <= 0 || height <= 0) return;

    columns.style.columnWidth = `${width}px`;
    columns.style.width = `${width}px`;
    columns.style.height = `${height}px`;
    // Without this, browsers may "balance" content across columns instead of
    // filling each one fully before overflowing to the next — breaking the
    // one-column-per-page assumption pagination relies on.
    columns.style.columnFill = "auto";

    // Force reflow before measuring scrollWidth
    const scrollWidth = columns.scrollWidth;
    const pages = Math.max(1, Math.round(scrollWidth / width));
    setPageWidth(width);
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

  // Slide the columns element so the current page lines up with the frame's
  // viewport. This was missing entirely before — `page` state updated but
  // nothing ever moved the content, which is why "next page" appeared to do
  // nothing.
  useEffect(() => {
    const columns = columnsRef.current;
    if (!columns || pageWidth <= 0) return;
    columns.style.transform = `translateX(-${page * pageWidth}px)`;
  }, [page, pageWidth]);

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
    pageWidth,
  };
}

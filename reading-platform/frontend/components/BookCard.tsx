'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Book } from '@/lib/api';

export function BookCard({ book }: { book: Book }) {
  const percent = book.progress?.[0]?.percent ?? 0;
  const isProcessing = book.status === 'PROCESSING';
  const isFailed = book.status === 'FAILED';

  const inner = (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-ink-900/5"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-linen-200 shadow-spine">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col justify-between p-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-900/40">
              {book.sourceType}
            </span>
            <p className="font-display text-sm leading-snug text-ink-900">{book.title}</p>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/60 text-xs text-ink-50">
            Processing…
          </div>
        )}
        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/70 p-2 text-center text-xs text-white">
            Couldn't process this file
          </div>
        )}
        {percent > 0 && !isProcessing && (
          <div className="absolute bottom-0 left-0 h-1 bg-brass-500" style={{ width: `${percent}%` }} />
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-ink-900">{book.title}</p>
        {book.author && <p className="truncate text-xs text-ink-900/50">{book.author}</p>}
      </div>
    </motion.div>
  );

  if (isProcessing || isFailed) {
    return <div>{inner}</div>;
  }

  return (
    <Link href={`/reader/${book.id}`} className="block">
      {inner}
    </Link>
  );
}

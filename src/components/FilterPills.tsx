import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { Collection } from '../types/domain';
import { t, tLabel } from '../i18n';

interface FilterPillsProps {
  activeType: string;
  onSelect: (type: string) => void;
  collections: Collection[];
  onManage: () => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({ activeType, onSelect, collections, onManage }) => {
  const pills = [{ id: 'all', label: t('全部') }, ...collections.map(c => ({ id: c.id, label: tLabel(c.name) }))];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ overflow: false, left: false, right: false });

  const updateScrollState = () => {
    const element = scrollRef.current;
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    const next = {
      overflow: maxScroll > 1,
      left: element.scrollLeft > 1,
      right: element.scrollLeft < maxScroll - 1
    };
    setScrollState(current => current.overflow === next.overflow && current.left === next.left && current.right === next.right ? current : next);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(element);
    updateScrollState();
    return () => observer.disconnect();
  }, []);
  useEffect(updateScrollState, [collections]);

  const scrollCategories = (direction: number) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(120, element.clientWidth * 0.75),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  };

  return (
    <nav aria-label={t('分类筛选')} className="flex items-center gap-1 min-w-0 shrink-0 px-4 py-1.5 border-b border-gray-100 dark:border-gray-800/50">
      {scrollState.overflow && (
        <button type="button" onClick={() => scrollCategories(-1)} disabled={!scrollState.left} aria-label={t('向左查看分类')} aria-controls="asset-type-filters" title={t('向左查看分类')} className="shrink-0 p-1 rounded-full text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 hover:bg-brand-100 dark:hover:bg-brand-800 disabled:opacity-30 disabled:cursor-default">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}
      <div id="asset-type-filters" ref={scrollRef} onScroll={updateScrollState} className="flex flex-1 min-w-0 items-center gap-1 overflow-x-auto no-scrollbar px-0.5 py-0.5">
      {pills.map((pill) => {
        const isActive = activeType === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => onSelect(pill.id)}
            aria-pressed={isActive}
            className={`shrink-0 whitespace-nowrap px-1.5 py-1 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-gray-100/70 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {pill.label}
          </button>
        );
      })}
      </div>
      {scrollState.overflow && (
        <button type="button" onClick={() => scrollCategories(1)} disabled={!scrollState.right} aria-label={t('向右查看分类')} aria-controls="asset-type-filters" title={t('向右查看分类')} className="shrink-0 p-1 rounded-full text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 hover:bg-brand-100 dark:hover:bg-brand-800 disabled:opacity-30 disabled:cursor-default">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      <button type="button" onClick={onManage} aria-label={t('管理收藏集与标签包')} title={t('管理收藏集与标签包')} className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800"><SlidersHorizontal className="w-4 h-4" /></button>
    </nav>
  );
};

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  label?: string;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage, 
  totalItems,
  label = "Items"
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
      <div className="text-xs text-slate-500 font-mono">
        Showing <span className="text-slate-300 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to <span className="text-slate-300 font-bold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-slate-300 font-bold">{totalItems}</span> {label}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="flex items-center justify-center px-4 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

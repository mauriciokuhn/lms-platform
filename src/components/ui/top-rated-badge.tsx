"use client";

export function TopRatedBadge() {
  return (
    <div className="absolute -right-1 -top-1 z-10">
      <div className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
        <span className="text-[10px]">⭐</span>
        <span>Melhor Avaliado</span>
      </div>
      {/* Decorative triangle fold */}
      <div className="absolute -bottom-1.5 right-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-amber-600/60" />
    </div>
  );
}

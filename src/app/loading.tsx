export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-24">
      <div className="mb-12 flex flex-col items-center animate-pulse">
        <div className="h-16 w-16 rounded-2xl bg-[#C9A961]/20 flex items-center justify-center mb-5">
          <span className="text-2xl font-bold text-[#C9A961] logo-glow">M</span>
        </div>
        <div className="h-5 w-52 bg-muted rounded-full" />
      </div>
      <div className="w-full max-w-3xl space-y-3" aria-hidden="true">
        <div className="h-4 bg-muted rounded animate-pulse w-full" />
        <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

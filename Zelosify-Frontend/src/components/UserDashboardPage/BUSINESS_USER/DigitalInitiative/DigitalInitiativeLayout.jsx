export default function DigitalInitiativeLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-12">
      <div className="max-w-7xl mx-auto w-full">
        <h1 className="text-6xl font-black tracking-tighter text-foreground mb-6">Digital Initiatives</h1>
        <div className="inline-block px-4 py-2 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest mb-10 shadow-sm">
          Coming Soon
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-20 pointer-events-none select-none">
          <div className="h-64 border border-border bg-card shadow-sm" />
          <div className="h-64 border border-border bg-card shadow-sm" />
        </div>
      </div>
    </div>
  );
}

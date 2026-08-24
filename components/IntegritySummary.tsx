"use client";

import type { IntegritySummary as ISummaryType, RiskLevel } from "@/lib/scoring";

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);

const XCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const HelpCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
);

type Props = {
  summary: ISummaryType | null | undefined;
  status: string | undefined | null;
};

export function IntegritySummary({ summary, status }: Props) {
  const st = status ?? "";
  const isLoading = st !== "complete" && !summary;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--rw-card)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md animate-pulse">
        <div className="h-4 w-1/3 bg-white/10 rounded mb-4" />
        <div className="h-10 w-full bg-white/5 rounded mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded" />)}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "high": return "bg-red-500/10 border-red-500/30 text-red-400";
      case "medium": return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "low": return "bg-green-500/10 border-green-500/30 text-green-400";
      default: return "bg-slate-500/10 border-slate-500/30 text-slate-400";
    }
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case "high": return <XCircle className="h-6 w-6 text-red-500" />;
      case "medium": return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case "low": return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      default: return <HelpCircle className="h-6 w-6 text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-4 rounded-xl border p-5 backdrop-blur-md ${getRiskColor(summary.riskLevel)}`}>
        <div className="mt-0.5">{getRiskIcon(summary.riskLevel)}</div>
        <div>
          <h3 className="font-semibold text-lg mb-1 tracking-tight">Rejection Risk: {summary.riskLevel.toUpperCase()}</h3>
          <p className="text-sm opacity-90 leading-relaxed">{summary.advice}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Citations" value={summary.totalCount} icon={<HelpCircle className="h-4 w-4 text-slate-400" />} />
        <StatCard label="Clean" value={summary.cleanCount} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} />
        <StatCard label="Retracted" value={summary.retractedCount} icon={<XCircle className="h-4 w-4 text-red-500" />} isDanger={summary.retractedCount > 0} />
        <StatCard label="Cascades" value={summary.cascadeCount} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} isWarning={summary.cascadeCount > 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, isDanger, isWarning }: { label: string, value: number, icon: React.ReactNode, isDanger?: boolean, isWarning?: boolean }) {
  const bg = isDanger ? "bg-red-500/5 border-red-500/20" : isWarning ? "bg-amber-500/5 border-amber-500/20" : "bg-white/5 border-white/5";
  const text = isDanger ? "text-red-400" : isWarning ? "text-amber-400" : "text-white";
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${bg}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={`text-2xl font-semibold tracking-tight ${text}`}>
        {value}
      </div>
    </div>
  );
}

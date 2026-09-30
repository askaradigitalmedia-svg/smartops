import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Sparkles } from "lucide-react";
import { parseAnalysis, type AnalysisStatus } from "@/lib/analysis";

const statusStyle: Record<AnalysisStatus, { label: string; badge: string; icon: typeof Info }> = {
  aman: { label: "Aman", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  perhatian: { label: "Perlu perhatian", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle },
  bahaya: { label: "Potensi bahaya", badge: "bg-red-50 text-red-700 border-red-200", icon: ShieldAlert },
  informasi: { label: "Informasi", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: Info },
};

export function AnalysisResultView({ value }: { value: string }) {
  const analysis = parseAnalysis(value);
  const style = statusStyle[analysis.status];
  const StatusIcon = style.icon;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-slate-800">
          <Sparkles size={16} className="shrink-0 text-blue-600" />
          <h4 className="font-semibold leading-snug">{analysis.title}</h4>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}>
          <StatusIcon size={12} /> {style.label}
        </span>
      </div>

      <p className="text-sm leading-6 text-slate-600">{analysis.summary}</p>

      {analysis.findings.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Temuan utama</p>
          <ul className="space-y-2">
            {analysis.findings.map((finding, index) => (
              <li key={`${finding}-${index}`} className="flex gap-2 text-sm leading-5 text-slate-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


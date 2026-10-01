import Link from "next/link";
import { ArrowRight, Camera, Package, Sparkles } from "lucide-react";

const modules = [
  { href: "/cctv", title: "CCTV & Analitik", description: "Live View, snapshot AI, jadwal, dan notifikasi.", icon: Camera, color: "bg-blue-600" },
  { href: "/inventory", title: "Keuangan & Stok", description: "Kelola barang, harga, stok, dan potensi profit.", icon: Package, color: "bg-emerald-600" },
];

export default function Home() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-blue-200">
            <Sparkles size={13} /> Operational Intelligence
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Selamat datang di SmartOps</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Kelola monitoring CCTV, analitik AI, keuangan, dan stok dari satu workspace yang responsif.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Pilih modul</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modules.map(({ href, title, description, icon: Icon, color }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className={`grid h-11 w-11 place-items-center rounded-xl text-white ${color}`}><Icon size={21} /></div>
              <h3 className="mt-5 font-bold text-slate-900 sm:text-lg">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-600">Buka modul <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';
import { Home, Package, Camera } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
      <div className="text-2xl font-bold mb-8 text-center text-blue-400">SmartOps</div>
      <nav className="flex flex-col gap-2">
        <Link href="/" className="flex items-center gap-3 hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <Home size={20} /> Dashboard
        </Link>
        <Link href="/cctv" className="flex items-center gap-3 hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <Camera size={20} /> CCTV & Proyek
        </Link>
        <Link href="/inventory" className="flex items-center gap-3 hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <Package size={20} /> Keuangan & Stok
        </Link>
      </nav>
    </aside>
  );
}
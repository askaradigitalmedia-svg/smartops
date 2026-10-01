"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, PackagePlus, Trash2, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type InventoryItem = {
  id: string;
  item_name: string;
  stock_qty: number;
  buy_price: number;
  sell_price: number;
};

async function loadInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as InventoryItem[];
}
function currency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ item_name: "", stock_qty: 0, buy_price: 0, sell_price: 0 });

  const fetchInventory = useCallback(async () => {
    const data = await loadInventory();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadInventory().then((data) => {
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("inventory").insert([form]);
    if (error) {
      alert("Gagal menambah data.");
      return;
    }
    setForm({ item_name: "", stock_qty: 0, buy_price: 0, sell_price: 0 });
    await fetchInventory();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) await fetchInventory();
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-5 sm:px-7 sm:py-6">
        <span className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
          Inventory Center
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Keuangan & Stok</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-base">Kelola barang, harga, stok, dan pantau potensi profit.</p>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5 xl:grid-cols-5 xl:items-end">
        <div className="sm:col-span-2 xl:col-span-1">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama Barang</label>
          <input type="text" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Stok</label>
          <input type="number" required min="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" value={form.stock_qty} onChange={(event) => setForm({ ...form, stock_qty: Number(event.target.value) })} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Harga Beli</label>
          <input type="number" required min="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" value={form.buy_price} onChange={(event) => setForm({ ...form, buy_price: Number(event.target.value) })} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Harga Jual</label>
          <input type="number" required min="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" value={form.sell_price} onChange={(event) => setForm({ ...form, sell_price: Number(event.target.value) })} />
        </div>
        <button type="submit" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:col-span-2 xl:col-span-1">
          <PackagePlus size={17} /> Tambah Barang
        </button>
      </form>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Boxes className="mx-auto text-slate-300" size={36} />
          <p className="mt-3 text-sm font-semibold text-slate-600">Belum ada data barang</p>
          <p className="mt-1 text-xs text-slate-400">Tambahkan barang pertama menggunakan formulir di atas.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {items.map((item) => {
              const profit = (item.sell_price - item.buy_price) * item.stock_qty;
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-800">{item.item_name}</h3>
                      <p className="mt-1 text-xs text-slate-500">Stok tersedia: <span className="font-semibold text-slate-700">{item.stock_qty}</span></p>
                    </div>
                    <button type="button" onClick={() => handleDelete(item.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600" aria-label={`Hapus ${item.item_name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                    <div><p className="text-slate-400">Harga beli</p><p className="mt-1 font-semibold text-slate-700">{currency(item.buy_price)}</p></div>
                    <div><p className="text-slate-400">Harga jual</p><p className="mt-1 font-semibold text-slate-700">{currency(item.sell_price)}</p></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                    <TrendingUp size={15} /> <span className="text-xs font-bold">Potensi {currency(profit)}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {['Nama Barang', 'Stok', 'Harga Beli', 'Harga Jual', 'Potensi Profit', 'Aksi'].map((label) => (
                      <th key={label} className={`p-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${label === 'Aksi' ? 'text-right' : ''}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const profit = (item.sell_price - item.buy_price) * item.stock_qty;
                    return (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="p-4 text-sm font-semibold text-slate-800">{item.item_name}</td>
                        <td className="p-4 text-sm text-slate-600">{item.stock_qty}</td>
                        <td className="p-4 text-sm text-slate-600">{currency(item.buy_price)}</td>
                        <td className="p-4 text-sm text-slate-600">{currency(item.sell_price)}</td>
                        <td className="p-4 text-sm font-semibold text-emerald-600">{currency(profit)}</td>
                        <td className="p-4 text-right"><button type="button" onClick={() => handleDelete(item.id)} className="text-sm font-semibold text-red-500 hover:text-red-700">Hapus</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

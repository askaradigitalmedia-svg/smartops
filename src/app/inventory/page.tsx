"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ item_name: "", stock_qty: 0, buy_price: 0, sell_price: 0 });

  // Fungsi Read (Mengambil data dari Supabase)
  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Fungsi Create (Menambah data ke Supabase)
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("inventory").insert([form]);
    if (!error) {
      setForm({ item_name: "", stock_qty: 0, buy_price: 0, sell_price: 0 });
      fetchInventory();
    } else {
      alert("Gagal menambah data!");
    }
  };

  // Fungsi Delete (Menghapus data)
  const handleDelete = async (id: string) => {
    if(!confirm("Yakin ingin menghapus barang ini?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) fetchInventory();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Keuangan & Stok</h2>
        <p className="text-slate-500 text-sm mt-1">Kelola barang, harga, dan pantau potensi profit.</p>
      </div>

      {/* Form Tambah Barang */}
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nama Barang</label>
          <input type="text" required className="border border-slate-300 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-500"
            value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium text-slate-700 mb-1">Stok</label>
          <input type="number" required min="0" className="border border-slate-300 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-500"
            value={form.stock_qty} onChange={e => setForm({...form, stock_qty: Number(e.target.value)})} />
        </div>
        <div className="w-36">
          <label className="block text-sm font-medium text-slate-700 mb-1">Harga Beli (Rp)</label>
          <input type="number" required min="0" className="border border-slate-300 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-500"
            value={form.buy_price} onChange={e => setForm({...form, buy_price: Number(e.target.value)})} />
        </div>
        <div className="w-36">
          <label className="block text-sm font-medium text-slate-700 mb-1">Harga Jual (Rp)</label>
          <input type="number" required min="0" className="border border-slate-300 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-500"
            value={form.sell_price} onChange={e => setForm({...form, sell_price: Number(e.target.value)})} />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Tambah
        </button>
      </form>

      {/* Tabel Stok */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-600">Nama Barang</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Stok</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Harga Beli</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Harga Jual</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Potensi Profit</th>
              <th className="p-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Memuat data...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Belum ada data barang. Silakan tambah di atas.</td></tr>
            ) : (
              items.map(item => {
                const profit = (item.sell_price - item.buy_price) * item.stock_qty;
                return (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-800">{item.item_name}</td>
                    <td className="p-4 text-sm text-slate-600">{item.stock_qty}</td>
                    <td className="p-4 text-sm text-slate-600">Rp {item.buy_price.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-sm text-slate-600">Rp {item.sell_price.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-sm font-semibold text-emerald-600">Rp {profit.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-sm text-right">
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 font-medium">Hapus</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
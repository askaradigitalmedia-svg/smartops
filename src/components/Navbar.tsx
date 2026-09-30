export default function Navbar() {
    return (
      <header className="h-16 bg-white border-b flex items-center px-6 justify-between shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Workspace</h1>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
          SO
        </div>
      </header>
    );
  }
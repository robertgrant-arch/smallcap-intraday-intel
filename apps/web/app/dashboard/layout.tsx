'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/watchlist', label: 'Watchlist' },
  { href: '/dashboard/research', label: 'Research' },
  { href: '/dashboard/backtest', label: 'Backtest' },
  { href: '/dashboard/sources', label: 'Sources' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen bg-zinc-950">
      <aside className="w-56 border-r border-zinc-800 flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-zinc-800">
          <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center text-zinc-950 font-bold text-xs">SI</div>
          <span className="font-semibold text-sm text-zinc-100">SmallCap Intel</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

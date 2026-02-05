import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LogOut, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/leads', label: 'Leads', icon: Users },
]

export default function AppShell() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-5">BR Arena</div>
              <div className="text-xs text-zinc-400">Leads em tempo real</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-zinc-400 md:block">{user?.email}</div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
              onClick={async () => {
                await signOut()
                navigate('/login', { replace: true })
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
          <aside className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
            <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100',
                      isActive && 'bg-zinc-800/80 text-zinc-50'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

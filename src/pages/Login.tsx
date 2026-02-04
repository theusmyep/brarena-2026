import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
  const { initialized, user, init, signIn, error } = useAuthStore()
  const location = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    void init()
  }, [init])

  if (initialized && user) {
    return <Navigate to={location.state?.from ?? '/dashboard'} replace />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <h1 className="text-lg font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-zinc-400">Use seu usuário do Supabase Auth.</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              await signIn(email, password)
            }}
          >
            <div>
              <label className="text-xs text-zinc-400">Email</label>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Senha</label>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}


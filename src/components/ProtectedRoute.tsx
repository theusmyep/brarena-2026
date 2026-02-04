import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { initialized, user, init } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    void init()
  }, [init])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-28 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-28 animate-pulse rounded-xl bg-zinc-900" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}


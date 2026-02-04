import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type RealtimeState = {
  connected: boolean
  lastInsertAt: string | null
}

export function useLeadEventsRealtime() {
  const [state, setState] = useState<RealtimeState>({ connected: false, lastInsertAt: null })

  useEffect(() => {
    const channel = supabase
      .channel('lead_events_inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lead_events' },
        (payload) => {
          const occurredAt = (payload.new as { occurred_at?: string } | null)?.occurred_at ?? null
          setState((s) => ({ ...s, lastInsertAt: occurredAt }))
        }
      )
      .subscribe((status) => {
        setState((s) => ({ ...s, connected: status === 'SUBSCRIBED' }))
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return state
}


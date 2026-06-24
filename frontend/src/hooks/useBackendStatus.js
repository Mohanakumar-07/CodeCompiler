import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'

/**
 * Polls /api/health to track whether the backend is reachable.
 * @param {number} intervalMs  How often to poll (default 15 s).
 * @returns {{ online: boolean | null, checking: boolean, lastChecked: Date | null }}
 *   `online` is null until the first check completes.
 */
export default function useBackendStatus(intervalMs = 15_000) {
  const [online, setOnline]           = useState(null)   // null = unknown
  const [checking, setChecking]       = useState(true)
  const [lastChecked, setLastChecked] = useState(null)
  const mountedRef = useRef(true)

  const check = useCallback(async () => {
    setChecking(true)
    try {
      await api.get('/health', { timeout: 5000 })
      if (mountedRef.current) setOnline(true)
    } catch {
      if (mountedRef.current) setOnline(false)
    } finally {
      if (mountedRef.current) {
        setChecking(false)
        setLastChecked(new Date())
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    check()                                       // immediate first check
    const id = setInterval(check, intervalMs)
    return () => { mountedRef.current = false; clearInterval(id) }
  }, [check, intervalMs])

  return { online, checking, lastChecked }
}

import { Wifi, WifiOff } from 'lucide-react'

/**
 * Compact online / offline pill for the Topbar.
 * Pulses green when online, glows red when offline.
 */
export default function ServerStatusBadge({ online, checking }) {
  // Still waiting for first result
  if (online === null) {
    return (
      <span className="server-badge server-badge--checking" title="Checking server…">
        <span className="server-dot server-dot--checking" />
        <span className="server-label">Checking…</span>
      </span>
    )
  }

  if (online) {
    return (
      <span className="server-badge server-badge--online" title="Backend server is reachable">
        <span className="server-dot server-dot--online" />
        <span className="server-label">Online</span>
      </span>
    )
  }

  return (
    <span className="server-badge server-badge--offline" title="Cannot reach the backend server">
      <WifiOff size={12} className="server-badge-icon" />
      <span className="server-label">Offline</span>
    </span>
  )
}

/**
 * Full-width banner for the login page when the backend is unreachable.
 */
export function ServerOfflineBanner({ online }) {
  if (online === null || online === true) return null

  return (
    <div className="server-banner">
      <div className="server-banner-inner">
        <WifiOff size={16} className="server-banner-icon" />
        <div>
          <p className="server-banner-title">Server unreachable</p>
          <p className="server-banner-desc">
            The backend server is currently offline. Login and other features won't work until it's back.
          </p>
        </div>
      </div>
    </div>
  )
}

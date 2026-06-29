import { useEffect, useState } from 'react'
import { Trophy, Search, Clock, AlertTriangle, Medal } from 'lucide-react'
import api from '../api/client'
import { PageLoader } from '../components/ui/LoadingSpinner'

export default function Leaderboard() {
  const [tests, setTests] = useState([])
  const [rankings, setRankings] = useState([])
  const [selectedTest, setSelectedTest] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadLeaderboard = (testId = '') => {
    setLoading(true)
    const param = testId ? `?test_id=${testId}` : ''
    api
      .get(`/analytics/leaderboard${param}`)
      .then(({ data }) => {
        setTests(data.tests || [])
        setRankings(data.rankings || [])
      })
      .catch((err) => {
        console.error('Failed to load leaderboard data:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadLeaderboard(selectedTest)
  }, [selectedTest])

  const formatDuration = (secs) => {
    if (!secs) return '0s'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const filteredRankings = rankings.filter(
    (r) =>
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRankBadge = (rank) => {
    if (rank === 1) return <Medal className="text-amber-500" size={18} /> // Gold
    if (rank === 2) return <Medal className="text-slate-400" size={18} /> // Silver
    if (rank === 3) return <Medal className="text-amber-700" size={18} /> // Bronze
    return <span className="text-xs font-semibold text-t4 tabular">{rank}</span>
  }

  const getRankBg = (rank) => {
    if (rank === 1) return 'rgba(245, 158, 11, 0.08)'
    if (rank === 2) return 'rgba(148, 163, 184, 0.08)'
    if (rank === 3) return 'rgba(180, 83, 9, 0.08)'
    return 'transparent'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Card */}
      <div className="card bg-gradient-to-r from-violet-600/10 to-indigo-600/10 p-5 rounded-2xl border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="text-violet-500" size={24} />
            <h1 className="h-title text-2xl font-bold">Leaderboard</h1>
          </div>
          <p className="section-sub mt-1.5 text-t3">
            Real-time assessment rankings and overall system standings.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Dropdown for test selection */}
          <div className="w-full sm:w-64">
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="w-full text-sm font-medium bg-surface border border-line rounded-lg px-3 py-2 text-t cursor-pointer hover:border-line-strong focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Overall Standings</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search and Table Area */}
      <div className="card p-5 rounded-2xl border border-line bg-surface flex flex-col gap-4">
        <div className="flex items-center gap-2 border border-line rounded-lg px-3 py-1.5 max-w-sm bg-surface-h focus-within:border-line-strong transition-colors">
          <Search className="text-t4" size={16} />
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm w-full outline-none text-t placeholder-t4"
          />
        </div>

        {loading ? (
          <div className="py-16">
            <PageLoader />
          </div>
        ) : filteredRankings.length === 0 ? (
          <div className="py-16 text-center text-t4">
            <Trophy size={48} className="mx-auto text-line mb-3" />
            <p className="text-sm">No submissions or scores recorded for this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean w-full text-left">
              <thead>
                <tr className="border-b border-line text-[11px] text-t4 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4 w-28 text-right">Score</th>
                  <th className="py-3 px-4 w-32 text-right">Time Spent</th>
                  <th className="py-3 px-4 w-28 text-right">Violations</th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((r) => {
                  const initial = (r.full_name || r.username || '?')[0].toUpperCase()
                  return (
                    <tr
                      key={r.user_id}
                      className="border-b border-line hover:bg-surface-h transition-colors"
                      style={{ background: getRankBg(r.rank) }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-line/50 mx-auto">
                          {getRankBadge(r.rank)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{
                              backgroundColor: `hsl(${(r.user_id * 73) % 360}, 65%, 45%)`,
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-t">{r.full_name}</p>
                            <p className="text-xs text-t4 font-mono">@{r.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-sm font-bold ${
                            r.score >= 80
                              ? 'text-ok'
                              : r.score >= 50
                              ? 'text-warn'
                              : 'text-err'
                          }`}
                        >
                          {r.score}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-xs text-t3 font-medium">
                          <Clock size={12} className="text-t4" />
                          {formatDuration(r.time_taken)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-xs font-semibold">
                          {r.violations > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-err">
                              <AlertTriangle size={12} />
                              {r.violations}
                            </span>
                          ) : (
                            <span className="text-t4">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Clock, ArrowRight, Lock, ShieldCheck, AlertTriangle } from 'lucide-react'
import { format, isPast, isFuture } from 'date-fns'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/LoadingSpinner'

export default function StudentTestMode() {
  const [tests, setTests]       = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/tests'),
      api.get('/submissions'),
    ]).then(([tRes, sRes]) => {
      setTests(tRes.data)
      setSubmissions(sRes.data)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="h1">Tests</h1>
        <p className="section-sub mt-0.5">Timed coding assessments assigned to you</p>
      </div>

      {/* Proctoring notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-line" style={{ background: 'var(--brandGhost)' }}>
        <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--d-purple)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--d-purple)' }}>Proctored Environment</p>
          <p className="text-xs text-t3 mt-0.5">
            Tests may enforce full-screen mode, disable copy-paste, detect tab switches,
            and block developer tools depending on the test settings.
          </p>
        </div>
      </div>

      {/* ── Active Tests ────────────────────────────────────────────────── */}
      {tests.length === 0 ? (
        <div className="card text-center py-16">
          <FlaskConical size={40} className="mx-auto text-t4 mb-3" />
          <p className="text-t3">No tests available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map(test => {
            const now = new Date()
            const canEnter = !test.end_time || !isPast(new Date(test.end_time))
            const isUpcoming = test.start_time && isFuture(new Date(test.start_time))
            const isCompleted = localStorage.getItem(`test_completed_${test.id}`) === 'true'

            return (
              <div key={test.id} className="card-hover flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="h3 line-clamp-2 flex-1 pr-2">{test.title}</h3>
                  {isCompleted ? (
                    <span className="badge-violet badge">Completed</span>
                  ) : isUpcoming ? (
                    <span className="badge-yellow badge">Upcoming</span>
                  ) : canEnter ? (
                    <span className="badge-green badge">Active</span>
                  ) : (
                    <span className="badge-violet badge">Ended</span>
                  )}
                </div>

                {test.description && (
                  <p className="text-xs text-t3 mb-2 line-clamp-2">{test.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="badge badge-violet tabular">{test.problem_count} question{test.problem_count !== 1 ? 's' : ''}</span>
                  {test.duration && <span className="badge badge-cyan flex items-center gap-1"><Clock size={10} />{test.duration}m</span>}
                  {test.fullscreen_required && <span className="badge badge-violet"><Lock size={10} /> Fullscreen</span>}
                  {test.tab_switch_detect   && <span className="badge badge-yellow"><AlertTriangle size={10} /> Tab Monitor</span>}
                </div>

                {test.start_time && (
                  <p className="text-xs text-t4 mb-1 tabular">
                    Starts: {format(new Date(test.start_time), 'MMM d, HH:mm')}
                  </p>
                )}
                {test.end_time && (
                  <p className="text-xs text-t4 mb-2 tabular">
                    Ends: {format(new Date(test.end_time), 'MMM d, HH:mm')}
                  </p>
                )}

                <button
                  onClick={() => canEnter && !isUpcoming && !isCompleted && navigate(`/test/${test.id}`)}
                  disabled={!canEnter || isUpcoming || isCompleted}
                  className={`mt-auto justify-center text-sm ${
                    canEnter && !isUpcoming && !isCompleted 
                      ? 'btn-primary' 
                      : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? (
                    <>Completed</>
                  ) : !canEnter ? (
                    <><Lock size={13} /> Closed</>
                  ) : isUpcoming ? (
                    <><Clock size={13} /> Upcoming</>
                  ) : (
                    <>Enter Test <ArrowRight size={13} /></>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

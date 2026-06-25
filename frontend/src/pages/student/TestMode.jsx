import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Clock, ArrowRight, Lock, ShieldCheck, AlertTriangle, BookOpen } from 'lucide-react'
import { format, isPast, isFuture } from 'date-fns'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { DifficultyBadge, StatusBadge } from '../../components/ui/Badge'
import CountBar, { diffStats } from '../../components/ui/CountBar'

function TestStatusBadge({ problem }) {
  const now = new Date()
  if (problem.start_time && isFuture(new Date(problem.start_time)))
    return <span className="badge-yellow badge">Upcoming</span>
  if (problem.end_time && isPast(new Date(problem.end_time)))
    return <span className="badge-violet badge">Ended</span>
  return <span className="badge-green badge">Active</span>
}

export default function StudentTestMode() {
  const [problems, setProblems] = useState([])
  const [exams, setExams]       = useState([])
  const [subs, setSubs]         = useState({})
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/problems?mode=test'),
      api.get('/submissions'),
      api.get('/exams'),
    ]).then(([pRes, sRes, eRes]) => {
      setProblems(pRes.data)
      setExams(eRes.data)
      const map = {}
      sRes.data.forEach((s) => {
        if (!map[s.problem_id] || new Date(s.submitted_at) > new Date(map[s.problem_id].submitted_at))
          map[s.problem_id] = s
      })
      setSubs(map)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="h1">Tests</h1>
        <p className="section-sub mt-0.5">Proctored assessments assigned to you</p>
      </div>

      {/* Proctoring notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-line" style={{ background: 'var(--brandGhost)' }}>
        <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--d-purple)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--d-purple)' }}>Proctored Environment</p>
          <p className="text-xs text-t3 mt-0.5">
            Tests may enforce full-screen mode, disable copy-paste, detect tab switches,
            and block developer tools depending on test settings.
          </p>
        </div>
      </div>

      {/* ── Exams (multi-question bundles) ─────────────────────────────── */}
      {exams.length > 0 && (
        <div>
          <h2 className="h2 mb-3 flex items-center gap-2">
            <BookOpen size={18} style={{ color: 'var(--d-purple)' }} /> Exams
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map(exam => {
              const now = new Date()
              const canEnter = !exam.end_time || !isPast(new Date(exam.end_time))
              const isUpcoming = exam.start_time && isFuture(new Date(exam.start_time))
              return (
                <div key={exam.id} className="card-hover flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="h3 line-clamp-2 flex-1 pr-2">{exam.title}</h3>
                    {isUpcoming
                      ? <span className="badge-yellow badge">Upcoming</span>
                      : canEnter
                        ? <span className="badge-green badge">Active</span>
                        : <span className="badge-violet badge">Ended</span>}
                  </div>

                  {exam.description && (
                    <p className="text-xs text-t3 mb-2 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="badge badge-violet tabular">{exam.problem_count} question{exam.problem_count !== 1 ? 's' : ''}</span>
                    {exam.duration && <span className="badge badge-cyan flex items-center gap-1"><Clock size={10} />{exam.duration}m</span>}
                    {exam.fullscreen_required && <span className="badge badge-violet"><Lock size={10} /> Fullscreen</span>}
                    {exam.tab_switch_detect   && <span className="badge badge-yellow"><AlertTriangle size={10} /> Tab Monitor</span>}
                  </div>

                  {exam.start_time && (
                    <p className="text-xs text-t4 mb-1 tabular">
                      Starts: {format(new Date(exam.start_time), 'MMM d, HH:mm')}
                    </p>
                  )}
                  {exam.end_time && (
                    <p className="text-xs text-t4 mb-2 tabular">
                      Ends: {format(new Date(exam.end_time), 'MMM d, HH:mm')}
                    </p>
                  )}

                  <button
                    onClick={() => canEnter && !isUpcoming && navigate(`/exam/${exam.id}`)}
                    disabled={!canEnter || isUpcoming}
                    className={`mt-auto justify-center text-sm ${canEnter && !isUpcoming ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                  >
                    {!canEnter ? <><Lock size={13} /> Closed</> : isUpcoming ? <><Clock size={13} /> Upcoming</> : <>Enter Exam <ArrowRight size={13} /></>}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Individual Tests ───────────────────────────────────────────── */}
      {problems.length > 0 && (
        <div>
          <h2 className="h2 mb-3">Individual Tests</h2>
          <CountBar stats={[{ label: 'Total', count: problems.length }, ...diffStats(problems)]} />
        </div>
      )}


      {exams.length === 0 && problems.length === 0 ? (
        <div className="card text-center py-16">
          <FlaskConical size={40} className="mx-auto text-t4 mb-3" />
          <p className="text-t3">No tests available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((p) => {
            const sub  = subs[p.id]
            const canEnter = !p.end_time || !isPast(new Date(p.end_time))
            const alreadyDone = sub?.status === 'Accepted'

            return (
              <div key={p.id} className="card-hover flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="h3 line-clamp-2 flex-1 pr-2">{p.title}</h3>
                  <TestStatusBadge problem={p} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <DifficultyBadge level={p.difficulty} />
                  {p.duration && <span className="badge-cyan badge flex items-center gap-1"><Clock size={10} />{p.duration}m</span>}
                  {p.fullscreen_required && <span className="badge-violet badge"><Lock size={10} /> Fullscreen</span>}
                  {p.tab_switch_detect   && <span className="badge-yellow badge"><AlertTriangle size={10} /> Tab Monitor</span>}
                  {p.copy_paste_disable  && <span className="badge-yellow badge">No Copy-Paste</span>}
                </div>

                {p.start_time && (
                  <p className="text-xs text-t4 mb-1 tabular">
                    Starts: {format(new Date(p.start_time), 'MMM d, HH:mm')}
                  </p>
                )}
                {p.end_time && (
                  <p className="text-xs text-t4 mb-2 tabular">
                    Ends: {format(new Date(p.end_time), 'MMM d, HH:mm')}
                  </p>
                )}

                {sub && (
                  <div className="mb-2">
                    <StatusBadge status={sub.status} />
                    <span className="text-xs text-t4 ml-2 tabular">Score: {sub.score}%</span>
                  </div>
                )}

                <button
                  onClick={() => canEnter && navigate(`/code/${p.id}?mode=test`)}
                  disabled={!canEnter}
                  className={`mt-auto justify-center text-sm ${canEnter ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                >
                  {!canEnter ? <><Lock size={13} /> Closed</> : alreadyDone ? <>Retry <ArrowRight size={13} /></> : <>Enter Test <ArrowRight size={13} /></>}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

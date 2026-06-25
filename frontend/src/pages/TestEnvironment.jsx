/**
 * TestEnvironment – Multi-question timed test workspace for students.
 * Fetches the test (with all its questions), shows a question navigator,
 * and lets the student solve each question in the Monaco editor.
 * One shared countdown timer covers the entire test session.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  ChevronLeft, ChevronRight, Clock, AlertTriangle, ShieldCheck,
  Play, Send, Lock, CheckCircle, XCircle, Terminal, Maximize2,
  Minimize2, BookOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { StatusBadge } from '../components/ui/Badge'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Markdown from '../components/ui/Markdown'

const DEFAULT_CODE = `# Write your solution here\n`
const LANG = 'python'

function fmt(sec) {
  if (sec == null) return '--:--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function codeKey(testId, problemId) {
  return `test_${testId}_prob_${problemId}`
}

export default function TestEnvironment() {
  const { testId }  = useParams()
  const navigate    = useNavigate()
  const { isDark }  = useTheme()
  const { user }    = useAuth()

  const [test, setTest]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [qIdx, setQIdx]         = useState(0)    // current question index
  const [code, setCode]         = useState(DEFAULT_CODE)
  const [timeLeft, setTimeLeft] = useState(null) // seconds
  const [tabSwitches, setTabSwitches] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [running, setRunning]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [runResult, setRunResult]   = useState(null)
  const [submissions, setSubmissions] = useState({}) // { problemId: submission }
  const [activeTab, setActiveTab]   = useState('statement')

  const timerRef  = useRef(null)
  const startRef  = useRef(null)  // when test session started (ms)

  // ── Load test ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/tests/${testId}`)
      .then(({ data }) => {
        setTest(data)
        // Restore or initialise code for first question
        const firstPid = data.problems?.[0]?.id
        if (firstPid) {
          const saved = localStorage.getItem(codeKey(testId, firstPid))
          setCode(saved || data.problems[0].starter_code || DEFAULT_CODE)
        }
        // Fetch prior submissions for each problem in this test
        api.get('/submissions').then(({ data: subs }) => {
          const map = {}
          const pids = new Set((data.problems || []).map(p => p.id))
          subs.forEach(s => {
            if (pids.has(s.problem_id)) {
              if (!map[s.problem_id] || new Date(s.submitted_at) > new Date(map[s.problem_id].submitted_at))
                map[s.problem_id] = s
            }
          })
          setSubmissions(map)
        }).catch(() => {})
      })
      .catch(() => {
        toast.error('Test not found')
        navigate(-1)
      })
      .finally(() => setLoading(false))
  }, [testId])

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!test?.duration) return
    const stored = localStorage.getItem(`test_start_${testId}`)
    let startMs
    if (stored) {
      startMs = parseInt(stored, 10)
    } else {
      startMs = Date.now()
      localStorage.setItem(`test_start_${testId}`, String(startMs))
    }
    startRef.current = startMs

    const totalSec = test.duration * 60
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const left = Math.max(0, totalSec - elapsed)
      setTimeLeft(left)
      if (left === 0) {
        clearInterval(timerRef.current)
        toast.error('Time is up!')
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [test])

  // ── Proctoring: tab switch & copying/devtools disable ────────────────────
  useEffect(() => {
    if (!test) return

    const handleBlur = () => {
      if (test.tab_switch_detect) {
        setTabSwitches(n => n + 1)
      }
    }

    const onKeyDown = (e) => {
      if (test.f12_disable && e.key === 'F12') {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Developer tools are disabled during this test.')
      }
      const key = e.key.toLowerCase()
      if (test.copy_paste_disable && (e.ctrlKey || e.metaKey) && key === 'c') {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Copying is disabled during this test.')
      }
      if ((test.copy_paste_disable || test.block_paste) && (e.ctrlKey || e.metaKey) && key === 'v') {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Pasting is disabled during this test.')
      }
    }

    const onCopyPaste = (e) => {
      const blocked = e.type === 'paste'
        ? (test.copy_paste_disable || test.block_paste)
        : test.copy_paste_disable
      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
        toast.error(e.type === 'paste' ? 'Pasting is disabled during this test.' : 'Copying is disabled during this test.')
      }
    }

    const onContext = (e) => {
      if (test.f12_disable) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('blur', handleBlur)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('copy', onCopyPaste, true)
    document.addEventListener('paste', onCopyPaste, true)
    document.addEventListener('contextmenu', onContext, true)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('copy', onCopyPaste, true)
      document.removeEventListener('paste', onCopyPaste, true)
      document.removeEventListener('contextmenu', onContext, true)
    }
  }, [test])

  // ── Fullscreen ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  // ── Switch question ──────────────────────────────────────────────────────
  const switchTo = useCallback((newIdx) => {
    if (!test) return
    // Save current code
    const curPid = test.problems[qIdx]?.id
    if (curPid) localStorage.setItem(codeKey(testId, curPid), code)
    // Load new code
    const newPid = test.problems[newIdx]?.id
    const saved  = newPid ? localStorage.getItem(codeKey(testId, newPid)) : null
    setCode(saved || test.problems[newIdx]?.starter_code || DEFAULT_CODE)
    setQIdx(newIdx)
    setRunResult(null)
    setActiveTab('statement')
  }, [test, qIdx, code, testId])

  // ── Run code ─────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!test) return
    const pid = test.problems[qIdx]?.id
    if (!pid) return
    setRunning(true)
    setRunResult(null)
    setActiveTab('output')
    try {
      const { data } = await api.post('/submissions/run', {
        problem_id: pid, code, language: LANG,
      })
      setRunResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!test) return
    const pid = test.problems[qIdx]?.id
    if (!pid) return
    if (!window.confirm('Submit your answer for this question?')) return
    setSubmitting(true)
    try {
      const elapsed = startRef.current
        ? Math.floor((Date.now() - startRef.current) / 1000)
        : 0
      const { data } = await api.post('/submissions', {
        problem_id: pid, code, language: LANG,
        time_taken: elapsed, tab_switches: tabSwitches,
      })
      setSubmissions(s => ({ ...s, [pid]: data }))
      toast.success(`Q${qIdx + 1} submitted! Score: ${data.score}%`)
      setRunResult(data)
      setActiveTab('output')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />
  if (!test)   return null

  const problems   = test.problems || []
  const curProblem = problems[qIdx]
  const curSub     = curProblem ? submissions[curProblem.id] : null
  const timerWarn  = timeLeft != null && timeLeft < 300 // < 5 min

  // ── Proctoring: fullscreen required ─────────────────────────────────────
  if (test.fullscreen_required && !isFullscreen) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ background: 'var(--bg)' }}>
        <ShieldCheck size={48} style={{ color: 'var(--d-purple)' }} />
        <p className="text-lg font-semibold">Full-Screen Required</p>
        <p className="text-sm text-t3">This test must be taken in full-screen mode.</p>
        <button onClick={toggleFullscreen} className="btn-primary">
          <Maximize2 size={16} /> Enter Full Screen
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-line flex-shrink-0"
        style={{ background: 'var(--s)' }}>

        {/* Test title */}
        <BookOpen size={16} className="text-t4 flex-shrink-0" />
        <span className="font-semibold text-sm truncate max-w-[200px]">{test.title}</span>

        {/* Question tabs */}
        <div className="flex gap-1 overflow-x-auto flex-1 mx-2">
          {problems.map((p, i) => {
            const sub = submissions[p.id]
            return (
              <button key={p.id} onClick={() => switchTo(i)}
                className={`flex-shrink-0 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  i === qIdx
                    ? 'bg-brand text-white'
                    : 'bg-beige-pill text-t3 hover:text-t'
                }`}>
                Q{i + 1}
                {sub && (
                  <span className="ml-1">
                    {sub.status === 'Accepted'
                      ? <CheckCircle size={10} className="inline text-ok" />
                      : <XCircle    size={10} className="inline text-err" />}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tabular flex-shrink-0 ${
          timerWarn ? 'bg-red-100 text-red-600' : 'bg-beige-pill text-t'
        }`}>
          <Clock size={12} />
          {fmt(timeLeft)}
        </div>

        {/* Tab switches */}
        {test.tab_switch_detect && tabSwitches > 0 && (
          <span className="text-xs text-warn flex items-center gap-1 flex-shrink-0">
            <AlertTriangle size={12} /> {tabSwitches}
          </span>
        )}

        {/* Fullscreen */}
        <button onClick={toggleFullscreen} className="btn-ghost p-1.5 flex-shrink-0" title="Toggle fullscreen">
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* ── Main split ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: Problem statement */}
        <div className="w-[38%] min-w-[280px] flex flex-col border-r border-line overflow-hidden">

          {/* Tabs */}
          <div className="flex gap-1 px-3 pt-2 border-b border-line flex-shrink-0"
            style={{ background: 'var(--s)' }}>
            {['statement', 'output'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md capitalize transition-colors ${
                  activeTab === tab ? 'tab-active' : 'tab-inactive'
                }`}>{tab}</button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: 'var(--bg)' }}>
            {activeTab === 'statement' && curProblem && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-t4">Q{qIdx + 1} of {problems.length}</span>
                  <span className={`badge badge-${curProblem.difficulty === 'easy' ? 'green' : curProblem.difficulty === 'hard' ? 'red' : 'yellow'}`}>
                    {curProblem.difficulty}
                  </span>
                  {curSub && <StatusBadge status={curSub.status} />}
                </div>
                <h2 className="text-base font-bold mb-3">{curProblem.title}</h2>
                <Markdown className="text-sm text-t2 leading-relaxed">
                  {curProblem.description}
                </Markdown>

                {/* Sample test cases */}
                {(curProblem.test_cases || [])
                  .filter(tc => !tc.is_hidden)
                  .map((tc, i) => (
                    <div key={i} className="mt-3 rounded-lg border border-line p-3"
                      style={{ background: 'var(--s)' }}>
                      <p className="text-xs font-semibold text-t4 mb-1">Sample {i + 1}</p>
                      {tc.input_data && (
                        <div className="mb-1">
                          <span className="text-[10px] text-t4">Input:</span>
                          <pre className="text-xs font-mono mt-0.5 whitespace-pre-wrap">{tc.input_data}</pre>
                        </div>
                      )}
                      {tc.expected_output != null && (
                        <div>
                          <span className="text-[10px] text-t4">Output:</span>
                          <pre className="text-xs font-mono mt-0.5 whitespace-pre-wrap">{tc.expected_output}</pre>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'output' && (
              <div>
                {!runResult && !submitting && !running && (
                  <p className="text-sm text-t4 mt-8 text-center">Run or submit to see results.</p>
                )}
                {(running || submitting) && (
                  <p className="text-sm text-t3 mt-8 text-center animate-pulse">
                    {submitting ? 'Submitting…' : 'Running…'}
                  </p>
                )}
                {runResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={runResult.status} />
                      {runResult.score != null && (
                        <span className="text-xs text-t4">Score: {runResult.score}%</span>
                      )}
                    </div>
                    {/* Per-case results */}
                    {(runResult.results || []).map((r, i) => (
                      <div key={i} className={`rounded-lg border p-3 ${
                        r.status === 'Passed' ? 'border-ok/40 bg-ok/5' : 'border-err/40 bg-err/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {r.status === 'Passed'
                            ? <CheckCircle size={13} className="text-ok" />
                            : <XCircle    size={13} className="text-err" />}
                          <span className="text-xs font-semibold">
                            Case {i + 1} {r.is_hidden ? '(hidden)' : ''} — {r.status}
                          </span>
                        </div>
                        {r.actual_output != null && !r.is_hidden && (
                          <pre className="text-xs font-mono text-t3 whitespace-pre-wrap mt-1">
                            {r.actual_output}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="python"
              value={code}
              onChange={v => setCode(v || '')}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
                readOnly: false,
              }}
            />
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-line flex-shrink-0"
            style={{ background: 'var(--s)' }}>

          {/* Navigation */}
          <button onClick={() => qIdx > 0 && switchTo(qIdx - 1)}
            disabled={qIdx === 0} className="btn-secondary btn-sm gap-1 disabled:opacity-40">
            <ChevronLeft size={14} /> Prev
          </button>
          <button onClick={() => qIdx < problems.length - 1 && switchTo(qIdx + 1)}
            disabled={qIdx === problems.length - 1} className="btn-secondary btn-sm gap-1 disabled:opacity-40">
            Next <ChevronRight size={14} />
          </button>

          <span className="text-xs text-t4 ml-1">Q{qIdx + 1}/{problems.length}</span>

          <div className="flex-1" />

          {/* Run */}
          <button onClick={handleRun} disabled={running || submitting} className="btn-secondary gap-1">
            <Play size={14} /> {running ? 'Running…' : 'Run'}
          </button>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting || running} className="btn-primary gap-1">
            <Send size={14} /> {submitting ? 'Submitting…' : 'Submit Q' + (qIdx + 1)}
          </button>
        </div>
      </div>
    </div>
  </div>
  )
}

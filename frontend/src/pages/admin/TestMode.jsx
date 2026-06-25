/**
 * TestMode – Admin interface for managing tests.
 * Includes two tabs:
 * 1. Assessments: Create and manage multi-question timed test sessions (bundles).
 * 2. Question Bank: Create and manage individual coding problems.
 */
import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Search, FlaskConical, ShieldCheck, Edit, Copy, Power,
  Lock, AlertTriangle, X, CheckSquare, Square, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { DifficultyBadge } from '../../components/ui/Badge'
import CountBar, { diffStats } from '../../components/ui/CountBar'

// ── 1. QUESTION BANK FORM (Individual Coding Problems) ─────────────────────

const EMPTY_TC = { input_data: '', expected_output: '', is_hidden: false }

function QuestionForm({ initial, onSave, onCancel }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(
    initial || {
      title: '', description: '', topics: '', difficulty: 'medium',
      duration: 60, is_for_all: true, assigned_user_ids: '',
      start_time: '', end_time: '',
      tab_switch_detect: true, copy_paste_disable: true,
      f12_disable: true, fullscreen_required: true,
      window_switch_detect: true, block_paste: true,
      test_cases: [{ ...EMPTY_TC }],
    }
  )
  const [aiLoading, setAiLoading] = useState(false)
  const [aiForm, setAiForm] = useState({ topic: '', difficulty: 'medium', description: '' })

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [k]: val })
  }
  const setTc = (i, k, v) => {
    const tcs = [...form.test_cases]; tcs[i] = { ...tcs[i], [k]: v }
    setForm({ ...form, test_cases: tcs })
  }
  const addTc   = () => setForm({ ...form, test_cases: [...form.test_cases, { ...EMPTY_TC }] })
  const removeTc = (i) => setForm({ ...form, test_cases: form.test_cases.filter((_, idx) => idx !== i) })

  const generateAI = async () => {
    if (!aiForm.topic) { toast.error('Enter a topic'); return }
    setAiLoading(true)
    try {
      const { data } = await api.post('/ai/generate-problem', aiForm)
      setForm((f) => ({
        ...f,
        title: data.title || f.title, description: data.description || f.description,
        topics: data.topics || f.topics, difficulty: data.difficulty || f.difficulty,
        test_cases: data.test_cases?.length ? data.test_cases : f.test_cases,
      }))
      toast.success('AI problem generated!'); setStep(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'AI generation failed') }
    finally { setAiLoading(false) }
  }

  const handleSave = () => {
    if (!form.title || !form.description) { toast.error('Title and description required'); return }
    onSave({
      ...form, mode: 'test',
      start_time: form.start_time || null, end_time: form.end_time || null,
      duration: Number(form.duration) || null,
      assigned_user_ids: form.assigned_user_ids
        ? form.assigned_user_ids.split(',').map((x) => parseInt(x.trim())).filter(Boolean) : [],
    })
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {[['1 · Problem Details', 1], ['2 · Questions & Proctoring', 2]].map(([label, s]) => (
          <button key={s} type="button" onClick={() => setStep(s)}
            className={step === s ? 'tab-active' : 'tab-inactive'}>{label}</button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div><label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Question name" required /></div>
          <div><label className="label">Description *</label>
            <textarea className="input resize-none" rows={4} value={form.description} onChange={set('description')}
              placeholder="Problem statement…" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Topics</label>
              <input className="input" value={form.topics} onChange={set('topics')} placeholder="arrays, pointers" /></div>
            <div><label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={set('difficulty')}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select></div>
          </div>
          <button type="button" onClick={() => setStep(2)} className="btn-primary w-full justify-center">
            Next: Add Questions & Test Cases →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-line p-4" style={{ background: 'var(--brandGhost)' }}>
            <p className="text-xs font-semibold mb-3 flex items-center gap-1" style={{ color: 'var(--d-purple)' }}>
              <span>⚡</span> AI Generator (Cerebras)
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="input" placeholder="Topic" value={aiForm.topic}
                onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })} />
              <select className="input" value={aiForm.difficulty}
                onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <button type="button" onClick={generateAI} disabled={aiLoading}
              className="btn-secondary w-full justify-center text-sm">
              {aiLoading ? 'Generating…' : '✨ Generate with AI'}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Test Cases</label>
              <button type="button" onClick={addTc} className="btn-ghost btn-sm"><Plus size={13} /> Add</button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {form.test_cases.map((tc, i) => (
                <div key={i} className="rounded-lg border border-line p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-t3 tabular">Case #{i + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-t3 cursor-pointer">
                        <input type="checkbox" className="accent-primary" checked={tc.is_hidden}
                          onChange={(e) => setTc(i, 'is_hidden', e.target.checked)} /> Hidden
                      </label>
                      {form.test_cases.length > 1 && (
                        <button type="button" onClick={() => removeTc(i)} style={{ color: 'var(--err)' }}>
                          <Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-[10px]">Input</label>
                      <textarea className="input font-mono text-xs resize-none" rows={3}
                        value={tc.input_data} onChange={(e) => setTc(i, 'input_data', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-[10px]">Expected Output</label>
                      <textarea className="input font-mono text-xs resize-none" rows={3}
                        value={tc.expected_output} onChange={(e) => setTc(i, 'expected_output', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} className="btn-primary flex-1">Save Question</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 2. MULTI-QUESTION ASSESSMENT FORM ──────────────────────────────────────

const EMPTY_TEST_BUNDLE = {
  title: '', description: '', duration: 90,
  start_time: '', end_time: '', is_for_all: true,
  tab_switch_detect: true, copy_paste_disable: true,
  f12_disable: true, fullscreen_required: false,
  window_switch_detect: false, block_paste: false,
  problem_ids: [],
}

function AssessmentForm({ initial, onSave, onCancel }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initial || { ...EMPTY_TEST_BUNDLE })
  const [testProblems, setTestProblems] = useState([])
  const [pSearch, setPSearch] = useState('')

  useEffect(() => {
    api.get('/problems?mode=test&include_inactive=false')
      .then(r => setTestProblems(r.data))
      .catch(() => {})
  }, [])

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const toggleProblem = id => {
    setForm(f => {
      const ids = f.problem_ids.includes(id)
        ? f.problem_ids.filter(x => x !== id)
        : [...f.problem_ids, id]
      return { ...f, problem_ids: ids }
    })
  }

  const moveProblem = (id, dir) => {
    setForm(f => {
      const ids = [...f.problem_ids]
      const idx = ids.indexOf(id)
      if (idx < 0) return f
      const swap = idx + dir
      if (swap < 0 || swap >= ids.length) return f
      ;[ids[idx], ids[swap]] = [ids[swap], ids[idx]]
      return { ...f, problem_ids: ids }
    })
  }

  const handleSave = () => {
    if (!form.title) { toast.error('Title is required'); return }
    if (form.problem_ids.length < 1) { toast.error('Select at least one question'); return }
    onSave({
      ...form,
      duration: Number(form.duration) || 90,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    })
  }

  const filtered = testProblems.filter(p =>
    p.title.toLowerCase().includes(pSearch.toLowerCase())
  )

  const selectedProblems = form.problem_ids
    .map(id => testProblems.find(p => p.id === id))
    .filter(Boolean)

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {[['1 · Assessment Details', 1], ['2 · Select Questions', 2]].map(([lbl, s]) => (
          <button key={s} type="button" onClick={() => setStep(s)}
            className={step === s ? 'tab-active' : 'tab-inactive'}>{lbl}</button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">Assessment Title *</label>
            <input className="input" value={form.title} onChange={set('title')}
              placeholder="e.g. Python Programming Midterm" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description}
              onChange={set('description')} placeholder="Instructions for students…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="datetime-local" className="input" value={form.start_time} onChange={set('start_time')} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="datetime-local" className="input" value={form.end_time} onChange={set('end_time')} />
            </div>
          </div>
          <div>
            <label className="label">Total Duration (minutes)</label>
            <input type="number" className="input" value={form.duration} onChange={set('duration')} min={5} />
          </div>

          {/* Proctoring */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={15} style={{ color: 'var(--d-purple)' }} />
              <label className="label !mb-0" style={{ color: 'var(--d-purple)' }}>Proctoring Options</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['tab_switch_detect',    'Tab Switch Detection'],
                ['window_switch_detect', 'Window Switch Detection'],
                ['copy_paste_disable',   'Disable Copy-Paste'],
                ['block_paste',          'Block Paste into Editor'],
                ['f12_disable',          'Disable F12 / DevTools'],
                ['fullscreen_required',  'Require Full Screen'],
              ].map(([key, label]) => (
                <label key={key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form[key] ? 'border-line-strong' : 'border-line text-t3 hover:border-line-strong'
                  }`}
                  style={form[key] ? { background: 'var(--brandGhost)', color: 'var(--d-purple)' } : undefined}>
                  <input type="checkbox" className="accent-violet" checked={form[key]} onChange={set(key)} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => setStep(2)} className="btn-primary w-full justify-center">
            Next: Select Questions →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Selected questions order preview */}
          {selectedProblems.length > 0 && (
            <div className="rounded-lg border border-line p-3" style={{ background: 'var(--brandGhost)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--d-purple)' }}>
                Selected Questions ({selectedProblems.length})
              </p>
              <div className="space-y-1.5">
                {selectedProblems.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-md bg-beige px-2 py-1.5 border border-line">
                    <span className="text-xs text-t4 font-mono w-5">Q{i + 1}</span>
                    <span className="text-xs flex-1 truncate">{p.title}</span>
                    <div className="flex gap-0.5">
                      <button type="button" onClick={() => moveProblem(p.id, -1)}
                        disabled={i === 0} className="btn-ghost p-0.5 text-t4 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveProblem(p.id, 1)}
                        disabled={i === selectedProblems.length - 1} className="btn-ghost p-0.5 text-t4 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => toggleProblem(p.id)}
                        className="btn-ghost p-0.5" style={{ color: 'var(--err)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question bank list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Available Questions from Bank</label>
              <span className="text-xs text-t4">{form.problem_ids.length} selected</span>
            </div>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input className="input pl-8 text-sm" placeholder="Search question bank…"
                value={pSearch} onChange={e => setPSearch(e.target.value)} />
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="text-xs text-t4 text-center py-4">No coding questions found. Add questions in the Question Bank tab first.</p>
              )}
              {filtered.map(p => {
                const selected = form.problem_ids.includes(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleProblem(p.id)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                      selected ? 'border-line-strong' : 'border-line hover:border-line-strong'
                    }`}
                    style={selected ? { background: 'var(--brandGhost)' } : undefined}>
                    {selected
                      ? <CheckSquare size={15} style={{ color: 'var(--d-purple)', flexShrink: 0 }} />
                      : <Square      size={15} className="text-t4 flex-shrink-0" />}
                    <span className="text-sm flex-1 truncate">{p.title}</span>
                    <DifficultyBadge level={p.difficulty} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} className="btn-primary flex-1">
              Save Assessment ({form.problem_ids.length} Q)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 3. MAIN PAGE ───────────────────────────────────────────────────────────

export default function TestMode() {
  const [activeTab, setActiveTab] = useState('assessments') // 'assessments' | 'bank'

  // Assessments state
  const [tests, setTests]         = useState([])
  const [testSearch, setTestSearch] = useState('')
  const [showInactiveTests, setShowInactiveTests] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [editTest, setEditTest]   = useState(null)

  // Question bank state
  const [problems, setProblems]   = useState([])
  const [bankSearch, setBankSearch] = useState('')
  const [showInactiveBank, setShowInactiveBank] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editQuestion, setEditQuestion] = useState(null)

  const [loading, setLoading]     = useState(true)

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      api.get('/tests?include_inactive=true'),
      api.get('/problems?mode=test&include_inactive=true')
    ]).then(([testsRes, bankRes]) => {
      setTests(testsRes.data)
      setProblems(bankRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  // ── Assessment Handlers ──────────────────────────────────────────────────
  const handleSaveTest = async (payload) => {
    try {
      if (editTest) {
        await api.put(`/tests/${editTest.id}`, payload)
        toast.success('Assessment updated!')
      } else {
        await api.post('/tests', payload)
        toast.success('Assessment created!')
      }
      setShowTestModal(false)
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save assessment')
    }
  }

  const handleEditTest = async (id) => {
    try {
      const { data } = await api.get(`/tests/${id}`)
      const form = {
        ...data,
        start_time: data.start_time ? data.start_time.slice(0, 16) : '',
        end_time:   data.end_time   ? data.end_time.slice(0, 16)   : '',
        problem_ids: (data.problems || []).map(p => p.id),
      }
      setEditTest(form)
      setShowTestModal(true)
    } catch {
      toast.error('Failed to load assessment details')
    }
  }

  const handleToggleActiveTest = async (test) => {
    try {
      await api.patch(`/tests/${test.id}/active`, { is_active: !test.is_active })
      toast.success(test.is_active ? 'Assessment deactivated' : 'Assessment activated')
      loadAll()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteTest = async (test) => {
    if (!window.confirm(`Permanently delete assessment "${test.title}"?\n\nThis cannot be undone.`)) return
    try {
      await api.delete(`/tests/${test.id}`)
      toast.success('Assessment deleted')
      loadAll()
    } catch {
      toast.error('Failed to delete assessment')
    }
  }

  // ── Question Bank Handlers ───────────────────────────────────────────────
  const handleSaveQuestion = async (payload) => {
    try {
      if (editQuestion) {
        await api.put(`/problems/${editQuestion.id}`, payload)
        toast.success('Question updated!')
      } else {
        await api.post('/problems', payload)
        toast.success('Question created!')
      }
      setShowQuestionModal(false)
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save question')
    }
  }

  const handleEditQuestion = async (id) => {
    try {
      const { data } = await api.get(`/problems/${id}`)
      if (data.start_time) data.start_time = data.start_time.slice(0, 16)
      if (data.end_time) data.end_time = data.end_time.slice(0, 16)
      data.assigned_user_ids = ''
      setEditQuestion(data)
      setShowQuestionModal(true)
    } catch {
      toast.error('Failed to load question details')
    }
  }

  const handleDuplicateQuestion = async (id) => {
    try {
      await api.post(`/problems/${id}/duplicate`)
      toast.success('Question duplicated')
      loadAll()
    } catch {
      toast.error('Failed to duplicate question')
    }
  }

  const handleToggleActiveQuestion = async (p) => {
    try {
      await api.patch(`/problems/${p.id}/active`, { is_active: !p.is_active })
      toast.success(p.is_active ? 'Question deactivated' : 'Question activated')
      loadAll()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteQuestion = async (p) => {
    if (!window.confirm(`Permanently delete "${p.title}"?\n\nThis removes the question, its test cases and all student attempts/submissions. This cannot be undone.`)) return
    try {
      await api.delete(`/problems/${p.id}/permanent`)
      toast.success('Question deleted')
      loadAll()
    } catch {
      toast.error('Failed to delete question')
    }
  }

  // Filter lists
  const filteredTests = tests.filter(e =>
    e.title.toLowerCase().includes(testSearch.toLowerCase()) &&
    (showInactiveTests || e.is_active)
  )
  const inactiveTestsCount = tests.filter(e => !e.is_active).length

  const filteredProblems = problems.filter(p =>
    p.title.toLowerCase().includes(bankSearch.toLowerCase()) &&
    (showInactiveBank || p.is_active)
  )
  const inactiveBankCount = problems.filter(p => !p.is_active).length

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h1">Tests</h1>
          <p className="section-sub mt-0.5">Manage timed multi-question assessments and the coding question bank</p>
        </div>
        {activeTab === 'assessments' ? (
          <button onClick={() => { setEditTest(null); setShowTestModal(true) }} className="btn-primary">
            <Plus size={16} /> Create Assessment
          </button>
        ) : (
          <button onClick={() => { setEditQuestion(null); setShowQuestionModal(true) }} className="btn-primary">
            <Plus size={16} /> Create Question
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`px-4 py-2 font-semibold text-sm -mb-px transition-colors ${
            activeTab === 'assessments'
              ? 'border-b-2 border-primary text-primary font-bold'
              : 'text-t3 hover:text-t'
          }`}
        >
          Assessments ({tests.length})
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 font-semibold text-sm -mb-px transition-colors ${
            activeTab === 'bank'
              ? 'border-b-2 border-primary text-primary font-bold'
              : 'text-t3 hover:text-t'
          }`}
        >
          Question Bank ({problems.length})
        </button>
      </div>

      {/* ── Tab Content: Assessments ───────────────────────────────────────── */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-xs flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input className="input pl-8" placeholder="Search assessments…" value={testSearch}
                onChange={e => setTestSearch(e.target.value)} />
            </div>
            {inactiveTestsCount > 0 && (
              <button onClick={() => setShowInactiveTests(v => !v)} className={showInactiveTests ? 'tab-active' : 'tab-inactive'}>
                {showInactiveTests ? 'Hide' : 'Show'} inactive ({inactiveTestsCount})
              </button>
            )}
            <span className="text-xs text-t4 ml-auto">{filteredTests.length} assessment{filteredTests.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredTests.length === 0 ? (
            <div className="card text-center py-16">
              <BookOpen size={40} className="mx-auto text-t4 mb-3" />
              <p className="text-t3 mb-1">No assessments yet.</p>
              <p className="text-xs text-t4">Create an assessment to bundle coding questions into a single timed session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTests.map(test => (
                <div key={test.id} className="card" style={test.is_active ? undefined : { opacity: 0.62 }}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="h3 text-sm line-clamp-2 flex-1 pr-2">{test.title}</h3>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => handleEditTest(test.id)} title="Edit" className="btn-ghost p-1" style={{ color: 'var(--t2)' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleToggleActiveTest(test)} title={test.is_active ? 'Deactivate' : 'Activate'}
                        className="btn-ghost p-1" style={{ color: test.is_active ? 'var(--warn)' : 'var(--ok)' }}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => handleDeleteTest(test)} title="Delete" className="btn-ghost p-1" style={{ color: 'var(--err)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {test.description && (
                    <p className="text-xs text-t3 mb-2 line-clamp-2">{test.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="badge badge-violet tabular">{test.problem_count} question{test.problem_count !== 1 ? 's' : ''}</span>
                    {test.duration && <span className="badge badge-cyan tabular">{test.duration} min</span>}
                    {test.fullscreen_required && <span className="badge badge-violet"><Lock size={10} /> Fullscreen</span>}
                    {test.tab_switch_detect   && <span className="badge badge-yellow"><AlertTriangle size={10} /> Tab Monitor</span>}
                    {!test.is_active          && <span className="badge badge-gray">Inactive</span>}
                  </div>

                  {test.start_time && (
                    <p className="text-xs text-t4 tabular">
                      Start: {new Date(test.start_time).toLocaleString()}
                    </p>
                  )}
                  {test.end_time && (
                    <p className="text-xs text-t4 tabular">
                      End: {new Date(test.end_time).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Question Bank ─────────────────────────────────────── */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-xs flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input className="input pl-8" placeholder="Search questions…" value={bankSearch}
                onChange={e => setBankSearch(e.target.value)} />
            </div>
            {inactiveBankCount > 0 && (
              <button onClick={() => setShowInactiveBank(v => !v)} className={showInactiveBank ? 'tab-active' : 'tab-inactive'}>
                {showInactiveBank ? 'Hide' : 'Show'} inactive ({inactiveBankCount})
              </button>
            )}
            <CountBar stats={[{ label: 'Total', count: problems.length }, ...diffStats(problems)]} />
          </div>

          {filteredProblems.length === 0 ? (
            <div className="card text-center py-16">
              <FlaskConical size={40} className="mx-auto text-t4 mb-3" />
              <p className="text-t3">No questions found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProblems.map(p => (
                <div key={p.id} className="card" style={p.is_active ? undefined : { opacity: 0.62 }}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="h3 text-sm line-clamp-2 flex-1 pr-2">{p.title}</h3>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => handleEditQuestion(p.id)} title="Edit" className="btn-ghost p-1" style={{ color: 'var(--t2)' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDuplicateQuestion(p.id)} title="Duplicate" className="btn-ghost p-1" style={{ color: 'var(--t2)' }}>
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleToggleActiveQuestion(p)} title={p.is_active ? 'Deactivate' : 'Activate'} className="btn-ghost p-1"
                        style={{ color: p.is_active ? 'var(--warn)' : 'var(--ok)' }}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => handleDeleteQuestion(p)} title="Delete permanently" className="btn-ghost p-1" style={{ color: 'var(--err)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <DifficultyBadge level={p.difficulty} />
                    <span className="badge-violet badge tabular">{p.test_cases_count} cases</span>
                    {!p.is_active && <span className="badge-gray badge">Inactive</span>}
                  </div>
                  {p.topics && <p className="text-xs text-t3 truncate">Topics: {p.topics}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={showTestModal} onClose={() => setShowTestModal(false)}
        title={editTest ? 'Edit Assessment' : 'Create Assessment'} size="lg">
        <AssessmentForm
          key={editTest ? editTest.id : 'new'}
          initial={editTest}
          onSave={handleSaveTest}
          onCancel={() => setShowTestModal(false)}
        />
      </Modal>

      <Modal open={showQuestionModal} onClose={() => setShowQuestionModal(false)}
        title={editQuestion ? 'Edit Coding Question' : 'Create Coding Question'} size="lg">
        <QuestionForm
          key={editQuestion ? editQuestion.id : 'new'}
          initial={editQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => setShowQuestionModal(false)}
        />
      </Modal>
    </div>
  )
}

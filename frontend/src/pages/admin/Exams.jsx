/**
 * AdminExams – Create/manage multi-question exam bundles.
 * Admin picks any Test-mode problems and groups them into one timed exam.
 * Students see the exam as a single card and solve all questions in one session.
 */
import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Search, BookOpen, ShieldCheck, Edit, Power,
  AlertTriangle, Lock, GripVertical, X, CheckSquare, Square,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { DifficultyBadge } from '../../components/ui/Badge'

// ── Exam form ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', description: '', duration: 90,
  start_time: '', end_time: '', is_for_all: true,
  tab_switch_detect: true, copy_paste_disable: true,
  f12_disable: true, fullscreen_required: false,
  window_switch_detect: false, block_paste: false,
  problem_ids: [],
}

function ExamForm({ initial, onSave, onCancel }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initial || { ...EMPTY_FORM })
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
    if (form.problem_ids.length < 1) { toast.error('Select at least one problem'); return }
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

  // Problems in selected order
  const selectedProblems = form.problem_ids
    .map(id => testProblems.find(p => p.id === id))
    .filter(Boolean)

  return (
    <div>
      {/* Step tabs */}
      <div className="flex gap-2 mb-5">
        {[['1 · Exam Details', 1], ['2 · Pick Questions', 2]].map(([lbl, s]) => (
          <button key={s} type="button" onClick={() => setStep(s)}
            className={step === s ? 'tab-active' : 'tab-inactive'}>{lbl}</button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">Exam Title *</label>
            <input className="input" value={form.title} onChange={set('title')}
              placeholder="e.g. Python String Assessment" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description}
              onChange={set('description')} placeholder="Brief overview for students…" />
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
            Next: Pick Questions →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Selected order preview */}
          {selectedProblems.length > 0 && (
            <div className="rounded-lg border border-line p-3" style={{ background: 'var(--brandGhost)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--d-purple)' }}>
                Selected Questions ({selectedProblems.length}) — drag to reorder
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

          {/* Problem picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Available Test Problems</label>
              <span className="text-xs text-t4">{form.problem_ids.length} selected</span>
            </div>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input className="input pl-8 text-sm" placeholder="Search problems…"
                value={pSearch} onChange={e => setPSearch(e.target.value)} />
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="text-xs text-t4 text-center py-4">No test problems found. Create some in the Tests tab first.</p>
              )}
              {filtered.map(p => {
                const selected = form.problem_ids.includes(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleProblem(p.id)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'border-line-strong'
                        : 'border-line hover:border-line-strong'
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
              Save Exam ({form.problem_ids.length} Q)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminExams() {
  const [exams, setExams]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editExam, setEditExam]   = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/exams?include_inactive=true')
      .then(r => setExams(r.data))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSave = async payload => {
    try {
      if (editExam) {
        await api.put(`/exams/${editExam.id}`, payload)
        toast.success('Exam updated!')
      } else {
        await api.post('/exams', payload)
        toast.success('Exam created!')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save exam')
    }
  }

  const handleEdit = async id => {
    try {
      const { data } = await api.get(`/exams/${id}`)
      const form = {
        ...data,
        start_time: data.start_time ? data.start_time.slice(0, 16) : '',
        end_time:   data.end_time   ? data.end_time.slice(0, 16)   : '',
        problem_ids: (data.problems || []).map(p => p.id),
      }
      setEditExam(form)
      setShowModal(true)
    } catch {
      toast.error('Failed to load exam details')
    }
  }

  const handleToggleActive = async exam => {
    try {
      await api.patch(`/exams/${exam.id}/active`, { is_active: !exam.is_active })
      toast.success(exam.is_active ? 'Exam deactivated' : 'Exam activated')
      load()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async exam => {
    if (!window.confirm(`Permanently delete exam "${exam.title}"?\n\nThis cannot be undone.`)) return
    try {
      await api.delete(`/exams/${exam.id}`)
      toast.success('Exam deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = exams.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) &&
    (showInactive || e.is_active)
  )
  const inactiveCount = exams.filter(e => !e.is_active).length

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h1">Exams</h1>
          <p className="section-sub mt-0.5">Bundle multiple questions into one timed exam session</p>
        </div>
        <button onClick={() => { setEditExam(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Create Exam
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border border-line"
        style={{ background: 'var(--brandGhost)' }}>
        <BookOpen size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--d-purple)' }} />
        <p className="text-xs text-t3">
          <span className="font-semibold" style={{ color: 'var(--d-purple)' }}>How it works: </span>
          Pick any Test-mode problems and bundle them into an Exam. Students see the exam as one card,
          enter it, and solve all questions (Q1, Q2 …) within a single timed session.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
          <input className="input pl-8" placeholder="Search exams…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        {inactiveCount > 0 && (
          <button onClick={() => setShowInactive(v => !v)} className={showInactive ? 'tab-active' : 'tab-inactive'}>
            {showInactive ? 'Hide' : 'Show'} inactive ({inactiveCount})
          </button>
        )}
        <span className="text-xs text-t4 ml-auto">{filtered.length} exam{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={40} className="mx-auto text-t4 mb-3" />
          <p className="text-t3 mb-1">No exams yet.</p>
          <p className="text-xs text-t4">Create an exam to bundle multiple test questions into one session.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(exam => (
            <div key={exam.id} className="card" style={exam.is_active ? undefined : { opacity: 0.62 }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="h3 text-sm line-clamp-2 flex-1 pr-2">{exam.title}</h3>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => handleEdit(exam.id)} title="Edit" className="btn-ghost p-1" style={{ color: 'var(--t2)' }}>
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleToggleActive(exam)} title={exam.is_active ? 'Deactivate' : 'Activate'}
                    className="btn-ghost p-1" style={{ color: exam.is_active ? 'var(--warn)' : 'var(--ok)' }}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => handleDelete(exam)} title="Delete" className="btn-ghost p-1" style={{ color: 'var(--err)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {exam.description && (
                <p className="text-xs text-t3 mb-2 line-clamp-2">{exam.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="badge badge-violet tabular">{exam.problem_count} question{exam.problem_count !== 1 ? 's' : ''}</span>
                {exam.duration && <span className="badge badge-cyan tabular">{exam.duration} min</span>}
                {exam.fullscreen_required && <span className="badge badge-violet"><Lock size={10} /> Fullscreen</span>}
                {exam.tab_switch_detect   && <span className="badge badge-yellow"><AlertTriangle size={10} /> Tab Monitor</span>}
                {!exam.is_active          && <span className="badge badge-gray">Inactive</span>}
              </div>

              {exam.start_time && (
                <p className="text-xs text-t4 tabular">
                  Start: {new Date(exam.start_time).toLocaleString()}
                </p>
              )}
              {exam.end_time && (
                <p className="text-xs text-t4 tabular">
                  End: {new Date(exam.end_time).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editExam ? 'Edit Exam' : 'Create Exam'} size="lg">
        <ExamForm
          key={editExam ? editExam.id : 'new'}
          initial={editExam}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}

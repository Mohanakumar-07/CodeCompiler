import EditorTour from './EditorTour'
import { useAuth } from '../../context/AuthContext'

const P = 'right'   // tour cards sit to the right of the sidebar items

const STUDENT_STEPS = [
  { title: 'Welcome to CodeArena 👋', body: "Here's a quick 1-minute tour — what each section in the sidebar does." },
  { selector: '[data-tour="nav-dashboard"]', placement: P, title: 'Dashboard', body: 'Your progress, recent activity and a skill chart at a glance.' },
  { selector: '[data-tour="nav-tests"]', placement: P, title: 'Tests', body: 'Timed, proctored coding tests assigned to you — solve them in Python, Java, C++ or C.' },
  { selector: '[data-tour="nav-reports"]', placement: P, title: 'Reports', body: 'Your submission history, scores, and a downloadable completion certificate.' },
  { selector: '[data-tour="nav-analytics"]', placement: P, title: 'Analytics', body: 'See your strengths and weak topics, and your progress over time.' },
  { selector: '[data-tour="nav-profile"]', placement: 'top', title: 'Your profile', body: 'Click your name to edit your details, add a phone number, or change your password.' },
  { title: "You're all set! 🚀", body: 'Head to Tests to start a coding test. Replay this tour anytime from the ? button at the top.' },
]

const ADMIN_STEPS = [
  { title: 'Welcome, Admin 👋', body: "A quick tour of the admin portal — here's everything you can manage." },
  { selector: '[data-tour="nav-dashboard"]', placement: P, title: 'Dashboard', body: 'Platform overview: students, submissions, acceptance rate and storage.' },
  { selector: '[data-tour="nav-students"]', placement: P, title: 'Students', body: 'All student details in one table — reset a forgotten password or remove an account.' },
  { selector: '[data-tour="nav-tests"]', placement: P, title: 'Tests', body: 'Create timed, proctored coding tests (tab-switch detection, fullscreen, copy-paste lock) across four languages.' },
  { selector: '[data-tour="nav-live"]', placement: P, title: 'Live Tests', body: "Monitor tests in real time — who's attending right now, who's done, and who hasn't started." },
  { selector: '[data-tour="nav-reports"]', placement: P, title: 'Reports', body: 'The full gradebook — filter, leave feedback, and export to Excel.' },
  { selector: '[data-tour="nav-analytics"]', placement: P, title: 'Analytics', body: "Cohort insights: hardest problems, weak topics, and who's stuck." },
  { selector: '[data-tour="nav-system"]', placement: P, title: 'System', body: 'Live service health, a real-time request log, storage usage, and database backups.' },
  { selector: '[data-tour="nav-profile"]', placement: 'top', title: 'Your profile', body: 'Click your name to edit your details or change your password.' },
  { title: "That's the tour! 🚀", body: 'Create your first test from the Tests page. Replay this tour anytime from the ? button at the top.' },
]

export default function PlatformTour({ open, onClose }) {
  const { user } = useAuth()
  const steps = user?.role === 'admin' ? ADMIN_STEPS : STUDENT_STEPS
  return <EditorTour open={open} steps={steps} onClose={onClose} />
}

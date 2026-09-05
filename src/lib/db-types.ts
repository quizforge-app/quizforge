// ── IndexedDB schema types for Quizard ──

export interface Account {
  id: string
  name: string
  pinHash: string | null
  color: string
  createdAt: number
}

export interface Doc {
  id: string
  accountId: string
  name: string
  type: string
  text: string
  original: Blob | null
  visualAnalysis: unknown | null
  topics: Topic[]
  folder: string | null
  tags: string[]
  wordCount: number
  createdAt: number
  bestScore: number | null
  attempts: number
}

export interface DocMeta extends Omit<Doc, 'text' | 'original' | 'visualAnalysis'> {}

export interface Topic {
  title: string
  count: number
}

export interface Attempt {
  id: string
  accountId: string
  docId: string
  date: number
  percent: number | null
  questions: unknown[]
  answers: unknown[]
  shared: boolean
  mistakeMode: boolean
  [key: string]: unknown
}

export interface Mistake {
  id: string
  accountId: string
  docId: string
  sentence: string
  term: string
  type: string
  wrongCount: number
  createdAt: number
  lastWrongAt: number
}

export interface DocImage {
  id: string
  docId: string
  accountId: string
  blob: Blob
  mime: string
  slideNumber: number | null
  index: number
}

export interface SrsRecord {
  id: string
  accountId: string
  docId: string
  term: string
  sentence: string
  type: string
  ease: number
  intervalDays: number
  dueAt: number
  reps: number
  lapses: number
  createdAt: number
  lastReviewedAt: number
}

export interface Deck {
  id: string
  accountId: string
  name: string
  questions: unknown[]
  source: string
  docId: string | null
  createdAt: number
}

export interface WeakTerm {
  term: string
  docId: string
  sentence: string
  type: string
  weight: number
}

export interface QuizConfig {
  count: number
  mix: Record<string, boolean>
  difficulty: string
  shuffle: boolean
  timerSec: number
  fresh: boolean
  topics: string[]
  fixedSeed: number | null
}

export interface Exam {
  id: string
  accountId?: string
  title: string
  examDate?: number
  createdAt: number
  announcement: string
  docIds: string[]
  topics: { title: string; docId?: string; reason?: string }[]
  status?: 'upcoming' | 'done'
  [key: string]: unknown
}

export interface AppSettings {
  theme?: string
  tutorialDone?: boolean
  tutorialDoneAccounts?: Record<string, boolean>
  tutorialAccountId?: string
  tourSeen?: string[]
  wizardVoice?: boolean
  onboarded?: boolean
  lastBackupAt?: number
  explainAfter?: boolean
  notificationMinutes?: number
  configs?: Record<string, Partial<QuizConfig>>
  [key: string]: unknown
}

export interface ExportData {
  app: 'quizard'
  version: number
  exportedAt: string
  accounts: Account[]
  docs: Doc[]
  attempts: Attempt[]
  mistakes: Mistake[]
  imageRecords: unknown[]
  srs: SrsRecord[]
  decks: Deck[]
  settings: AppSettings
}

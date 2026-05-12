import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import ParticlesCanvas from '../components/ParticlesCanvas'

const ROLE_OPTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'UI/UX Designer',
  'HR Manager',
  'Marketing Specialist',
  'Custom Role',
]

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const INTERVIEW_TYPES = ['Technical', 'HR', 'Behavioral', 'Mixed']
const QUESTION_COUNTS = [5, 10, 15]
const MAX_ANSWER_LENGTH = 1200
const API_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
const USE_PROXY_IN_DEV =
  import.meta.env.DEV &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(API_BASE)

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (USE_PROXY_IN_DEV || !API_BASE) {
    return `/api${normalized}`
  }

  return `${API_BASE}/api${normalized}`
}

async function postJson(path, payload) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data
}

function safeText(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '')
  return text.trim() || fallback
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safeText(item)).filter(Boolean)
  }

  const text = safeText(value)
  return text ? [text] : []
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clampScore(value) {
  return Math.max(1, Math.min(10, Number(value) || 0))
}

function performanceLabel(score) {
  if (score >= 8.5) return 'Excellent'
  if (score >= 7) return 'Strong'
  if (score >= 5.5) return 'Solid'
  if (score >= 4) return 'Developing'
  return 'Needs Support'
}

function uniqueList(items, limit = 5) {
  const seen = new Set()
  const output = []
  for (const item of items) {
    const text = safeText(item)
    if (!text || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    output.push(text)
    if (output.length >= limit) break
  }
  return output
}

function buildInterviewHistory(turns) {
  return turns.map((turn) => ({
    question: turn.question,
    answer: turn.answer,
    score: turn.feedback?.score,
    strengths: turn.feedback?.strengths || [],
    weaknesses: turn.feedback?.weaknesses || [],
    suggestions: turn.feedback?.suggestions || [],
    ideal_answer: turn.feedback?.ideal_answer || '',
    communication_rating: turn.feedback?.communication_rating,
    technical_rating: turn.feedback?.technical_rating,
    confidence_rating: turn.feedback?.confidence_rating,
    performance_level: turn.feedback?.performance_level,
  }))
}

function normalizeFeedback(data) {
  const score = clampScore(data?.score)
  return {
    score,
    strengths: toStringArray(data?.strengths),
    weaknesses: toStringArray(data?.weaknesses),
    suggestions: toStringArray(data?.suggestions),
    ideal_answer: safeText(data?.ideal_answer || data?.idealAnswer),
    communication_rating: clampScore(data?.communication_rating || score),
    technical_rating: clampScore(data?.technical_rating || score),
    confidence_rating: clampScore(data?.confidence_rating || score),
    performance_level: safeText(data?.performance_level, performanceLabel(score)),
    follow_up_direction: safeText(data?.follow_up_direction, 'maintain'),
    short_feedback: safeText(data?.short_feedback || data?.feedback_summary),
    question: safeText(data?.question),
  }
}

function buildLocalSummary(turns) {
  const scores = turns.map((turn) => Number(turn.feedback?.score)).filter((value) => Number.isFinite(value))
  const communication = turns
    .map((turn) => Number(turn.feedback?.communication_rating))
    .filter((value) => Number.isFinite(value))
  const technical = turns
    .map((turn) => Number(turn.feedback?.technical_rating))
    .filter((value) => Number.isFinite(value))
  const confidence = turns
    .map((turn) => Number(turn.feedback?.confidence_rating))
    .filter((value) => Number.isFinite(value))

  const allStrengths = uniqueList(turns.flatMap((turn) => turn.feedback?.strengths || []), 5)
  const allWeaknesses = uniqueList(
    turns.flatMap((turn) => [...(turn.feedback?.weaknesses || []), ...(turn.feedback?.suggestions || [])]),
    6,
  )

  return {
    overall_score: scores.length ? Number(average(scores).toFixed(1)) : 0,
    performance_level: performanceLabel(scores.length ? average(scores) : 0),
    communication_rating: communication.length ? Number(average(communication).toFixed(1)) : 0,
    technical_rating: technical.length ? Number(average(technical).toFixed(1)) : 0,
    confidence_rating: confidence.length ? Number(average(confidence).toFixed(1)) : 0,
    strong_areas: allStrengths,
    areas_needing_improvement: allWeaknesses,
    final_feedback_message:
      turns.at(-1)?.feedback?.short_feedback ||
      'You completed the interview practice session. Review the notes and repeat the drill to raise your score.',
  }
}

// Common tech concepts and keywords to extract from questions/answers
const CONCEPT_KEYWORDS = {
  backend: ['rest api', 'rest', 'graphql', 'database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'indexing', 'query', 'schema', 'orm', 'docker', 'kubernetes', 'microservices', 'scaling', 'caching', 'redis', 'server', 'node', 'python', 'java', 'backend'],
  frontend: ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'dom', 'component', 'state management', 'redux', 'hooks', 'frontend', 'ui', 'ux', 'responsive', 'performance', 'bundler', 'webpack'],
  devops: ['docker', 'kubernetes', 'ci/cd', 'jenkins', 'gitlab', 'github', 'aws', 'azure', 'gcp', 'terraform', 'ansible', 'devops', 'deployment', 'monitoring', 'logging'],
  security: ['authentication', 'jwt', 'oauth', 'encryption', 'security', 'ssl', 'tls', 'hash', 'salt', 'cors', 'csrf', 'xss', 'injection', 'access control'],
  design: ['design pattern', 'solid', 'dry', 'architecture', 'system design', 'scalability', 'reliability', 'availability', 'latency', 'throughput'],
  soft: ['communication', 'collaboration', 'teamwork', 'leadership', 'conflict resolution', 'adaptability', 'problem-solving'],
}

function extractConceptsFromText(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const extracted = new Set()
  
  // Check against all keyword patterns
  Object.values(CONCEPT_KEYWORDS).forEach(keywords => {
    keywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        // Capitalize first letter for display
        extracted.add(keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      }
    })
  })
  
  return Array.from(extracted)
}

function extractConceptsFromTurn(turn) {
  const concepts = new Set()
  
  // Extract from question
  extractConceptsFromText(turn.question).forEach(c => concepts.add(c))
  
  // Extract from answer
  extractConceptsFromText(turn.answer).forEach(c => concepts.add(c))
  
  // Extract from feedback
  if (turn.feedback) {
    extractConceptsFromText(turn.feedback.short_feedback).forEach(c => concepts.add(c))
    extractConceptsFromText(turn.feedback.ideal_answer).forEach(c => concepts.add(c))
    ;(turn.feedback.strengths || []).forEach(s => extractConceptsFromText(s).forEach(c => concepts.add(c)))
    ;(turn.feedback.weaknesses || []).forEach(w => extractConceptsFromText(w).forEach(c => concepts.add(c)))
    ;(turn.feedback.suggestions || []).forEach(s => extractConceptsFromText(s).forEach(c => concepts.add(c)))
  }
  
  return Array.from(concepts)
}

function FieldShell({ label, hint, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-emerald-100/80">{label}</span>
      {children}
      {hint ? <span className="text-xs text-emerald-100/45">{hint}</span> : null}
    </label>
  )
}

function TypingDots({ label = 'AI is responding' }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-neon-500/15 bg-black/20 px-4 py-2 text-xs text-emerald-100/70">
      <span className="h-2 w-2 rounded-full bg-neon-500 shadow-[0_0_16px_rgba(0,255,102,0.8)]" />
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-neon-400"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.16 }}
          />
        ))}
      </span>
    </div>
  )
}

function ProgressPill({ current, total }) {
  return (
    <div
      id="progress1"
      className="inline-flex items-center gap-2 rounded-full border border-neon-500/20 bg-emerald-50/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-emerald-100/70"
    >
      <span className="h-2 w-2 rounded-full bg-neon-500 shadow-[0_0_12px_rgba(0,255,102,0.7)]" />
      Question {current} / {total}
    </div>
  )
}

function FeedbackCard({ feedback }) {
  if (!feedback) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card-glass rounded-3xl border border-neon-500/15 bg-gradient-to-br from-emerald-950/90 via-black/70 to-emerald-900/35 p-5 shadow-[0_0_48px_rgba(0,255,102,0.08)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-neon-200/70">AI Evaluation</div>
          <div className="mt-2 flex items-center gap-4">
            <div className="font-display text-5xl font-semibold text-neon-500">{feedback.score}</div>
            <div>
              <div className="text-sm font-medium text-emerald-50">{feedback.performance_level}</div>
              <div className="mt-1 text-sm text-emerald-100/65">{feedback.short_feedback}</div>
            </div>
          </div>

          
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs text-emerald-100/70">
          {[
            ['Communication', feedback.communication_rating],
            ['Technical', feedback.technical_rating],
            ['Confidence', feedback.confidence_rating],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-neon-500/10 bg-black/20 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/45">{label}</div>
              <div className="mt-1 font-display text-xl text-emerald-50">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
          <div className="text-sm font-medium text-emerald-50">Strengths</div>
          <ul className="mt-3 space-y-2 text-sm text-emerald-100/70">
            {feedback.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
          <div className="text-sm font-medium text-emerald-50">Needs Work</div>
          <ul className="mt-3 space-y-2 text-sm text-emerald-100/70">
            {feedback.weaknesses.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-neon-500/10 bg-emerald-950/30 p-4">
        <div className="text-sm font-medium text-emerald-50">Improvement Suggestions</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {feedback.suggestions.map((item) => (
            <span
              key={item}
              className="rounded-full border border-neon-500/15 bg-neon-500/10 px-3 py-1 text-xs text-emerald-50/90"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {feedback.ideal_answer ? (
        <div className="mt-4 rounded-2xl border border-neon-500/10 bg-black/20 p-4">
          <div className="text-sm font-medium text-emerald-50">Ideal Answer Example</div>
          <p className="mt-2 text-sm leading-6 text-emerald-100/70">{feedback.ideal_answer}</p>
        </div>
      ) : null}
    </motion.div>
  )
}

function TurnCard({ turn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid gap-3"
    >
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-3xl rounded-bl-md border border-neon-500/15 bg-emerald-500/8 px-4 py-4 shadow-[0_0_32px_rgba(0,255,102,0.06)] md:max-w-[84%]">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-neon-200/75">
            <span className="h-2 w-2 rounded-full bg-neon-500" />
            AI Question {turn.index}
          </div>
          <p className="text-sm leading-6 text-emerald-50 whitespace-pre-wrap">{turn.question}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="max-w-[92%] rounded-3xl rounded-br-md border border-white/10 bg-black/25 px-4 py-4 md:max-w-[84%]">
          <div className="mb-2 text-[11px] uppercase tracking-[0.3em] text-emerald-100/45">Your Answer</div>
          <p className="text-sm leading-6 text-emerald-50/90 whitespace-pre-wrap">{turn.answer}</p>
        </div>
      </div>

      <FeedbackCard feedback={turn.feedback} />
    </motion.div>
  )
}

function StatTile({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-neon-500/10 bg-black/20 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/45">{label}</div>
      <div className="mt-2 font-display text-2xl text-emerald-50">{value}</div>
      {description ? <div className="mt-1 text-sm text-emerald-100/60">{description}</div> : null}
    </div>
  )
}

function InterviewPrep() {
  const [settings, setSettings] = useState({
    role: ROLE_OPTIONS[0],
    customRole: '',
    experienceLevel: EXPERIENCE_LEVELS[1],
    interviewType: INTERVIEW_TYPES[3],
    questionCount: QUESTION_COUNTS[1],
  })
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeParsedText, setResumeParsedText] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  // Voice states
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [interviewMode, setInterviewMode] = useState('TEXT')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const [recognitionActive, setRecognitionActive] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentMeta, setCurrentMeta] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(1)
  const [answer, setAnswer] = useState('')
  const [turns, setTurns] = useState([])
  const [questionHistory, setQuestionHistory] = useState([])
  const [coveredConcepts, setCoveredConcepts] = useState([])
  const [pendingFeedback, setPendingFeedback] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const transcriptRef = useRef(null)
  const endRef = useRef(null)

  const activeRole = useMemo(() => {
    if (settings.role === 'Custom Role') {
      return settings.customRole.trim()
    }
    return settings.role
  }, [settings.role, settings.customRole])

  const historyPayload = useMemo(() => buildInterviewHistory(turns), [turns])

  useEffect(() => {
    if (!transcriptRef.current) return
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [turns, currentQuestion, pendingFeedback, completed, loadingQuestion, evaluating])

  // --- Resume upload handlers ---
  async function uploadFileToServer(file) {
    setUploadError('')
    setUploadLoading(true)
    try {
      const form = new FormData()
      form.append('resume', file)
      const resp = await fetch(apiUrl('/upload-resume'), {
        method: 'POST',
        body: form,
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setResumeFileName(data.filename || file.name)
      setResumeParsedText(data.parsed_text || '')
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
      setResumeFileName('')
      setResumeParsedText('')
    } finally {
      setUploadLoading(false)
      setDragActive(false)
    }
  }

  function handleFileInputChange(e) {
    const f = e.target.files && e.target.files[0]
    if (f) {
      uploadFileToServer(f)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer?.files && e.dataTransfer.files[0]
    if (f) uploadFileToServer(f)
  }

  // --- Voice: load voices, speak AI questions, and handle speech recognition ---
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => {
      try {
        const v = window.speechSynthesis.getVoices() || []
        setVoices(v)
        if (!selectedVoice && v.length) {
          // prefer a neutral English voice if available
          const prefer = v.find((x) => /en-?us|english/i.test(x.lang || x.name))
          setSelectedVoice(prefer ? prefer.name : v[0].name)
        }
      } catch (err) {
        // ignore
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    if (!voiceEnabled || !currentQuestion) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const utter = new SpeechSynthesisUtterance(currentQuestion)
    try {
      const chosen = (voices || []).find((v) => v.name === selectedVoice)
      if (chosen) utter.voice = chosen
    } catch (e) {}
    utter.rate = 1
    utter.pitch = 1
    utter.onstart = () => setAiSpeaking(true)
    utter.onend = () => setAiSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
    return () => {
      try {
        window.speechSynthesis.cancel()
      } catch (e) {}
      setAiSpeaking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selectedVoice, voiceEnabled, voices])

  function startRecognition() {
    if (recognitionRef.current) return
    // Only allow starting recognition in VOICE mode
    if (interviewMode !== 'VOICE') return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('SpeechRecognition API not supported in this browser.')
      return
    }
    try {
      const rec = new SpeechRecognition()
      rec.lang = 'en-US'
      rec.interimResults = true
      rec.continuous = true
      rec.maxAlternatives = 1
      let silenceTimer = null
      let lastTranscriptTime = Date.now()
      
      rec.onstart = () => {
        setRecognitionActive(true)
        setLiveTranscript('')
        lastTranscriptTime = Date.now()
      }
      
      rec.onresult = (ev) => {
        let interim = ''
        let final = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i]
          if (r.isFinal) final += r[0].transcript
          else interim += r[0].transcript
        }
        const current = (final || interim).trim()
        if (current) {
          lastTranscriptTime = Date.now()
          clearTimeout(silenceTimer)
        }
        setLiveTranscript(current)
        setAnswer(current)
        
        // Clear silence timer and set a new one (minimum 2 seconds of silence to finalize)
        clearTimeout(silenceTimer)
        silenceTimer = setTimeout(() => {
          if (interviewMode === 'VOICE' && recognitionRef.current) {
            // Only auto-stop if there's actual content
            if (current && current.length > 5) {
              stopRecognition()
            }
          }
        }, 2000)
      }
      
      rec.onerror = (ev) => {
        setError(`Microphone error: ${ev.error || 'unknown'}`)
        setRecognitionActive(false)
        recognitionRef.current = null
        clearTimeout(silenceTimer)
      }
      
      rec.onend = () => {
        clearTimeout(silenceTimer)
        setRecognitionActive(false)
        recognitionRef.current = null
      }
      
      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      setError(`Speech recognition start failed: ${err.message || err}`)
      setRecognitionActive(false)
      recognitionRef.current = null
    }
  }

  function stopRecognition() {
    try {
      if (recognitionRef.current) recognitionRef.current.stop()
    } catch (e) {}
    setRecognitionActive(false)
    recognitionRef.current = null
  }

  function toggleRecognition() {
    if (recognitionActive) stopRecognition()
    else startRecognition()
  }

  const summaryData = useMemo(() => {
    if (completed && summary) return summary
    if (turns.length === 0) return null
    return buildLocalSummary(turns)
  }, [completed, summary, turns])

  async function startInterview(event) {
    event.preventDefault()
    const role = activeRole
    if (!role) {
      setError('Please enter a custom role before starting the interview.')
      return
    }

    setError('')
    setCompleted(false)
    setSummary(null)
    setTurns([])
    setCoveredConcepts([])
    setPendingFeedback(null)
    setCurrentQuestion('')
    setCurrentMeta(null)
    setAnswer('')
    setQuestionIndex(1)
    setQuestionHistory([])
    setStarted(true)
    setLoadingQuestion(true)

    try {
      const data = await postJson('/generate-question', {
        role,
        experience_level: settings.experienceLevel,
        interview_type: settings.interviewType,
        question_count: settings.questionCount,
        question_number: 1,
        interview_history: [],
        previous_questions: [],
        parsed_resume_text: resumeParsedText || undefined,
      })

      setCurrentQuestion(safeText(data.question))
      setQuestionHistory([data.question])
      setCurrentMeta({
        difficulty: safeText(data.difficulty, settings.experienceLevel),
        focusArea: safeText(data.focus_area, settings.interviewType),
        followUpStyle: safeText(data.follow_up_style, 'balanced'),
      })
      setQuestionIndex(1)
    } catch (err) {
      setError(`Unable to start interview: ${err.message}`)
      setStarted(false)
    } finally {
      setLoadingQuestion(false)
    }
  }

  async function handleSubmitAnswer(event) {
    event.preventDefault()
    if (!currentQuestion || !answer.trim() || loadingQuestion || evaluating) return

    setError('')
    setEvaluating(true)

    try {
      const data = await postJson('/evaluate-answer', {
        role: activeRole,
        experience_level: settings.experienceLevel,
        interview_type: settings.interviewType,
        current_question: currentQuestion,
        user_answer: answer.trim(),
        interview_history: historyPayload,
        previous_questions: questionHistory,
        question_number: questionIndex,
        question_count: settings.questionCount,
        parsed_resume_text: resumeParsedText || undefined,
      })

      const feedback = normalizeFeedback(data)
      const turn = {
        id: `${Date.now()}-${questionIndex}`,
        index: questionIndex,
        question: currentQuestion,
        answer: answer.trim(),
        feedback,
        meta: currentMeta,
      }

      setTurns((prev) => [...prev, turn])
      
      // Extract and add new concepts from this turn
      const newConcepts = extractConceptsFromTurn(turn)
      setCoveredConcepts((prev) => {
        const combined = new Set([...prev, ...newConcepts])
        return Array.from(combined)
      })
      
      setPendingFeedback(feedback)
      setAnswer('')
      setCurrentQuestion('')
      setCurrentMeta(null)
    } catch (err) {
      setError(`Unable to evaluate answer: ${err.message}`)
    } finally {
      setEvaluating(false)
    }
  }

  async function handleNextQuestion() {
    if (!started || pendingFeedback == null) return

    if (questionIndex >= settings.questionCount) {
      setLoadingQuestion(true)
      try {
        const data = await postJson('/interview-summary', {
          role: activeRole,
          experience_level: settings.experienceLevel,
          interview_type: settings.interviewType,
          question_count: settings.questionCount,
          interview_history: historyPayload,
          parsed_resume_text: resumeParsedText || undefined,
        })

        setSummary(data)
      } catch {
        setSummary(buildLocalSummary(turns))
      } finally {
        setLoadingQuestion(false)
        setCompleted(true)
        setPendingFeedback(null)
      }
      return
    }

    setLoadingQuestion(true)
    setPendingFeedback(null)
    try {
      const nextQuestionNumber = questionIndex + 1
      const data = await postJson('/generate-question', {
        role: activeRole,
        experience_level: settings.experienceLevel,
        interview_type: settings.interviewType,
        question_count: settings.questionCount,
        question_number: nextQuestionNumber,
        interview_history: historyPayload,
        previous_questions: questionHistory,
        covered_concepts: coveredConcepts,
        parsed_resume_text: resumeParsedText || undefined,
      })

      setQuestionIndex(nextQuestionNumber)
      const newQuestion = safeText(data.question)
      setCurrentQuestion(newQuestion)
      setQuestionHistory((prev) => [...prev, newQuestion])
      setCurrentMeta({
        difficulty: safeText(data.difficulty, settings.experienceLevel),
        focusArea: safeText(data.focus_area, settings.interviewType),
        followUpStyle: safeText(data.follow_up_style, 'balanced'),
      })
    } catch (err) {
      setError(`Unable to load the next question: ${err.message}`)
    } finally {
      setLoadingQuestion(false)
    }
  }

  return (
    <div id="pg1" className="pointer-glow relative min-h-screen overflow-hidden px-5 py-12">
      <ParticlesCanvas className="absolute inset-0 h-full w-full opacity-70" density={62} />
      <div className="absolute inset-0 opacity-30 bg-grid-faint [background-size:72px_72px] [mask-image:radial-gradient(55%_42%_at_50%_18%,black,transparent)]" />
      <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-neon-500/10 blur-[110px]" />

      <div className="relative mx-auto max-w-7xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-emerald-100/70 transition-colors hover:text-neon-500"
        >
          <span aria-hidden="true">←</span> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-500/20 bg-emerald-50/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-neon-100/80 shadow-[0_0_0_1px_rgba(0,0,0,0.22)_inset]">
            Premium AI Interview Simulator
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-emerald-50 sm:text-5xl md:text-6xl">
            InterviewX <span className="text-neon-500">AI</span>
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-emerald-100/70 sm:text-base">
            Practice realistic interviews with adaptive one-question-at-a-time guidance, live scoring,
            and detailed feedback that grows stronger or softer based on your performance.
          </p>
        </motion.div>

        {/* Live performance dashboard */}
        <div className="absolute top-28 right-8 hidden w-64 md:block">
          <div className="rounded-2xl border border-neon-500/10 bg-black/25 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
            <div className="text-xs uppercase tracking-[0.24em] text-neon-200/70">Live Performance</div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-emerald-100/70">Overall</div>
                <div className="font-display text-2xl text-neon-500">{turns.length ? Number(average(turns.map(t=>t.feedback?.score||0)).toFixed(1)) : 0}</div>
              </div>
              <div>
                <div className="text-sm text-emerald-100/70">Confidence</div>
                <div className="font-display text-2xl text-emerald-50">{turns.length ? Number(average(turns.map(t=>t.feedback?.confidence_rating||0)).toFixed(1)) : 0}</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-emerald-100/65">Difficulty: <span className="text-neon-500">{currentMeta?.difficulty || pendingFeedback?.follow_up_direction || 'Balanced'}</span></div>
            <div className="mt-3 text-xs text-emerald-100/50">Progress: {turns.length}/{settings.questionCount}</div>
          </div>
        </div>

        <motion.form
          onSubmit={startInterview}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="mt-8 card-glass rounded-3xl border border-neon-500/15 p-6 md:p-8"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-emerald-50">Interview Setup</h2>
              <p className="mt-2 max-w-2xl text-sm text-emerald-100/65">
                Configure the role, interview style, and question count before the AI interviewer begins.
              </p>
            </div>
            <div className="text-xs text-emerald-100/45">
              Existing Gemini integration is reused through the Flask backend.
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FieldShell label="Job Role" hint="Choose a preset or enter a custom role.">
              <select
                value={settings.role}
                onChange={(event) => setSettings((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-2xl border border-neon-500/15 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-50 outline-none transition focus:border-neon-500/40"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role} className="bg-emerald-950 text-emerald-50">
                    {role}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell label="Experience Level">
              <select
                value={settings.experienceLevel}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, experienceLevel: event.target.value }))
                }
                className="w-full rounded-2xl border border-neon-500/15 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-50 outline-none transition focus:border-neon-500/40"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level} className="bg-emerald-950 text-emerald-50">
                    {level}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell label="Interview Type">
              <select
                value={settings.interviewType}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, interviewType: event.target.value }))
                }
                className="w-full rounded-2xl border border-neon-500/15 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-50 outline-none transition focus:border-neon-500/40"
              >
                {INTERVIEW_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-emerald-950 text-emerald-50">
                    {type}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell label="Number of Questions">
              <select
                value={settings.questionCount}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, questionCount: Number(event.target.value) }))
                }
                className="w-full rounded-2xl border border-neon-500/15 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-50 outline-none transition focus:border-neon-500/40"
              >
                {QUESTION_COUNTS.map((count) => (
                  <option key={count} value={count} className="bg-emerald-950 text-emerald-50">
                    {count}
                  </option>
                ))}
              </select>
            </FieldShell>
          </div>

          {settings.role === 'Custom Role' ? (
            <div className="mt-4 max-w-xl">
              <FieldShell label="Custom Role" hint="Enter the exact job title you want to practice for.">
                <input
                  value={settings.customRole}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, customRole: event.target.value }))
                  }
                  placeholder="e.g. Product Designer, DevOps Engineer"
                  className="w-full rounded-2xl border border-neon-500/15 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-50 placeholder:text-emerald-100/30 outline-none transition focus:border-neon-500/40"
                />
              </FieldShell>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FieldShell label="Interview Mode" hint="Select TEXT (typing) or VOICE (speech) only mode.">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInterviewMode('TEXT')}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    interviewMode === 'TEXT'
                      ? 'border-neon-500/40 bg-neon-500/20 text-neon-50'
                      : 'border-neon-500/15 bg-emerald-950/40 text-emerald-100/70 hover:border-neon-500/30'
                  }`}
                >
                  📝 Text Mode
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewMode('VOICE')}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    interviewMode === 'VOICE'
                      ? 'border-neon-500/40 bg-neon-500/20 text-neon-50'
                      : 'border-neon-500/15 bg-emerald-950/40 text-emerald-100/70 hover:border-neon-500/30'
                  }`}
                >
                  🎤 Voice Mode
                </button>
              </div>
            </FieldShell>

            <FieldShell label="AI Voice" hint="Toggle AI speech synthesis for questions.">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(Boolean(e.target.checked))}
                    className="h-4 w-4 rounded border-neon-500/20 bg-emerald-950/30"
                  />
                  <span className="text-sm text-emerald-100/70">Enable AI voice</span>
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="ml-auto rounded-2xl border border-neon-500/15 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-50 outline-none"
                >
                  <option value="">(Default browser voice)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI + v.name} value={v.name}>
                      {v.name} {v.lang ? `(${v.lang})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </FieldShell>

            <FieldShell label="Upload Resume (Optional)" hint="PDF or DOCX only">
              <div
                id="txt1"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex items-center justify-center w-full rounded-2xl border-2 px-4 py-6 text-sm transition ${
                  dragActive ? 'border-neon-500/60 bg-emerald-950/30' : 'border-neon-500/15 bg-emerald-950/18'
                }`}
              >
                <input
                  aria-hidden
                  accept=".pdf,.docx"
                  type="file"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div className="pointer-events-none flex w-full flex-col items-center justify-center gap-2">
                  <div className="text-sm text-emerald-100/70">Drag & drop your resume, or click to browse</div>
                  <div className="text-xs text-emerald-100/45">Accepted: PDF, DOCX · Optional</div>
                  {uploadLoading ? (
                    <div className="mt-2 text-xs text-emerald-100/60">Uploading...</div>
                  ) : resumeFileName ? (
                    <div className="mt-2 text-xs text-emerald-50">Uploaded: {resumeFileName}</div>
                  ) : null}
                  {uploadError ? <div className="mt-2 text-xs text-amber-300">{uploadError}</div> : null}
                </div>
              </div>
            </FieldShell>
          </div>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-emerald-100/65">
              Session role: <span className="text-neon-200">{activeRole || 'Custom Role'}</span>
            </div>

            <motion.button
              id="btn1"
              type="submit"
              disabled={loadingQuestion || evaluating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center rounded-2xl border border-neon-500/20 bg-neon-500 px-6 py-3 font-medium text-black shadow-[0_0_32px_rgba(0,255,102,0.22)] transition hover:shadow-[0_0_42px_rgba(0,255,102,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {started && !completed ? 'Restart Interview' : 'Start Interview'}
            </motion.button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </motion.form>

        <AnimatePresence mode="wait">
          {started ? (
            <motion.div
              key={completed ? 'summary' : 'session'}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.9fr]"
            >
              <section className="card-glass rounded-3xl border border-neon-500/15 p-5 md:p-6">
                <div className="flex flex-col gap-4 border-b border-emerald-700/20 pb-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-neon-200/70">Interview Session</div>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-emerald-50">
                      Live AI Interview
                    </h3>
                    <p className="mt-2 text-sm text-emerald-100/65">
                      Questions adapt in real time using the prior answers and feedback history.
                    </p>
                  </div>

                  <ProgressPill current={questionIndex} total={settings.questionCount} />
                </div>

                {completed ? (
                  <div className="mt-6 rounded-3xl border border-neon-500/15 bg-gradient-to-br from-emerald-950/90 via-black/70 to-emerald-900/35 p-5 md:p-6">
                    <div
                      id="done1"
                      className="inline-flex items-center gap-2 rounded-full border border-neon-500/20 bg-neon-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-neon-100"
                    >
                      Interview Completed Successfully
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <StatTile
                        label="Overall Score"
                        value={summaryData?.overall_score ?? 0}
                        description="Average performance across the full session"
                      />
                      <StatTile
                        label="Performance Level"
                        value={summaryData?.performance_level || 'Completed'}
                        description="Overall interview readiness"
                      />
                      <StatTile
                        label="Communication"
                        value={summaryData?.communication_rating ?? 0}
                        description="Clarity, structure, and professionalism"
                      />
                      <StatTile
                        label="Technical"
                        value={summaryData?.technical_rating ?? 0}
                        description="Correctness and depth of answers"
                      />
                      <StatTile
                        label="Confidence"
                        value={summaryData?.confidence_rating ?? 0}
                        description="Presence and conviction in responses"
                      />
                      <StatTile
                        label="Questions Completed"
                        value={`${turns.length}/${settings.questionCount}`}
                        description="Full interview journey"
                      />
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                        <div className="text-sm font-medium text-emerald-50">Strong Areas</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(summaryData?.strong_areas || []).length ? (
                            summaryData.strong_areas.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-neon-500/15 bg-neon-500/10 px-3 py-1 text-xs text-emerald-50/90"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <div className="text-sm text-emerald-100/60">No strong areas captured yet.</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                        <div className="text-sm font-medium text-emerald-50">Areas Needing Improvement</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(summaryData?.areas_needing_improvement || []).length ? (
                            summaryData.areas_needing_improvement.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <div className="text-sm text-emerald-100/60">No improvement gaps captured yet.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-neon-500/10 bg-emerald-950/30 p-4">
                      <div className="text-sm font-medium text-emerald-50">Final AI Feedback</div>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                        {summaryData?.final_feedback_message ||
                          'You completed the interview practice session. Review the feedback and continue practicing with stronger examples.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      ref={transcriptRef}
                      className="mt-6 max-h-[34rem] space-y-4 overflow-auto rounded-3xl border border-neon-500/10 bg-black/20 p-4 md:p-5"
                    >
                      {turns.length === 0 ? (
                        <div className="rounded-3xl border border-neon-500/10 bg-emerald-950/20 p-5 text-sm leading-6 text-emerald-100/70">
                          The AI interviewer is ready. Once the first question appears, answer naturally and keep the conversation moving one step at a time.
                        </div>
                      ) : null}

                      <AnimatePresence initial={false}>
                        {turns.map((turn) => (
                          <TurnCard key={turn.id} turn={turn} />
                        ))}
                      </AnimatePresence>

                      {currentQuestion ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="max-w-[92%] rounded-3xl rounded-bl-md border border-neon-500/15 bg-emerald-500/8 px-4 py-4 md:max-w-[84%]">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="text-[11px] uppercase tracking-[0.3em] text-neon-200/75">
                                Current Question
                              </div>
                              <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/45">
                                {currentMeta?.difficulty || settings.experienceLevel}
                              </div>
                            </div>
                            <p className="text-sm leading-6 text-emerald-50 whitespace-pre-wrap">{currentQuestion}</p>
                            {currentMeta?.focusArea ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-neon-500/15 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-100/70">
                                  Focus: {currentMeta.focusArea}
                                </span>
                                <span className="rounded-full border border-neon-500/15 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-100/70">
                                  Style: {currentMeta.followUpStyle}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}

                      {(loadingQuestion || evaluating || aiSpeaking) && (
                        <div className="flex justify-start">
                          <TypingDots label={
                            aiSpeaking ? 'AI is speaking' : loadingQuestion ? 'AI interviewer is preparing the next question' : 'AI is evaluating your answer'
                          } />
                        </div>
                      )}
                      <div ref={endRef} />
                    </div>

                    <form onSubmit={handleSubmitAnswer} className="mt-5 grid gap-4">
                      <label className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-emerald-100/80">
                            Your Answer
                            {interviewMode === 'VOICE' && <span className="ml-2 text-xs text-amber-300">(Voice Only)</span>}
                          </span>
                          {interviewMode === 'VOICE' && (
                            <motion.button
                              type="button"
                              onClick={toggleRecognition}
                              title={recognitionActive ? 'Stop recording' : 'Start recording'}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium transition ${
                                recognitionActive
                                  ? 'bg-amber-400/20 border border-amber-400/40 text-amber-100'
                                  : 'bg-neon-500/20 border border-neon-500/30 text-neon-50'
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${recognitionActive ? 'bg-amber-300 animate-pulse' : 'bg-neon-500'}`} />
                              <span>{recognitionActive ? '🎙️ Recording...' : '🎤 Click to Record'}</span>
                            </motion.button>
                          )}
                        </div>

                        {interviewMode === 'TEXT' ? (
                          <>
                            <textarea
                              value={answer}
                              onChange={(event) => setAnswer(event.target.value)}
                              rows={7}
                              maxLength={MAX_ANSWER_LENGTH}
                              disabled={!currentQuestion || loadingQuestion || evaluating}
                              placeholder="Type your answer here. Structure it clearly and answer as if you were in the real interview."
                              className="w-full resize-none rounded-3xl border border-neon-500/15 bg-emerald-950/40 px-4 py-4 text-sm leading-6 text-emerald-50 placeholder:text-emerald-100/30 outline-none transition focus:border-neon-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <div className="flex items-center justify-between text-xs text-emerald-100/45">
                              <span>Use examples, metrics, and a clear structure when possible.</span>
                              <span>
                                {answer.length} / {MAX_ANSWER_LENGTH}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="rounded-3xl border border-neon-500/15 bg-emerald-950/40 px-4 py-4 text-sm leading-6 text-emerald-100/70 min-h-[12rem] pointer-events-none select-none">
                              {liveTranscript ? (
                                <p className="text-emerald-50 whitespace-pre-wrap">{liveTranscript}</p>
                              ) : (
                                <p className="italic text-emerald-100/50">Click the record button and speak your answer. Your speech will appear here.</p>
                              )}
                            </div>
                            {liveTranscript && (
                              <div className="text-xs text-emerald-100/50">
                                {liveTranscript.length} characters recorded
                              </div>
                            )}
                            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
                              <div className="font-medium">Voice Mode Active</div>
                              <div className="mt-1 text-amber-300/80">The record button above is your only input. Your speech will be automatically transcribed and submitted when complete.</div>
                            </div>
                          </>
                        )}

                        {liveTranscript && interviewMode === 'TEXT' ? (
                          <div className="mt-2 rounded-md border border-neon-500/10 bg-black/20 px-3 py-2 text-sm text-emerald-100/70">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/45">Live Transcript</div>
                            <div className="mt-1 text-sm text-emerald-50 whitespace-pre-wrap">{liveTranscript}</div>
                          </div>
                        ) : null}
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <motion.button
                          id="btn2"
                          type="submit"
                          disabled={
                            !currentQuestion || 
                            !answer.trim() || 
                            loadingQuestion || 
                            evaluating ||
                            (interviewMode === 'VOICE' && recognitionActive)
                          }
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="inline-flex items-center justify-center rounded-2xl border border-neon-500/20 bg-neon-500 px-6 py-3 font-medium text-black shadow-[0_0_32px_rgba(0,255,102,0.22)] transition hover:shadow-[0_0_42px_rgba(0,255,102,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {evaluating ? 'Evaluating...' : interviewMode === 'VOICE' && recognitionActive ? 'Recording...' : 'Submit Answer'}
                        </motion.button>

                        {pendingFeedback ? (
                          <motion.button
                            id="btn3"
                            type="button"
                            onClick={handleNextQuestion}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center justify-center rounded-2xl border border-neon-500/20 bg-emerald-50/5 px-6 py-3 font-medium text-emerald-50 transition hover:border-neon-500/40 hover:bg-neon-500/10"
                          >
                            Next Question
                          </motion.button>
                        ) : (
                          <div className="text-sm text-emerald-100/60">
                            Answer the current question to unlock the next step.
                          </div>
                        )}
                      </div>
                    </form>
                  </>
                )}
              </section>

              <aside className="space-y-6">
                {!completed ? (
                  <>
                    <FeedbackCard feedback={pendingFeedback} />

                    <div className="card-glass rounded-3xl border border-neon-500/15 p-5">
                      <div className="text-xs uppercase tracking-[0.28em] text-neon-200/70">Session Overview</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <StatTile
                          label="Current Role"
                          value={activeRole || 'Custom Role'}
                          description="The interview target role"
                        />
                        <StatTile
                          label="Interview Type"
                          value={settings.interviewType}
                          description="Question style and evaluation focus"
                        />
                        <StatTile
                          label="Experience Level"
                          value={settings.experienceLevel}
                          description="Adaptive difficulty baseline"
                        />
                        <StatTile
                          label="Questions"
                          value={settings.questionCount}
                          description="Total number of one-by-one rounds"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glass rounded-3xl border border-neon-500/15 p-5"
                  >
                    <div className="text-xs uppercase tracking-[0.28em] text-neon-200/70">Completed Session</div>
                    <div className="mt-4 text-sm leading-6 text-emerald-100/65">
                      Your final summary is ready. Restart the simulator whenever you want a new adaptive interview sequence.
                    </div>
                  </motion.div>
                )}
              </aside>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default InterviewPrep

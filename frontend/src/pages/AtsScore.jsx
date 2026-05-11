import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const INDUSTRIES = [
  'Technology',
  'Cybersecurity',
  'Design',
  'Marketing',
  'Finance',
  'Healthcare',
]

function getScoreMeta(score) {
  if (score >= 85) {
    return {
      label: 'Excellent Match',
      subtitle: 'Your resume is strongly aligned with the job description.',
      accent: 'text-emerald-300',
      ring: 'from-emerald-400 via-neon-400 to-lime-300',
      glow: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]',
    }
  }
  if (score >= 70) {
    return {
      label: 'Strong Match',
      subtitle: 'Solid fit with a few keyword and formatting opportunities.',
      accent: 'text-neon-200',
      ring: 'from-neon-500 via-emerald-300 to-teal-300',
      glow: 'shadow-[0_0_40px_rgba(34,197,94,0.18)]',
    }
  }
  if (score >= 55) {
    return {
      label: 'Moderate Match',
      subtitle: 'You are close, but the resume needs sharper keyword alignment.',
      accent: 'text-amber-200',
      ring: 'from-amber-400 via-yellow-300 to-emerald-300',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.16)]',
    }
  }
  return {
    label: 'Needs Improvement',
    subtitle: 'The resume should be tailored more closely to this role.',
    accent: 'text-rose-200',
    ring: 'from-rose-400 via-orange-300 to-amber-300',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.14)]',
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function AtsScore() {
  const [jobTitle, setJobTitle] = useState('')
  const [industry, setIndustry] = useState(INDUSTRIES[0])
  const [jdText, setJdText] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [resumePreview, setResumePreview] = useState('')
  const resumeRef = useRef(null)
  const resultRef = useRef(null)
  const scrollIntervalRef = useRef(null)
  const fileInputRef = useRef(null)
  const [modal, setModal] = useState({ open: false, title: '', message: '' })

  useEffect(() => {
    if (!loading) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
    }
  }, [loading])

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  function startAutoScroll() {
    const el = resumeRef.current
    if (!el) return
    el.scrollTop = 0
    scrollIntervalRef.current = setInterval(() => {
      if (!el) return
      el.scrollBy({ top: 14, behavior: 'smooth' })
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        el.scrollTop = 0
      }
    }, 400)
  }

  function highlightText(text, keywords) {
    if (!keywords || keywords.length === 0) return text
    const unique = Array.from(new Set(keywords.filter(Boolean))).sort((a, b) => b.length - a.length)
    const pattern = unique.map((k) => escapeRegExp(k)).join('|')
    if (!pattern) return text
    const regex = new RegExp(`(${pattern})`, 'gi')
    return text.replace(regex, '<span class="px-0.5 rounded-sm bg-neon-500/30 text-neon-50 font-semibold">$1</span>')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!resumeFile) return setModal({ open: true, title: 'Missing Resume', message: 'Please upload a resume PDF.' })
    if (!jdText.trim()) return setModal({ open: true, title: 'Missing Job Description', message: 'Please paste the job description.' })

    setLoading(true)
    setResult(null)
    setResumePreview('')

    const form = new FormData()
    form.append('resume_pdf', resumeFile)
    form.append('jd_text', jdText)
    form.append('job_title', jobTitle)
    form.append('industry', industry)

    try {
      // start UI scanning animations
      startAutoScroll()

      const resp = await fetch('/api/ats-score', {
        method: 'POST',
        body: form,
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Server error')

      setResult(data)
      setResumePreview(data.resume_text_preview || '')
    } catch (err) {
      console.error(err)
      setModal({ open: true, title: 'Error', message: 'Error computing ATS score: ' + (err.message || err) })
    } finally {
      setLoading(false)
    }
  }

  const scannerVisible = loading
  const scoreMeta = getScoreMeta(Number(result?.ats_score || 0))

  return (
    <div className="min-h-screen px-5 py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-emerald-100/70 hover:text-neon-500 transition-colors"
        >
          <span aria-hidden="true">←</span> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-8 card-glass rounded-2xl p-6 md:p-8"
        >
          <h2 className="font-display text-3xl font-semibold text-emerald-50">ATS Match & Score</h2>
          <p className="mt-2 text-emerald-100/70 max-w-2xl">Paste the Job Description and upload a resume PDF to calculate an ATS score.</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-emerald-100/80">Job Title</label>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior React Engineer" className="mt-1 w-full rounded-lg bg-emerald-800/30 border border-neon-500/10 px-3 py-2 text-emerald-50" />

              <label className="block mt-3 text-sm text-emerald-100/80">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1 w-full rounded-lg bg-emerald-800/30 border border-neon-500/10 px-3 py-2 text-emerald-50">
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>

              <label className="block mt-3 text-sm text-emerald-100/80">Job Description</label>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={10} className="mt-1 w-full rounded-lg bg-emerald-800/30 border border-neon-500/10 px-3 py-2 text-emerald-50" placeholder="Paste the full job description here" />

              <div className="mt-3">
                <label className="block text-sm text-emerald-100/80">Resume (PDF)</label>
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0] || null; setResumeFile(f); }} className="hidden" />

                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f && f.type === 'application/pdf') setResumeFile(f)
                    else setModal({ open: true, title: 'Invalid file', message: 'Please upload a PDF file.' })
                  }}
                  className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-neon-500/10 bg-emerald-800/30 px-4 py-3 text-emerald-50 cursor-pointer"
                >
                  <div>
                    {resumeFile ? (
                      <div className="text-sm">
                        <div className="font-medium">{resumeFile.name}</div>
                        <div className="text-xs text-emerald-100/60">{Math.round((resumeFile.size || 0) / 1024)} KB</div>
                      </div>
                    ) : (
                      <div className="text-sm text-emerald-100/70">Click or drop a PDF here to upload</div>
                    )}
                  </div>
                  {resumeFile ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="rounded-md bg-emerald-700/60 px-3 py-1 text-xs text-emerald-100">Remove</button>
                      <div className="text-xs text-neon-200">Uploaded</div>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-100/50">PDF</div>
                  )}
                </div>

                <p className="mt-2 text-xs text-emerald-100/60">Pro tip: Avoid two-column layouts or images for better text extraction and scoring.</p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button type="submit" disabled={loading} className="rounded-md bg-neon-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-60">
                  {loading ? 'Scanning Keywords…' : 'Calculate ATS Score'}
                </button>
                <div className="text-sm text-emerald-100/70">Industry benchmark: <strong className="text-neon-200">{industry}</strong></div>
              </div>
            </div>

            <div>
              <div className="rounded-lg border border-neon-500/10 bg-emerald-900/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-emerald-100/80">Resume Preview</div>
                  {scannerVisible && <div className="text-xs text-neon-200">Scanning…</div>}
                </div>

                <div ref={resumeRef} className="mt-3 h-72 overflow-auto rounded bg-emerald-900/30 p-3 text-sm text-emerald-100/80 relative">
                  <div dangerouslySetInnerHTML={{ __html: highlightText(resumePreview || (resumeFile ? `Uploaded: ${resumeFile.name}` : 'No resume uploaded yet.'), result?.matched_keywords || []) }} />

                  {/* scanner overlay */}
                  {scannerVisible && (
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-neon-500/15 to-transparent animate-scan" style={{ mixBlendMode: 'screen' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>

          {result && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`mt-6 overflow-hidden rounded-3xl border border-neon-500/15 bg-gradient-to-br from-emerald-950/95 via-emerald-900/75 to-black/60 p-5 md:p-7 ${scoreMeta.glow}`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center rounded-full border border-neon-500/20 bg-neon-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-neon-100">
                    ATS Report
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-emerald-50 md:text-3xl">
                    {scoreMeta.label}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/70 md:text-base">
                    {scoreMeta.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div
                    className="relative flex h-32 w-32 items-center justify-center rounded-full p-1 md:h-40 md:w-40"
                    style={{
                      background: `conic-gradient(from 180deg, rgba(16,185,129,0.95) 0deg, rgba(16,185,129,0.95) ${Math.min(360, (Number(result.ats_score || 0) / 100) * 360)}deg, rgba(16,185,129,0.12) ${Math.min(360, (Number(result.ats_score || 0) / 100) * 360)}deg, rgba(16,185,129,0.12) 360deg)`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full border border-neon-500/15 bg-emerald-950/95 text-center shadow-inner shadow-black/30">
                      <div>
                        <div className={`font-display text-5xl font-semibold md:text-6xl ${scoreMeta.accent}`}>
                          {Math.round(Number(result.ats_score || 0))}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-emerald-100/55">
                          ATS Score
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden max-w-xs lg:block">
                    <div className="text-sm font-medium text-emerald-50">Quick verdict</div>
                    <div className="mt-1 text-sm leading-6 text-emerald-100/65">
                      Keyword match {result.keyword_score ?? '—'}% · Semantic similarity {result.semantic_score ?? '—'}%
                    </div>
                    <div className="mt-2 text-sm leading-6 text-emerald-100/65">
                      Benchmarked for <span className="text-neon-100">{industry}</span> roles.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  { label: 'Keyword Match', value: `${result.keyword_score ?? '—'}%` },
                  { label: 'Semantic Similarity', value: `${result.semantic_score ?? '—'}%` },
                  { label: 'Skill Coverage', value: `${result.skill_score ?? '—'}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-neon-500/10 bg-emerald-950/40 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-emerald-100/45">{item.label}</div>
                    <div className="mt-2 font-display text-2xl text-emerald-50">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                  <div className="text-sm font-medium text-emerald-50">Matched Keywords</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(result.matched_keywords || []).slice(0, 24).map((k) => (
                      <span key={k} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                        {k}
                      </span>
                    ))}
                    {(!result.matched_keywords || result.matched_keywords.length === 0) && (
                      <span className="text-sm text-emerald-100/55">No strong matches detected yet.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                  <div className="text-sm font-medium text-emerald-50">Missing Keywords</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(result.missing_keywords || []).slice(0, 24).map((k) => (
                      <span key={k} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                        {k}
                      </span>
                    ))}
                    {(!result.missing_keywords || result.missing_keywords.length === 0) && (
                      <span className="text-sm text-emerald-100/55">Great keyword coverage across the JD.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-neon-500/10 bg-emerald-950/35 p-4">
                  <div className="text-sm font-medium text-emerald-50">Formatting Review</div>
                  <div className="mt-2 text-sm leading-6 text-emerald-100/70">
                    {result.formatting_issues && result.formatting_issues.length > 0
                      ? result.formatting_issues.join(' · ')
                      : 'No major formatting concerns detected.'}
                  </div>
                </div>

                <div className="rounded-2xl border border-neon-500/10 bg-emerald-950/35 p-4">
                  <div className="text-sm font-medium text-emerald-50">Recommended Next Step</div>
                  <div className="mt-2 text-sm leading-6 text-emerald-100/70">
                    {Number(result.ats_score || 0) >= 80
                      ? 'Polish the top section with stronger impact metrics and keep this version as a high-confidence submission.'
                      : Number(result.ats_score || 0) >= 60
                        ? 'Add missing keywords naturally, strengthen role-specific bullets, and re-run the scan.'
                        : 'Tailor the resume to the JD more closely and remove layout elements that may reduce ATS readability.'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <style>{`
            @keyframes scanMove { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
            .animate-scan { animation: scanMove 2.5s linear infinite; opacity: 0.9; }
          `}</style>
          {modal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setModal({ open: false, title: '', message: '' })} />
              <div className="relative z-10 w-full max-w-lg rounded-2xl bg-emerald-900/80 p-6 shadow-lg border border-neon-500/20">
                <div className="text-lg font-semibold text-emerald-50">{modal.title}</div>
                <div className="mt-3 text-sm text-emerald-100/80">{modal.message}</div>
                <div className="mt-5 flex justify-end">
                  <button onClick={() => setModal({ open: false, title: '', message: '' })} className="rounded-md bg-neon-500 px-4 py-2 text-sm font-medium text-black">OK</button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default AtsScore

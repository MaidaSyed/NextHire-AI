import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'nexthire_resume_builder_v1'
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const DEFAULT_PERSONAL = {
  name: '',
  email: '',
  phone: '',
  linkedin: '',
  location: '',
}
const DEFAULT_EDUCATION = [{ degree: '', institution: '', startYear: '', endYear: '' }]
const DEFAULT_EXPERIENCE = [{ title: '', company: '', startYear: '', endYear: '', description: '' }]
const DEFAULT_SKILLS = [{ name: '', level: 'Beginner' }]
const DEFAULT_PROJECTS = [{ name: '', description: '', technologies: '' }]

function _trim(v) {
  return typeof v === 'string' ? v.trim() : v
}

function _digitsOnly(v) {
  return String(v || '').replace(/[^\d]/g, '')
}

function _normalizeLinkedIn(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('https://')) return raw
  if (raw.startsWith('linkedin.com/in/')) return `https://${raw}`
  if (raw.startsWith('www.linkedin.com/in/')) return `https://${raw}`
  if (raw.startsWith('linkedin.com/in/')) return `https://${raw}`
  return raw
}

function _isValidEmail(email) {
  const v = String(email || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function _isValidLinkedIn(url) {
  const v = String(url || '').trim()
  if (!v) return false
  if (!v.startsWith('https://')) return false
  try {
    const u = new URL(v)
    const host = u.hostname.toLowerCase()
    if (host !== 'linkedin.com' && host !== 'www.linkedin.com') return false
    return u.pathname.toLowerCase().startsWith('/in/')
  } catch {
    return false
  }
}

function _isValidPhone(phone) {
  const v = String(phone || '').trim()
  if (!/^\+?\d+$/.test(v)) return false
  const digits = _digitsOnly(v)
  return digits.length >= 10
}

function _parseYear(value) {
  const v = String(value || '').trim()
  if (!v) return null
  if (!/^\d{4}$/.test(v)) return NaN
  const n = Number(v)
  if (n < 1900 || n > 2100) return NaN
  return n
}

function _extractYear(v) {
  const s = String(v || '').trim()
  const m = s.match(/(\d{4})/)
  return m ? m[1] : ''
}

function _isEmptyEntry(obj) {
  if (!obj || typeof obj !== 'object') return true
  return Object.values(obj).every((v) => String(v || '').trim() === '')
}

function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error = '',
  inputMode,
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-emerald-100/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(_trim(e.target.value))}
        placeholder={placeholder}
        inputMode={inputMode}
        className={[
          'w-full rounded-xl border bg-emerald-50/5 px-4 py-3 text-sm text-emerald-50 placeholder:text-emerald-100/30 outline-none',
          error ? 'border-red-500/60 focus:border-red-400' : 'border-neon-500/15 focus:border-neon-500/40',
        ].join(' ')}
      />
      {error ? <div className="text-xs text-red-200">{error}</div> : null}
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder = '', rows = 6, error = '' }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-emerald-100/70">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(_trim(e.target.value))}
        placeholder={placeholder}
        rows={rows}
        className={[
          'w-full resize-y rounded-xl border bg-emerald-50/5 px-4 py-3 text-sm text-emerald-50 placeholder:text-emerald-100/30 outline-none',
          error ? 'border-red-500/60 focus:border-red-400' : 'border-neon-500/15 focus:border-neon-500/40',
        ].join(' ')}
      />
      {error ? <div className="text-xs text-red-200">{error}</div> : null}
    </label>
  )
}

function SmallButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-neon-500/20 bg-emerald-50/5 px-3 py-2 text-xs text-emerald-100/80 hover:border-neon-500/40 hover:text-emerald-50 disabled:opacity-50 disabled:hover:border-neon-500/20"
    >
      {children}
    </button>
  )
}

function ResumeBuilder() {
  const steps = useMemo(
    () => [
      'Personal Info',
      'Summary',
      'Education',
      'Experience',
      'Skills',
      'Projects',
      'Template',
      'Generate',
    ],
    [],
  )
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }, [])

  const [step, setStep] = useState(() => {
    const s = typeof saved?.step === 'number' ? saved.step : 0
    return Math.max(0, Math.min(7, s))
  })

  const [personal, setPersonal] = useState(() => {
    const p = saved?.personal && typeof saved.personal === 'object' ? saved.personal : {}
    return {
      ...DEFAULT_PERSONAL,
      ...p,
      linkedin: _normalizeLinkedIn(p.linkedin),
    }
  })
  const [objective, setObjective] = useState(() => (typeof saved?.objective === 'string' ? saved.objective : ''))
  const [education, setEducation] = useState(() => {
    if (Array.isArray(saved?.education) && saved.education.length) {
      return saved.education.map((e) => ({
        degree: e?.degree || '',
        institution: e?.institution || '',
        startYear: e?.startYear || _extractYear(e?.startDate),
        endYear: e?.endYear || _extractYear(e?.endDate),
      }))
    }
    return DEFAULT_EDUCATION
  })
  const [experience, setExperience] = useState(() => {
    if (Array.isArray(saved?.experience) && saved.experience.length) {
      return saved.experience.map((e) => ({
        title: e?.title || '',
        company: e?.company || '',
        startYear: e?.startYear || _extractYear(e?.startDate),
        endYear: e?.endYear || _extractYear(e?.endDate),
        description: e?.description || '',
      }))
    }
    return DEFAULT_EXPERIENCE
  })
  const [skills, setSkills] = useState(() => (Array.isArray(saved?.skills) && saved.skills.length ? saved.skills : DEFAULT_SKILLS))
  const [projects, setProjects] = useState(() => (Array.isArray(saved?.projects) && saved.projects.length ? saved.projects : DEFAULT_PROJECTS))
  const [templateId, setTemplateId] = useState(() => (typeof saved?.templateId === 'string' ? saved.templateId : 'template1'))

  const [aiBusy, setAiBusy] = useState(false)
  const [generateBusy, setGenerateBusy] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(() => Boolean(saved))

  const saveTimerRef = useRef(0)

  const templateOptions = useMemo(
    () => [
      { id: 'template1', name: 'Template 1 (Modern Minimal)' },
      { id: 'template2', name: 'Template 2 (Corporate Professional)' },
      { id: 'template3', name: 'Template 3 (Creative Designer)' },
      { id: 'template4', name: 'Template 4 (ATS Friendly Simple)' },
    ],
    [],
  )

  function next() {
    setStep((s) => Math.min(steps.length - 1, s + 1))
  }

  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  function touch() {
    setDirty(true)
  }

  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setStep(0)
    setPersonal(DEFAULT_PERSONAL)
    setObjective('')
    setEducation(DEFAULT_EDUCATION)
    setExperience(DEFAULT_EXPERIENCE)
    setSkills(DEFAULT_SKILLS)
    setProjects(DEFAULT_PROJECTS)
    setTemplateId('template1')
    setError('')
    setDirty(false)
  }

  function validate() {
    const errors = {}

    const name = _trim(personal.name)
    const email = _trim(personal.email)
    const phone = _trim(personal.phone)
    const linkedin = _trim(personal.linkedin)

    if (!name) errors['personal.name'] = 'Name is required.'
    if (!email) errors['personal.email'] = 'Email is required.'
    else if (!_isValidEmail(email)) errors['personal.email'] = 'Enter a valid email (name@example.com).'

    if (!phone) errors['personal.phone'] = 'Phone is required.'
    else if (!_isValidPhone(phone))
      errors['personal.phone'] = 'Phone must be digits (optional +) and at least 10 digits.'

    if (!linkedin) errors['personal.linkedin'] = 'LinkedIn URL is required.'
    else if (!_isValidLinkedIn(linkedin))
      errors['personal.linkedin'] = 'Use a valid LinkedIn URL: https://linkedin.com/in/username'

    if (!_trim(objective)) errors.objective = 'Summary is required.'

    const hasAnyEducation = education.some((e) => !_isEmptyEntry(e))
    if (!hasAnyEducation) errors['education.required'] = 'Add at least one education entry.'

    education.forEach((edu, idx) => {
      const degree = _trim(edu.degree)
      const institution = _trim(edu.institution)
      const startYear = _trim(edu.startYear)
      const endYear = _trim(edu.endYear)

      const any = !_isEmptyEntry(edu)
      if (!any) return

      if (!degree) errors[`education.${idx}.degree`] = 'Degree is required.'
      if (!institution) errors[`education.${idx}.institution`] = 'Institution is required.'

      const sy = _parseYear(startYear)
      if (sy === null) errors[`education.${idx}.startYear`] = 'Start year is required.'
      else if (Number.isNaN(sy)) errors[`education.${idx}.startYear`] = 'Use a valid year (e.g. 2020).'

      const ey = _parseYear(endYear)
      if (ey !== null && Number.isNaN(ey))
        errors[`education.${idx}.endYear`] = 'Use a valid year (e.g. 2023) or leave empty.'
      if (typeof sy === 'number' && !Number.isNaN(sy) && typeof ey === 'number' && !Number.isNaN(ey) && ey < sy)
        errors[`education.${idx}.endYear`] = 'End year cannot be before start year.'
    })

    const hasAnyExperience = experience.some((e) => !_isEmptyEntry(e))
    if (!hasAnyExperience) errors['experience.required'] = 'Add at least one experience entry.'

    experience.forEach((exp, idx) => {
      const title = _trim(exp.title)
      const company = _trim(exp.company)
      const startYear = _trim(exp.startYear)
      const endYear = _trim(exp.endYear)
      const description = _trim(exp.description)

      const any = !_isEmptyEntry(exp)
      if (!any) return

      if (!title) errors[`experience.${idx}.title`] = 'Job title is required.'
      if (!company) errors[`experience.${idx}.company`] = 'Company is required.'

      const sy = _parseYear(startYear)
      if (sy === null) errors[`experience.${idx}.startYear`] = 'Start year is required.'
      else if (Number.isNaN(sy)) errors[`experience.${idx}.startYear`] = 'Use a valid year (e.g. 2020).'

      const ey = _parseYear(endYear)
      if (ey !== null && Number.isNaN(ey))
        errors[`experience.${idx}.endYear`] = 'Use a valid year (e.g. 2023) or leave empty.'
      if (typeof sy === 'number' && !Number.isNaN(sy) && typeof ey === 'number' && !Number.isNaN(ey) && ey < sy)
        errors[`experience.${idx}.endYear`] = 'End year cannot be before start year.'

      if (!description) errors[`experience.${idx}.description`] = 'Description is required.'
    })

    skills.forEach((s, idx) => {
      const name2 = _trim(s.name)
      const level = _trim(s.level)
      if (!name2) errors[`skills.${idx}.name`] = 'Skill name is required.'
      if (!SKILL_LEVELS.includes(level))
        errors[`skills.${idx}.level`] = 'Level must be Beginner, Intermediate, or Advanced.'
    })

    projects.forEach((p, idx) => {
      if (_isEmptyEntry(p)) return
      if (!_trim(p.name)) errors[`projects.${idx}.name`] = 'Project name is required.'
      if (!_trim(p.description)) errors[`projects.${idx}.description`] = 'Project description is required.'
    })

    if (!templateOptions.some((t) => t.id === templateId)) errors.templateId = 'Select a template.'

    return errors
  }

  function stepHasErrors(errorsObj, s) {
    const keys = Object.keys(errorsObj)
    if (s === 0) return keys.some((k) => k.startsWith('personal.'))
    if (s === 1) return keys.includes('objective')
    if (s === 2) return keys.some((k) => k.startsWith('education.'))
    if (s === 3) return keys.some((k) => k.startsWith('experience.'))
    if (s === 4) return keys.some((k) => k.startsWith('skills.'))
    if (s === 5) return keys.some((k) => k.startsWith('projects.'))
    if (s === 6) return keys.includes('templateId')
    if (s === 7) return keys.length > 0
    return false
  }

  const allErrors = validate()
  const showFieldErrors = true
  const currentStepValid = !stepHasErrors(allErrors, step)
  const allValid = Object.keys(allErrors).length === 0

  function _keyStep(key) {
    if (key === 'education.required') return 2
    if (key === 'experience.required') return 3
    if (key.startsWith('personal.')) return 0
    if (key === 'objective') return 1
    if (key.startsWith('education.')) return 2
    if (key.startsWith('experience.')) return 3
    if (key.startsWith('skills.')) return 4
    if (key.startsWith('projects.')) return 5
    if (key === 'templateId') return 6
    return 7
  }

  function err(key) {
    if (!showFieldErrors) return ''
    if (_keyStep(key) !== step) return ''
    return allErrors[key] || ''
  }

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const payload = {
          step,
          personal,
          objective,
          education,
          experience,
          skills,
          projects,
          templateId,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // ignore
      }
    }, 250)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [education, experience, objective, personal, projects, skills, step, templateId])

  async function handleGenerateSummary() {
    setError('')
    try {
      setAiBusy(true)
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, experience }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      touch()
      setObjective(data?.summary || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiBusy(false)
    }
  }

  async function handleImproveExperience(index) {
    setError('')
    const exp = experience[index]
    const rawText = (exp?.description || '').trim()
    if (!rawText) {
      setError('Add experience description first, then click Improve with AI.')
      return
    }

    try {
      setAiBusy(true)
      const res = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const improved = Array.isArray(data?.bullets) && data.bullets.length
        ? data.bullets.map((b) => `- ${b}`).join('\n')
        : data?.improved_text || ''
      setExperience((prev) =>
        prev.map((x, i) => (i === index ? { ...x, description: improved } : x)),
      )
      touch()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiBusy(false)
    }
  }

  async function handleGenerateResume() {
    setError('')
    try {
      setGenerateBusy(true)

      const payload = {
        template_id: templateId,
        data: {
          name: _trim(personal.name),
          email: _trim(personal.email),
          phone: _trim(personal.phone),
          linkedin: _trim(personal.linkedin),
          objective: _trim(objective),
          skills,
          experience: experience.map((e) => ({
            title: _trim(e.title),
            company: _trim(e.company),
            description: _trim(e.description),
            startDate: _trim(e.startYear),
            endDate: _trim(e.endYear),
          })),
          education: education.map((e) => ({
            degree: _trim(e.degree),
            institution: _trim(e.institution),
            startDate: _trim(e.startYear),
            endDate: _trim(e.endYear),
          })),
          projects,
          location: _trim(personal.location),
        },
      }

      const res = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(personal.name || 'resume').trim().replaceAll(' ', '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerateBusy(false)
    }
  }

  return (
    <div className="min-h-screen px-5 py-14">
      <div className="mx-auto max-w-5xl">
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
          className="mt-8 card-glass rounded-2xl p-7 md:p-9"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-emerald-50">
                NextHire AI Resume Builder
              </h2>
              <p className="mt-2 text-sm text-emerald-100/70">
                Step-by-step resume builder with AI suggestions and PDF export.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-neon-500/20 bg-emerald-50/5 px-4 py-2 text-xs text-emerald-100/75 hover:border-neon-500/40 hover:text-emerald-50"
              >
                Clear All Data
              </button>
              <div className="grid text-right">
                <div className="text-xs text-emerald-100/45">Step {step + 1} / {steps.length}</div>
                <div className="text-[11px] text-emerald-100/35">{dirty ? 'Auto-save on' : 'Not saved yet'}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <div className="flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(i)}
                  className={[
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    i === step
                      ? 'border-neon-500/40 bg-neon-500/10 text-emerald-50'
                      : i < step && !stepHasErrors(allErrors, i)
                        ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-50'
                        : i < step && stepHasErrors(allErrors, i)
                          ? 'border-red-500/50 bg-red-500/10 text-red-100'
                          : 'border-neon-500/15 bg-emerald-50/5 text-emerald-100/60 hover:border-neon-500/30 hover:text-emerald-50',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-6">
            {step === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Full Name"
                  value={personal.name}
                  onChange={(v) => {
                    touch()
                    setPersonal((p) => ({ ...p, name: v }))
                  }}
                  error={err('personal.name')}
                />
                <TextInput
                  label="Location"
                  value={personal.location}
                  onChange={(v) => {
                    touch()
                    setPersonal((p) => ({ ...p, location: v }))
                  }}
                />
                <TextInput
                  label="Email"
                  value={personal.email}
                  onChange={(v) => {
                    touch()
                    setPersonal((p) => ({ ...p, email: v }))
                  }}
                  type="email"
                  error={err('personal.email')}
                />
                <TextInput
                  label="Phone"
                  value={personal.phone}
                  onChange={(v) => {
                    touch()
                    const cleaned = String(v || '').replace(/[^\d+]/g, '')
                    setPersonal((p) => ({ ...p, phone: cleaned }))
                  }}
                  inputMode="tel"
                  error={err('personal.phone')}
                />
                <div className="md:col-span-2">
                  <TextInput
                    label="LinkedIn"
                    value={personal.linkedin}
                    onChange={(v) => {
                      touch()
                      setPersonal((p) => ({ ...p, linkedin: _normalizeLinkedIn(v) }))
                    }}
                    placeholder="https://linkedin.com/in/..."
                    error={err('personal.linkedin')}
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4">
                <TextArea
                  label="Professional Summary / Objective"
                  value={objective}
                  onChange={(v) => {
                    touch()
                    setObjective(v)
                  }}
                  placeholder="Write a short summary..."
                  rows={7}
                  error={err('objective')}
                />
                <div className="flex flex-wrap gap-2">
                  <SmallButton onClick={handleGenerateSummary} disabled={aiBusy}>
                    {aiBusy ? 'Generating...' : 'Generate with AI'}
                  </SmallButton>
                  <div className="text-xs text-emerald-100/45 self-center">
                    Uses your skills + experience to draft a summary.
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4">
                {err('education.required') ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {err('education.required')}
                  </div>
                ) : null}
                {education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-emerald-50">Education #{idx + 1}</div>
                      <SmallButton
                        onClick={() => (touch(), setEducation((prev) => prev.filter((_, i) => i !== idx)))}
                        disabled={education.length === 1}
                      >
                        Remove
                      </SmallButton>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <TextInput
                        label="Degree"
                        value={edu.degree}
                        onChange={(v) => {
                          touch()
                          setEducation((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, degree: v } : x)),
                          )
                        }}
                        error={err(`education.${idx}.degree`)}
                      />
                      <TextInput
                        label="Institution"
                        value={edu.institution}
                        onChange={(v) => {
                          touch()
                          setEducation((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, institution: v } : x)),
                          )
                        }}
                        error={err(`education.${idx}.institution`)}
                      />
                      <TextInput
                        label="Start Year"
                        value={edu.startYear}
                        onChange={(v) => {
                          touch()
                          const y = String(v || '').replace(/[^\d]/g, '').slice(0, 4)
                          setEducation((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, startYear: y } : x)),
                          )
                        }}
                        placeholder="YYYY"
                        inputMode="numeric"
                        error={err(`education.${idx}.startYear`)}
                      />
                      <TextInput
                        label="End Year (optional)"
                        value={edu.endYear}
                        onChange={(v) => {
                          touch()
                          const y = String(v || '').replace(/[^\d]/g, '').slice(0, 4)
                          setEducation((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, endYear: y } : x)),
                          )
                        }}
                        placeholder="YYYY"
                        inputMode="numeric"
                        error={err(`education.${idx}.endYear`)}
                      />
                    </div>
                  </div>
                ))}
                <SmallButton
                  onClick={() =>
                    (touch(),
                    setEducation((prev) => [
                      ...prev,
                      { degree: '', institution: '', startYear: '', endYear: '' },
                    ]))
                  }
                >
                  + Add Education
                </SmallButton>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4">
                {err('experience.required') ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {err('experience.required')}
                  </div>
                ) : null}
                {experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-emerald-50">Experience #{idx + 1}</div>
                      <div className="flex gap-2">
                        <SmallButton
                          onClick={() => handleImproveExperience(idx)}
                          disabled={aiBusy}
                        >
                          {aiBusy ? 'Improving...' : 'Improve with AI'}
                        </SmallButton>
                        <SmallButton
                          onClick={() => (touch(), setExperience((prev) => prev.filter((_, i) => i !== idx)))}
                          disabled={experience.length === 1}
                        >
                          Remove
                        </SmallButton>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <TextInput
                        label="Job Title"
                        value={exp.title}
                        onChange={(v) => {
                          touch()
                          setExperience((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, title: v } : x)),
                          )
                        }}
                        error={err(`experience.${idx}.title`)}
                      />
                      <TextInput
                        label="Company"
                        value={exp.company}
                        onChange={(v) => {
                          touch()
                          setExperience((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, company: v } : x)),
                          )
                        }}
                        error={err(`experience.${idx}.company`)}
                      />
                      <TextInput
                        label="Start Year"
                        value={exp.startYear}
                        onChange={(v) => {
                          touch()
                          const y = String(v || '').replace(/[^\d]/g, '').slice(0, 4)
                          setExperience((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, startYear: y } : x)),
                          )
                        }}
                        placeholder="YYYY"
                        inputMode="numeric"
                        error={err(`experience.${idx}.startYear`)}
                      />
                      <TextInput
                        label="End Year (optional)"
                        value={exp.endYear}
                        onChange={(v) => {
                          touch()
                          const y = String(v || '').replace(/[^\d]/g, '').slice(0, 4)
                          setExperience((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, endYear: y } : x)),
                          )
                        }}
                        placeholder="YYYY"
                        inputMode="numeric"
                        error={err(`experience.${idx}.endYear`)}
                      />
                      <div className="md:col-span-2">
                        <TextArea
                          label="Description (use bullet points, one per line)"
                          value={exp.description}
                          onChange={(v) => {
                            touch()
                            setExperience((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, description: v } : x)),
                            )
                          }}
                          rows={6}
                          placeholder="- Built ...\n- Improved ..."
                          error={err(`experience.${idx}.description`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <SmallButton
                  onClick={() =>
                    (touch(),
                    setExperience((prev) => [
                      ...prev,
                      { title: '', company: '', startYear: '', endYear: '', description: '' },
                    ]))
                  }
                >
                  + Add Experience
                </SmallButton>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4">
                {skills.map((s, idx) => (
                  <div
                    key={idx}
                    className="grid gap-4 rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-4 md:grid-cols-3"
                  >
                    <TextInput
                      label="Skill Name"
                      value={s.name}
                      onChange={(v) => {
                        touch()
                        setSkills((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)))
                      }}
                      placeholder="e.g. Python"
                      error={err(`skills.${idx}.name`)}
                    />
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm text-emerald-100/70">Level</span>
                      <select
                        value={s.level}
                        onChange={(e) => {
                          touch()
                          setSkills((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, level: e.target.value } : x,
                            ),
                          )
                        }}
                        className={[
                          'w-full rounded-xl border bg-emerald-50/5 px-4 py-3 text-sm text-emerald-50 outline-none',
                          err(`skills.${idx}.level`)
                            ? 'border-red-500/60 focus:border-red-400'
                            : 'border-neon-500/15 focus:border-neon-500/40',
                        ].join(' ')}
                      >
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                      </select>
                      {err(`skills.${idx}.level`) ? (
                        <div className="text-xs text-red-200">{err(`skills.${idx}.level`)}</div>
                      ) : null}
                    </label>
                    <div className="md:col-span-3">
                      <SmallButton
                        onClick={() => (touch(), setSkills((prev) => prev.filter((_, i) => i !== idx)))}
                        disabled={skills.length === 1}
                      >
                        Remove
                      </SmallButton>
                    </div>
                  </div>
                ))}
                <SmallButton
                  onClick={() => (touch(), setSkills((prev) => [...prev, { name: '', level: 'Beginner' }]))}
                >
                  + Add Skill
                </SmallButton>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="grid gap-4">
                <div className="text-sm text-emerald-100/60">
                  Projects are optional but can improve your profile.
                </div>
                {projects.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-emerald-50">Project #{idx + 1}</div>
                      <SmallButton
                        onClick={() => (touch(), setProjects((prev) => prev.filter((_, i) => i !== idx)))}
                        disabled={projects.length === 1}
                      >
                        Remove
                      </SmallButton>
                    </div>
                    <div className="mt-4 grid gap-4">
                      <TextInput
                        label="Project Name"
                        value={p.name}
                        onChange={(v) => {
                          touch()
                          setProjects((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, name: v } : x)),
                          )
                        }}
                        error={err(`projects.${idx}.name`)}
                      />
                      <TextInput
                        label="Technologies Used"
                        value={p.technologies}
                        onChange={(v) => {
                          touch()
                          setProjects((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, technologies: v } : x)),
                          )
                        }}
                        placeholder="e.g. React, Flask, SQL"
                      />
                      <TextArea
                        label="Description"
                        value={p.description}
                        onChange={(v) => {
                          touch()
                          setProjects((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, description: v } : x)),
                          )
                        }}
                        rows={5}
                        error={err(`projects.${idx}.description`)}
                      />
                    </div>
                  </div>
                ))}
                <SmallButton
                  onClick={() =>
                    (touch(),
                    setProjects((prev) => [
                      ...prev,
                      { name: '', description: '', technologies: '' },
                    ]))
                  }
                >
                  + Add Project
                </SmallButton>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="grid gap-4">
                <div className="text-sm text-emerald-100/70">
                  Select a resume template:
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {templateOptions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        touch()
                        setTemplateId(t.id)
                      }}
                      className={[
                        'text-left rounded-2xl border p-5 transition-all',
                        templateId === t.id
                          ? 'border-neon-500/50 bg-neon-500/10 shadow-neon'
                          : 'border-neon-500/15 bg-emerald-50/5 hover:border-neon-500/35',
                      ].join(' ')}
                    >
                      <div className="font-display text-lg font-semibold text-emerald-50">
                        {t.name}
                      </div>
                      <div className="mt-2 text-sm text-emerald-100/60">
                        Click to select
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 7 ? (
              <div className="grid gap-4">
                <div className="rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-5">
                  <div className="text-sm text-emerald-100/70">Ready to export</div>
                  <div className="mt-2 text-lg font-semibold text-emerald-50">
                    Generate PDF Resume
                  </div>
                  <div className="mt-2 text-sm text-emerald-100/60">
                    Template: <span className="text-emerald-50">{templateId}</span>
                  </div>
                  {!allValid ? (
                    <div className="mt-3 text-sm text-red-100/90">
                      Fix validation errors before generating.
                    </div>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateResume}
                      disabled={generateBusy || !allValid}
                      className="rounded-xl bg-neon-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:brightness-110 disabled:opacity-60"
                    >
                      {generateBusy ? 'Generating...' : 'Generate Resume'}
                    </button>
                    <div className="text-xs text-emerald-100/45 self-center">
                      Downloads a PDF file.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded-xl border border-neon-500/20 bg-emerald-50/5 px-5 py-3 text-sm text-emerald-100/80 hover:border-neon-500/40 hover:text-emerald-50 disabled:opacity-50 disabled:hover:border-neon-500/20"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={step === steps.length - 1 || !currentStepValid}
              className="rounded-xl bg-emerald-50/10 px-5 py-3 text-sm text-emerald-50 hover:bg-emerald-50/15 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ResumeBuilder

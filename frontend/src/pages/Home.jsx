import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import FeatureCard from '../components/FeatureCard'
import ParticlesCanvas from '../components/ParticlesCanvas'

function IconResume() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h7l3 3v15H7V3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 11h6M9 15h6M9 19h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconInterview() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3H10l-4 3v-3H7a3 3 0 01-3-3V7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10.5h7M8.5 13.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 19V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 15v-4M12 15V7M16 15v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 11l3-3 3 2 4-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Home() {
  const rootRef = useRef(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    function onMove(e) {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 100
      const y = ((e.clientY - r.top) / r.height) * 100
      el.style.setProperty('--mx', `${x}%`)
      el.style.setProperty('--my', `${y}%`)
      el.style.setProperty('--px', `${(x - 50) * 0.22}px`)
      el.style.setProperty('--py', `${(y - 50) * 0.18}px`)
    }

    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div ref={rootRef} className="pointer-glow relative min-h-screen overflow-hidden">
      <ParticlesCanvas className="absolute inset-0 h-full w-full opacity-75" density={62} />

      <div className="absolute inset-0 opacity-25 [mask-image:radial-gradient(60%_55%_at_50%_20%,black,transparent)] bg-grid-faint [background-size:72px_72px]" />

      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-neon-500/10 blur-[90px]"
        style={{ transform: 'translate3d(calc(-50% + var(--px, 0px)), var(--py, 0px), 0)' }}
      />
      <div
        className="absolute -bottom-48 right-[-90px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[110px]"
        style={{ transform: 'translate3d(var(--px, 0px), calc(var(--py, 0px) * -1), 0)' }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-14 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-500/20 bg-emerald-50/5 px-3 py-1 text-xs text-emerald-50/80 shadow-[0_0_0_1px_rgba(0,0,0,0.25)_inset]">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-500 shadow-[0_0_18px_rgba(0,255,102,0.55)]" />
            AI Hiring Suite
          </div>

          <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-emerald-50">
            NextHire <span className="text-neon-500">AI</span>
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-sm sm:text-base text-emerald-100/70">
            Build ATS-ready resumes, practice interviews with instant feedback, and score your
            profile against job descriptions with intelligent matching.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          <FeatureCard
            title="SmartCV Builder"
            description="Create professional, ATS-optimized resumes in seconds with AI assistance."
            to="/resume-builder"
            icon={<span className="text-neon-500">{<IconResume />}</span>}
          />
          <FeatureCard
            title="InterviewX AI"
            description="Practice real interview questions and get instant AI-powered feedback."
            to="/interview-prep"
            icon={<span className="text-neon-500">{<IconInterview />}</span>}
          />
          <FeatureCard
            title="ATS Insight"
            description="Analyze your resume against job descriptions and boost your hiring score."
            to="/ats-score"
            icon={<span className="text-neon-500">{<IconAnalytics />}</span>}
          />
        </motion.div>

        <div className="mt-12 text-center text-xs text-emerald-100/45">
          Get your future interview preparation on one powerful platform.
        </div>
      </div>
    </div>
  )
}

export default Home

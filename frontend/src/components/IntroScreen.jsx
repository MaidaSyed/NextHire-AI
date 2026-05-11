import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import ParticlesCanvas from './ParticlesCanvas'

function ResumeSvg() {
  return (
    <svg viewBox="0 0 240 200" className="intro-svg">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <motion.path
          d="M70 34h74l22 22v110H70V34z"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.25, ease: 'easeInOut' }}
        />
        <motion.path
          d="M144 34v28h28"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.9, ease: 'easeInOut' }}
        />
        <motion.path
          d="M88 78h62M88 96h62M88 114h46"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.22, duration: 1.05, ease: 'easeInOut' }}
        />
        <motion.path
          d="M88 138h30"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: 'easeInOut' }}
        />
      </g>
      <motion.rect
        x="78"
        y="70"
        width="108"
        height="10"
        rx="5"
        fill="rgba(0,255,102,0.14)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.75, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
      />
    </svg>
  )
}

function AtsSvg() {
  return (
    <svg viewBox="0 0 260 200" className="intro-svg">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <motion.path
          d="M42 150V48h176"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.25, ease: 'easeInOut' }}
        />
        <motion.path
          d="M60 132v-22M90 132V86M120 132V72M150 132v-38M180 132V98"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.18, duration: 1.05, ease: 'easeInOut' }}
        />
        <motion.path
          d="M60 92l30-22 30 14 30-26 30 18"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.05, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="90"
          cy="70"
          r="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.25 }}
        />
        <motion.circle
          cx="120"
          cy="84"
          r="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.25 }}
        />
        <motion.circle
          cx="150"
          cy="58"
          r="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.25 }}
        />
        <motion.circle
          cx="180"
          cy="76"
          r="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.25 }}
        />
      </g>
      <motion.rect
        x="52"
        y="48"
        width="166"
        height="96"
        rx="14"
        fill="rgba(57,255,136,0.06)"
        stroke="rgba(57,255,136,0.18)"
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: [48, 116, 48], opacity: [0, 0.85, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

function InterviewSvg() {
  return (
    <svg viewBox="0 0 260 200" className="intro-svg">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M52 64a18 18 0 0118-18h120a18 18 0 0118 18v52a18 18 0 01-18 18H98l-30 22v-22H70a18 18 0 01-18-18V64z"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.35, ease: 'easeInOut' }}
        />
        <motion.path
          d="M84 86h92M84 106h62"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.95, ease: 'easeInOut' }}
        />
        <motion.path
          d="M178 144v-12a12 12 0 00-24 0v12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.9, ease: 'easeInOut' }}
        />
        <motion.path
          d="M166 152a8 8 0 008-8v-22a8 8 0 10-16 0v22a8 8 0 008 8z"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.95, ease: 'easeInOut' }}
        />
      </g>
      <motion.circle
        cx="84"
        cy="52"
        r="10"
        fill="rgba(0,255,102,0.10)"
        initial={{ opacity: 0.15, scale: 0.9 }}
        animate={{ opacity: [0.15, 0.45, 0.15], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

function IntroScreen() {
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
      el.style.setProperty('--px', `${(x - 50) * 0.26}px`)
      el.style.setProperty('--py', `${(y - 50) * 0.22}px`)
    }

    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  const title = 'NextHire AI'
  const letter = {
    hidden: { opacity: 0, filter: 'blur(10px)' },
    show: { opacity: 1, filter: 'blur(0px)' },
  }

  return (
    <motion.div
      ref={rootRef}
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(900px_560px_at_50%_35%,rgba(0,255,102,0.20),transparent_62%),radial-gradient(820px_520px_at_18%_18%,rgba(57,255,136,0.14),transparent_62%),linear-gradient(150deg,#030404,#060c08_55%,#020403)]" />
      <div className="absolute inset-0 opacity-25 bg-grid-faint [background-size:64px_64px]" />
      <ParticlesCanvas className="absolute inset-0 h-full w-full opacity-90" density={70} />

      <div className="absolute inset-0 intro-orbit" />
      <div className="absolute inset-0 intro-datastream" />
      <div className="absolute inset-0 intro-scanlines" />
      <div className="absolute inset-0 intro-fog" />
      <div className="absolute inset-0 intro-grain" />

      <motion.div
        className="absolute left-[-48px] top-[10%] w-[340px] text-neon-500/35 pointer-events-none"
        style={{ transform: 'translate3d(var(--px, 0px), var(--py, 0px), 0)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, -1.3, 0] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ResumeSvg />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute right-[-58px] top-[14%] w-[360px] text-neon-500/32 pointer-events-none"
        style={{ transform: 'translate3d(calc(var(--px, 0px) * -1), var(--py, 0px), 0)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={{ y: [0, 14, 0], rotate: [0, 1.2, 0] }}
          transition={{ duration: 7.0, repeat: Infinity, ease: 'easeInOut' }}
        >
          <InterviewSvg />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute left-[-40px] bottom-[6%] w-[400px] text-neon-500/28 pointer-events-none"
        style={{
          transform:
            'translate3d(var(--px, 0px), calc(var(--py, 0px) * -1), 0)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AtsSvg />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative px-6 text-center"
        initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.98 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="smoke-reveal">
          <motion.h1
            className="smoke-title intro-title-glow font-display text-6xl sm:text-7xl md:text-8xl font-semibold text-emerald-50"
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.055, delayChildren: 0.22 }}
          >
            <span className="sr-only">{title}</span>
            <span aria-hidden="true">
              {title.split('').map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  variants={letter}
                  transition={{ duration: 0.46, ease: 'easeOut' }}
                  className={ch === ' ' ? 'inline-block w-2 sm:w-3' : 'inline-block'}
                  style={ch !== ' ' && title.startsWith('NextHire') && i < 8 ? { color: '#00ff66' } : undefined}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          </motion.h1>
        </div>
        <motion.p
          className="mt-5 text-sm sm:text-base text-emerald-100/70"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.75 }}
        >
          Precision hiring intelligence
        </motion.p>
        <motion.div
          className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] tracking-[0.22em] text-emerald-100/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.05, duration: 0.7 }}
        >
          <span className="rounded-full border border-neon-500/15 bg-emerald-50/5 px-3 py-1">
            SMARTCV
          </span>
          <span className="rounded-full border border-neon-500/15 bg-emerald-50/5 px-3 py-1">
            INTERVIEWX
          </span>
          <span className="rounded-full border border-neon-500/15 bg-emerald-50/5 px-3 py-1">
            ATS INSIGHT
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.15, duration: 0.8 }}
        style={{
          background:
            'radial-gradient(600px 320px at var(--mx, 50%) var(--my, 44%), rgba(0,255,102,0.16), transparent 62%)',
          filter: 'blur(18px)',
          transform: 'translate3d(calc(var(--px, 0px) * 0.5), calc(var(--py, 0px) * 0.5), 0)',
        }}
      />

      <motion.div
        className="absolute inset-0 pointer-events-none intro-pulse"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      />

      <motion.div
        className="absolute left-0 right-0 h-[180px] pointer-events-none intro-scan"
        initial={{ opacity: 0, y: '-30%' }}
        animate={{ opacity: [0, 0.9, 0], y: ['-30%', '120%', '120%'] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 3.25, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

export default IntroScreen

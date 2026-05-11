import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function InterviewPrep() {
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
          <h2 className="font-display text-3xl font-semibold text-emerald-50">
            InterviewX AI
          </h2>
          <p className="mt-3 text-emerald-100/70 max-w-2xl">
            Add question practice, timed sessions, and instant feedback here.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {['Mock interviews', 'Feedback highlights', 'Confidence score'].map((t) => (
              <div
                key={t}
                className="rounded-xl border border-neon-500/15 bg-emerald-50/5 px-4 py-3 text-sm text-emerald-100/70"
              >
                {t}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default InterviewPrep

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const MotionLink = motion.create(Link)

function FeatureCard({ title, description, to, icon }) {
  return (
    <MotionLink
      to={to}
      className="card-border card-glass group relative block rounded-2xl p-6 md:p-7 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-500/70"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl shadow-neon" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50/5 ring-1 ring-neon-500/20">
            {icon}
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-emerald-50">{title}</div>
            <div className="mt-1 text-sm text-emerald-100/70">{description}</div>
          </div>
        </div>

        <motion.div
          className="mt-1 text-neon-500/80"
          initial={{ x: 0, opacity: 0.7 }}
          whileHover={{ x: 6, opacity: 1 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-emerald-100/50">Click to open</div>
        <div className="text-xs text-neon-500/70 group-hover:text-neon-500 transition-colors">
          Explore
        </div>
      </div>
    </MotionLink>
  )
}

export default FeatureCard

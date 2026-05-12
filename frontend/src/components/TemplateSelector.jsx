import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const TEMPLATES = [
  {
    id: 'template1',
    name: 'Modern Minimal',
    description: 'Clean serif-inspired layout with a bold header and compact sections.',
    accent: 'slate',
  },
  {
    id: 'template2',
    name: 'Corporate Professional',
    description: 'Structured two-column layout with a formal sidebar and timeline content.',
    accent: 'blue',
  },
  {
    id: 'template3',
    name: 'Creative Designer',
    description: 'Editorial-style design with a strong visual header and section blocks.',
    accent: 'purple',
  },
  {
    id: 'template4',
    name: 'ATS Friendly',
    description: 'Simple, scannable, text-first layout optimized for parsing systems.',
    accent: 'neutral',
  },
]

function TemplateThumbnail({ templateId }) {
  if (templateId === 'template1') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="h-2 w-24 rounded-full bg-slate-900" />
        <div className="mt-2 h-2 w-40 rounded-full bg-slate-300" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-slate-200" />
            <div className="h-2 w-4/5 rounded-full bg-slate-200" />
            <div className="h-2 w-3/5 rounded-full bg-slate-200" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-slate-200" />
            <div className="h-2 w-11/12 rounded-full bg-slate-200" />
            <div className="h-2 w-2/3 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (templateId === 'template2') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="h-2 w-22 rounded-full bg-slate-900" />
        <div className="mt-2 flex gap-2">
          <div className="w-7 rounded-md bg-slate-900" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-5/6 rounded-full bg-slate-300" />
            <div className="h-2 w-4/5 rounded-full bg-slate-200" />
            <div className="h-2 w-3/5 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (templateId === 'template3') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm">
        <div className="h-5 w-24 rounded-md bg-gradient-to-r from-purple-600 to-pink-500" />
        <div className="mt-2 h-2 w-36 rounded-full bg-slate-300" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="h-10 rounded-xl bg-white shadow-sm" />
          <div className="h-10 rounded-xl bg-white shadow-sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="h-2 w-24 rounded-full bg-slate-900" />
      <div className="mt-2 h-2 w-40 rounded-full bg-slate-300" />
      <div className="mt-3 space-y-1.5">
        <div className="h-2 w-full rounded-full bg-slate-200" />
        <div className="h-2 w-11/12 rounded-full bg-slate-200" />
        <div className="h-2 w-10/12 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

export default function TemplateSelector({ onSelectTemplate, selectedTemplate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen px-5 py-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-emerald-100/70 transition-colors hover:text-neon-500"
        >
          <span aria-hidden="true">←</span> Back to Home
        </Link>

        <div className="mt-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-neon-500/20 bg-emerald-50/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-neon-100/80"
          >
            Step 1: Choose Template
          </motion.div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-emerald-50 md:text-5xl">
            Select Your Resume Template
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-emerald-100/70 md:text-lg">
            Pick the layout that best fits your style. The form and live preview will open right after selection.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((template, index) => {
            const selected = selectedTemplate === template.id
            return (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.07 }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onSelectTemplate(template.id)}
                className={[
                  'group relative overflow-hidden rounded-3xl border p-4 text-left transition-all',
                  selected
                    ? 'border-neon-500/60 bg-neon-500/10 shadow-[0_0_36px_rgba(0,255,102,0.16)]'
                    : 'border-neon-500/15 bg-emerald-950/40 hover:border-neon-500/40 hover:bg-emerald-950/55',
                ].join(' ')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-500/0 via-transparent to-neon-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="mb-3">
                    <TemplateThumbnail templateId={template.id} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-emerald-50">{template.name}</h2>
                    {selected ? (
                      <span className="rounded-full border border-neon-500/40 bg-neon-500/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neon-100">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/65">{template.description}</p>
                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectTemplate(selectedTemplate)}
            className="rounded-2xl bg-neon-500 px-8 py-4 text-sm font-semibold text-black shadow-[0_0_32px_rgba(0,255,102,0.22)] transition-all hover:brightness-110"
          >
            Continue with Selected Template
          </motion.button>
        </div>

        <div className="mt-8 rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-4 text-center text-sm text-emerald-100/60">
          The selected template can still be switched later while editing your resume.
        </div>
      </div>
    </motion.div>
  )
}

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import IntroScreen from './components/IntroScreen'
import AtsScore from './pages/AtsScore'
import Home from './pages/Home'
import InterviewPrep from './pages/InterviewPrep'
import ResumeBuilder from './pages/ResumeBuilder'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <Home />
            </motion.div>
          }
        />
        <Route
          path="/resume-builder"
          element={
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35 }}
            >
              <ResumeBuilder />
            </motion.div>
          }
        />
        <Route
          path="/interview-prep"
          element={
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35 }}
            >
              <InterviewPrep />
            </motion.div>
          }
        />
        <Route
          path="/ats-score"
          element={
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35 }}
            >
              <AtsScore />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setShowIntro(false), 5000)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="app-shell">
      <AnimatePresence>{showIntro ? <IntroScreen /> : null}</AnimatePresence>
      <AnimatedRoutes />
    </div>
  )
}

export default App

import { useEffect, useRef } from 'react'

function ParticlesCanvas({ className = '', density = 54 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const particles = []

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function random(min, max) {
      return min + Math.random() * (max - min)
    }

    function spawn() {
      const rect = canvas.getBoundingClientRect()
      particles.length = 0
      for (let i = 0; i < density; i += 1) {
        particles.push({
          x: random(0, rect.width),
          y: random(0, rect.height),
          vx: random(-0.18, 0.18),
          vy: random(-0.12, 0.12),
          r: random(0.7, 2.2),
          a: random(0.08, 0.28),
        })
      }
    }

    function tick() {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < -20) p.x = rect.width + 20
        if (p.x > rect.width + 20) p.x = -20
        if (p.y < -20) p.y = rect.height + 20
        if (p.y > rect.height + 20) p.y = -20

        ctx.beginPath()
        ctx.fillStyle = `rgba(57,255,136,${p.a})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = window.requestAnimationFrame(tick)
    }

    function onResize() {
      resize()
      spawn()
    }

    onResize()
    tick()

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(raf)
    }
  }, [density])

  return <canvas ref={canvasRef} className={className} />
}

export default ParticlesCanvas

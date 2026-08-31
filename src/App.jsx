import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const GAME_DURATION = 15 // seconds
const DOT_LIFETIME = 1800 // ms before auto-miss

function randomPos(arenaSize = 340, dotSize = 56, pad = 20) {
  return {
    x: Math.floor(Math.random() * (arenaSize - dotSize - pad * 2)) + pad,
    y: Math.floor(Math.random() * (arenaSize - dotSize - pad * 2)) + pad,
  }
}

export default function App() {
  const [phase, setPhase]       = useState('idle') // idle | playing | done
  const [score, setScore]       = useState(0)
  const [misses, setMisses]     = useState(0)
  const [best, setBest]         = useState(null)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [dot, setDot]           = useState(null) // { x, y, id }
  const [lastMs, setLastMs]     = useState(null)
  const [particles, setParticles] = useState([])

  const shownAt   = useRef(null)
  const dotTimer  = useRef(null)
  const gameTimer = useRef(null)
  const tickTimer = useRef(null)

  // cleanup
  useEffect(() => () => {
    clearTimeout(dotTimer.current)
    clearInterval(gameTimer.current)
    clearInterval(tickTimer.current)
  }, [])

  const hideDot = useCallback(() => {
    setDot(null)
    shownAt.current = null
  }, [])

  const scheduleDot = useCallback(() => {
    const delay = 500 + Math.random() * 1100
    setTimeout(() => {
      const pos = randomPos()
      const id  = Date.now()
      setDot({ ...pos, id })
      shownAt.current = Date.now()

      dotTimer.current = setTimeout(() => {
        setDot(prev => prev?.id === id ? null : prev)
        setMisses(m => m + 1)
        shownAt.current = null
        scheduleDot()
      }, DOT_LIFETIME)
    }, delay)
  }, [])

  const startGame = () => {
    setScore(0); setMisses(0); setBest(null)
    setLastMs(null); setParticles([])
    setTimeLeft(GAME_DURATION)
    setDot(null)
    setPhase('playing')

    gameTimer.current = setTimeout(() => {
      setPhase('done')
      clearTimeout(dotTimer.current)
      clearInterval(tickTimer.current)
      setDot(null)
    }, GAME_DURATION * 1000)

    tickTimer.current = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1))
    }, 1000)

    scheduleDot()
  }

  const hitDot = (e, id) => {
    e.stopPropagation()
    if (!shownAt.current) return
    clearTimeout(dotTimer.current)

    const elapsed = Date.now() - shownAt.current
    setLastMs(elapsed)
    setBest(b => b === null || elapsed < b ? elapsed : b)
    setScore(s => s + 1)
    hideDot()

    // particle burst
    const rect = e.target.getBoundingClientRect()
    const arenaRect = e.target.closest('#arena').getBoundingClientRect()
    const cx = rect.left - arenaRect.left + rect.width / 2
    const cy = rect.top  - arenaRect.top  + rect.height / 2
    const newPs = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      cx, cy,
      angle: (i / 8) * 360,
    }))
    setParticles(ps => [...ps, ...newPs])
    setTimeout(() => setParticles(ps => ps.filter(p => !newPs.find(n => n.id === p.id))), 500)

    scheduleDot()
  }

  const missClick = () => {
    if (phase !== 'playing') return
    if (!dot) {
      setMisses(m => m + 1)
    }
  }

  const speedLabel = lastMs === null ? '—'
    : lastMs < 300 ? '⚡ Lightning!'
    : lastMs < 600 ? '🔥 Fast!'
    : '👍 Nice!'

  return (
    <div className="app">
      <header>
        <h1>DOT DASH</h1>
        <p className="tagline">Click the dot — beat the clock!</p>
      </header>

      <div className="hud">
        <div className="stat">
          <span className="label">Score</span>
          <span className="value">{score}</span>
        </div>
        <div className="stat timer-stat">
          <span className="label">Time</span>
          <span className={`value ${timeLeft <= 5 ? 'danger' : ''}`}>{timeLeft}s</span>
        </div>
        <div className="stat">
          <span className="label">Misses</span>
          <span className="value misses-val">{misses}</span>
        </div>
      </div>

      <div id="arena" className={`arena ${phase}`} onClick={missClick}>
        {particles.map(p => (
          <div key={p.id} className="particle"
            style={{
              left: p.cx, top: p.cy,
              '--tx': `${Math.cos(p.angle * Math.PI / 180) * 45}px`,
              '--ty': `${Math.sin(p.angle * Math.PI / 180) * 45}px`,
            }} />
        ))}

        {dot && (
          <button
            key={dot.id}
            className="dot"
            style={{ left: dot.x, top: dot.y }}
            onClick={e => hitDot(e, dot.id)}
          />
        )}

        {phase === 'idle' && (
          <div className="overlay">
            <p>React • Click the glowing dot<br/>as fast as possible!</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="overlay result">
            <p className="result-title">Time's Up! 🎉</p>
            <p>Score: <strong>{score}</strong> &nbsp;|&nbsp; Best: <strong>{best ? best + 'ms' : '—'}</strong></p>
          </div>
        )}
      </div>

      <div className="feedback">
        {phase === 'playing' && lastMs !== null && (
          <span className="speed">{speedLabel} {lastMs}ms</span>
        )}
        {phase === 'playing' && lastMs === null && (
          <span className="muted">Get ready…</span>
        )}
        {phase === 'idle' && <span className="muted">Press Start to play!</span>}
        {phase === 'done' && <span className="muted">Play again?</span>}
      </div>

      {(phase === 'idle' || phase === 'done') && (
        <button className="start-btn" onClick={startGame}>
          {phase === 'idle' ? '▶ Start' : '↺ Play Again'}
        </button>
      )}

      {phase !== 'idle' && (
        <div className="best-bar">
          Best reaction: <strong>{best ? best + 'ms' : '—'}</strong>
        </div>
      )}
    </div>
  )
}

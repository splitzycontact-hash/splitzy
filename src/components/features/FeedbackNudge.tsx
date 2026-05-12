import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function FeedbackNudge() {
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const duration = 5000
    const interval = 50
    let elapsed = 0

    const timer = setInterval(() => {
      elapsed += interval
      setProgress((elapsed / duration) * 100)
      if (elapsed >= duration) {
        clearInterval(timer)
        navigate('/feedback')
      }
    }, interval)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.3 }}
      className="bg-white rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-dark">Comment s'est passée la soirée ?</p>
          <p className="text-xs text-muted mt-0.5">Ton avis est 100% privé</p>
        </div>
        <span className="text-2xl">⭐</span>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-brand rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted mt-2 text-center">Redirection dans quelques secondes…</p>
    </motion.div>
  )
}

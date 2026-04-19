import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface LeaderEntry {
  wallet_pubkey: string
  display_name: string | null
  total_contributions: number
  approved_contributions: number
  total_earned: number
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load leaderboard')
        return r.json()
      })
      .then(data => { setLeaders(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <main className="pt-24 pb-16 max-w-4xl mx-auto px-6">
      <div className="flex items-center gap-2 text-sm text-white/30 mb-8">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <span className="text-white/60">Leaderboard</span>
      </div>

      <h1 className="font-display text-4xl italic mb-2">Leaderboard</h1>
      <p className="text-white/40 mb-8">Top contributors advancing exoplanet science.</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-12 border border-red-500/10 bg-surface text-center">
          <p className="text-red-400/70 mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="text-accent text-sm hover:underline">Try again</button>
        </div>
      ) : leaders.length === 0 ? (
        <div className="p-12 border border-white/[0.06] bg-surface text-center">
          <p className="text-white/40">No contributions yet. Be the first!</p>
        </div>
      ) : (
        <div className="border border-white/[0.06] bg-surface overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-4 p-4 text-xs text-white/30 border-b border-white/[0.06]">
            <span>#</span>
            <span>Contributor</span>
            <span className="text-right">Total</span>
            <span className="text-right">Approved</span>
            <span className="text-right">$ASTRO</span>
          </div>
          {leaders.map((entry, i) => (
            <div key={entry.wallet_pubkey} className="p-4 border-b border-white/[0.04] hover:bg-surface-light transition-colors">
              {/* Desktop layout */}
              <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-4 items-center">
                <span className={`font-body font-bold ${i < 3 ? 'text-accent' : 'text-white/30'}`}>{i + 1}</span>
                <span className="text-sm font-mono text-white/60 truncate">
                  {entry.display_name || `${entry.wallet_pubkey.slice(0, 6)}...${entry.wallet_pubkey.slice(-4)}`}
                </span>
                <span className="text-sm text-right text-white/40">{entry.total_contributions}</span>
                <span className="text-sm text-right text-white/40">{entry.approved_contributions}</span>
                <span className="text-sm text-right text-accent font-mono">{entry.total_earned}</span>
              </div>
              {/* Mobile layout */}
              <div className="md:hidden flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-body font-bold text-sm ${i < 3 ? 'text-accent' : 'text-white/30'}`}>{i + 1}</span>
                  <span className="text-sm font-mono text-white/60 truncate max-w-[180px]">
                    {entry.display_name || `${entry.wallet_pubkey.slice(0, 6)}...${entry.wallet_pubkey.slice(-4)}`}
                  </span>
                </div>
                <span className="text-sm text-accent font-mono">{entry.total_earned} $ASTRO</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

import { Link } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-void/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-tight">astrodex</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/leaderboard" className="font-display text-[15px] italic text-white/40 hover:text-accent transition-colors">
            Leaderboard
          </Link>
          <span className="w-px h-4 bg-white/[0.08]" />
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  )
}

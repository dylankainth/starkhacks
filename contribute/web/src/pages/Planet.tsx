import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

interface PlanetData {
  planet_name: string
  known_data: Record<string, unknown>
  missing_fields: string[]
  community_contributions: Array<{
    id: number
    data_field: string
    value: string
    status: string
    contributor_wallet: string
  }>
}

const FIELD_LABELS: Record<string, string> = {
  atmosphere_composition: 'Atmospheric Composition',
  geometric_albedo: 'Geometric Albedo',
  temp_eq_k: 'Equilibrium Temperature (K)',
  mass_earth: 'Mass (Earth masses)',
  radius_earth: 'Radius (Earth radii)',
  orbital_period_days: 'Orbital Period (days)',
  surface_gravity: 'Surface Gravity (m/s\u00B2)',
  semi_major_axis_au: 'Semi-major Axis (AU)',
  eccentricity: 'Orbital Eccentricity',
  distance_ly: 'Distance (light-years)',
  star_type: 'Star Type',
  discovery_year: 'Discovery Year',
  discovery_method: 'Discovery Method',
  density_g_cm3: 'Density (g/cm\u00B3)',
  magnetic_field_strength: 'Magnetic Field Strength',
  tidal_lock_status: 'Tidal Lock Status',
  spectral_features: 'Spectral Features',
}

const REWARD_TIERS: Record<string, number> = {
  atmosphere_composition: 50,
  geometric_albedo: 30,
  temp_eq_k: 25,
  mass_earth: 10,
  radius_earth: 10,
  orbital_period_days: 5,
  surface_gravity: 15,
  semi_major_axis_au: 5,
  eccentricity: 5,
}

export default function Planet() {
  const { name } = useParams<{ name: string }>()
  const { publicKey } = useWallet()
  const [planet, setPlanet] = useState<PlanetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState('')
  const [formData, setFormData] = useState({ value: '', source_doi: '', methodology: '', confidence: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!name) return
    setError(null)
    fetch(`/api/planet/${encodeURIComponent(name)}`)
      .then(r => {
        if (!r.ok) throw new Error('Planet not found')
        return r.json()
      })
      .then(data => { setPlanet(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !selectedField) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet_name: name,
          data_field: selectedField,
          value: formData.value,
          source_doi: formData.source_doi,
          methodology: formData.methodology,
          confidence: formData.confidence ? parseFloat(formData.confidence) : null,
          wallet_pubkey: publicKey.toBase58(),
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setFormData({ value: '', source_doi: '', methodology: '', confidence: '' })
        setSelectedField('')
        const updated = await fetch(`/api/planet/${encodeURIComponent(name!)}`)
        if (updated.ok) setPlanet(await updated.json())
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  if (error || !planet) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="text-center">
        <h1 className="font-display text-2xl italic mb-2">{error || 'Planet not found'}</h1>
        <p className="text-white/30 text-sm mb-4">Could not load planet data. The API may be unavailable.</p>
        <Link to="/" className="text-accent text-sm hover:underline">Back to all planets</Link>
      </div>
    </div>
  )

  const known = Object.entries(planet.known_data).filter(([, v]) => v !== null)
  const missing = planet.missing_fields

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-6">
      <div className="flex items-center gap-2 text-sm text-white/30 mb-8">
        <Link to="/" className="hover:text-white transition-colors">Planets</Link>
        <span>/</span>
        <span className="text-white/60">{planet.planet_name}</span>
      </div>

      <div className="flex items-start gap-6 mb-12">
        <div>
          <h1 className="font-display text-4xl italic mb-3">{planet.planet_name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent border border-accent/20">
              {missing.length} fields missing
            </span>
            <span className="text-xs px-2 py-0.5 bg-white/[0.03] text-white/40 border border-white/[0.06]">
              {known.length} fields known
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-xl italic mb-4 text-white/80">Known Data</h2>
          <div className="space-y-1.5">
            {known.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-surface border border-white/[0.04]">
                <span className="text-sm text-white/45">{FIELD_LABELS[key] || key}</span>
                <span className="text-sm font-mono text-accent">{String(value)}</span>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl italic mt-8 mb-4 text-red-400/70">Missing Data</h2>
          <div className="space-y-1.5">
            {missing.map((field) => (
              <div key={field} className="flex items-center justify-between p-3 bg-surface border border-red-500/[0.06]">
                <span className="text-sm text-white/45">{FIELD_LABELS[field] || field}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-accent/50">{REWARD_TIERS[field] || 10} $ASTRO</span>
                  <span className="text-xs text-red-400/40 font-mono">&mdash;</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl italic mb-4">Contribute Data</h2>

          {!publicKey ? (
            <div className="p-10 border border-accent/10 bg-accent/[0.02] relative overflow-hidden">
              {/* Decorative ring */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full border border-accent/[0.08]" />
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full border border-accent/[0.05]" />
              <h3 className="font-display text-2xl italic mb-2">Ready to contribute?</h3>
              <p className="text-white/35 text-sm leading-relaxed mb-6 max-w-sm">Connect your Solana wallet to submit observations and earn $ASTRO tokens for advancing exoplanet science.</p>
              <WalletMultiButton />
            </div>
          ) : submitted ? (
            <div className="p-8 border border-accent/20 bg-accent/[0.02] text-center">
              <h3 className="font-display text-xl italic text-accent mb-2">Contribution Submitted</h3>
              <p className="text-white/40 text-sm mb-4">Your submission is now in the peer review queue.</p>
              <button onClick={() => setSubmitted(false)} className="text-accent text-sm hover:underline">Submit another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 border border-white/[0.06] bg-surface space-y-4">
              <div>
                <label htmlFor="data-field" className="block text-sm text-white/45 mb-1.5">Data Field</label>
                <select
                  id="data-field"
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  required
                  className="w-full bg-void border border-white/[0.08] px-3 py-2.5 text-sm text-white transition-colors"
                >
                  <option value="">Select a missing field...</option>
                  {missing.map((field) => (
                    <option key={field} value={field}>
                      {FIELD_LABELS[field] || field} — {REWARD_TIERS[field] || 10} $ASTRO
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="data-value" className="block text-sm text-white/45 mb-1.5">Value</label>
                <input
                  id="data-value"
                  type="text"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g. H2O, CO2, CH4"
                  className="w-full bg-void border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/20 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="source-doi" className="block text-sm text-white/45 mb-1.5">Source Citation (DOI / arXiv)</label>
                <input
                  id="source-doi"
                  type="text"
                  required
                  value={formData.source_doi}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_doi: e.target.value }))}
                  placeholder="10.1038/s41550-023-02064-z"
                  className="w-full bg-void border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/20 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="methodology" className="block text-sm text-white/45 mb-1.5">Methodology (optional)</label>
                <textarea
                  id="methodology"
                  value={formData.methodology}
                  onChange={(e) => setFormData(prev => ({ ...prev, methodology: e.target.value }))}
                  placeholder="Describe how this data was obtained..."
                  rows={3}
                  className="w-full bg-void border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/20 transition-colors resize-none"
                />
              </div>

              <div>
                <label htmlFor="confidence" className="block text-sm text-white/45 mb-1.5">Confidence (0-1)</label>
                <input
                  id="confidence"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.confidence}
                  onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
                  placeholder="0.95"
                  className="w-full bg-void border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/20 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedField}
                className="w-full bg-accent text-void font-body font-semibold text-sm py-3 hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Contribution'}
              </button>

              <p className="text-xs text-white/20 text-center">
                Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </p>
            </form>
          )}

          {planet.community_contributions.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-lg italic mb-4 text-white/80">Community Contributions</h3>
              <div className="space-y-1.5">
                {planet.community_contributions.map((c) => (
                  <div key={c.id} className="p-3 bg-surface border border-white/[0.04] flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white/60">{FIELD_LABELS[c.data_field] || c.data_field}</span>
                      <span className="text-xs text-white/25 ml-2">by {c.contributor_wallet.slice(0, 4)}...{c.contributor_wallet.slice(-4)}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 ${
                      c.status === 'approved' ? 'bg-accent/10 text-accent' :
                      c.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                      'bg-white/[0.03] text-white/40'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

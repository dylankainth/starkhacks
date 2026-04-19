import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const PLANETS = [
  { name: 'TRAPPIST-1 b', missing: 6, distance: '40.66 ly', type: 'Rocky', temp: '400 K' },
  { name: 'Kepler-442b', missing: 4, distance: '1206 ly', type: 'Super-Earth', temp: '233 K' },
  { name: 'Proxima Centauri b', missing: 2, distance: '4.24 ly', type: 'Rocky', temp: '234 K' },
  { name: 'WASP-121 b', missing: 3, distance: '881 ly', type: 'Hot Jupiter', temp: '2358 K' },
  { name: 'K2-18 b', missing: 4, distance: '124 ly', type: 'Sub-Neptune', temp: '255 K' },
]

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('animate-fade-up')
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollReveal()
  return <div ref={ref} className={`opacity-0 ${className}`}>{children}</div>
}

export default function Landing() {
  return (
    <main>
      {/* Hero — left-aligned, asymmetric */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-void">
          {/* Nebula cloud */}
          <div className="absolute top-[10%] right-[-5%] w-[800px] h-[800px] opacity-30" style={{
            background: 'radial-gradient(ellipse at 40% 50%, rgba(212,160,23,0.15) 0%, transparent 50%), radial-gradient(ellipse at 60% 40%, rgba(99,102,241,0.08) 0%, transparent 40%), radial-gradient(ellipse at 50% 60%, rgba(168,85,247,0.06) 0%, transparent 45%)',
            filter: 'blur(60px)',
          }} />

          {/* Planet body */}
          <div className="absolute top-[15%] right-[5%] sm:right-[10%] w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] lg:w-[500px] lg:h-[500px]">
            {/* Planet sphere */}
            <div className="absolute inset-0 rounded-full" style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(212,160,23,0.3) 0%, rgba(212,160,23,0.05) 30%, rgba(19,18,15,0.95) 60%, #0b0a08 100%)',
              boxShadow: '0 0 80px rgba(212,160,23,0.15), inset -20px -20px 60px rgba(0,0,0,0.8), inset 10px 10px 40px rgba(212,160,23,0.1)',
            }} />
            {/* Surface texture overlay */}
            <div className="absolute inset-0 rounded-full opacity-20" style={{
              background: 'radial-gradient(circle at 25% 25%, transparent 0%, rgba(212,160,23,0.1) 40%, transparent 70%), radial-gradient(circle at 60% 70%, rgba(99,102,241,0.05) 0%, transparent 30%), radial-gradient(circle at 45% 55%, rgba(212,160,23,0.08) 0%, transparent 25%)',
            }} />
            {/* Atmosphere edge glow */}
            <div className="absolute -inset-3 rounded-full" style={{
              background: 'radial-gradient(circle, transparent 45%, rgba(212,160,23,0.08) 50%, rgba(212,160,23,0.03) 55%, transparent 60%)',
            }} />
            {/* Orbital ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[35%]" style={{
              border: '1.5px solid rgba(212,160,23,0.12)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%) rotateX(75deg) rotateZ(-15deg)',
              animation: 'orbit-spin 30s linear infinite',
            }} />
            {/* Second ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[145%] h-[40%]" style={{
              border: '0.5px solid rgba(212,160,23,0.06)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%) rotateX(75deg) rotateZ(-15deg)',
              animation: 'orbit-spin 45s linear infinite reverse',
            }} />
          </div>

          {/* Scattered stars */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.15) 0%, transparent 100%), radial-gradient(1px 1px at 35% 75%, rgba(255,255,255,0.1) 0%, transparent 100%), radial-gradient(1px 1px at 55% 15%, rgba(255,255,255,0.12) 0%, transparent 100%), radial-gradient(1px 1px at 75% 55%, rgba(255,255,255,0.08) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 85% 85%, rgba(212,160,23,0.12) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 5% 65%, rgba(212,160,23,0.1) 0%, transparent 100%)',
            backgroundSize: '300px 300px',
          }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-3xl">
            <div className="animate-fade-up inline-block mb-8 px-3 py-1 border border-accent/20 bg-accent/[0.04] text-accent text-xs font-body tracking-wider uppercase">
              Decentralized Science on Solana
            </div>
            <h1 className="animate-fade-up delay-100 font-display text-6xl sm:text-7xl lg:text-[5.5rem] leading-[0.95] mb-8">
              The missing data<br />
              <em className="text-accent">of 5,800 worlds</em>
            </h1>
            <p className="animate-fade-up delay-200 text-white/40 text-lg max-w-lg mb-10 leading-relaxed">
              Most exoplanets have massive data gaps. Contribute real observations, get peer-reviewed, earn <span className="text-accent">$ASTRO</span> tokens.
            </p>
            <div className="animate-fade-up delay-300 flex items-center gap-5">
              <a href="#planets" className="group inline-flex items-center gap-3 bg-accent text-void font-display italic text-lg px-7 py-3 hover:bg-accent-dim transition-colors">
                Start Contributing
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
              <a href="https://github.com/keanucz/astrodex" target="_blank" rel="noopener" className="inline-flex items-center gap-2 border border-white/[0.08] text-white/35 font-display italic text-[15px] px-6 py-3 hover:border-accent/20 hover:text-accent transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-fade-in delay-500">
          <span className="text-white/20 text-xs tracking-[0.3em] uppercase font-body">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* How it works — broken grid, not 3 identical cards */}
      <section className="py-32 border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="font-display text-4xl italic mb-16">How it works</h2>

            {/* First item: full width callout */}
            <div className="mb-6 p-8 border border-white/[0.06] bg-surface-light flex items-start gap-8">
              <span className="text-accent/30 font-body text-xs tracking-widest mt-1">01</span>
              <div>
                <h3 className="font-display text-2xl italic mb-2">Find a gap</h3>
                <p className="text-white/40 leading-relaxed max-w-2xl">Browse exoplanets with missing data — atmospheric composition, geometric albedo, temperature measurements. Of 5,800+ confirmed planets, only ~70 have detected atmospheres.</p>
              </div>
            </div>

            {/* Items 2-3: side by side but different proportions */}
            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-3 p-8 border border-white/[0.06] bg-surface">
                <span className="text-accent/30 font-body text-xs tracking-widest">02</span>
                <h3 className="font-display text-2xl italic mt-3 mb-2">Submit data</h3>
                <p className="text-white/40 text-sm leading-relaxed">Contribute observations with source citations — DOIs, arXiv IDs, observation datasets. Every submission is SHA-256 hashed on-chain for provenance.</p>
              </div>
              <div className="md:col-span-2 p-8 border border-accent/10 bg-accent/[0.02]">
                <span className="text-accent/30 font-body text-xs tracking-widest">03</span>
                <h3 className="font-display text-2xl italic mt-3 mb-2">Earn $ASTRO</h3>
                <p className="text-white/40 text-sm leading-relaxed">Peer reviewers validate your work. Approved contributions mint tokens proportional to data rarity — up to 50 $ASTRO for atmospheric detections.</p>
              </div>
            </div>
          </div>
        </section>

      {/* Planets — varied grid */}
      <Section>
        <section id="planets" className="py-20 border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-12">
              <h2 className="font-display text-4xl italic mb-3">Planets needing data</h2>
              <p className="text-white/35 max-w-md">Real exoplanets with real data gaps. Pick one and contribute.</p>
            </div>

            {/* Bento-ish: first card is tall, rest fill around it */}
            <div className="grid md:grid-cols-3 gap-3">
              {/* Featured planet — spans 2 rows */}
              <Link
                to={`/planet/${encodeURIComponent(PLANETS[0].name)}`}
                className="group md:row-span-2 relative p-8 border border-white/[0.06] bg-surface hover:border-accent/20 transition-all"
              >
                <div className="absolute top-8 right-8 w-24 h-24 rounded-full border border-accent/10 group-hover:border-accent/20 transition-colors group-hover:rotate-[30deg] duration-700" />
                <div className="absolute top-11 right-11 w-18 h-18 rounded-full border border-accent/[0.06] group-hover:rotate-[-20deg] transition-transform duration-700" />

                <span className="text-xs font-body px-2 py-0.5 bg-accent/10 text-accent border border-accent/20">
                  {PLANETS[0].missing} fields missing
                </span>
                <h3 className="font-display text-3xl italic mt-6 mb-2 group-hover:text-accent transition-colors">{PLANETS[0].name}</h3>
                <p className="text-white/30 text-sm mb-4">{PLANETS[0].distance} · {PLANETS[0].type}</p>
                <p className="text-white/20 text-sm leading-relaxed">The most studied TRAPPIST-1 system planet, yet atmospheric composition remains undetected.</p>
              </Link>

              {/* Remaining planets — compact cards */}
              {PLANETS.slice(1).map((planet) => (
                <Link
                  key={planet.name}
                  to={`/planet/${encodeURIComponent(planet.name)}`}
                  className="group relative p-6 border border-white/[0.06] bg-surface hover:border-accent/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-body px-2 py-0.5 bg-accent/10 text-accent border border-accent/20">
                      {planet.missing} missing
                    </span>
                    <span className="text-xs text-white/20">{planet.temp}</span>
                  </div>
                  <h3 className="font-display text-xl italic mb-1 group-hover:text-accent transition-colors">{planet.name}</h3>
                  <div className="text-xs text-white/25">
                    {planet.distance} · {planet.type}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </Section>

      {/* Stats — reformatted as prose, not metric grid */}
      <Section>
        <section className="py-16 border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-white/30 text-lg leading-relaxed max-w-3xl">
              Of <span className="text-white/60 font-medium">5,800+</span> confirmed exoplanets, only <span className="text-accent">~70</span> have detected atmospheric molecules and <span className="text-accent">~200</span> have measured temperatures. Traditional research is slow, gatekept, and underfunded for filling known unknowns.
            </p>
          </div>
        </section>
      </Section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="font-display text-sm italic text-white/25">astrodex — StarkHacks 2026</span>
          <div className="flex items-center gap-4 text-white/20 text-xs">
            <span>Built on Solana</span>
            <span>·</span>
            <span>Powered by open science</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

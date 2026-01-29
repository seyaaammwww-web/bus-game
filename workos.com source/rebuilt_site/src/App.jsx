
import { useEffect, useState } from 'react'

function App() {
  const features = [
    {
      id: 'coins',
      title: 'Coins',
      description: 'Manage virtual currency and user balances seamlessly.',
      image: '/images/features/coins'
    },
    {
      id: 'datadog',
      title: 'Datadog Integration',
      description: 'Full observability for your enterprise usage.',
      image: '/images/features/datadog'
    },
    {
      id: 'edge',
      title: 'Edge Authentication',
      description: 'Global low-latency authentication at the edge.',
      image: '/images/features/edge'
    },
    {
      id: 'impersonation',
      title: 'User Impersonation',
      description: 'Support customers by seeing exactly what they see.',
      image: '/images/features/impersonation'
    },
    {
      id: 'radix',
      title: 'Radix UI Support',
      description: 'Built with accessibility and customization in mind.',
      image: '/images/features/radix'
    },
    {
      id: 'roles',
      title: 'RBAC Roles',
      description: 'Granular permissions and role-based access control.',
      image: '/images/features/roles'
    },
    {
      id: 'sessions',
      title: 'Advanced Sessions',
      description: 'Secure session management with active revocation.',
      image: '/images/features/sessions'
    }
  ];

  return (
    <div className="app bg-[#2e1065]">
      {/* 3D Hero Zone */}
      <HeroScene />

      {/* ZONE 2: CONTENT (Cream/Beige) */}
      <div className="main-content relative z-10">
        <div className="container">
          {/* Features Tree Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '60px', marginBottom: '100px' }}>
            {/* Row 1 */}
            <div style={{ display: 'flex', gap: '80px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {features.slice(0, 3).map(f => (
                <div key={f.id} className="feature-card minimal" style={{ width: '200px' }}>
                  <div style={{ background: '#e9d5ff', border: '2px solid #4c1d95', borderRadius: '12px', padding: '20px', display: 'inline-block' }}>
                    {/* Using dots as placeholder pattern since we don't have exact sprite sheets for each feature icon in specific states */}
                    <img src="/images/hero/dots.png" style={{ width: '64px', height: '64px', opacity: 0.5, imageRendering: 'pixelated' }} />
                  </div>
                  <h3>{f.title}</h3>
                </div>
              ))}
            </div>
            {/* Row 2 */}
            <div style={{ display: 'flex', gap: '80px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {features.slice(3, 5).map(f => (
                <div key={f.id} className="feature-card minimal" style={{ width: '200px' }}>
                  <div style={{ background: '#e9d5ff', border: '2px solid #4c1d95', borderRadius: '12px', padding: '20px', display: 'inline-block' }}>
                    <img src="/images/hero/dots.png" style={{ width: '64px', height: '64px', opacity: 0.5, imageRendering: 'pixelated' }} />
                  </div>
                  <h3>{f.title}</h3>
                </div>
              ))}
            </div>
            {/* Chest/Rainbow Centerpiece */}
            <div style={{ textAlign: 'center' }}>
              {/* Placeholder for chest if not found, using coins image as fallback */}
              <img src="/images/features/coins/1.png" style={{ width: '120px', imageRendering: 'pixelated' }} />
              <h3 style={{ color: '#4c1d95', marginTop: '10px', fontFamily: 'var(--font-display)' }}>PRIZES</h3>
            </div>
          </div>

          {/* Credits Section */}
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: '#4c1d95', marginBottom: '40px', fontSize: '2rem' }}>CREDITS</h2>

            {/* Honeycomb-ish Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', maxWidth: '800px', margin: '0 auto' }}>
              {['michael-grinich', 'benoit-grelard', 'adam-wolfman', 'paul-asjes', 'vlad-moroz', 'lucas-motta', 'jb-volta', 'matt-dzwonczyk', 'sherry-ali', 'cameron-matheson', 'jonah-oh', 'anna-meyer', 'mark-tran', 'min-kim', 'rakesh-patel'].map((name, i) => (
                <div key={name} style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #4c1d95',
                  background: '#fff',
                  transform: i % 2 === 0 ? 'translateY(10px)' : 'none' /* Slight offset for honeycomb effect */
                }}>
                  <img src={`/images/credits/contributors/${name}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '40px' }}>
              <a href="#" className="btn" style={{ background: '#4c1d95', color: '#fff', border: '2px solid #4c1d95' }}>View All</a>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 3: FOOTER (Sky/Ground) */}
      <div className="footer-section relative z-10">
        {/* Plane Banner */}
        <div className="plane-banner" style={{ top: '100px' }}>
          <img src="/images/footer/plane/1.png" width="80" style={{ transform: 'scaleX(-1)', imageRendering: 'pixelated' }} />
          <div style={{ background: '#fff', padding: '4px 12px', border: '2px solid #000', fontFamily: 'var(--font-display)', fontSize: '10px' }}>
            WORKOS
          </div>
        </div>

        {/* Clouds scattered in Footer Sky */}
        <img src="/images/hero/clouds/1.png" style={{ position: 'absolute', top: '150px', left: '20%', width: '60px', opacity: 0.8 }} />
        <img src="/images/hero/clouds/2.png" style={{ position: 'absolute', top: '250px', right: '20%', width: '90px', opacity: 0.8 }} />

        {/* Ground Layer */}
        <div className="ground-layer">
          {/* Trees on top of grass border (negative margin to pull them up) */}
          <div style={{ position: 'absolute', top: '-60px', width: '100%', display: 'flex', justifyContent: 'space-around' }}>
            <img src="/images/footer/trees.png" style={{ width: '100px', imageRendering: 'pixelated' }} />
            <img src="/images/footer/trees.png" style={{ width: '80px', imageRendering: 'pixelated', transform: 'scaleX(-1)' }} />
            <img src="/images/footer/trees.png" style={{ width: '120px', imageRendering: 'pixelated' }} />
          </div>

          {/* Buried Gems */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '100px', marginTop: '50px', opacity: 0.8 }}>
            <img src="/images/footer/gems.png" width="40" style={{ imageRendering: 'pixelated' }} />
            <img src="/images/footer/gems.png" width="60" style={{ imageRendering: 'pixelated', filter: 'hue-rotate(90deg)' }} />
            <img src="/images/footer/gems.png" width="40" style={{ imageRendering: 'pixelated', filter: 'hue-rotate(180deg)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

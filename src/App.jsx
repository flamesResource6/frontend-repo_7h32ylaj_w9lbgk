import { useEffect, useMemo, useState } from 'react'
import Spline from '@splinetool/react-spline'

function useBackend() {
  const baseUrl = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])
  const [token, setToken] = useState(() => localStorage.getItem('tana_token') || '')
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
  const saveToken = (t) => { localStorage.setItem('tana_token', t); setToken(t) }
  const clearToken = () => { localStorage.removeItem('tana_token'); setToken('') }
  return { baseUrl, token, authHeaders, saveToken, clearToken }
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function PillBadge({ label, active }) {
  const colors = active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>{label}</span>
}

export default function App() {
  const { baseUrl, authHeaders, token, saveToken, clearToken } = useBackend()
  const [mode, setMode] = useState('home') // home | auth | app
  const [authTab, setAuthTab] = useState('login') // login | signup
  const [status, setStatus] = useState('')

  // user state
  const [me, setMe] = useState(null)
  const [dash, setDash] = useState(null)
  const [sessions, setSessions] = useState([])
  const [reflections, setReflections] = useState([])

  // forms
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', age: '', purpose: 'Healing' })
  const [profileForm, setProfileForm] = useState({ name: '', age: '', purpose: 'Healing' })
  const [sessionForm, setSessionForm] = useState({ topic: 'Mind — Clarity', date: '', time: '' })
  const [reflectionForm, setReflectionForm] = useState({ pillar: 'Mind', entry_text: '', mood: '' })

  // Auto-enter app if token exists
  useEffect(() => {
    if (token) {
      setMode('app')
      refreshAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const refreshAll = async () => {
    try {
      const m = await apiGet('/me')
      setMe(m)
      setProfileForm({ name: m.name || '', age: m.age || '', purpose: m.purpose || 'Healing' })
      const d = await apiGet('/dashboard')
      setDash(d)
      const s = await apiGet('/sessions')
      setSessions(s.items || [])
      const r = await apiGet('/reflections')
      setReflections(r.items || [])
    } catch (e) {
      setStatus(`Auth expired. Please login again.`)
      clearToken()
      setMode('auth')
    }
  }

  // API helpers
  const apiGet = async (path) => {
    const res = await fetch(`${baseUrl}${path}`, { headers: { 'Content-Type': 'application/json', ...authHeaders } })
    if (!res.ok) throw new Error('request failed')
    return res.json()
  }
  const apiPost = async (path, body, useAuth = true) => {
    const headers = { 'Content-Type': 'application/json', ...(useAuth ? authHeaders : {}) }
    const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  // Handlers
  const handleSignup = async (e) => {
    e.preventDefault()
    setStatus('Creating your account...')
    try {
      const payload = {
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        age: signupForm.age ? Number(signupForm.age) : undefined,
        purpose: signupForm.purpose,
      }
      const data = await apiPost('/auth/signup', payload, false)
      saveToken(data.token)
      setStatus('Welcome to TANA ✨')
      setMode('app')
      await refreshAll()
    } catch (err) {
      setStatus('Signup failed. Email may already be registered.')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setStatus('Signing in...')
    try {
      const data = await apiPost('/auth/login', loginForm, false)
      saveToken(data.token)
      setStatus('Welcome back ✨')
      setMode('app')
      await refreshAll()
    } catch (err) {
      setStatus('Login failed. Check your credentials.')
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setStatus('Saving profile...')
    try {
      const payload = {
        name: profileForm.name,
        purpose: profileForm.purpose,
        age: profileForm.age ? Number(profileForm.age) : undefined,
      }
      await apiPost('/profile', payload)
      await refreshAll()
      setStatus('Profile updated ✅')
    } catch (e) {
      setStatus('Could not save profile')
    }
  }

  const handleCreateSession = async (e) => {
    e.preventDefault()
    setStatus('Requesting session...')
    try {
      const body = {
        user_id: me.id,
        topic: sessionForm.topic,
        date: sessionForm.date,
        time: sessionForm.time,
        status: 'requested',
      }
      const resp = await apiPost('/sessions', body)
      if (resp.limited) {
        setStatus('You reached your current session limit. Consider unlocking more.')
      } else {
        setStatus('Session requested. We will email the host.')
      }
      await refreshAll()
    } catch (e) {
      setStatus('Could not request session')
    }
  }

  const handleAddReflection = async (e) => {
    e.preventDefault()
    setStatus('Saving reflection...')
    try {
      const body = { user_id: me.id, ...reflectionForm }
      await apiPost('/reflections', body)
      setReflectionForm({ pillar: 'Mind', entry_text: '', mood: '' })
      await refreshAll()
      setStatus('Reflection saved ✍️')
    } catch (e) {
      setStatus('Could not save reflection')
    }
  }

  const showPaywall = dash && dash.sessions && dash.sessions.used >= dash.sessions.total

  // UI blocks
  const Hero = (
    <div className="relative min-h-[70vh] w-full overflow-hidden bg-gradient-to-b from-indigo-50 to-white">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/4cHQr84zOGAHOehh/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
          LifeOS × TANA
        </h1>
        <p className="mt-4 max-w-2xl text-lg md:text-xl text-slate-700">
          A mindful digital ecosystem to heal, reflect and grow across Mind, Money and Meaning.
        </p>
        <div className="mt-8 flex gap-4">
          <button onClick={() => setMode('auth')} className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold shadow hover:bg-indigo-700 transition-colors">
            Get Started
          </button>
          <a href="/test" className="rounded-lg bg-white/70 backdrop-blur px-6 py-3 text-slate-700 font-semibold shadow border border-slate-200 hover:bg-white transition-colors">
            Check Backend
          </a>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/70 to-transparent" />
    </div>
  )

  const Auth = (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-800">Enter your Sanctuary</h2>
          <p className="text-slate-600">Create an account or sign in to continue.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex gap-2 mb-4">
              <button className={`px-3 py-1 rounded ${authTab==='login'?'bg-indigo-600 text-white':'bg-slate-100 text-slate-700'}`} onClick={()=>setAuthTab('login')}>Login</button>
              <button className={`px-3 py-1 rounded ${authTab==='signup'?'bg-indigo-600 text-white':'bg-slate-100 text-slate-700'}`} onClick={()=>setAuthTab('signup')}>Signup</button>
            </div>
            {authTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Email">
                  <input value={loginForm.email} onChange={(e)=>setLoginForm({...loginForm,email:e.target.value})} type="email" required className="w-full rounded border p-2" />
                </Field>
                <Field label="Password">
                  <input value={loginForm.password} onChange={(e)=>setLoginForm({...loginForm,password:e.target.value})} type="password" required className="w-full rounded border p-2" />
                </Field>
                <button className="w-full rounded bg-indigo-600 text-white py-2 font-semibold">Sign In</button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <Field label="Name">
                  <input value={signupForm.name} onChange={(e)=>setSignupForm({...signupForm,name:e.target.value})} required className="w-full rounded border p-2" />
                </Field>
                <Field label="Email">
                  <input value={signupForm.email} onChange={(e)=>setSignupForm({...signupForm,email:e.target.value})} type="email" required className="w-full rounded border p-2" />
                </Field>
                <Field label="Password">
                  <input value={signupForm.password} onChange={(e)=>setSignupForm({...signupForm,password:e.target.value})} type="password" required className="w-full rounded border p-2" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age">
                    <input value={signupForm.age} onChange={(e)=>setSignupForm({...signupForm,age:e.target.value})} type="number" min="0" className="w-full rounded border p-2" />
                  </Field>
                  <Field label="Purpose">
                    <select value={signupForm.purpose} onChange={(e)=>setSignupForm({...signupForm,purpose:e.target.value})} className="w-full rounded border p-2">
                      <option>Healing</option>
                      <option>Growth</option>
                      <option>Direction</option>
                    </select>
                  </Field>
                </div>
                <button className="w-full rounded bg-indigo-600 text-white py-2 font-semibold">Create Account</button>
              </form>
            )}
            {status && <p className="mt-3 text-sm text-slate-700">{status}</p>}
            <button onClick={()=>setMode('home')} className="mt-4 text-slate-600 hover:underline">Back</button>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-slate-800 mb-2">The TANA Model</h3>
            <p className="text-slate-600 mb-4">Mind, Money, Meaning — three pillars of a balanced life. Start at 0 each and grow through sessions and reflections.</p>
            <div className="flex gap-2">
              <PillBadge label="Mind" />
              <PillBadge label="Money" />
              <PillBadge label="Meaning" />
            </div>
            <div className="mt-6 rounded-lg border p-4 bg-gradient-to-br from-indigo-50 to-pink-50">
              <p className="text-sm text-slate-700">Secure sign-in uses a token stored on your device. No 3rd-party provider required for this MVP.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const Dashboard = dash && (
    <div className="rounded-xl border bg-white p-6 shadow">
      <h3 className="text-lg font-semibold text-slate-800">Welcome {dash.name}</h3>
      <p className="text-slate-600">Your current balance within TANA:</p>
      <div className="mt-3 flex items-center gap-3">
        <PillBadge label={`Mind ${dash.tana.percentages.mind}%`} active />
        <PillBadge label={`Money ${dash.tana.percentages.money}%`} active />
        <PillBadge label={`Meaning ${dash.tana.percentages.meaning}%`} active />
      </div>
      <div className="mt-4 h-2 w-full bg-slate-100 rounded overflow-hidden">
        <div className="h-2 bg-indigo-500" style={{ width: `${dash.tana.percentages.mind}%` }} />
        <div className="h-2 bg-emerald-500 -mt-2" style={{ width: `${dash.tana.percentages.money}%` }} />
        <div className="h-2 bg-pink-500 -mt-2" style={{ width: `${dash.tana.percentages.meaning}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-600">Sessions used {dash.sessions.used} / {dash.sessions.total}</p>
      {showPaywall && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium">You’ve completed your free sessions 🌙</p>
          <p className="text-sm mt-1">Continue your journey within TANA:</p>
          <ul className="mt-2 text-sm space-y-1">
            <li>₹499 — Let me try (adds +3 sessions)</li>
            <li>₹999 — I’m serious (+7 sessions + AI journal insights)</li>
            <li>₹1999 — I’m addicted (Unlimited + mentorship + vault)</li>
          </ul>
          <p className="text-sm mt-2">Pay to UPI ID: <span className="font-semibold">jagathis@upi</span></p>
          <button className="mt-3 rounded bg-indigo-600 text-white px-4 py-2">I’ve Paid</button>
        </div>
      )}
    </div>
  )

  const AppShell = (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-10 px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">LifeOS × TANA</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">{me?.email}</span>
            <button onClick={()=>{clearToken(); setMode('auth')}} className="rounded bg-slate-200 px-3 py-1 text-sm">Logout</button>
          </div>
        </div>

        {Dashboard}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Profile</h3>
            <form onSubmit={handleProfileSave} className="space-y-3">
              <Field label="Name"><input className="w-full rounded border p-2" value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age"><input type="number" className="w-full rounded border p-2" value={profileForm.age} onChange={e=>setProfileForm({...profileForm,age:e.target.value})} /></Field>
                <Field label="Purpose">
                  <select className="w-full rounded border p-2" value={profileForm.purpose} onChange={e=>setProfileForm({...profileForm,purpose:e.target.value})}>
                    <option>Healing</option>
                    <option>Growth</option>
                    <option>Direction</option>
                  </select>
                </Field>
              </div>
              <button className="rounded bg-indigo-600 text-white px-4 py-2">Save</button>
            </form>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Book a Sanctuary Session</h3>
            <form onSubmit={handleCreateSession} className="space-y-3">
              <Field label="Pillar & Topic">
                <select className="w-full rounded border p-2" value={sessionForm.topic} onChange={e=>setSessionForm({...sessionForm,topic:e.target.value})}>
                  <option>Mind — Clarity</option>
                  <option>Money — Discipline</option>
                  <option>Meaning — Alignment</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><input required type="date" className="w-full rounded border p-2" value={sessionForm.date} onChange={e=>setSessionForm({...sessionForm,date:e.target.value})} /></Field>
                <Field label="Time"><input required type="time" className="w-full rounded border p-2" value={sessionForm.time} onChange={e=>setSessionForm({...sessionForm,time:e.target.value})} /></Field>
              </div>
              <button disabled={showPaywall} className={`rounded px-4 py-2 text-white ${showPaywall? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600'}`}>Request Session</button>
            </form>
            <p className="mt-3 text-sm text-slate-600">We’ll email the host with your request. You’ll receive a Spatial link near the session time.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Sessions</h3>
            <ul className="space-y-2">
              {sessions.map(s => (
                <li key={s.id} className="rounded border p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.topic}</p>
                    <p className="text-sm text-slate-600">{s.date} • {s.time} • {s.status}</p>
                  </div>
                  <a className="text-indigo-600 text-sm" href={s.spatial_url || '#'} target="_blank" rel="noreferrer">{s.spatial_url? 'Join' : 'Pending link'}</a>
                </li>
              ))}
              {sessions.length === 0 && <p className="text-sm text-slate-600">No sessions yet.</p>}
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Reflection Journal</h3>
            <form onSubmit={handleAddReflection} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Pillar">
                  <select className="w-full rounded border p-2" value={reflectionForm.pillar} onChange={e=>setReflectionForm({...reflectionForm,pillar:e.target.value})}>
                    <option>Mind</option>
                    <option>Money</option>
                    <option>Meaning</option>
                  </select>
                </Field>
                <Field label="Mood">
                  <input className="w-full rounded border p-2" value={reflectionForm.mood} onChange={e=>setReflectionForm({...reflectionForm,mood:e.target.value})} placeholder="calm, grateful..." />
                </Field>
                <div className="hidden md:block" />
              </div>
              <Field label="What did you feel after this Sanctuary?">
                <textarea required className="w-full rounded border p-2" rows={4} value={reflectionForm.entry_text} onChange={e=>setReflectionForm({...reflectionForm,entry_text:e.target.value})} />
              </Field>
              <button className="rounded bg-indigo-600 text-white px-4 py-2">Save Reflection</button>
            </form>
            <ul className="mt-4 space-y-2 max-h-64 overflow-auto">
              {reflections.map(r => (
                <li key={r.id} className="rounded border p-3">
                  <p className="text-xs text-slate-500">{r.pillar} • {r.mood || '—'} • {new Date(r.created_at).toLocaleString?.() || ''}</p>
                  <p className="mt-1 text-slate-700 text-sm">{r.entry_text}</p>
                </li>
              ))}
              {reflections.length === 0 && <p className="text-sm text-slate-600">No reflections yet.</p>}
            </ul>
          </div>
        </div>

        {status && <div className="text-center text-sm text-slate-700">{status}</div>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {mode === 'home' && Hero}
      {mode === 'auth' && Auth}
      {mode === 'app' && AppShell}
    </div>
  )
}

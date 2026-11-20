import { useState, type FormEvent } from 'react'
import { api, getMessage, type User } from '../api'

interface Props {
  onAuthenticated: (user: User) => void
}

export function AuthPanel({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const { user } = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password)
      onAuthenticated(user)
    } catch (err) {
      setError(getMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <section style={{ maxWidth: 420, margin: '48px auto', textAlign: 'left' }}>
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('login')} disabled={mode === 'login'}>Log in</button>
        <button onClick={() => setMode('register')} disabled={mode === 'register'}>Register</button>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={pending}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password (8+ characters)"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          required
          disabled={pending}
        />
        <button type="submit" disabled={pending}>
          {pending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>
      {error && <p role="alert" style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}
      <p style={{ marginTop: 16, fontSize: 14 }}>
        The backend requires an account before tasks and notes can be saved.
      </p>
    </section>
  )
}

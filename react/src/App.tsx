import { useEffect, useState } from 'react'
import { TaskManager } from './components/TaskManager'
import { NoteManager } from './components/NoteManager'
import { AuthPanel } from './components/AuthPanel'
import { api, type User } from './api'
import './App.css'

export default function App() {
  // undefined = checking session, null = not logged in
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks')

  useEffect(() => {
    let cancelled = false
    api.me()
      .then(({ user }) => { if (!cancelled) setUser(user) })
      .catch(() => { if (!cancelled) setUser(null) })
    return () => { cancelled = true }
  }, [])

  if (user === undefined) return <main style={{ padding: 24 }}>Checking session…</main>

  if (user === null) return <AuthPanel onAuthenticated={setUser} />

  const logout = async () => {
    try { await api.logout() } catch { /* already logged out */ }
    setUser(null)
  }

  return (
    <main style={{ padding: '24px 16px', textAlign: 'left' }}>
      <nav style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('tasks')} disabled={activeTab === 'tasks'}>Tasks</button>
        <button onClick={() => setActiveTab('notes')} disabled={activeTab === 'notes'}>Notes</button>
        <span style={{ marginLeft: 'auto', fontSize: 14 }}>{user.email}</span>
        <button onClick={logout}>Log out</button>
      </nav>

      {activeTab === 'tasks' ? <TaskManager /> : <NoteManager />}
    </main>
  )
}

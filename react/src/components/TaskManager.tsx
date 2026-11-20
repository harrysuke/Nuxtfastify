import { useEffect, useState, useActionState } from 'react'
import { api, getMessage, type Task } from '../api'

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.listTasks()
      .then((data) => {
        if (cancelled) return
        setTasks(Array.isArray(data) ? data : [])
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(getMessage(err))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const refresh = async () => {
    const data = await api.listTasks()
    setTasks(Array.isArray(data) ? data : [])
  }

  const [formError, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData): Promise<string | null> => {
      const title = String(formData.get('title') ?? '').trim()
      if (!title) return 'Title is required'
      try {
        await api.createTask(title)
        await refresh()
        setError(null)
        return null
      } catch (err) {
        return getMessage(err)
      }
    },
    null,
  )

  const toggleTask = async (task: Task) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed })
      await refresh()
      setError(null)
    } catch (err) {
      setError(getMessage(err))
    }
  }

  const deleteTask = async (id: number) => {
    try {
      await api.deleteTask(id)
      await refresh()
      setError(null)
    } catch (err) {
      setError(getMessage(err))
    }
  }

  return (
    <section>
      <h2>Tasks</h2>
      <form action={submitAction} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input name="title" placeholder="New task..." disabled={isPending} style={{ flex: 1 }} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add'}
        </button>
      </form>

      {formError && <p role="alert" style={{ color: '#b91c1c' }}>{formError}</p>}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p>Loading tasks…</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {tasks.map((task) => (
          <li key={task.id} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
            <span
              onClick={() => toggleTask(task)}
              style={{ cursor: 'pointer', flex: 1, textDecoration: task.completed ? 'line-through' : 'none' }}
            >
              {task.title}
            </span>
            <button onClick={() => deleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {!loading && tasks.length === 0 && !error && <p>No tasks yet. Add one above.</p>}
    </section>
  )
}

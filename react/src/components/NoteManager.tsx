import { useEffect, useState, useActionState } from 'react'
import { api, getMessage, type Note } from '../api'

export function NoteManager() {
  const [notes, setNotes] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.listNotes()
      .then((data) => {
        if (cancelled) return
        setNotes(Array.isArray(data) ? data : [])
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
    const data = await api.listNotes()
    setNotes(Array.isArray(data) ? data : [])
  }

  const [formError, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData): Promise<string | null> => {
      const content = String(formData.get('content') ?? '').trim()
      if (!content) return 'Note cannot be empty'
      try {
        await api.createNote(content)
        await refresh()
        setError(null)
        return null
      } catch (err) {
        return getMessage(err)
      }
    },
    null,
  )

  const togglePin = async (note: Note) => {
    try {
      await api.updateNote(note.id, { pinned: !note.pinned })
      await refresh()
      setError(null)
    } catch (err) {
      setError(getMessage(err))
    }
  }

  const deleteNote = async (id: number) => {
    try {
      await api.deleteNote(id)
      await refresh()
      setError(null)
    } catch (err) {
      setError(getMessage(err))
    }
  }

  return (
    <section>
      <h2>Notes</h2>
      <form action={submitAction} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input name="content" placeholder="Write a note..." disabled={isPending} style={{ flex: 1 }} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </form>

      {formError && <p role="alert" style={{ color: '#b91c1c' }}>{formError}</p>}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p>Loading notes…</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {notes.map((note) => (
          <li key={note.id} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
            <span style={{ flex: 1 }}>
              {note.pinned && <strong>[Pinned] </strong>}
              {note.content}
            </span>
            <button onClick={() => togglePin(note)}>{note.pinned ? 'Unpin' : 'Pin'}</button>
            <button onClick={() => deleteNote(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {!loading && notes.length === 0 && !error && <p>No notes yet. Write one above.</p>}
    </section>
  )
}

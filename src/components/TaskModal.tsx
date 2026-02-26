'use client'

import { useState, useEffect } from 'react'
import { Task, Board } from '@/lib/types'
import { Check, X, Archive, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'

type TaskModalProps = {
  task: Task | null
  boardId: string
  boards: Board[]
  onClose: () => void
  onReload: () => void
}

export default function TaskModal({ task, boardId, boards, onClose, onReload }: TaskModalProps) {
  const isEditing = !!task

  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeMemberId || '')
  const [selectedBoardId, setSelectedBoardId] = useState(task?.boardId || boardId)

  const [isCompleted, setIsCompleted] = useState(task?.isCompleted || false)

  const [isSaving, setIsSaving] = useState(false)

  // In MVP we hardcode the members or let them type. For assignee dropdown, we know from instructions: 未来 / ゆうくん
  // but let's hardcode the workspace members we seeded if we can, or just send display name? API expects member ID.
  // Wait, the API requires actual Member IDs. Let's fetch members!
  const [members, setMembers] = useState<{ id: string, displayName: string }[]>([])

  useEffect(() => {
    // Quick and dirty way to get members from the backend for MVP: we can fetch tasks and look at assignees,
    // or just fetch workspace members if we had an endpoint. Since we don't, I will just call a tiny raw fetch or
    // assume the seeded display names can be mapped.
    // Actually, we need the true member IDs. Let's provide an endpoint for members or just fetch all tasks and extract unique.
    const fetchMembers = async () => {
      try {
        // Fallback or ideally we should have /api/members
        // I will just let the user save assignee by ID or name and handle mapping... wait, schema says `assigneeMemberId` refers to Member `id`.
        // Let's create an /api/members route later. For now, we will just rely on the API.
        const res = await fetch('/api/members')
        if (res.ok) {
          const data = await res.json()
          setMembers(data)
        }
      } catch (e) { }
    }
    fetchMembers()
  }, [])

  const handleSave = async () => {
    if (!title.trim()) return
    setIsSaving(true)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeMemberId: assigneeId || undefined,
        boardId: selectedBoardId,
        isCompleted
      }

      const url = isEditing ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        onReload()
        onClose()
      } else {
        alert('Failed to save task')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAction = async (action: 'archive' | 'unarchive' | 'delete' | 'restore') => {
    if (!task) return
    setIsSaving(true)
    try {
      await fetch(`/api/tasks/${task.id}/${action}`, { method: 'POST' })
      onReload()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(9, 30, 66, 0.54)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)',
        width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px', border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Title *</label>
            <input
              className="input"
              style={{ width: '100%', fontSize: '16px' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details..."
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Board</label>
              <select className="input" style={{ width: '100%' }} value={selectedBoardId} onChange={e => setSelectedBoardId(e.target.value)}>
                {boards.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Assignee</label>
              <select className="input" style={{ width: '100%' }} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">未割当 (Unassigned)</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div style={{
              marginTop: '8px', padding: '12px', backgroundColor: 'var(--surface-hover)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  checked={isCompleted}
                  onChange={e => setIsCompleted(e.target.checked)}
                />
                Mark as Completed
              </label>
              {task.completedAt && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Completed at: {new Date(task.completedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--surface-hover)',
          borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditing && !task.archivedAt && (
              <button
                className="btn btn-secondary"
                onClick={() => handleAction('archive')}
                disabled={isSaving}
                title="Archive"
              ><Archive size={16} /></button>
            )}
            {isEditing && task.archivedAt && (
              <button
                className="btn btn-secondary"
                onClick={() => handleAction('unarchive')}
                disabled={isSaving}
                title="Unarchive"
              ><RotateCcw size={16} /></button>
            )}
            {isEditing && !task.deletedAt && (
              <button
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', borderColor: '#ffd5cc', backgroundColor: '#ffebe6' }}
                onClick={() => { if (confirm('Move to trash?')) handleAction('delete') }}
                disabled={isSaving}
                title="Delete"
              ><Trash2 size={16} /></button>
            )}
            {isEditing && task.deletedAt && (
              <button
                className="btn btn-secondary"
                onClick={() => handleAction('restore')}
                disabled={isSaving}
                title="Restore from Trash"
              ><RotateCcw size={16} /></button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

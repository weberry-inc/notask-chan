'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '@/lib/types'
import { CheckCircle2, User } from 'lucide-react'

type TaskCardProps = {
  task: Task
  onClick: (task: Task) => void
  onToggleComplete: (task: Task, newStatus: boolean) => void
}

const TaskCard = memo(function TaskCard({ task, onClick, onToggleComplete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task
    }
  })

  // Use Translate instead of Transform to avoid scaling bugs during drag
  // Also explicitly disable the transition while actively dragging to prevent rubber-banding
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 1,
  }

  // Premium hover & visual logic
  const isCompletedStyle = task.isCompleted ? { opacity: 0.6 } : {}
  const hasNotes = !!task.description

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...isCompletedStyle }}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'grab',
          border: '1px solid transparent',
          position: 'relative',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          marginBottom: '8px'
        }}
        onClick={(e) => {
          // If they click, prevent drag event if possible, but dnd-kit handles this nicely.
          onClick(task)
        }}
        onPointerDown={(e) => {
          // We can't stop propagation if we want dnd-kit to work,
          // but we can distinguish clicks vs drags.
          // By default dnd-kit will fire onClick if it wasn't dragged.
        }}
      >
        <style jsx>{`
          .task-card > div:hover {
            box-shadow: var(--shadow-md);
            border-color: var(--border-focus);
          }
          .dragging > div {
            box-shadow: var(--shadow-lg);
            cursor: grabbing !important;
            transform: scale(1.02);
          }
        `}</style>

        {task.deletedAt && (
          <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Deleted</div>
        )}
        {task.archivedAt && !task.deletedAt && (
          <div style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Archived</div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 500,
            wordBreak: 'break-word',
            textDecoration: task.isCompleted ? 'line-through' : 'none',
            color: task.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)'
          }}>
            {task.title}
          </h4>
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent opening modal
              onToggleComplete(task, !task.isCompleted)
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2px', borderRadius: '50%', transition: 'all 0.2s',
              color: task.isCompleted ? 'var(--success)' : '#c8b8dc' // Light pastel purple for uncompleted checkmark
            }}
            title={task.isCompleted ? "Mark as uncompleted" : "Mark as completed"}
          >
            <CheckCircle2 size={18} />
          </button>
        </div>

        {(hasNotes || task.assignee) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
              {hasNotes && (
                <div style={{ width: '16px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '6px' }} title="Has notes" />
              )}
            </div>
            {task.assignee && (
              <div
                title={task.assignee.displayName}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 600
                }}
              >
                {task.assignee.displayName.substring(0, 1)}
              </div>
            )}
            {!task.assignee && (
              <div
                title="Unassigned"
                style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: 'var(--surface-active)', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <User size={12} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default TaskCard

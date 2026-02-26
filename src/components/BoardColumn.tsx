'use client'

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Board, Task } from '@/lib/types'
import TaskCard from './TaskCard'
import { Plus, Trash2, GripHorizontal } from 'lucide-react'

type BoardColumnProps = {
  board: Board
  tasks: Task[]
  onAddTask: (boardId: string) => void
  onEditTask: (task: Task) => void
  onToggleComplete: (task: Task, newStatus: boolean) => void
  onDeleteBoard?: (boardId: string) => void
}

export default function BoardColumn({ board, tasks, onAddTask, onEditTask, onToggleComplete, onDeleteBoard }: BoardColumnProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: board.id,
    data: {
      type: 'Column',
      board,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
    height: '100%',
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: '300px',
        minWidth: '300px',
        backgroundColor: 'var(--board-bg)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Board Header */}
      <div style={{ padding: '16px 16px 12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            {...attributes}
            {...listeners}
            style={{
              background: 'none', border: 'none', cursor: 'grab',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center'
            }}
          >
            <GripHorizontal size={16} />
          </button>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-hover)' }}>{board.title}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
            {tasks.length}
          </span>
        </div>
        {onDeleteBoard && (
          <button
            onClick={() => {
              if (confirm(`ボード「${board.title}」を削除してもよろしいですか？（中のタスクも削除されます）`)) {
                onDeleteBoard(board.id)
              }
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="ボードを削除"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Droppable Area for Tasks */}
      <div
        style={{
          flex: 1,
          padding: '0 12px 12px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100px',
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => onEditTask(task)} onToggleComplete={onToggleComplete} />
          ))}
        </SortableContext>

        {/* Add Task Button inside the droppable area but at bottom */}
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)', marginTop: '4px' }}
          onClick={() => onAddTask(board.id)}
        >
          <Plus size={16} /> ＋ タスク追加
        </button>
      </div>
    </div>
  )
}

'use client'

import { memo, useMemo, useState, useRef, useEffect } from 'react'
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
  onEditBoard?: (boardId: string, newTitle: string) => void
}

const BoardColumn = memo(function BoardColumn({ board, tasks, onAddTask, onEditTask, onToggleComplete, onDeleteBoard, onEditBoard }: BoardColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(board.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditingTitle])

  const handleTitleSubmit = () => {
    if (editTitleValue.trim() && editTitleValue !== board.title) {
      onEditBoard?.(board.id, editTitleValue.trim())
    } else {
      setEditTitleValue(board.title)
    }
    setIsEditingTitle(false)
  }

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
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-hover)', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 4px', width: '100%', outline: 'none' }}
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit()
                if (e.key === 'Escape') {
                  setEditTitleValue(board.title)
                  setIsEditingTitle(false)
                }
              }}
            />
          ) : (
            <h3
              style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-hover)', cursor: 'pointer', flex: 1, margin: 0 }}
              onClick={() => setIsEditingTitle(true)}
              title="クリックして名前を変更"
            >
              {board.title}
            </h3>
          )}
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
            <TaskCard key={task.id} task={task} onClick={onEditTask} onToggleComplete={onToggleComplete} />
          ))}
        </SortableContext>

        {/* Add Task Button inside the droppable area but at bottom */}
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)', marginTop: '4px' }}
          onClick={() => onAddTask(board.id)}
        >
          <Plus size={16} /> タスク追加
        </button>
      </div>
    </div>
  )
})

export default BoardColumn

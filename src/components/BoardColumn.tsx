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
  onEditBoard?: (boardId: string, newTitle: string, newColor?: string | null) => void
}

const BoardColumn = memo(function BoardColumn({ board, tasks, onAddTask, onEditTask, onToggleComplete, onDeleteBoard, onEditBoard }: BoardColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(board.title)
  const [editColorValue, setEditColorValue] = useState(board.color || '')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditingTitle])

  const handleTitleSubmit = () => {
    if (editTitleValue.trim() && (editTitleValue !== board.title || editColorValue !== (board.color || ''))) {
      onEditBoard?.(board.id, editTitleValue.trim(), editColorValue || null)
    } else {
      setEditTitleValue(board.title)
      setEditColorValue(board.color || '')
    }
    setIsEditingTitle(false)
  }

  const COLORS = [
    { value: '', label: 'None', code: 'transparent' },
    { value: 'blue', label: 'Blue', code: '#60a5fa' },
    { value: 'pink', label: 'Pink', code: '#f472b6' },
    { value: 'green', label: 'Green', code: '#34d399' }
  ]

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
        backgroundColor: board.color ? `${COLORS.find(c => c.value === board.color)?.code}15` : 'var(--board-bg)',
        borderRadius: 'var(--radius-lg)',
        borderTop: board.color ? `4px solid ${COLORS.find(c => c.value === board.color)?.code || board.color}` : '4px solid transparent',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Board Header - Entire area is draggable unless editing */}
      <div
        style={{ padding: '16px 16px 12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isEditingTitle ? 'default' : 'grab' }}
        {...(!isEditingTitle ? attributes : {})}
        {...(!isEditingTitle ? listeners : {})}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {!isEditingTitle && (
            <GripHorizontal size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          )}
          {isEditingTitle ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <input
                ref={titleInputRef}
                style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-hover)', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 4px', width: '100%', outline: 'none' }}
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit()
                  if (e.key === 'Escape') {
                    setEditTitleValue(board.title)
                    setEditColorValue(board.color || '')
                    setIsEditingTitle(false)
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {COLORS.map(c => (
                  <div
                    key={c.value}
                    onClick={() => setEditColorValue(c.value)}
                    style={{
                      width: '16px', height: '16px', borderRadius: '50%', backgroundColor: c.code,
                      border: editColorValue === c.value ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              <button
                onClick={handleTitleSubmit}
                style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '2px 6px', marginTop: '4px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >保存</button>
            </div>
          ) : (
            <h3
              style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', flex: 1, margin: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              title="クリックして名前・色を変更"
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
          minHeight: '150px', // Increased slightly for better empty drop target
        }}
      >
        <SortableContext id={board.id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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

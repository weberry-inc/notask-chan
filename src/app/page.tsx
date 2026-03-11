'use client'

import { useState, useEffect, useCallback } from 'react'
import { Board, Task, Member } from '@/lib/types'
import Header from '@/components/Header'
import BoardList from '@/components/BoardList'
import TaskModal from '@/components/TaskModal'

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])

  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState('all') // all | unassigned | memberId
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultBoardId, setDefaultBoardId] = useState<string>('')

  // Fetch data
  const fetchData = async () => {
    try {
      // Build query string for tasks
      const params = new URLSearchParams()
      if (assigneeFilter !== 'all') params.append('assignee', assigneeFilter)
      if (searchQuery) params.append('q', searchQuery)
      if (showArchived) params.append('showArchived', 'true')
      if (showDeleted) params.append('showDeleted', 'true')

      const [boardsRes, tasksRes, membersRes] = await Promise.all([
        fetch('/api/boards'),
        fetch(`/api/tasks?${params.toString()}`),
        fetch('/api/members')
      ])

      const b = await boardsRes.json()
      const t = await tasksRes.json()
      const m = await membersRes.json()

      setBoards(b)
      setTasks(t)
      if (Array.isArray(m)) setMembers(m)

      if (!members.length && t.length > 0) {
        // Just extract members from the first few tasks for MVP, or we would have a /api/members route
        // To be safe, we might just hardcode the two members or let the server return them.
        // For now, let's assume we fetch them or just pull unique assignees out.
        // Actually, let's fetch members if possible. We didn't create /members API.
        // We know the members are '未来' and 'ゆうくん'. We can extract from passed tasks or just leave them dynamically empty for a moment.
        // Let's create an API endpoint in the task.
      }
    } catch (e) {
      console.error(e)
    } finally {
      // If we are currently fetching in the background, don't show the loading screen
      if (isLoading) setIsLoading(false)
    }
  }

  // Refetch when filters change or when polling
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [assigneeFilter, searchQuery, showArchived, showDeleted])



  // Open modal for new task
  const openNewTaskModal = useCallback((boardId: string) => {
    setEditingTask(null)
    setDefaultBoardId(boardId)
    setIsModalOpen(true)
  }, [])

  // Open modal for editing
  const openEditTaskModal = useCallback((task: Task) => {
    setEditingTask(task)
    setDefaultBoardId(task.boardId)
    setIsModalOpen(true)
  }, [])

  // Quick toggle completion status
  const handleToggleComplete = useCallback(async (task: Task, newStatus: boolean) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: newStatus } : t))

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newStatus })
      })
    } catch (e) {
      console.error('Failed to toggle completion status', e)
      fetchData() // Revert to server state if failed
    }
  }, [])

  // Reload action
  const handleReload = useCallback(() => {
    fetchData()
  }, [assigneeFilter, searchQuery, showArchived, showDeleted])

  // Create new board
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return
    setIsCreatingBoard(true)
    try {
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBoardTitle.trim() })
      })
      setNewBoardTitle('')
      fetchData()
    } catch (e) {
      console.error('Failed to create board', e)
    } finally {
      setIsCreatingBoard(false)
    }
  }

  // Delete board
  const handleDeleteBoard = useCallback(async (boardId: string) => {
    try {
      await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      })
      fetchData()
    } catch (e) {
      console.error('Failed to delete board', e)
    }
  }, [assigneeFilter, searchQuery, showArchived, showDeleted])

  // Edit board
  const handleEditBoard = useCallback(async (boardId: string, newTitle: string, newColor?: string | null) => {
    // Optimistic UI update
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, title: newTitle, color: newColor ?? b.color } : b))

    try {
      await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, color: newColor })
      })
    } catch (e) {
      console.error('Failed to update board', e)
      fetchData() // Revert to server state if failed
    }
  }, [assigneeFilter, searchQuery, showArchived, showDeleted])

  if (isLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <h2>Loading Weberry Board...</h2>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Header
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        showDeleted={showDeleted}
        setShowDeleted={setShowDeleted}
        members={members}
      />

      <main className="board-area">
        <BoardList
          boards={boards}
          tasks={tasks}
          setBoards={setBoards}
          setTasks={setTasks}
          onAddTask={openNewTaskModal}
          onEditTask={openEditTaskModal}
          onToggleComplete={handleToggleComplete}
          onDeleteBoard={handleDeleteBoard}
          onEditBoard={handleEditBoard}
          onReload={handleReload}
        />

        {/* New Board Creation Column */}
        <div style={{
          width: '300px',
          minWidth: '300px',
          backgroundColor: 'var(--board-bg)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <input
            className="input"
            style={{ width: '100%' }}
            placeholder="＋ 新しいボードを追加"
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateBoard()
            }}
            disabled={isCreatingBoard}
          />
          {newBoardTitle.trim() && (
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleCreateBoard}
              disabled={isCreatingBoard}
            >
              {isCreatingBoard ? '作成中...' : '追加'}
            </button>
          )}
        </div>
      </main>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          boardId={defaultBoardId}
          boards={boards}
          onClose={() => setIsModalOpen(false)}
          onReload={handleReload}
        />
      )}
    </div>
  )
}

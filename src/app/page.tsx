'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Board, Task, Member } from '@/lib/types'
import Header from '@/components/Header'
import BoardList from '@/components/BoardList'
import TaskModal from '@/components/TaskModal'

// SWR global fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Home() {
  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState('all') // all | unassigned | memberId
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // Build query string for tasks based on filters
  const taskParams = new URLSearchParams()
  if (assigneeFilter !== 'all') taskParams.append('assignee', assigneeFilter)
  if (searchQuery) taskParams.append('q', searchQuery)
  if (showArchived) taskParams.append('showArchived', 'true')
  if (showDeleted) taskParams.append('showDeleted', 'true')

  // Setup SWR data hooks
  // Polling is configured via refreshInterval: 10000 -> fetch automatically every 10 seconds.
  // It also refetches automatically on focus (default behavior) which is great for natural sync.
  const { data: boards = [], mutate: mutateBoards } = useSWR<Board[]>('/api/boards', fetcher, { refreshInterval: 10000 })
  const { data: tasks = [], mutate: mutateTasks } = useSWR<Task[]>(`/api/tasks?${taskParams.toString()}`, fetcher, { refreshInterval: 10000 })
  const { data: members = [] } = useSWR<Member[]>('/api/members', fetcher)

  // Derive loading state from SWR
  const isLoading = !boards.length && !tasks.length && !members.length;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultBoardId, setDefaultBoardId] = useState<string>('')

  // SWR automatically handles refetching when query params change via the URL string dependency in useSWR.



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
    mutateTasks((prevTasks: Task[] | undefined) => {
      const currentTasks = prevTasks || [];
      return currentTasks.map(t => t.id === task.id ? { ...t, isCompleted: newStatus } : t);
    }, false)

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newStatus })
      })
      mutateTasks() // Revalidate with server
    } catch (e) {
      console.error('Failed to toggle completion status', e)
      mutateTasks() // Revert to server state if failed
    }
  }, [mutateTasks])

  // Reload action
  const handleReload = useCallback(() => {
    mutateBoards()
    mutateTasks()
  }, [mutateBoards, mutateTasks])

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
      mutateBoards()
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
      mutateBoards()
      mutateTasks()
    } catch (e) {
      console.error('Failed to delete board', e)
    }
  }, [mutateBoards, mutateTasks])

  // Edit board
  const handleEditBoard = useCallback(async (boardId: string, newTitle: string, newColor?: string | null) => {
    // Optimistic UI update
    mutateBoards((prevBoards: Board[] | undefined) => {
      const currentBoards = prevBoards || [];
      return currentBoards.map(b => b.id === boardId ? { ...b, title: newTitle, color: newColor ?? b.color } : b);
    }, false)

    try {
      await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, color: newColor })
      })
      mutateBoards()
    } catch (e) {
      console.error('Failed to update board', e)
      mutateBoards() // Revert to server state if failed
    }
  }, [mutateBoards])

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
          setBoards={(b) => {
            if (typeof b === 'function') {
              mutateBoards((prev) => b(prev || []), false);
            } else {
              mutateBoards(b, false);
            }
          }}
          setTasks={(t) => {
            if (typeof t === 'function') {
              mutateTasks((prev) => t(prev || []), false);
            } else {
              mutateTasks(t, false);
            }
          }}
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

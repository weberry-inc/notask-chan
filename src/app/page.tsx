'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Board, Task, Member } from '@/lib/types'
import Header from '@/components/Header'
import BoardList from '@/components/BoardList'
import TaskModal from '@/components/TaskModal'
import Pusher from 'pusher-js'

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

  // Interaction tracking (Ref so it doesn't trigger re-renders or get stale in closures)
  const isInteracting = useRef(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultBoardId, setDefaultBoardId] = useState<string>('')

  // Fetch data
  const fetchData = useCallback(async (isBackground = false) => {
    // Prevent fetching if the user is interacting to avoid hydration snaps back
    if (isBackground && isInteracting.current) return

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

      // If they started interacting WHILE we were fetching, don't overwrite the UI with stale data
      if (isBackground && isInteracting.current) return

      setBoards(b)
      setTasks(t)
      if (Array.isArray(m)) setMembers(m)

    } catch (e) {
      console.error(e)
    } finally {
      if (isLoading) setIsLoading(false)
    }
  }, [assigneeFilter, searchQuery, showArchived, showDeleted, isLoading])

  // Refetch when filters change immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [assigneeFilter, searchQuery, showArchived, showDeleted])

  // Ref to always have the latest fetchData available to Pusher callback without re-subscribing
  const fetchDataRef = useRef(fetchData)
  useEffect(() => {
    fetchDataRef.current = fetchData
  })

  // Subscribe to real-time updates via Pusher
  useEffect(() => {
    const pusherKey = (process.env.NEXT_PUBLIC_PUSHER_KEY || '').replace(/^\[(.+)\]$/, '$1')
    const pusherCluster = (process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '').replace(/^\[(.+)\]$/, '$1')

    if (!pusherKey) {
      console.warn('NEXT_PUBLIC_PUSHER_KEY is missing')
      return
    }

    console.log('Initializing Pusher...', pusherKey)

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    })

    const channel = pusher.subscribe('weberry-board')

    pusher.connection.bind('connected', () => {
      console.log('Pusher connected successfully')
    })

    pusher.connection.bind('error', (err: unknown) => {
      console.error('Pusher connection error:', err)
    })

    channel.bind('updated', () => {
      console.log('Real-time update received')
      // Background fetch if NOT currently interacting
      if (!isInteracting.current) {
        fetchDataRef.current(true)
      } else {
        console.log('Update skipped because user is interacting')
      }
    })

    return () => {
      console.log('Disconnecting Pusher...')
      pusher.unsubscribe('weberry-board')
      pusher.disconnect()
    }
  }, []) // Run only once on mount


  // Open modal for new task
  const openNewTaskModal = useCallback((boardId: string) => {
    isInteracting.current = true
    setEditingTask(null)
    setDefaultBoardId(boardId)
    setIsModalOpen(true)
  }, [])

  // Open modal for editing
  const openEditTaskModal = useCallback((task: Task) => {
    isInteracting.current = true
    setEditingTask(task)
    setDefaultBoardId(task.boardId)
    setIsModalOpen(true)
  }, [])

  // Handle modal close
  const handleModalClose = useCallback(() => {
    isInteracting.current = false
    setIsModalOpen(false)
  }, [])

  const handleInteractionStart = useCallback(() => {
    isInteracting.current = true
  }, [])

  const handleInteractionEnd = useCallback(() => {
    isInteracting.current = false
  }, [])

  // Quick toggle completion status
  const handleToggleComplete = useCallback(async (task: Task, newStatus: boolean) => {
    isInteracting.current = true
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
      fetchData(false) // Revert to server state if failed
    } finally {
      isInteracting.current = false
    }
  }, [])

  // Reload action
  const handleReload = useCallback(() => {
    fetchData(false)
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
          onInteractionStart={handleInteractionStart}
          onInteractionEnd={handleInteractionEnd}
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
          onClose={handleModalClose}
          onReload={handleReload}
        />
      )}
    </div>
  )
}

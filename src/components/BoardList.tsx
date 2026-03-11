'use client'

import { useState, useMemo, memo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, horizontalListSortingStrategy, SortableContext, arrayMove } from '@dnd-kit/sortable'
import { Board, Task } from '@/lib/types'
import BoardColumn from './BoardColumn'
import TaskCard from './TaskCard'

type BoardListProps = {
  boards: Board[]
  tasks: Task[]
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  onAddTask: (boardId: string) => void
  onEditTask: (task: Task) => void
  onToggleComplete: (task: Task, newStatus: boolean) => void
  onDeleteBoard?: (boardId: string) => void
  onEditBoard?: (boardId: string, newTitle: string, newColor?: string | null) => void
  onReload: () => void
}

const BoardList = memo(function BoardList({ boards, tasks, setTasks, setBoards, onAddTask, onEditTask, onToggleComplete, onDeleteBoard, onEditBoard, onReload }: BoardListProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeBoard, setActiveBoard] = useState<Board | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (e: DragStartEvent) => {
    const { active } = e
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task)
    } else if (active.data.current?.type === 'Column') {
      setActiveBoard(active.data.current.board)
    }
  }

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return

    const activeId = active.id
    const overId = over.id
    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === 'Task'
    const isOverTask = over.data.current?.type === 'Task'
    const isOverColumn = over.data.current?.type === 'Column'

    if (!isActiveTask) return

    setTasks(prevTasks => {
      const activeIndex = prevTasks.findIndex(t => t.id === activeId)
      const overIndex = prevTasks.findIndex(t => t.id === overId)

      if (activeIndex === -1 || (overIndex === -1 && !isOverColumn)) return prevTasks

      let newTasks = [...prevTasks]

      if (isOverTask) {
        if (newTasks[activeIndex].boardId !== newTasks[overIndex].boardId) {
          newTasks[activeIndex] = { ...newTasks[activeIndex], boardId: newTasks[overIndex].boardId }
        }
        return arrayMove(newTasks, activeIndex, overIndex)
      }

      if (isOverColumn) {
        if (newTasks[activeIndex].boardId !== overId) {
          newTasks[activeIndex] = { ...newTasks[activeIndex], boardId: overId as string }
          // Move roughly to end of column
          return arrayMove(newTasks, activeIndex, newTasks.length - 1)
        }
      }

      return prevTasks
    })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null)
    setActiveBoard(null)
    const { active, over } = e
    if (!over) return

    const activeId = active.id
    const overId = over.id

    // Handle Board Reordering
    if (active.data.current?.type === 'Column') {
      let targetBoardId = overId

      // If the board was dropped on top of a task card in another column,
      // find which board that task belongs to.
      if (over.data.current?.type === 'Task') {
        targetBoardId = over.data.current.task.boardId
      } else if (over.data.current?.type === 'Column') {
        targetBoardId = over.id
      }

      if (activeId !== targetBoardId) {
        setBoards(prevBoards => {
          const oldIndex = prevBoards.findIndex(b => b.id === activeId)
          const newIndex = prevBoards.findIndex(b => b.id === targetBoardId)

          if (oldIndex === -1 || newIndex === -1) return prevBoards

          let newBoards = arrayMove(prevBoards, oldIndex, newIndex)
          // Re-calculate order Indexes (1000 interval)
          newBoards = newBoards.map((b, idx) => ({ ...b, orderIndex: (idx + 1) * 1000 }))

          // Fire background sync
          fetch('/api/boards/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              boardOrders: newBoards.map(b => ({ id: b.id, orderIndex: b.orderIndex }))
            })
          }).catch(console.error)

          return newBoards
        })
      }
      return
    }

    // Handle Task Reordering
    const isActiveTask = active.data.current?.type === 'Task'
    if (isActiveTask) {
      setTasks(prevTasks => {
        let newTasks = [...prevTasks]
        const activeIndex = newTasks.findIndex(t => t.id === activeId)
        const overIndex = newTasks.findIndex(t => t.id === overId)

        if (activeIndex === -1) return prevTasks

        const isOverTask = over.data.current?.type === 'Task'
        const isOverColumn = over.data.current?.type === 'Column'

        let targetBoardId = newTasks[activeIndex].boardId

        // Finalize array move locally
        if (activeId !== overId) {
          if (isOverTask && overIndex !== -1) {
            targetBoardId = newTasks[overIndex].boardId
            newTasks[activeIndex] = { ...newTasks[activeIndex], boardId: targetBoardId }
            newTasks = arrayMove(newTasks, activeIndex, overIndex)
          } else if (isOverColumn) {
            targetBoardId = overId as string
            newTasks[activeIndex] = { ...newTasks[activeIndex], boardId: targetBoardId }
            newTasks = arrayMove(newTasks, activeIndex, newTasks.length - 1)
          }
        }

        // Recompute uniform orderIndexes for the specific board
        const boardTasks = newTasks.filter(t => t.boardId === targetBoardId)

        boardTasks.forEach((t, idx) => {
          const finalIndex = newTasks.findIndex(task => task.id === t.id)
          const newIdx = (idx + 1) * 1000
          newTasks[finalIndex] = { ...newTasks[finalIndex], orderIndex: newIdx }
        })

        const newSavedTask = newTasks.find(t => t.id === activeId)

        if (newSavedTask) {
          fetch('/api/tasks/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: activeId,
              fromBoardId: active.data.current?.task.boardId, // original
              toBoardId: targetBoardId,
              newOrderIndex: newSavedTask.orderIndex
            })
          }).catch(error => {
            console.error('Task move failed:', error)
            onReload() // Revert to server state
          })
        }

        return newTasks
      })
    }
  }

  const tasksByBoard = useMemo(() => {
    const map = new Map<string, Task[]>()
    boards.forEach(b => map.set(b.id, []))
    tasks.forEach(t => {
      let bTasks = map.get(t.boardId)
      if (!bTasks) {
        bTasks = []
        map.set(t.boardId, bTasks)
      }
      bTasks.push(t)
    })
    return map
  }, [boards, tasks])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={boards.map(b => b.id)} strategy={horizontalListSortingStrategy}>
        {boards.map(board => {
          const boardTasks = tasksByBoard.get(board.id) || []
          return (
            <BoardColumn
              key={board.id}
              board={board}
              tasks={boardTasks}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onToggleComplete={onToggleComplete}
              onDeleteBoard={onDeleteBoard}
              onEditBoard={onEditBoard}
            />
          )
        })}
      </SortableContext>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} onClick={() => { }} onToggleComplete={() => { }} /> : null}
        {activeBoard ? (
          <div style={{ opacity: 0.8 }}>
            <BoardColumn
              board={activeBoard}
              tasks={tasks.filter(t => t.boardId === activeBoard.id)}
              onAddTask={() => { }}
              onEditTask={() => { }}
              onToggleComplete={() => { }}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
})

export default BoardList

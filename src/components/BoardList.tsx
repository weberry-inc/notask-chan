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
  onReload: () => void
}

const BoardList = memo(function BoardList({ boards, tasks, setTasks, setBoards, onAddTask, onEditTask, onToggleComplete, onDeleteBoard, onReload }: BoardListProps) {
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

    // Dropping a task over another task
    if (isActiveTask && isOverTask) {
      setTasks(prevTasks => {
        const activeIndex = prevTasks.findIndex(t => t.id === activeId)
        const overIndex = prevTasks.findIndex(t => t.id === overId)

        if (prevTasks[activeIndex].boardId !== prevTasks[overIndex].boardId) {
          const newTasks = [...prevTasks]
          newTasks[activeIndex] = {
            ...newTasks[activeIndex],
            boardId: newTasks[overIndex].boardId,
          }
          return newTasks
        }
        return prevTasks
      })
    }

    // Dropping a task over an empty column
    if (isActiveTask && isOverColumn) {
      setTasks(prevTasks => {
        const activeIndex = prevTasks.findIndex(t => t.id === activeId)
        if (prevTasks[activeIndex].boardId !== overId) {
          const newTasks = [...prevTasks]
          newTasks[activeIndex] = {
            ...newTasks[activeIndex],
            boardId: overId as string,
          }
          return newTasks
        }
        return prevTasks
      })
    }
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
      if (activeId !== overId) {
        setBoards(prevBoards => {
          const oldIndex = prevBoards.findIndex(b => b.id === activeId)
          const newIndex = prevBoards.findIndex(b => b.id === overId)

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
    const activeTaskFinal = tasks.find(t => t.id === activeId)
    if (!activeTaskFinal) return

    const boardTasks = tasks.filter(t => t.boardId === activeTaskFinal.boardId).sort((a, b) => a.orderIndex - b.orderIndex)
    const isOverTask = over.data.current?.type === 'Task'
    let newOrderIndex = activeTaskFinal.orderIndex

    if (isOverTask) {
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) {
        newOrderIndex = overTask.orderIndex + 1
      }
    } else {
      const lastTask = boardTasks[boardTasks.length - 1]
      newOrderIndex = lastTask ? lastTask.orderIndex + 1000 : 1000
    }

    // Optimistically update tasks array
    setTasks(prevTasks => {
      const activeOldIndex = prevTasks.findIndex(t => t.id === activeId)
      const overOldIndex = prevTasks.findIndex(t => t.id === overId)

      let newTasks = [...prevTasks]

      if (activeOldIndex !== -1 && overOldIndex !== -1 && isOverTask) {
        // Move array item so dnd-kit registers it instantly
        newTasks = arrayMove(newTasks, activeOldIndex, overOldIndex)
      }

      const finalIndex = newTasks.findIndex(t => t.id === activeId)
      if (finalIndex !== -1) {
        newTasks[finalIndex] = { ...newTasks[finalIndex], orderIndex: newOrderIndex }
      }

      return newTasks
    })

    // Background DB Sync
    fetch('/api/tasks/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: activeId,
        fromBoardId: activeTaskFinal.boardId,
        toBoardId: activeTaskFinal.boardId,
        newOrderIndex: newOrderIndex
      })
    }).catch(error => {
      console.error('Task move failed:', error)
      onReload() // Revert to server state
    })
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

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const body = await request.json()
    const { title, description, assigneeMemberId, isCompleted, archivedAt, deletedAt, boardId, orderIndex } = body

    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const dataToUpdate: any = {}
    if (title !== undefined) dataToUpdate.title = title
    if (description !== undefined) dataToUpdate.description = description

    // assigneeMemberId can be string | null
    if (assigneeMemberId !== undefined) dataToUpdate.assigneeMemberId = assigneeMemberId

    // Handle isCompleted logic (案B)
    if (isCompleted !== undefined) {
      dataToUpdate.isCompleted = isCompleted
      if (isCompleted && !existingTask.completedAt) {
        dataToUpdate.completedAt = new Date()
      }
      // If turning OFF completion, we keep completedAt unchanged conceptually.
    }

    if (archivedAt !== undefined) dataToUpdate.archivedAt = archivedAt
    if (deletedAt !== undefined) dataToUpdate.deletedAt = deletedAt
    if (boardId !== undefined) dataToUpdate.boardId = boardId
    if (orderIndex !== undefined) dataToUpdate.orderIndex = orderIndex

    const task = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignee: true,
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

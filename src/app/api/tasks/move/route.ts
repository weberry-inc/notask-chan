import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { taskId, fromBoardId, toBoardId, newOrderIndex } = await request.json()

    if (!taskId || !fromBoardId || !toBoardId || newOrderIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        boardId: toBoardId,
        orderIndex: newOrderIndex,
      },
      include: {
        assignee: true
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to move task:', error)
    return NextResponse.json({ error: 'Failed to move task' }, { status: 500 })
  }
}

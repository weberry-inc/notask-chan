import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const task = await prisma.task.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: { assignee: true }
    })

    // Notify other clients
    const { pusherServer } = await import('@/lib/pusher')
    await pusherServer.trigger('weberry-board', 'updated', {})

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to archive task:', error)
    return NextResponse.json({ error: 'Failed to archive task' }, { status: 500 })
  }
}

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

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to archive task:', error)
    return NextResponse.json({ error: 'Failed to archive task' }, { status: 500 })
  }
}

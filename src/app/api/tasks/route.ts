import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const boardId = searchParams.get('boardId')
  const assignee = searchParams.get('assignee')
  const q = searchParams.get('q')
  const showArchived = searchParams.get('showArchived') === 'true'
  const showDeleted = searchParams.get('showDeleted') === 'true'

  try {
    // Determine the default workspace
    const workspace = await prisma.workspace.findFirst()
    if (!workspace) return NextResponse.json([])

    const where: any = { workspaceId: workspace.id }

    if (boardId) where.boardId = boardId
    if (assignee) {
      if (assignee === 'unassigned') {
        where.assigneeMemberId = null
      } else {
        where.assigneeMemberId = assignee
      }
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } }
      ]
    }

    if (!showArchived) where.archivedAt = null
    if (!showDeleted) where.deletedAt = null

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: true
      },
      orderBy: { orderIndex: 'asc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { boardId, title, description, assigneeMemberId, orderIndex, workspaceId } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let wsId = workspaceId
    if (!wsId) {
      const workspace = await prisma.workspace.findFirst()
      if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 400 })
      wsId = workspace.id
    }

    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined) {
      const lastTask = await prisma.task.findFirst({
        where: { boardId },
        orderBy: { orderIndex: 'desc' },
      })
      finalOrderIndex = lastTask ? lastTask.orderIndex + 1000 : 1000
    }

    const task = await prisma.task.create({
      data: {
        workspaceId: wsId,
        boardId,
        title,
        description: description || null,
        assigneeMemberId: assigneeMemberId || null,
        orderIndex: finalOrderIndex,
      },
      include: {
        assignee: true
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

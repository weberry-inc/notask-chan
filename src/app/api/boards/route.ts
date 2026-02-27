import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { orderIndex: 'asc' },
    })
    return NextResponse.json(boards)
  } catch (error) {
    console.error('Failed to fetch boards:', error)
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { title, color, orderIndex, workspaceId } = await request.json()

    // Use default workspace if not provided (MVP logic)
    let wsId = workspaceId
    if (!wsId) {
      let workspace = await prisma.workspace.findFirst()
      if (!workspace) {
        // Auto-create workspace for MVP if missing
        workspace = await prisma.workspace.create({
          data: { name: 'Weberry MVP' }
        })
      }
      wsId = workspace.id
    }

    // Determine orderIndex if not provided
    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined) {
      const lastBoard = await prisma.board.findFirst({
        where: { workspaceId: wsId },
        orderBy: { orderIndex: 'desc' },
      })
      finalOrderIndex = lastBoard ? lastBoard.orderIndex + 1000 : 1000
    }

    const board = await prisma.board.create({
      data: {
        title,
        color: color || null,
        orderIndex: finalOrderIndex,
        workspaceId: wsId,
      },
    })
    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error('Failed to create board:', error)
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
  }
}

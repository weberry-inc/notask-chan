import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { boardOrders } = await request.json()
    // boardOrders: [{ id: string, orderIndex: number }]

    if (!Array.isArray(boardOrders)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Process all updates in a transaction
    await prisma.$transaction(
      boardOrders.map((board) =>
        prisma.board.update({
          where: { id: board.id },
          data: { orderIndex: board.orderIndex },
        })
      )
    )

    // Notify other clients
    const { pusherServer } = await import('@/lib/pusher')
    await pusherServer.trigger('weberry-board', 'updated', {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder boards:', error)
    return NextResponse.json({ error: 'Failed to reorder boards' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const body = await request.json()
    const { title, color, orderIndex } = body

    const dataToUpdate: any = {}
    if (title !== undefined) dataToUpdate.title = title
    if (color !== undefined) dataToUpdate.color = color
    if (orderIndex !== undefined) dataToUpdate.orderIndex = orderIndex

    const board = await prisma.board.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json(board)
  } catch (error) {
    console.error('Failed to update board:', error)
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    await prisma.board.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete board:', error)
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let members = await prisma.member.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Auto-create workspace and default members if none exist (for MVP smooth experience on fresh DB)
    if (members.length === 0) {
      let workspace = await prisma.workspace.findFirst()
      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: { name: 'Weberry MVP' }
        })
      }

      const mirai = await prisma.member.create({
        data: { workspaceId: workspace.id, displayName: '未来' }
      })
      const yukun = await prisma.member.create({
        data: { workspaceId: workspace.id, displayName: 'ゆうくん' }
      })
      members = [mirai, yukun]
    }

    return NextResponse.json(members)
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

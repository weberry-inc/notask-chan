import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Weberry',
    },
  })

  // Create Members
  const mirai = await prisma.member.create({
    data: {
      workspaceId: workspace.id,
      displayName: '未来',
    },
  })

  const yukun = await prisma.member.create({
    data: {
      workspaceId: workspace.id,
      displayName: 'ゆうくん',
    },
  })

  // Create initial Boards
  const boardTitles = ['社長タスク（通常）', '今日', '今週', '保留']

  for (let i = 0; i < boardTitles.length; i++) {
    await prisma.board.create({
      data: {
        workspaceId: workspace.id,
        title: boardTitles[i],
        orderIndex: (i + 1) * 1000,
      },
    })
  }

  console.log('Seed data created successfully')
  console.log(`Workspace ID: ${workspace.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { NestFactory } from '@nestjs/core'
import { AppModule } from './src/app.module'
import { PrismaService } from './src/shared/modules/database/prisma.service'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const prisma = app.get(PrismaService)

  const conversations = await prisma.conversation.findMany({
    include: { tenant: true },
  })

  for (const c of conversations) {
    if (c.tenant) {
      await prisma.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: c.id,
            userId: c.tenant.ownerUserId,
          },
        },
        create: {
          conversationId: c.id,
          userId: c.tenant.ownerUserId,
        },
        update: {},
      })
      console.log(`Added user ${c.tenant.ownerUserId} to conversation ${c.id}`)
    }
  }

  await app.close()
}
bootstrap()

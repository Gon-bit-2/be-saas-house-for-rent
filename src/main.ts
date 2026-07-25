import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { ZodValidationPipe } from 'nestjs-zod'
import helmet from 'helmet'
import { AppModule } from './app.module'
import envConfig from './config/env.config'
import { buildCorsOptions, buildHelmetOptions } from './config/http-security.config'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  if (envConfig.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', envConfig.TRUST_PROXY_HOPS)
  }
  app.use(helmet(buildHelmetOptions(envConfig.NODE_ENV)))
  app.enableCors(buildCorsOptions(envConfig.CORS_ORIGINS))
  app.useGlobalPipes(new ZodValidationPipe())
  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()

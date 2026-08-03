import { Injectable } from '@nestjs/common'
import type { NotificationType, Prisma } from 'generated/prisma/client'
import { FirebaseProvider } from './firebase.provider'

export type PushDeviceToken = {
  id: number
  token: string
}

export type PushNotificationPayload = {
  id: number
  title: string
  content: string
  type: NotificationType
  data: Prisma.JsonValue | null
}

export type PushSendResult = {
  tokenId: number
  success: boolean
  errorCode?: string
  disableToken: boolean
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
])

@Injectable()
export class FirebasePushService {
  constructor(private readonly firebaseProvider: FirebaseProvider) {}

  async sendToTokens(notification: PushNotificationPayload, tokens: PushDeviceToken[]): Promise<PushSendResult[]> {
    if (tokens.length === 0) {
      return []
    }

    const results: PushSendResult[] = []
    for (const chunk of this.chunk(tokens, 500)) {
      const response = await this.firebaseProvider.getMessaging().sendEachForMulticast({
        tokens: chunk.map((item) => item.token),
        notification: {
          title: notification.title,
          body: notification.content,
        },
        data: this.toFcmData(notification),
      })

      response.responses.forEach((item, index) => {
        const token = chunk[index]
        const errorCode = item.error?.code
        results.push({
          tokenId: token.id,
          success: item.success,
          errorCode,
          disableToken: errorCode ? INVALID_TOKEN_ERROR_CODES.has(errorCode) : false,
        })
      })
    }

    return results
  }

  private toFcmData(notification: PushNotificationPayload) {
    const rawData = this.isPlainObject(notification.data) ? notification.data : {}
    return {
      notificationId: String(notification.id),
      type: notification.type,
      ...Object.fromEntries(Object.entries(rawData).map(([key, value]) => [key, this.stringifyDataValue(value)])),
    }
  }

  private stringifyDataValue(value: unknown): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value)
    }
    if (value === null || value === undefined) return ''
    try {
      return JSON.stringify(value) ?? ''
    } catch {
      return ''
    }
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  private chunk<T>(items: T[], size: number) {
    const chunks: T[][] = []
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size))
    }
    return chunks
  }
}

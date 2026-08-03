import { Logger } from '@nestjs/common'
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { TokenService } from '@src/shared/modules/services/token.service'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ namespace: 'notifications', cors: true })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server

  private readonly logger = new Logger(NotificationsGateway.name)

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client)
    if (!token) {
      client.disconnect(true)
      return
    }

    try {
      const user = await this.tokenService.verifyAccessToken(token)
      await client.join(this.userRoom(user.userId))
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'Invalid websocket token')
      client.disconnect(true)
    }
  }

  emitNotificationCreated(userId: number, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('notification.created', payload)
  }

  emitNotificationRead(userId: number, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('notification.read', payload)
  }

  emitTicketUpdated(userId: number, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('ticket.updated', payload)
  }

  private extractToken(client: Socket) {
    const auth: unknown = client.handshake.auth
    const authToken =
      typeof auth === 'object' && auth !== null && 'token' in auth ? (auth as { token?: unknown }).token : undefined
    if (typeof authToken === 'string' && authToken) {
      return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken
    }

    const header = client.handshake.headers.authorization
    return header?.startsWith('Bearer ') ? header.slice(7) : undefined
  }

  private userRoom(userId: number) {
    return `user:${userId}`
  }
}

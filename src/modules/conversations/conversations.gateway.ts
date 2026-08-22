import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { TokenService } from '@src/shared/modules/services/token.service'
import { ConversationsService } from './conversations.service'
import envConfig from '@src/config/env.config'
import { SendMessageBodyDTO } from './dto/conversations.dto'

interface AuthenticatedSocket extends Socket {
  data: {
    userId: number
  }
}

const socketOrigins = envConfig.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

@WebSocketGateway({ namespace: 'conversations', cors: { origin: socketOrigins, credentials: true } })
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server

  private readonly logger = new Logger(ConversationsGateway.name)

  constructor(
    private readonly tokenService: TokenService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.extractToken(client)
    if (!token) {
      client.disconnect(true)
      return
    }

    try {
      const user = await this.tokenService.verifyAccessToken(token)
      client.data.userId = user.userId
      // We don't join all rooms here. The client will emit 'joinConversation' for specific rooms.
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'Invalid websocket token')
      client.disconnect(true)
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      // checkAccess is inside getConversationMessages or we can just verify via service
      const conversation = await this.conversationsService.getConversationMessages(
        data.conversationId,
        client.data.userId,
        0,
        1,
      )
      if (conversation) {
        const roomName = this.getConversationRoom(data.conversationId)
        await client.join(roomName)
        this.logger.debug(`User ${client.data.userId} joined room ${roomName}`)
        return { success: true }
      }
    } catch (error) {
      this.logger.warn(`User ${client.data.userId} failed to join conversation ${data.conversationId}`)
      return { success: false, error: 'Cannot join this conversation' }
    }
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    const roomName = this.getConversationRoom(data.conversationId)
    await client.leave(roomName)
    this.logger.debug(`User ${client.data.userId} left room ${roomName}`)
    return { success: true }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: number; message: SendMessageBodyDTO },
  ) {
    try {
      const message = await this.conversationsService.sendMessage(
        payload.conversationId,
        client.data.userId,
        payload.message,
      )

      const roomName = this.getConversationRoom(payload.conversationId)
      // Broadcast the message to all clients in the room (including sender, or we can broadcast to others)
      this.server.to(roomName).emit('newMessage', message)
      return { success: true, data: message }
    } catch (error) {
      this.logger.error(`Error sending message: ${error}`)
      return { success: false, error: 'Failed to send message' }
    }
  }

  @SubscribeMessage('readMessage')
  async handleReadMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      await this.conversationsService.markMessagesAsRead(data.conversationId, client.data.userId)
      const roomName = this.getConversationRoom(data.conversationId)
      this.server.to(roomName).emit('messagesRead', {
        conversationId: data.conversationId,
        readBy: client.data.userId,
      })
      return { success: true }
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error}`)
      return { success: false, error: 'Failed to mark as read' }
    }
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

  private getConversationRoom(conversationId: number) {
    return `conversation:${conversationId}`
  }
}

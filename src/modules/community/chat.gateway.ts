import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

interface AuthenticatedSocket extends Socket {
  user?: JWTUserPayload;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`🔌 New connection attempt from: ${client.id}`);

    try {
      const token = this.extractToken(client);
      if (!token) {
        this.handleAuthError(client, 'No token provided');
        return;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        this.handleAuthError(client, 'Invalid token');
        return;
      }

      // Set user data on socket
      client.user = this.reconstructUserPayload(payload);

      // Store connection
      this.connectedUsers.set(client.user.id.toString(), client.id);

      this.logger.log(
        `✅ User authenticated: ${client.user.id} (${client.user.email})`,
      );

      // Emit connection success
      client.emit('CONNECTED', {
        user_id: client.user.id,
        email: client.user.email,
        role: client.user.role.name,
      });

      // Broadcast online status
      this.broadcastOnlineStatus(client.user.id.toString(), true);
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`);
      this.handleAuthError(client, error.message);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.connectedUsers.delete(client.user.id.toString());
      this.logger.log(`🔌 User disconnected: ${client.user.id}`);
      this.broadcastOnlineStatus(client.user.id.toString(), false);
    }
  }

  @SubscribeMessage('SEND_MESSAGE')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    this.logger.log(`📨 SEND_MESSAGE from user: ${client.user?.id}`);

    if (!this.validateUser(client)) return { error: 'Unauthorized' };

    const messageData = this.parseMessageData(data);
    if (!messageData) {
      return { error: 'Invalid message data format' };
    }

    try {
      const savedMessage = await this.chatService.createMessage(
        messageData,
        client.user!,
      );

      // Emit to sender
      client.emit('MESSAGE_SENT', savedMessage);

      // Emit to receiver if online
      this.emitToReceiver(messageData.receiver_id, 'NEW_MESSAGE', savedMessage);

      return savedMessage;
    } catch (error) {
      this.logger.error(`❌ Error sending message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('MARK_READ')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sender_id: string },
  ) {
    this.logger.log(
      `👁️ MARK_READ from user: ${client.user?.id} for sender: ${data.sender_id}`,
    );

    if (!this.validateUser(client)) return { error: 'Unauthorized' };

    if (!client.user?.school_id) {
      throw new BadRequestException('School ID is required');
    }

    const connection = await this.chatService.getTenantConnection(
      client.user.school_id.toString(),
    );

    try {
      // Convert string IDs to ObjectId
      const currentUserId = new Types.ObjectId(client.user!.id);
      const senderId = new Types.ObjectId(data.sender_id);

      this.logger.log(
        `Converting IDs - Current: ${currentUserId}, Sender: ${senderId}`,
      );

      await this.chatService.markMessagesAsRead(
        currentUserId,
        senderId,
        connection,
      );

      // Notify sender that messages were read
      this.emitToReceiver(data.sender_id, 'MESSAGES_READ', {
        reader_id: client.user!.id.toString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Error marking messages as read: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('DELETE_MESSAGE')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { message_id: string },
  ) {
    this.logger.log(`🗑️ DELETE_MESSAGE from user: ${client.user?.id}`);

    if (!this.validateUser(client)) return { error: 'Unauthorized' };

    try {
      await this.chatService.deleteMessage(data.message_id, client.user!);

      // Emit to sender for confirmation
      client.emit('MESSAGE_DELETED', {
        message_id: data.message_id,
        success: true,
      });

      // Broadcast to all connected users that message was deleted
      this.server.emit('MESSAGE_DELETED', {
        message_id: data.message_id,
        deleted_by: client.user!.id.toString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Error deleting message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('TYPING_START')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiver_id: string },
  ) {
    if (!this.validateUser(client)) return { error: 'Unauthorized' };

    this.emitToReceiver(data.receiver_id, 'USER_TYPING', {
      user_id: client.user!.id.toString(),
      is_typing: true,
    });
  }

  @SubscribeMessage('TYPING_STOP')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiver_id: string },
  ) {
    if (!this.validateUser(client)) return { error: 'Unauthorized' };

    this.emitToReceiver(data.receiver_id, 'USER_TYPING', {
      user_id: client.user!.id.toString(),
      is_typing: false,
    });
  }

  @SubscribeMessage('PING')
  async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.log(`🏓 PING from user: ${client.user?.id}`);

    client.emit('PONG', {
      message: 'Pong from server',
      timestamp: new Date().toISOString(),
      user_id: client.user?.id,
    });
  }

  // Public utility methods
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineStatusForUsers(userIds: string[]): { [userId: string]: boolean } {
    const statusMap: { [userId: string]: boolean } = {};
    userIds.forEach((userId) => {
      statusMap[userId] = this.connectedUsers.has(userId);
    });
    return statusMap;
  }

  getConnectionDetails(): {
    totalConnected: number;
    connectedUsers: Array<{ userId: string; socketId: string }>;
  } {
    const connectedUsers = Array.from(this.connectedUsers.entries()).map(
      ([userId, socketId]) => ({
        userId,
        socketId,
      }),
    );

    return {
      totalConnected: this.connectedUsers.size,
      connectedUsers,
    };
  }

  // Private helper methods
  private extractToken(client: AuthenticatedSocket): string | null {
    const auth =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.query?.token;

    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return auth || null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      return await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  private reconstructUserPayload(payload: any): JWTUserPayload {
    const userId = payload.id || payload.sub;
    return {
      id: userId,
      email: payload.email,
      role: {
        id: payload.role_id,
        name: payload.role_name,
      },
      school_id: payload.school_id,
      preferred_language: payload.preferred_language,
    };
  }

  private handleAuthError(client: AuthenticatedSocket, message: string) {
    client.emit('error', { message });
    client.disconnect();
  }

  private validateUser(client: AuthenticatedSocket): boolean {
    if (!client.user) {
      this.logger.error('❌ Unauthorized: No user found');
      return false;
    }
    return true;
  }

  private parseMessageData(data: any): CreateChatMessageDto | null {
    let messageData = data;

    // Handle string data
    if (typeof data === 'string') {
      try {
        if (data.startsWith('{') && data.endsWith('}')) {
          messageData = JSON.parse(data);
        } else {
          // Extract object properties from string
          const receiverIdMatch = data.match(/receiver_id:\s*['"]([^'"]+)['"]/);
          const receiverRoleMatch = data.match(
            /receiver_role:\s*['"]([^'"]+)['"]/,
          );
          const messageMatch = data.match(/message:\s*['"]([^'"]+)['"]/);

          if (receiverIdMatch && receiverRoleMatch && messageMatch) {
            messageData = {
              receiver_id: receiverIdMatch[1],
              receiver_role: receiverRoleMatch[1],
              message: messageMatch[1],
            };
          } else {
            throw new Error('Could not parse object properties from string');
          }
        }
      } catch (error) {
        this.logger.error(`Failed to parse message data: ${error.message}`);
        return null;
      }
    }

    // Validate required fields
    if (
      !messageData ||
      !messageData.receiver_id ||
      !messageData.receiver_role ||
      !messageData.message
    ) {
      this.logger.error(`Invalid message data: ${JSON.stringify(messageData)}`);
      return null;
    }

    return {
      receiver_id: messageData.receiver_id,
      receiver_role: messageData.receiver_role,
      message: messageData.message,
    };
  }

  private emitToReceiver(receiverId: string, event: string, data: any) {
    const receiverSocketId = this.connectedUsers.get(receiverId);
    if (receiverSocketId) {
      this.logger.log(`📤 Emitting ${event} to receiver: ${receiverId}`);
      this.server.to(receiverSocketId).emit(event, data);
    } else {
      this.logger.log(`⚠️ Receiver not online: ${receiverId}`);
    }
  }

  private broadcastOnlineStatus(userId: string, isOnline: boolean) {
    const event = isOnline ? 'USER_ONLINE' : 'USER_OFFLINE';
    this.server.emit(event, { user_id: userId });
    this.logger.log(`📢 ${event}: ${userId}`);
  }
}

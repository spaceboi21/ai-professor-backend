# Chat Feature Documentation

## Overview

The chat feature provides real-time one-to-one communication between users with role-based access control. It supports WebSocket connections for instant messaging and REST API endpoints for message management.

## Features

### 1. Role-Based Communication
- **Professor ↔ Student**: Primary communication channel
- **Student ↔ School Admin**: Administrative communication
- **Professor ↔ School Admin**: Administrative communication
- **Super Admin ↔ All Roles**: System-wide communication

### 2. Real-Time Messaging
- WebSocket-based real-time communication
- Typing indicators
- Read receipts
- Message delivery status

### 3. Message Management
- Send messages
- View conversation history
- Mark messages as read
- Delete own messages
- Pagination support

### 4. Multi-Tenant Architecture
- **Students**: Stored in tenant database (`students` collection)
- **Professors**: Stored in central database (`users` collection)
- **Messages**: Stored in tenant database (`chat_messages` collection)

## Database Schema

### ChatMessage Schema
```typescript
{
  sender_id: ObjectId,        // Reference to User/Student
  receiver_id: ObjectId,      // Reference to User/Student
  sender_role: RoleEnum,      // PROFESSOR, STUDENT, etc.
  receiver_role: RoleEnum,    // PROFESSOR, STUDENT, etc.
  message: string,            // Message content
  is_read: boolean,           // Read status
  read_at: Date,              // When message was read
  deleted_at: Date,           // Soft delete timestamp
  deleted_by: ObjectId,       // Who deleted the message
  created_at: Date,           // Message creation time
  updated_at: Date            // Last update time
}
```

## API Endpoints

### REST API (Non-Real-Time Operations)

#### Get Conversations with User Details
```
GET /api/chat/conversations-with-details?page=1&limit=20&user_id=507f1f77bcf86cd799439011&user_role=STUDENT
Authorization: Bearer <token>
```

**Response:**
```json
{
  "conversations": [
    {
      "conversation_user": {
        "_id": "507f1f77bcf86cd799439011",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "role": "STUDENT"
      },
      "conversation_user_role": "STUDENT",
      "last_message": {
        "_id": "507f1f77bcf86cd799439012",
        "message": "Hello!",
        "created_at": "2025-01-15T10:30:00.000Z",
        "is_read": false
      },
      "unread_count": 2
    }
  ],
  "total": 1
}
```

#### Get Messages with User
```
GET /api/chat/messages/:userId?page=1&limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "sender_id": "507f1f77bcf86cd799439011",
      "receiver_id": "507f1f77bcf86cd799439013",
      "sender_role": "STUDENT",
      "receiver_role": "PROFESSOR",
      "message": "Hello Professor!",
      "is_read": true,
      "read_at": "2025-01-15T10:35:00.000Z",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

### WebSocket Events (Real-Time Operations)

#### Client to Server Events

**Send Message:**
```javascript
socket.emit('SEND_MESSAGE', {
  receiver_id: '507f1f77bcf86cd799439011',
  receiver_role: 'STUDENT', // or 'PROFESSOR'
  message: 'Hello!'
});
```

**Mark Messages as Read:**
```javascript
socket.emit('MARK_READ', {
  sender_id: '507f1f77bcf86cd799439011' // ID of the person who sent you messages
});
```

**Delete Message:**
```javascript
socket.emit('DELETE_MESSAGE', {
  message_id: '507f1f77bcf86cd799439012'
});
```

**Typing Indicators:**
```javascript
socket.emit('TYPING_START', {
  receiver_id: '507f1f77bcf86cd799439011'
});

socket.emit('TYPING_STOP', {
  receiver_id: '507f1f77bcf86cd799439011'
});
```

**Test Connection:**
```javascript
socket.emit('PING');
```

#### Server to Client Events

**Message Events:**
```javascript
// New message received
socket.on('NEW_MESSAGE', (message) => {
  console.log('New message:', message);
  // message: { _id, sender_id, receiver_id, sender_role, receiver_role, message, is_read, created_at, updated_at }
});

// Message sent confirmation
socket.on('MESSAGE_SENT', (message) => {
  console.log('Message sent:', message);
  // message: { _id, sender_id, receiver_id, sender_role, receiver_role, message, is_read, created_at, updated_at }
});

// Message deleted
socket.on('MESSAGE_DELETED', (data) => {
  console.log('Message deleted:', data.message_id);
  // data: { message_id, deleted_by }
});

// Messages marked as read
socket.on('MESSAGES_READ', (data) => {
  console.log('Messages read by:', data.reader_id);
  // data: { reader_id }
});
```

**Typing Events:**
```javascript
socket.on('USER_TYPING', (data) => {
  console.log('User typing:', data);
  // data: { user_id, is_typing }
});
```

**Online Status Events:**
```javascript
socket.on('USER_ONLINE', (data) => {
  console.log('User online:', data.user_id);
  // data: { user_id }
});

socket.on('USER_OFFLINE', (data) => {
  console.log('User offline:', data.user_id);
  // data: { user_id }
});
```

**Connection Events:**
```javascript
socket.on('CONNECTED', (data) => {
  console.log('Connected:', data);
  // data: { user_id, email, role }
});

socket.on('PONG', (data) => {
  console.log('Pong received:', data);
  // data: { message, timestamp, user_id }
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  // error: { message }
});
```

## WebSocket Connection

### Connect to Chat
```javascript
const socket = io('http://localhost:5000/chat', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});

// Listen for connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('CONNECTED', (data) => {
  console.log('Successfully authenticated:', data);
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Data Types and Interfaces

### TypeScript Interfaces

```typescript
// Message interface
interface ChatMessage {
  _id: string;
  sender_id: string;
  receiver_id: string;
  sender_role: 'PROFESSOR' | 'STUDENT' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN';
  receiver_role: 'PROFESSOR' | 'STUDENT' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN';
  message: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

// Conversation interface
interface Conversation {
  conversation_user: {
    _id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role: string;
  };
  conversation_user_role: string;
  last_message: {
    _id: string;
    message: string;
    created_at: string;
    is_read: boolean;
  };
  unread_count: number;
}

// WebSocket event data interfaces
interface SendMessageData {
  receiver_id: string;
  receiver_role: 'PROFESSOR' | 'STUDENT' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN';
  message: string;
}

interface MarkReadData {
  sender_id: string; // ID of the person who sent you messages
}

interface DeleteMessageData {
  message_id: string;
}

interface TypingData {
  receiver_id: string;
}

interface OnlineStatusData {
  user_id: string;
}

interface MessageDeletedData {
  message_id: string;
  deleted_by: string;
}

interface MessagesReadData {
  reader_id: string;
}

interface UserTypingData {
  user_id: string;
  is_typing: boolean;
}
```

## Implementation Guidelines

### 1. Frontend Chat Component Structure

```typescript
// ChatService class for API calls
class ChatService {
  private baseUrl = 'http://localhost:5000/api';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getConversations(page = 1, limit = 20, userId?: string, userRole?: string): Promise<{ conversations: Conversation[], total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(userId && { user_id: userId }),
      ...(userRole && { user_role: userRole })
    });

    const response = await fetch(`${this.baseUrl}/chat/conversations-with-details?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return response.json();
  }

  async getMessages(userId: string, page = 1, limit = 50): Promise<{ messages: ChatMessage[], total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    const response = await fetch(`${this.baseUrl}/chat/messages/${userId}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }
}

// WebSocket service for real-time communication
class ChatWebSocketService {
  private socket: any;
  private token: string;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(token: string) {
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io('http://localhost:5000/chat', {
        auth: { token: this.token },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Connected to chat server');
        resolve();
      });

      this.socket.on('CONNECTED', (data: any) => {
        console.log('Successfully authenticated:', data);
      });

      this.socket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('Disconnected:', reason);
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    // Message events
    this.socket.on('NEW_MESSAGE', (message: ChatMessage) => {
      this.emit('NEW_MESSAGE', message);
    });

    this.socket.on('MESSAGE_SENT', (message: ChatMessage) => {
      this.emit('MESSAGE_SENT', message);
    });

    this.socket.on('MESSAGE_DELETED', (data: MessageDeletedData) => {
      this.emit('MESSAGE_DELETED', data);
    });

    this.socket.on('MESSAGES_READ', (data: MessagesReadData) => {
      this.emit('MESSAGES_READ', data);
    });

    // Typing events
    this.socket.on('USER_TYPING', (data: UserTypingData) => {
      this.emit('USER_TYPING', data);
    });

    // Online status events
    this.socket.on('USER_ONLINE', (data: OnlineStatusData) => {
      this.emit('USER_ONLINE', data);
    });

    this.socket.on('USER_OFFLINE', (data: OnlineStatusData) => {
      this.emit('USER_OFFLINE', data);
    });

    // Connection events
    this.socket.on('PONG', (data: any) => {
      this.emit('PONG', data);
    });
  }

  // Send message
  sendMessage(receiverId: string, receiverRole: string, message: string): void {
    this.socket.emit('SEND_MESSAGE', {
      receiver_id: receiverId,
      receiver_role: receiverRole,
      message: message
    });
  }

  // Mark messages as read
  markAsRead(senderId: string): void {
    this.socket.emit('MARK_READ', {
      sender_id: senderId
    });
  }

  // Delete message
  deleteMessage(messageId: string): void {
    this.socket.emit('DELETE_MESSAGE', {
      message_id: messageId
    });
  }

  // Typing indicators
  startTyping(receiverId: string): void {
    this.socket.emit('TYPING_START', {
      receiver_id: receiverId
    });
  }

  stopTyping(receiverId: string): void {
    this.socket.emit('TYPING_STOP', {
      receiver_id: receiverId
    });
  }

  // Test connection
  ping(): void {
    this.socket.emit('PING');
  }

  // Event handling
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Main Chat component
class ChatComponent {
  private chatService: ChatService;
  private wsService: ChatWebSocketService;
  private conversations: Conversation[] = [];
  private currentMessages: ChatMessage[] = [];
  private selectedUserId: string | null = null;

  constructor(token: string) {
    this.chatService = new ChatService(token);
    this.wsService = new ChatWebSocketService(token);
    this.setupWebSocketHandlers();
  }

  async initialize(): Promise<void> {
    try {
      await this.wsService.connect();
      await this.loadConversations();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  }

  private setupWebSocketHandlers(): void {
    // Handle new messages
    this.wsService.on('NEW_MESSAGE', (message: ChatMessage) => {
      this.handleNewMessage(message);
    });

    // Handle message sent confirmation
    this.wsService.on('MESSAGE_SENT', (message: ChatMessage) => {
      this.handleMessageSent(message);
    });

    // Handle message deletion
    this.wsService.on('MESSAGE_DELETED', (data: MessageDeletedData) => {
      this.handleMessageDeleted(data);
    });

    // Handle messages read
    this.wsService.on('MESSAGES_READ', (data: MessagesReadData) => {
      this.handleMessagesRead(data);
    });

    // Handle typing indicators
    this.wsService.on('USER_TYPING', (data: UserTypingData) => {
      this.handleUserTyping(data);
    });

    // Handle online status
    this.wsService.on('USER_ONLINE', (data: OnlineStatusData) => {
      this.handleUserOnline(data);
    });

    this.wsService.on('USER_OFFLINE', (data: OnlineStatusData) => {
      this.handleUserOffline(data);
    });
  }

  async loadConversations(): Promise<void> {
    try {
      const result = await this.chatService.getConversations();
      this.conversations = result.conversations;
      this.renderConversations();
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  async loadMessages(userId: string): Promise<void> {
    try {
      const result = await this.chatService.getMessages(userId);
      this.currentMessages = result.messages;
      this.selectedUserId = userId;
      this.renderMessages();
      this.markMessagesAsRead(userId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  sendMessage(receiverId: string, receiverRole: string, message: string): void {
    this.wsService.sendMessage(receiverId, receiverRole, message);
  }

  deleteMessage(messageId: string): void {
    this.wsService.deleteMessage(messageId);
  }

  startTyping(receiverId: string): void {
    this.wsService.startTyping(receiverId);
  }

  stopTyping(receiverId: string): void {
    this.wsService.stopTyping(receiverId);
  }

  private markMessagesAsRead(userId: string): void {
    this.wsService.markAsRead(userId);
  }

  // Event handlers
  private handleNewMessage(message: ChatMessage): void {
    // Add message to current conversation if it matches
    if (this.selectedUserId && 
        (message.sender_id === this.selectedUserId || message.receiver_id === this.selectedUserId)) {
      this.currentMessages.unshift(message);
      this.renderMessages();
    }
    
    // Update conversation list
    this.updateConversationList(message);
  }

  private handleMessageSent(message: ChatMessage): void {
    // Update UI to show message as sent
    console.log('Message sent successfully:', message);
  }

  private handleMessageDeleted(data: MessageDeletedData): void {
    // Remove message from UI
    this.currentMessages = this.currentMessages.filter(msg => msg._id !== data.message_id);
    this.renderMessages();
  }

  private handleMessagesRead(data: MessagesReadData): void {
    // Update read status in UI
    console.log('Messages read by:', data.reader_id);
  }

  private handleUserTyping(data: UserTypingData): void {
    // Show typing indicator
    console.log('User typing:', data);
  }

  private handleUserOnline(data: OnlineStatusData): void {
    // Update online status
    console.log('User online:', data.user_id);
  }

  private handleUserOffline(data: OnlineStatusData): void {
    // Update offline status
    console.log('User offline:', data.user_id);
  }

  private updateConversationList(message: ChatMessage): void {
    // Update conversation list with new message
    // Implementation depends on UI framework
  }

  private renderConversations(): void {
    // Render conversation list
    // Implementation depends on UI framework
  }

  private renderMessages(): void {
    // Render message list
    // Implementation depends on UI framework
  }

  destroy(): void {
    this.wsService.disconnect();
  }
}
```

### 2. Usage Example

```typescript
// Initialize chat
const token = localStorage.getItem('token');
const chat = new ChatComponent(token);

// Initialize
await chat.initialize();

// Load conversations
await chat.loadConversations();

// Select a conversation and load messages
await chat.loadMessages('user_id');

// Send a message
chat.sendMessage('receiver_id', 'STUDENT', 'Hello!');

// Delete a message
chat.deleteMessage('message_id');

// Typing indicators
chat.startTyping('receiver_id');
// ... user types ...
chat.stopTyping('receiver_id');

// Clean up
chat.destroy();
```

## Security Features

### 1. Authentication
- JWT token required for all operations
- WebSocket connections require valid JWT token

### 2. Authorization
- Role-based access control
- Users can only communicate with allowed roles
- Users can only delete their own messages

### 3. Data Validation
- Input validation for all endpoints
- MongoDB injection protection
- XSS protection through proper escaping

## Error Handling

### Common Error Responses
```json
{
  "error": "Receiver not found",
  "statusCode": 404
}
```

```json
{
  "error": "Communication between PROFESSOR and STUDENT is not allowed",
  "statusCode": 403
}
```

```json
{
  "error": "You can only delete your own messages",
  "statusCode": 403
}
```

```json
{
  "error": "School ID is required",
  "statusCode": 400
}
```

## Performance Optimizations

### 1. Database Indexes
- Compound indexes for efficient queries
- Background index creation
- Optimized for conversation retrieval

### 2. WebSocket Optimization
- Connection pooling
- Efficient room management
- Minimal data transfer

### 3. Caching Strategy
- User online status caching
- Conversation list caching
- Message pagination optimization

## Migration

To set up the chat feature in a new tenant:

1. Run the migration: `npm run migrate`
2. The migration will create the `chat_messages` collection with proper indexes
3. The feature will be available immediately after migration

## Monitoring

### Key Metrics
- Active WebSocket connections
- Message delivery rate
- Response times for API endpoints
- Error rates for failed operations

### Logs
- Connection/disconnection events
- Message delivery status
- Authentication failures
- Authorization violations
- Online status changes 
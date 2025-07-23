# AI Chat Module Documentation

## Overview

The AI Chat Module provides a complete system for managing AI practice sessions between students and AI agents. The system integrates with external Python APIs to provide AI-powered patient simulation, supervisor analysis, and professor resources.

## Workflow

### 1. Student Flow
1. **View Modules**: Student sees all modules created by school admin
2. **Select Module**: Student clicks on a module to view its sections
3. **AI Practice Section**: Student navigates to the "AI Practice Session" section
4. **Start Session**: Student clicks "Start Chat" button
5. **Session List**: Student sees previous sessions and conversations
6. **Start New Session**: Student clicks "Start AI Session" button
7. **Chat with AI Patient**: Student interacts with AI patient via chat
8. **End Session**: Student ends the conversation
9. **View Feedback**: AI supervisor provides analysis and feedback
10. **View Resources**: AI professor provides study materials and resources

### 2. AI Agent Integration

The system integrates with three AI agents:

- **AI Patient**: Simulates patient scenarios for medical practice
- **AI Supervisor**: Analyzes conversations and provides feedback
- **AI Professor**: Provides study materials and resources

## Database Schemas

### 1. AIChatSession
Stores session information and metadata.

**Key Fields:**
- `module_id`: Reference to the module
- `student_id`: Reference to the student
- `status`: Session status (active, completed, paused, cancelled)
- `started_at`: Session start time
- `ended_at`: Session end time
- `total_messages`: Total message count
- `student_messages`: Student message count
- `ai_messages`: AI message count

### 2. AIChatMessage
Stores individual messages in conversations.

**Key Fields:**
- `session_id`: Reference to the session
- `sender`: Message sender (student, ai_patient, ai_supervisor, ai_professor)
- `message_type`: Type of message (text, image, file, system)
- `content`: Message content
- `sequence`: Message sequence number
- `attachments`: File attachments

### 3. AIChatFeedback
Stores supervisor analysis and feedback.

**Key Fields:**
- `session_id`: Reference to the session
- `feedback_type`: Type of feedback (supervisor_analysis, student_rating, professor_feedback)
- `rating`: Numerical rating (1-5)
- `keywords`: Extracted keywords
- `mistakes`: Identified mistakes
- `strengths`: Student strengths
- `areas_for_improvement`: Areas needing improvement

### 4. AIResource
Stores study materials and resources.

**Key Fields:**
- `session_id`: Reference to the session
- `resource_type`: Type of resource (article, video, document, etc.)
- `category`: Resource category (study_material, practice_exercise, etc.)
- `url`: Resource URL
- `keywords`: Related keywords
- `related_mistakes`: Mistakes this resource addresses

## API Endpoints

### Session Management

```typescript
// Create new AI session
POST /ai-chat/sessions
{
  "module_id": "module_id",
  "student_id": "student_id",
  "session_title": "Optional title",
  "session_description": "Optional description"
}

// Get all sessions with filters
GET /ai-chat/sessions?module_id=xxx&student_id=xxx&status=active

// Get session by ID
GET /ai-chat/sessions/:id

// Update session
PUT /ai-chat/sessions/:id
{
  "status": "completed",
  "session_title": "Updated title"
}

// Complete session
POST /ai-chat/sessions/:id/complete

// Delete session
DELETE /ai-chat/sessions/:id
```

### Message Management

```typescript
// Create new message
POST /ai-chat/messages
{
  "session_id": "session_id",
  "module_id": "module_id",
  "student_id": "student_id",
  "sender": "student",
  "message_type": "text",
  "content": "Hello, I'm a medical student",
  "attachments": [],
  "sequence": 1
}

// Get messages by session
GET /ai-chat/sessions/:sessionId/messages
```

### Feedback Management

```typescript
// Create feedback
POST /ai-chat/feedback
{
  "session_id": "session_id",
  "module_id": "module_id",
  "student_id": "student_id",
  "feedback_type": "supervisor_analysis",
  "title": "Session Analysis",
  "content": "Detailed analysis of the conversation...",
  "rating": 4,
  "keywords": ["diagnosis", "symptoms"],
  "mistakes": ["Incorrect diagnosis"],
  "strengths": ["Good communication"],
  "areas_for_improvement": ["Clinical reasoning"]
}

// Get feedback by session
GET /ai-chat/sessions/:sessionId/feedback
```

### Resource Management

```typescript
// Create resource
POST /ai-chat/resources
{
  "session_id": "session_id",
  "module_id": "module_id",
  "student_id": "student_id",
  "title": "Diagnosis Guidelines",
  "description": "Comprehensive guide to medical diagnosis",
  "resource_type": "article",
  "category": "study_material",
  "url": "https://example.com/guide",
  "keywords": ["diagnosis", "clinical reasoning"],
  "related_mistakes": ["Incorrect diagnosis"]
}

// Get resources by session
GET /ai-chat/sessions/:sessionId/resources

// Mark resource as accessed
POST /ai-chat/resources/:id/access
```

## Integration with Python APIs

### 1. Start AI Session
```typescript
// Call Python API to start patient session
POST /chat/patient/start
{
  "module_id": "module_id",
  "student_id": "student_id",
  "session_id": "session_id"
}
```

### 2. AI Patient Chat
```typescript
// Send message to AI patient
POST /chat/patient/chat
{
  "session_id": "session_id",
  "message": "Student message",
  "context": "Previous conversation context"
}
```

### 3. Supervisor Analysis
```typescript
// Get supervisor analysis after session ends
POST /chat/supervisor/analyze
{
  "session_id": "session_id",
  "conversation": "Full conversation history",
  "module_context": "Module information"
}
```

### 4. Professor Resources
```typescript
// Get study resources based on analysis
POST /chat/professor/resources
{
  "session_id": "session_id",
  "keywords": ["extracted_keywords"],
  "mistakes": ["identified_mistakes"],
  "module_context": "Module information"
}
```

### 5. Keyword Extraction
```typescript
// Extract keywords from conversation
POST /chat/professor/keywords
{
  "session_id": "session_id",
  "conversation": "Full conversation history"
}
```

### 6. Knowledge Base Q&A
```typescript
// Get answers from knowledge base
POST /chat/qa/ask
{
  "question": "Student question",
  "context": "Session context"
}
```

### 7. Complete Session Workflow
```typescript
// Complete session with analysis and resources
POST /chat/workflow/complete-session
{
  "session_id": "session_id",
  "conversation": "Full conversation history",
  "module_context": "Module information"
}
```

## Implementation Example

```typescript
// 1. Student starts session
const session = await aiChatService.createAISession({
  module_id: "module_id",
  student_id: "student_id"
}, user);

// 2. Call Python API to start patient
const patientResponse = await pythonApi.post('/chat/patient/start', {
  session_id: session._id,
  module_id: session.module_id,
  student_id: session.student_id
});

// 3. Store student message
await aiChatService.createAIMessage({
  session_id: session._id,
  module_id: session.module_id,
  student_id: session.student_id,
  sender: MessageSenderEnum.STUDENT,
  message_type: MessageTypeEnum.TEXT,
  content: "Hello, I'm here to practice"
}, user);

// 4. Send to AI patient and store response
const aiResponse = await pythonApi.post('/chat/patient/chat', {
  session_id: session._id,
  message: "Hello, I'm here to practice"
});

await aiChatService.createAIMessage({
  session_id: session._id,
  module_id: session.module_id,
  student_id: session.student_id,
  sender: MessageSenderEnum.AI_PATIENT,
  message_type: MessageTypeEnum.TEXT,
  content: aiResponse.data.message
}, user);

// 5. Complete session
await aiChatService.completeAISession(session._id, user);

// 6. Get supervisor analysis
const analysis = await pythonApi.post('/chat/supervisor/analyze', {
  session_id: session._id,
  conversation: await getConversationHistory(session._id)
});

// 7. Store feedback
await aiChatService.createAIFeedback({
  session_id: session._id,
  module_id: session.module_id,
  student_id: session.student_id,
  feedback_type: FeedbackTypeEnum.SUPERVISOR_ANALYSIS,
  title: "Session Analysis",
  content: analysis.data.analysis,
  rating: analysis.data.rating,
  keywords: analysis.data.keywords,
  mistakes: analysis.data.mistakes,
  strengths: analysis.data.strengths,
  areas_for_improvement: analysis.data.areas_for_improvement
}, user);

// 8. Get professor resources
const resources = await pythonApi.post('/chat/professor/resources', {
  session_id: session._id,
  keywords: analysis.data.keywords,
  mistakes: analysis.data.mistakes
});

// 9. Store resources
for (const resource of resources.data.resources) {
  await aiChatService.createAIResource({
    session_id: session._id,
    module_id: session.module_id,
    student_id: session.student_id,
    title: resource.title,
    description: resource.description,
    resource_type: resource.type,
    category: resource.category,
    url: resource.url,
    keywords: resource.keywords,
    related_mistakes: resource.related_mistakes
  }, user);
}
```

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Users can only access their own sessions
3. **Data Validation**: All inputs are validated using DTOs
4. **Soft Deletes**: Data is soft deleted to maintain history
5. **Audit Trail**: All actions are logged with user information

## Error Handling

The module includes comprehensive error handling:

- **Validation Errors**: Invalid input data
- **Not Found Errors**: Resources not found
- **Business Logic Errors**: Invalid state transitions
- **Database Errors**: Connection and query errors

## Performance Considerations

1. **Indexing**: Proper database indexes on frequently queried fields
2. **Pagination**: Large result sets are paginated
3. **Caching**: Consider caching for frequently accessed data
4. **Connection Pooling**: Efficient database connection management

## Testing

The module should be tested with:

1. **Unit Tests**: Individual service methods
2. **Integration Tests**: API endpoints
3. **End-to-End Tests**: Complete workflows
4. **Performance Tests**: Load testing with multiple sessions 
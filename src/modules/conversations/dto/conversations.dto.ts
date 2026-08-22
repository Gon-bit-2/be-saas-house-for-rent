import { createZodDto } from 'nestjs-zod';
import {
  CreateConversationBodySchema,
  SendMessageBodySchema,
} from '../model/conversations.model';

export class CreateConversationBodyDTO extends createZodDto(CreateConversationBodySchema) {}
export class SendMessageBodyDTO extends createZodDto(SendMessageBodySchema) {}

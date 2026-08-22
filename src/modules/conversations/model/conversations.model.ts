import z from 'zod';

const ConversationTypeSchema = z.enum(['ROOM_CHAT', 'CONTRACT_CHAT', 'TICKET_CHAT', 'SUPPORT_CHAT']);
const MessageTypeSchema = z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']);

export const CreateConversationBodySchema = z
  .object({
    type: ConversationTypeSchema,
    tenantId: z.coerce.number().int().positive(),
    roomId: z.coerce.number().int().positive().optional(),
    contractId: z.coerce.number().int().positive().optional(),
    ticketId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const SendMessageBodySchema = z
  .object({
    messageType: MessageTypeSchema.default('TEXT'),
    content: z.string().trim().max(5000).optional(),
    fileUrl: z.string().trim().max(5000).optional(),
  })
  .strict()
  .refine((data) => data.content || data.fileUrl, {
    message: 'Either content or fileUrl must be provided',
    path: ['content'],
  });

export type TCreateConversationBodySchema = z.infer<typeof CreateConversationBodySchema>;
export type TSendMessageBodySchema = z.infer<typeof SendMessageBodySchema>;

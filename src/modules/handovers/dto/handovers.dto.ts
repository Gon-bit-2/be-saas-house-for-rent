import { createZodDto } from 'nestjs-zod'
import {
  ConfirmHandoverBodySchema,
  CreateHandoverBodySchema,
  DisputeHandoverBodySchema,
  ListHandoversQuerySchema,
  ResolveHandoverBodySchema,
  UpdateHandoverBodySchema,
} from '../model/handovers.model'

export class ListHandoversQueryDTO extends createZodDto(ListHandoversQuerySchema) {}
export class CreateHandoverBodyDTO extends createZodDto(CreateHandoverBodySchema) {}
export class UpdateHandoverBodyDTO extends createZodDto(UpdateHandoverBodySchema) {}
export class ConfirmHandoverBodyDTO extends createZodDto(ConfirmHandoverBodySchema) {}
export class DisputeHandoverBodyDTO extends createZodDto(DisputeHandoverBodySchema) {}
export class ResolveHandoverBodyDTO extends createZodDto(ResolveHandoverBodySchema) {}

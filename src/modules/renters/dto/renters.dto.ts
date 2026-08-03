import { createZodDto } from 'nestjs-zod'
import {
  AcceptRenterInvitationBodySchema,
  InviteRenterBodySchema,
  ListRentalHistoryQuerySchema,
  ListRentersQuerySchema,
  UpdateRenterProfileBodySchema,
  UpdateRenterForLandlordBodySchema,
} from '../model/renters.model'

export class ListRentersQueryDTO extends createZodDto(ListRentersQuerySchema) {}
export class ListRentalHistoryQueryDTO extends createZodDto(ListRentalHistoryQuerySchema) {}
export class UpdateRenterProfileBodyDTO extends createZodDto(UpdateRenterProfileBodySchema) {}
export class InviteRenterBodyDTO extends createZodDto(InviteRenterBodySchema) {}
export class AcceptRenterInvitationBodyDTO extends createZodDto(AcceptRenterInvitationBodySchema) {}
export class UpdateRenterForLandlordBodyDTO extends createZodDto(UpdateRenterForLandlordBodySchema) {}

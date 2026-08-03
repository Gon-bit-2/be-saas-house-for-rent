import { createZodDto } from 'nestjs-zod'
import {
  CreateReviewBodySchema,
  ListAdminReviewsQuerySchema,
  ListMyReviewsQuerySchema,
  ListPublicReviewsQuerySchema,
  UpdateReviewStatusBodySchema,
} from '../model/reviews.model'

export class CreateReviewBodyDTO extends createZodDto(CreateReviewBodySchema) {}
export class ListMyReviewsQueryDTO extends createZodDto(ListMyReviewsQuerySchema) {}
export class ListPublicReviewsQueryDTO extends createZodDto(ListPublicReviewsQuerySchema) {}
export class ListAdminReviewsQueryDTO extends createZodDto(ListAdminReviewsQuerySchema) {}
export class UpdateReviewStatusBodyDTO extends createZodDto(UpdateReviewStatusBodySchema) {}

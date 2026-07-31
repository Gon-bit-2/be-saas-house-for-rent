import { createZodDto } from 'nestjs-zod'
import {
  CompleteContractTerminationBodySchema,
  CreateContractTerminationBodySchema,
  EmptyContractTerminationBodySchema,
  ListContractTerminationsQuerySchema,
  ReviewContractTerminationBodySchema,
} from '../model/contract-terminations.model'

export class ListContractTerminationsQueryDTO extends createZodDto(ListContractTerminationsQuerySchema) {}
export class CreateContractTerminationBodyDTO extends createZodDto(CreateContractTerminationBodySchema) {}
export class ReviewContractTerminationBodyDTO extends createZodDto(ReviewContractTerminationBodySchema) {}
export class EmptyContractTerminationBodyDTO extends createZodDto(EmptyContractTerminationBodySchema) {}
export class CompleteContractTerminationBodyDTO extends createZodDto(CompleteContractTerminationBodySchema) {}

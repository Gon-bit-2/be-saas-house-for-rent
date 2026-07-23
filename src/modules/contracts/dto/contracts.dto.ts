import { createZodDto } from 'nestjs-zod'
import {
  CreateContractBodySchema,
  EmptyContractBodySchema,
  ListContractsQuerySchema,
  UpdateContractBodySchema,
} from '../model/contracts.model'

export class ListContractsQueryDTO extends createZodDto(ListContractsQuerySchema) {}
export class CreateContractBodyDTO extends createZodDto(CreateContractBodySchema) {}
export class UpdateContractBodyDTO extends createZodDto(UpdateContractBodySchema) {}
export class EmptyContractBodyDTO extends createZodDto(EmptyContractBodySchema) {}

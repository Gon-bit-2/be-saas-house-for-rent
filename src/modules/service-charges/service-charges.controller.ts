import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreateServiceAssignmentBodyDTO,
  CreateServiceCatalogItemBodyDTO,
  ListServiceAssignmentsQueryDTO,
  ListServiceCatalogQueryDTO,
  UpdateServiceAssignmentBodyDTO,
  UpdateServiceCatalogItemBodyDTO,
} from './dto/service-charges.dto'
import { ServiceChargesService } from './service-charges.service'

@Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
@Controller()
export class ServiceChargesController {
  constructor(private readonly service: ServiceChargesService) {}

  @Get('service-catalog')
  listCatalog(@ActiveUser() user: AccessTokenPayload, @Query() query: ListServiceCatalogQueryDTO) {
    return this.service.listCatalog(user.userId, query)
  }

  @Post('service-catalog')
  createCatalogItem(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateServiceCatalogItemBodyDTO) {
    return this.service.createCatalogItem(user.userId, body)
  }

  @Patch('service-catalog/:id')
  updateCatalogItem(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateServiceCatalogItemBodyDTO,
  ) {
    return this.service.updateCatalogItem(user.userId, id, body)
  }

  @Get('service-assignments')
  listAssignments(@ActiveUser() user: AccessTokenPayload, @Query() query: ListServiceAssignmentsQueryDTO) {
    return this.service.listAssignments(user.userId, query)
  }

  @Post('service-assignments')
  createAssignment(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateServiceAssignmentBodyDTO) {
    return this.service.createAssignment(user.userId, body)
  }

  @Patch('service-assignments/:id')
  updateAssignment(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateServiceAssignmentBodyDTO,
  ) {
    return this.service.updateAssignment(user.userId, id, body)
  }
}

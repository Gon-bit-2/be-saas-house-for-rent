import { SetMetadata } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'

export const ROLES_KEY = 'roles'
/**
 * Decorator to assign required user roles to a route or controller.
 * Decorator để gán các vai trò người dùng bắt buộc đối với một tuyến đường hoặc controller.
 *
 * @param {string[]} roles - List of authorized role names.
 * @param {string[]} roles - Danh sách tên các vai trò được phép.
 */
export const Roles = (...roles: string[]) => {
  return SetMetadata(ROLES_KEY, roles)
}

/**
 * Decorator helper to restrict route access exclusively to Administrators.
 * Decorator bổ trợ để giới hạn quyền truy cập tuyến đường độc quyền cho người quản trị (Admin).
 */
export const IsAdmin = () => Roles(roleName.ADMIN)

/**
 * Decorator helper to restrict route access exclusively to Landlords.
 * Decorator bổ trợ để giới hạn quyền truy cập tuyến đường độc quyền cho chủ trọ (Landlord).
 */
export const IsLandlord = () => Roles(roleName.LANDLORD)

/**
 * Decorator helper to restrict route access exclusively to Managers.
 * Decorator bổ trợ để giới hạn quyền truy cập tuyến đường độc quyền cho quản lý (Manager).
 */
export const IsManager = () => Roles(roleName.MANAGER)

/**
 * Decorator helper to restrict route access exclusively to Accountants.
 * Decorator bổ trợ để giới hạn quyền truy cập tuyến đường độc quyền cho kế toán (Accountant).
 */
export const IsAccountant = () => Roles(roleName.ACCOUNTANT)

/**
 * Decorator helper to restrict route access exclusively to Maintenance Staff.
 * Decorator bổ trợ để giới hạn quyền truy cập tuyến đường độc quyền cho nhân viên bảo trì (Maintenance Staff).
 */
export const IsMaintenanceStaff = () => Roles(roleName.MAINTENANCE_STAFF)

/**
 * Decorator helper to restrict route access exclusively to Tenants.
 * Decorator bổ trợ để giới hạn quyền truy cập tuyến đường độc quyền cho khách thuê (Tenant).
 */
export const IsTenant = () => Roles(roleName.TENANT)

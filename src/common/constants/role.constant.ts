const roleName = {
  ADMIN: 'ADMIN',
  LANDLORD: 'LANDLORD',
  MANAGER: 'MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  MAINTENANCE_STAFF: 'MAINTENANCE_STAFF',
  TENANT: 'TENANT',
} as const
export default roleName
export type RoleNameType = (typeof roleName)[keyof typeof roleName]

export const HTTPMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const

import type { RoleNameType } from '../constants/role.constant'

export interface IAccessTokenPayload {
  userId: number
  deviceId?: number
  roleId: string
  roleName: RoleNameType
}
export interface AccessTokenPayload extends IAccessTokenPayload {
  exp: number
  iat: number
}
export interface IRefreshTokenPayload {
  userId: number
}

export interface RefreshTokenPayload extends IRefreshTokenPayload {
  exp: number
  iat: number
}

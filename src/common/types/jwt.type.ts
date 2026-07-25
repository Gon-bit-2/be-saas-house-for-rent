export interface IAccessTokenPayload {
  userId: number
  deviceId?: number
  ver: 2
}

export interface DecodedAccessToken {
  userId: number
  deviceId?: number
  ver?: number
  roleId?: string
  roleName?: string
  jti?: string
  exp: number
  iat: number
}

export type AuthContextKind = 'IDENTITY' | 'SYSTEM' | 'RENTER' | 'TENANT'

export interface AccessTokenPayload {
  userId: number
  deviceId?: number
  ver?: number
  jti?: string
  exp?: number
  iat?: number
  contextKind?: AuthContextKind
  roleId?: string
  roleName: string
  tenantId?: number
  memberId?: number
}
export interface IRefreshTokenPayload {
  userId: number
}

export interface RefreshTokenPayload extends IRefreshTokenPayload {
  exp: number
  iat: number
}

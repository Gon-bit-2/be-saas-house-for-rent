import { createZodDto } from 'nestjs-zod'
import {
  ForgotPasswordBodySchema,
  GetAuthorizationUrlResSchema,
  GoogleAuthStateSchema,
  GoogleSessionBodySchema,
  GoogleSessionResSchema,
  LoginBodySchema,
  LoginResSchema,
  LogoutBodySchema,
  RefreshTokenBodySchema,
  RefreshTokenResSchema,
  RegisterBodySchema,
  RegisterResSchema,
  SendOTPBodySchema,
  UpdateProfileBodySchema,
  UpdateProfileResSchema,
  VerifyOTPBodySchema,
} from '../model/auth.model'

export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

export class RegisterResDTO extends createZodDto(RegisterResSchema) {}
export class SendOTPBodyDTO extends createZodDto(SendOTPBodySchema) {}
export class VerifyOTPBodyDTO extends createZodDto(VerifyOTPBodySchema) {}
export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}
export class LoginResDTO extends createZodDto(LoginResSchema) {}
export class RefreshTokenBodyDTO extends createZodDto(RefreshTokenBodySchema) {}
export class RefreshTokenResDTO extends createZodDto(RefreshTokenResSchema) {}
// export class GetUsserProfileResDTO extends createZodDto(GetUsserProfileResSchema) {}
export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}
export class GoogleAuthStateDTO extends createZodDto(GoogleAuthStateSchema) {}
export class GetAuthorizationUrlResDTO extends createZodDto(GetAuthorizationUrlResSchema) {}
export class GoogleSessionBodyDTO extends createZodDto(GoogleSessionBodySchema) {}
export class GoogleSessionResDTO extends createZodDto(GoogleSessionResSchema) {}
export class ForgotPasswordBodyDTO extends createZodDto(ForgotPasswordBodySchema) {}
export class UpdateProfileBodyDTO extends createZodDto(UpdateProfileBodySchema) {}
export class UpdateProfileResDTO extends createZodDto(UpdateProfileResSchema) {}

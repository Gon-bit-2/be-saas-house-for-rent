declare module 'bcrypt' {
  export function hash(value: string | Buffer, saltOrRounds: string | number): Promise<string>
  export function compare(value: string | Buffer, encrypted: string): Promise<boolean>
}

import { Injectable } from '@nestjs/common'
import { compare, hash } from 'bcrypt'
import { createHash } from 'crypto'
const saltRound = 10
/**
 * Service that provides secure string hashing and comparison using bcrypt.
 * Service cung cấp tính năng băm (hashing) và so sánh chuỗi bảo mật sử dụng bcrypt.
 *
 * Typically used for encrypting and verifying user passwords.
 * Thường được sử dụng để mã hóa và xác thực mật khẩu người dùng.
 */
@Injectable()
export class HashingService {
  /**
   * Hashes a plain text string using bcrypt with a salt round of 10.
   * Thực hiện băm một chuỗi văn bản thường sử dụng bcrypt với salt round là 10.
   *
   * @param {string} value - The plain text value to hash.
   * @param {string} value - Giá trị văn bản thường cần băm.
   * @returns {Promise<string>} The generated secure hash string.
   * @returns {Promise<string>} Chuỗi băm bảo mật đã tạo.
   */
  hash(value: string): Promise<string> {
    return hash(value, saltRound)
  }

  /**
   * Compares a plain text string with a hashed string to check if they match.
   * So sánh một chuỗi văn bản thường với một chuỗi đã băm để kiểm tra xem chúng có khớp hay không.
   *
   * @param {string} value - The plain text value to compare.
   * @param {string} value - Giá trị văn bản thường cần so sánh.
   * @param {string} hash - The hashed string to compare against.
   * @param {string} hash - Chuỗi đã băm để đối chiếu.
   * @returns {Promise<boolean>} True if they match, false otherwise.
   * @returns {Promise<boolean>} True nếu khớp, ngược lại là false.
   */
  compare(value: string, hashStr: string): Promise<boolean> {
    return compare(value, hashStr)
  }

  /**
   * Hashes a string using SHA-256 (deterministic, synchronous).
   * Băm chuỗi sử dụng SHA-256 (xác định, đồng bộ).
   *
   * Dùng cho refresh token: cùng token → cùng hash → tìm được trong DB.
   * Không dùng bcrypt vì bcrypt không deterministic (mỗi lần hash ra kết quả khác).
   *
   * @param {string} value - The plain text value to hash.
   * @param {string} value - Giá trị văn bản thường cần băm.
   * @returns {string} The SHA-256 hash string in hex format.
   * @returns {string} Chuỗi băm SHA-256 dạng hex.
   */
  hashSHA256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}

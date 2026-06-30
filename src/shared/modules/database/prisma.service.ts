import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Tự động kết nối tới cơ sở dữ liệu khi module được khởi tạo
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Tự động ngắt kết nối với cơ sở dữ liệu khi module bị hủy (ví dụ khi dừng ứng dụng)
   * Đây là phương thức bắt buộc phải có để thỏa mãn interface OnModuleDestroy
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

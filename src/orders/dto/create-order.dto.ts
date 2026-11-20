import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: '12 Nguyễn Trãi, Quận 1, TP.HCM' })
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  @IsString()
  shippingAddress: string;

  @ApiProperty({
    enum: ['COD', 'BANK_TRANSFER', 'E_WALLET'],
    example: 'COD',
    description: 'COD = thanh toán khi nhận hàng. BANK_TRANSFER / E_WALLET cần gọi payment-callback.',
  })
  @IsIn(['COD', 'BANK_TRANSFER', 'E_WALLET'], { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'E_WALLET';

  // Mã giảm giá (không bắt buộc)
  @ApiPropertyOptional({ example: 'SALE50K', description: 'Kiểm tra trước bằng GET /vouchers/check/{code}' })
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

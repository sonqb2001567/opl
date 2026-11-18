import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  @IsString()
  shippingAddress: string;

  @IsIn(['COD', 'BANK_TRANSFER', 'E_WALLET'], { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'E_WALLET';

  // Mã giảm giá (không bắt buộc)
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

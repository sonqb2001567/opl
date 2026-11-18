import { Injectable } from '@nestjs/common';

// Lưu cấu hình đơn giản trong bộ nhớ (sẽ reset khi restart server)
@Injectable()
export class SettingsService {
  private shippingFee = 30000; // phí vận chuyển mặc định 30.000đ

  getShippingFee() {
    return this.shippingFee;
  }

  setShippingFee(fee: number) {
    this.shippingFee = fee;
    return this.shippingFee;
  }
}

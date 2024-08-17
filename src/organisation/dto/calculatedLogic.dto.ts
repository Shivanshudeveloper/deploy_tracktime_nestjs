import { IsDecimal, IsNumber } from 'class-validator';

export class CreateCalculatedLogicDto {
  @IsNumber()
  fullDayActiveTime: number;

  @IsNumber()
  fullDayCoreProductiveTime: number;

  @IsNumber()
  halfDayActiveTime: number;

  @IsNumber()
  halfDayCoreProductiveTime: number;
}


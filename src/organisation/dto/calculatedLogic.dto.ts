import { IsDecimal, IsNotEmpty, IsNumber, IsString } from 'class-validator';

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


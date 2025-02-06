import { IsDecimal, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCalculatedLogicDto {
  @IsNumber()
  fullDayActiveTime: number;

  @IsNumber()
  fullDayCoreProductiveTime: number;
  
  @IsNumber()
  fullDayProductiveTime: number;

  @IsNumber()
  fullDayIdleTime: number;

  @IsNumber()
  halfDayActiveTime: number;

  @IsNumber()
  halfDayCoreProductiveTime: number;

  @IsNumber()
  halfDayProductiveTime: number;
  
  @IsNumber()
  halfDayIdleTime: number;
  
}
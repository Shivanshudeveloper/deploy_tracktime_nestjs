import { IsDecimal, IsNotEmpty, IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

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

  // Add this new field
  @IsOptional()
  @IsString()
  @IsIn(['coreProductivePlusProductive', 'activeTimePlusIdleTime', 'coreProductiveOnly', 'activeTimePlusIdleTimeAlt'])
  timesheetCalculationLogic?: string;
}
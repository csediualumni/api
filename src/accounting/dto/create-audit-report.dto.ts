import { IsInt, IsIn, Min, Max, IsOptional, IsString } from 'class-validator';

export class CreateAuditReportDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsInt()
  @Min(0)
  openingBalance: number;

  @IsOptional()
  @IsString()
  summary?: string;
}

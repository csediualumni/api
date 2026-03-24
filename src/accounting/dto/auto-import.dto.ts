import { IsInt, Min, Max } from 'class-validator';

export class AutoImportDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;
}

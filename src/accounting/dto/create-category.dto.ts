import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import type { CategoryType } from '../../entities/account-category.entity';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsIn(['income', 'expense', 'both'])
  type?: CategoryType;
}

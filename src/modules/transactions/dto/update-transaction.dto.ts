import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Used by admin to mark a transaction as paid or waived */
export class MarkPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}

export class WaiveDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DepositRequestDto {
  /** Amount in your platform's currency (e.g. NGN) */
  @IsNumber()
  @Min(100)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
  // proofImage comes as a multipart file — not validated here
}

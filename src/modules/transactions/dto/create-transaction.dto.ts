import { IsMongoId, IsNumber, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsMongoId()
  jobId: string;

  @IsMongoId()
  providerId: string;

  @IsMongoId()
  clientId: string;

  @IsNumber()
  @Min(0)
  agreedPrice: number;
}

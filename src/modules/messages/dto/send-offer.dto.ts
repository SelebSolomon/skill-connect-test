import { IsMongoId, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SendOfferDto {
  @IsMongoId()
  conversationId: string;

  @IsNumber()
  @Min(1)
  price: number;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(1)
  @Max(365)
  deliveryDays: number;

  @IsMongoId()
  serviceId: string;
}

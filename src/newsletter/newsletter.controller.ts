import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { NewsletterService } from './newsletter.service';

class SubscribeDto {
  @IsEmail() email: string;
}

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto.email);
  }

  @Get('unsubscribe')
  @HttpCode(HttpStatus.OK)
  unsubscribe(@Body() dto: { token: string }) {
    return this.newsletter.unsubscribe(dto.token);
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ContactService } from './contact.service';

class CreateContactTicketDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() @MaxLength(300) subject: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) message: string;
}

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** Public: anyone can submit a contact form */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: CreateContactTicketDto) {
    return this.contact.createTicket(dto);
  }
}

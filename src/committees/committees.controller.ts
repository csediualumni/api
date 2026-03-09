import { Controller, Get, Param } from '@nestjs/common';
import { CommitteesService } from './committees.service';

/** Public — no auth required. Used by the Committee and About pages. */
@Controller('committees')
export class CommitteesController {
  constructor(private readonly committees: CommitteesService) {}

  @Get()
  findAll() {
    return this.committees.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.committees.findOne(id);
  }
}

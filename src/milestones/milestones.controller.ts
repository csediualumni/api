import { Controller, Get } from '@nestjs/common';
import { MilestonesService } from './milestones.service';

/** Public endpoint — no auth required.  Used by the About page. */
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  findAll() {
    return this.milestones.findAll();
  }
}

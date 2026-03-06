import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Public alumni directory — excludes the seeded admin account */
  @Get()
  listPublic() {
    return this.users.findPublicAlumni();
  }
}

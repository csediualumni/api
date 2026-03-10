import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { MembershipService } from './membership.service';
import { IsString, MinLength } from 'class-validator';

class RejectDto {
  @IsString()
  @MinLength(1)
  reason: string;
}

@Controller('membership')
@UseGuards(JwtAuthGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  /**
   * POST /membership/apply
   * Any authenticated user (guest) submits their membership application.
   */
  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  apply(@Request() req: { user: { id: string } }) {
    return this.membership.apply(req.user.id);
  }

  /**
   * GET /membership/my
   * Current user retrieves their own application status.
   */
  @Get('my')
  getMyApplication(@Request() req: { user: { id: string } }) {
    return this.membership.getMyApplication(req.user.id);
  }

  /**
   * GET /membership/requests
   * Privileged: list all applications.
   */
  @Get('requests')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ)
  listRequests() {
    return this.membership.listRequests();
  }

  /**
   * GET /membership/requests/:id
   * Privileged: fetch a single application.
   */
  @Get('requests/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ)
  findRequest(@Param('id') id: string) {
    return this.membership.findRequest(id);
  }

  /**
   * PATCH /membership/requests/:id/approve
   * Privileged: approve an application.
   */
  @Patch('requests/:id/approve')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_REVIEW)
  approve(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.membership.approve(id, req.user.id);
  }

  /**
   * PATCH /membership/requests/:id/reject
   * Privileged: reject an application.
   */
  @Patch('requests/:id/reject')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_REVIEW)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.membership.reject(id, req.user.id, dto.reason);
  }
}

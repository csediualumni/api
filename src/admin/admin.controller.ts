import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { UsersService } from '../users/users.service';
import { NewsletterService } from '../newsletter/newsletter.service';
import { ContactService } from '../contact/contact.service';
import { MilestonesService, CreateMilestoneDto, UpdateMilestoneDto } from '../milestones/milestones.service';
import { CommitteesService, CreateCommitteeDto, UpdateCommitteeDto, AddCommitteeMemberDto, UpdateCommitteeMemberDto, SetDesignationMappingDto } from '../committees/committees.service';
import { IsArray, IsString, IsNotEmpty, IsIn, IsUUID } from 'class-validator';

class UpdateDesignationMappingDto {
  @IsUUID() roleId: string;
}

class SetRolesDto {
  @IsArray() @IsString({ each: true }) roleIds: string[];
}

class SendNewsletterDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() htmlBody: string;
}

class UpdateTicketStatusDto {
  @IsString() @IsIn(['open', 'in_progress', 'resolved']) status: string;
}

class AddTicketCommentDto {
  @IsString() @IsNotEmpty() body: string;
  @IsString() @IsNotEmpty() authorName: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly newsletter: NewsletterService,
    private readonly contact: ContactService,
    private readonly milestonesService: MilestonesService,
    private readonly committeesService: CommitteesService,
  ) {}

  // ── Users ──────────────────────────────────────────────────

  @Get('users')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  listUsers() {
    return this.users.findAll();
  }

  // ── Role assignment on users ───────────────────────────────

  /** Replace all roles on a user */
  @Post('users/:id/roles')
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  setRoles(@Param('id') id: string, @Body() dto: SetRolesDto) {
    return this.users.setRoles(id, dto.roleIds);
  }

  /** Add a single role to a user */
  @Post('users/:id/roles/:roleId')
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  addRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.users.addRole(id, roleId);
  }

  /** Remove a single role from a user */
  @Delete('users/:id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.users.removeRole(id, roleId);
  }

  // ── Newsletter subscriptions ───────────────────────────────

  @Get('newsletter/subscriptions')
  @RequirePermissions(PERMISSIONS.NEWSLETTER_READ)
  listSubscriptions() {
    return this.newsletter.findAll();
  }

  @Patch('newsletter/subscriptions/:id/toggle')
  @RequirePermissions(PERMISSIONS.NEWSLETTER_WRITE)
  toggleSubscription(@Param('id') id: string) {
    return this.newsletter.toggleActive(id);
  }

  @Delete('newsletter/subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.NEWSLETTER_WRITE)
  removeSubscription(@Param('id') id: string) {
    return this.newsletter.remove(id);
  }

  @Post('newsletter/send')
  @RequirePermissions(PERMISSIONS.NEWSLETTER_WRITE)
  sendNewsletter(@Body() dto: SendNewsletterDto) {
    return this.newsletter.sendBroadcast(dto.subject, dto.htmlBody);
  }

  // ── Contact Tickets ────────────────────────────────────────

  @Get('contact/tickets')
  @RequirePermissions(PERMISSIONS.CONTACT_READ)
  listTickets() {
    return this.contact.findAll();
  }

  @Get('contact/tickets/:id')
  @RequirePermissions(PERMISSIONS.CONTACT_READ)
  getTicket(@Param('id') id: string) {
    return this.contact.findOne(id);
  }

  @Patch('contact/tickets/:id/status')
  @RequirePermissions(PERMISSIONS.CONTACT_WRITE)
  updateTicketStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.contact.updateStatus(id, dto.status as any);
  }

  @Post('contact/tickets/:id/comments')
  @RequirePermissions(PERMISSIONS.CONTACT_WRITE)
  addComment(@Param('id') id: string, @Body() dto: AddTicketCommentDto) {
    return this.contact.addComment(id, { body: dto.body, authorName: dto.authorName });
  }

  @Delete('contact/tickets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.CONTACT_WRITE)
  deleteTicket(@Param('id') id: string) {
    return this.contact.remove(id);
  }

  // ── Milestones ─────────────────────────────────────────────

  @Get('milestones')
  @RequirePermissions(PERMISSIONS.MILESTONES_READ)
  listMilestones() {
    return this.milestonesService.findAll();
  }

  @Post('milestones')
  @RequirePermissions(PERMISSIONS.MILESTONES_WRITE)
  createMilestone(@Body() dto: CreateMilestoneDto) {
    return this.milestonesService.create(dto);
  }

  @Patch('milestones/:id')
  @RequirePermissions(PERMISSIONS.MILESTONES_WRITE)
  updateMilestone(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestonesService.update(id, dto);
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.MILESTONES_WRITE)
  deleteMilestone(@Param('id') id: string) {
    return this.milestonesService.remove(id);
  }

  // ── Committees ──────────────────────────────────────────

  @Get('committees')
  @RequirePermissions(PERMISSIONS.COMMITTEES_READ)
  listCommittees() {
    return this.committeesService.findAll();
  }

  @Post('committees')
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  createCommittee(@Body() dto: CreateCommitteeDto) {
    return this.committeesService.create(dto);
  }

  @Patch('committees/:id')
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  updateCommittee(@Param('id') id: string, @Body() dto: UpdateCommitteeDto) {
    return this.committeesService.update(id, dto);
  }

  @Delete('committees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  deleteCommittee(@Param('id') id: string) {
    return this.committeesService.remove(id);
  }

  @Post('committees/:id/members')
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  addCommitteeMember(@Param('id') id: string, @Body() dto: AddCommitteeMemberDto) {
    return this.committeesService.addMember(id, dto);
  }

  @Patch('committees/members/:memberId')
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  updateCommitteeMember(@Param('memberId') memberId: string, @Body() dto: UpdateCommitteeMemberDto) {
    return this.committeesService.updateMember(memberId, dto);
  }

  @Delete('committees/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  removeCommitteeMember(@Param('memberId') memberId: string) {
    return this.committeesService.removeMember(memberId);
  }

  // ── Designation → Role mappings ──────────────────────────────

  @Get('designation-roles')
  @RequirePermissions(PERMISSIONS.COMMITTEES_READ)
  listDesignationMappings() {
    return this.committeesService.listMappings();
  }

  @Post('designation-roles')
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  setDesignationMapping(@Body() dto: SetDesignationMappingDto) {
    return this.committeesService.setMapping(dto);
  }

  @Patch('designation-roles/:id')
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  updateDesignationMapping(@Param('id') id: string, @Body() dto: UpdateDesignationMappingDto) {
    return this.committeesService.updateMapping(id, dto.roleId);
  }

  @Delete('designation-roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.COMMITTEES_WRITE)
  removeDesignationMapping(@Param('id') id: string) {
    return this.committeesService.removeMapping(id);
  }
}

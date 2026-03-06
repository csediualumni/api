import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AdminModule } from './admin/admin.module';
import { InvoicesModule } from './invoices/invoices.module';
import { Invoice } from './entities/invoice.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserExperience } from './entities/user-experience.entity';
import { UserEducation } from './entities/user-education.entity';
import { UserAchievement } from './entities/user-achievement.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, Role, Permission, UserRole, RolePermission, Invoice, InvoicePayment, UserExperience, UserEducation, UserAchievement],
        synchronize: true,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    UsersModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    AdminModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

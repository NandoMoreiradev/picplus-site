import { Module } from '@nestjs/common';
import { AcademyAdminController } from './academy-admin.controller';
import { AcademyAdminService } from './academy-admin.service';
import { AcademyAuthService } from './academy-auth.service';
import { AcademyPublicController } from './academy-public.controller';
import { AcademyStudentService } from './academy-student.service';
import { MercadoPagoService } from './mercado-pago.service';

@Module({
  controllers: [AcademyAdminController, AcademyPublicController],
  providers: [
    AcademyAuthService,
    AcademyAdminService,
    AcademyStudentService,
    MercadoPagoService,
  ],
  exports: [
    AcademyAuthService,
    AcademyAdminService,
    AcademyStudentService,
    MercadoPagoService,
  ],
})
export class AcademyModule {}

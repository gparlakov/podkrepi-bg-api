import { EmailService } from './../email/email.service'
import { Module } from '@nestjs/common'
import { CampaignApplicationService } from './campaign-application.service'
import { CampaignApplicationController } from './campaign-application.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PersonModule } from '../person/person.module'
import { OrganizerModule } from '../organizer/organizer.module'
import { S3Service } from '../s3/s3.service'
import { TemplateService } from '../email/template.service'
@Module({
  imports: [PrismaModule, PersonModule, OrganizerModule],
  controllers: [CampaignApplicationController],
  providers: [CampaignApplicationService, S3Service, EmailService, TemplateService],
})
export class CampaignApplicationModule {}

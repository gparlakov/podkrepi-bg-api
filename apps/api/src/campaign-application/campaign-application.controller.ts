import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Response,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiTags } from '@nestjs/swagger'
import { AuthenticatedUser } from 'nest-keycloak-connect'
import { KeycloakTokenParsed, isAdmin } from '../auth/keycloak'
import { validateFileType } from '../common/files'
import { PersonService } from '../person/person.service'
import { CampaignApplicationService } from './campaign-application.service'
import { CreateCampaignApplicationDto } from './dto/create-campaign-application.dto'
import { UpdateCampaignApplicationDto } from './dto/update-campaign-application.dto'

@ApiTags('campaign-application')
@Controller('campaign-application')
export class CampaignApplicationController {
  constructor(
    private readonly campaignApplicationService: CampaignApplicationService,
    private readonly personService: PersonService,
  ) {}

  @Post('create')
  async create(
    @Body() createCampaignApplicationDto: CreateCampaignApplicationDto,
    @AuthenticatedUser() user: KeycloakTokenParsed,
  ) {
    const person = await this.personService.findOneByKeycloakId(user.sub)
    if (!person) {
      Logger.error('No person found in database')
      throw new NotFoundException('No person found in database')
    }

    return this.campaignApplicationService.create(createCampaignApplicationDto, person)
  }

  @Post('uploadFile/:id')
  @UseInterceptors(
    FilesInterceptor('file', 10, {
      limits: { fileSize: 1024 * 1024 * 30 },
      fileFilter: (_req: Request, file, cb) => {
        validateFileType(file, cb)
      },
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Param('id') id: string,
    @AuthenticatedUser() user: KeycloakTokenParsed,
  ) {
    const person = await this.personService.findOneByKeycloakId(user.sub)
    if (!person) {
      Logger.error('No person found in database')
      throw new NotFoundException('No person found in database')
    }

    return this.campaignApplicationService.uploadFiles(id, person, files)
  }

  @Get('list')
  findAll(@AuthenticatedUser() user: KeycloakTokenParsed) {
    if (!isAdmin(user)) {
      throw new ForbiddenException('Must be admin to get all campaign-applications')
    }
    return this.campaignApplicationService.findAll()
  }

  @Get('byId/:id')
  async findOne(@Param('id') id: string, @AuthenticatedUser() user: KeycloakTokenParsed) {
    const person = await this.personService.findOneByKeycloakId(user.sub)
    if (!person) {
      Logger.error('No person found in database')
      throw new NotFoundException('No person found in database')
    }

    const isAdminFlag = isAdmin(user)

    return this.campaignApplicationService.findOne(id, isAdminFlag, person)
  }

  @Delete('fileById/:id')
  async deleteFile(@Param('id') id: string, @AuthenticatedUser() user: KeycloakTokenParsed) {
    const person = await this.personService.findOneByKeycloakId(user.sub)
    if (!person) {
      Logger.error('No person found in database')
      throw new NotFoundException('No person found in database')
    }

    const isAdminFlag = isAdmin(user)

    return this.campaignApplicationService.deleteFile(id, isAdminFlag, person)
  }

  @Get('fileById/:id')
  async fetchFile(
    @Param('id') id: string,
    @AuthenticatedUser() user: KeycloakTokenParsed,
    @Response({ passthrough: true }) res,
  ): Promise<StreamableFile> {
    const person = await this.personService.findOneByKeycloakId(user.sub)
    if (!person) {
      Logger.error('No person found in database')
      throw new NotFoundException('No person found in database')
    }

    const isAdminFlag = isAdmin(user)

    const file = await this.campaignApplicationService.getFile(id, isAdminFlag, person)

    res.set({
      'Content-Type': file?.mimetype,
      'Content-Disposition': 'attachment; filename="' + file.filename + '"',
      'Cache-Control': (file.mimetype ?? '').startsWith('image/')
        ? 'public, s-maxage=15552000, stale-while-revalidate=15552000, immutable'
        : 'no-store',
    })

    return new StreamableFile(file.stream)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCampaignApplicationDto: UpdateCampaignApplicationDto,
    @AuthenticatedUser() user: KeycloakTokenParsed,
  ) {
    const person = await this.personService.findOneByKeycloakId(user.sub)
    if (!person) throw new NotFoundException('User is not found')

    let isAdminFlag

    if (isAdmin(user)) {
      isAdminFlag = true
      return this.campaignApplicationService.updateCampaignApplication(
        id,
        updateCampaignApplicationDto,
        isAdminFlag,
        'ADMIN',
      )
    } else {
      if (!person.organizer) throw new NotFoundException('User has no campaigns')
      isAdminFlag = false
      return this.campaignApplicationService.updateCampaignApplication(
        id,
        updateCampaignApplicationDto,
        isAdminFlag,
        person.organizer.id,
      )
    }
  }
}

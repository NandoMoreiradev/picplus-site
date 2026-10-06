import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Public } from '../common/decorators/public.decorator';
import {
  ApproveInfluencerDto,
  ListInfluencersQueryDto,
  ListShowcaseQueryDto,
  RegisterInfluencerDto,
  RejectInfluencerDto,
  ShowcaseToggleDto,
  UpdateInfluencerDto,
} from './dto/influencer.dto';
import { InfluencersService } from './influencers.service';
import type { RegisterFiles } from './influencers.service';

@Public()
@Controller('influencers')
export class InfluencersController {
  constructor(private readonly influencers: InfluencersService) {}

  /** Formulário público de cadastro (multipart). 5 envios por hora por IP. */
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(201)
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
        { name: 'presentationPdf', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024, files: 3 },
      },
    ),
  )
  register(
    @Body() dto: RegisterInfluencerDto,
    @UploadedFiles() files: RegisterFiles,
  ) {
    return this.influencers.register(dto, files ?? {});
  }

  @Get('showcase')
  showcase(@Query() query: ListShowcaseQueryDto) {
    return this.influencers.listShowcase(query);
  }

  @Get('showcase/niches')
  niches() {
    return this.influencers.showcaseNiches();
  }

  @Get('showcase/:id')
  showcaseOne(@Param('id') id: string) {
    return this.influencers.findShowcase(id);
  }
}

@Controller('admin/influencers')
export class AdminInfluencersController {
  constructor(private readonly influencers: InfluencersService) {}

  @Get()
  list(@Query() query: ListInfluencersQueryDto) {
    return this.influencers.listAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.influencers.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInfluencerDto) {
    return this.influencers.update(id, dto);
  }

  @HttpCode(200)
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveInfluencerDto) {
    return this.influencers.approve(id, dto);
  }

  @HttpCode(200)
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectInfluencerDto) {
    return this.influencers.reject(id, dto);
  }

  @Patch(':id/showcase')
  showcase(@Param('id') id: string, @Body() dto: ShowcaseToggleDto) {
    return this.influencers.setShowcase(id, dto.show);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.influencers.remove(id);
  }
}

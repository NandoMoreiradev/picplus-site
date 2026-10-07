import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Resource } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';
import { TestimonialsService } from './testimonials.service';

@Public()
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  list() {
    return this.testimonials.listPublic();
  }
}

@Resource('testimonials')
@Controller('admin/testimonials')
export class AdminTestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  list() {
    return this.testimonials.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testimonials.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTestimonialDto) {
    return this.testimonials.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonials.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testimonials.remove(id);
  }
}

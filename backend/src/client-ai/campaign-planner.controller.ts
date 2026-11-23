import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  Resource,
} from '../common/decorators/permissions.decorator';
import { CampaignPlannerService } from './campaign-planner.service';
import {
  GenerateCampaignPlanDto,
  PublishCampaignPlanDto,
  UpdateCampaignPlanItemDto,
} from './dto/campaign-planner.dto';

@Resource('ai_studio')
@Controller('admin/ai-studio/planner')
export class CampaignPlannerController {
  constructor(private readonly planner: CampaignPlannerService) {}

  @Get('projects/:projectId')
  @RequirePermissions('ai_studio.view')
  listPlans(@Param('projectId') projectId: string) {
    return this.planner.listPlans(projectId);
  }

  @Get(':planId')
  @RequirePermissions('ai_studio.view')
  getPlan(@Param('planId') planId: string) {
    return this.planner.getPlan(planId);
  }

  @Post('projects/:projectId/generate')
  @RequirePermissions('ai_studio.manage')
  generatePlan(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateCampaignPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.planner.generatePlan(projectId, dto, user.sub);
  }

  @Patch('items/:itemId')
  @RequirePermissions('ai_studio.manage')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCampaignPlanItemDto,
  ) {
    return this.planner.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('ai_studio.manage')
  deleteItem(@Param('itemId') itemId: string) {
    return this.planner.deleteItem(itemId);
  }

  @Delete(':planId')
  @RequirePermissions('ai_studio.manage')
  deletePlan(@Param('planId') planId: string) {
    return this.planner.deletePlan(planId);
  }

  @Post(':planId/publish')
  @RequirePermissions('ai_studio.manage', 'tasks.create')
  publishPlan(
    @Param('planId') planId: string,
    @Body() dto: PublishCampaignPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.planner.publishPlan(planId, dto, user.sub);
  }
}

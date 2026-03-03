import { AmcService } from './amc.service';
import { AmcReminderService } from './amc-reminder.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('amc')
@UseGuards(JwtAuthGuard)
export class AmcController {
  constructor(
    private amc: AmcService,
    private reminderService: AmcReminderService,
  ) {}

  @Get()
  list(@Query() query: any) {
    return this.amc.list(query);
  }

  @Get('summary')
  summary() {
    return this.amc.summary();

  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.amc.get(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.amc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.amc.update(id, body);
  }

  @Patch(':id/renew')
  renew(@Param('id') id: string, @Body() body: any) {
    return this.amc.renew(id, body);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.amc.cancel(id);
  }

  @Post('test-reminders')
  testReminders() {
    return this.reminderService.sendReminders();
  }

@Delete('reminder-logs')
  clearReminderLogs() {
    return this.amc.clearReminderLogs();
  }}
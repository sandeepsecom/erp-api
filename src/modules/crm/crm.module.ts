import { Module } from '@nestjs/common';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';
import { LeadsController } from './leads/leads.controller';
import { LeadsService } from './leads/leads.service';
import { ActivitiesController } from './activities/activities.controller';
import { ActivitiesService } from './activities/activities.service';
import { ChatterController } from './chatter/chatter.controller';
import { ChatterService } from './chatter/chatter.service';

@Module({
  controllers: [
    ContactsController,
    LeadsController,
    ActivitiesController,
    ChatterController,
  ],
  providers: [
    ContactsService,
    LeadsService,
    ActivitiesService,
    ChatterService,
  ],
  exports: [ContactsService, LeadsService, ChatterService],
})
export class CrmModule {}
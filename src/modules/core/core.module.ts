import { Module } from '@nestjs/common';
import { SequenceService } from './sequences/sequence.service';

@Module({
  providers: [SequenceService],
  exports: [SequenceService],
})
export class CoreModule {}
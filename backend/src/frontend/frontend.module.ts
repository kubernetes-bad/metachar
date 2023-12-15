import { forwardRef, Module } from '@nestjs/common';
import CharactersModule from '../chars/chars.module.js';
import FrontendController from './frontend.controller.js';

@Module({
  imports: [forwardRef(() => CharactersModule)],
  exports: [FrontendController],
})
export default class FrontendModule {}

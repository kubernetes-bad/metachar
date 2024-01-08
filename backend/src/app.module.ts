import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TagsModule } from './tags/tags.module.js';
import configuration from './config/configuration.js';
import ChubModule from './chub/chub.module.js';
import S3Module from './s3/s3.module.js';
import ImagesModule from './images/images.module.js';
import JanitorModule from './janitor/janitor.module.js';
import CharactersModule from './chars/chars.module.js';
import FrontendController from './frontend/frontend.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        autoLoadEntities: true,
        type: 'mysql',
        host: config.getOrThrow<string>('db.host'),
        port: config.getOrThrow<number>('db.port'),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('db.database'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: true,
        // logging: true,
      }),
    }),
    ChubModule,
    S3Module,
    ImagesModule,
    JanitorModule,
    CharactersModule,
    TagsModule,
  ],
  controllers: [FrontendController],
  providers: [],
})
export class AppModule {}

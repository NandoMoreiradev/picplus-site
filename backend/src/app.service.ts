import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'picplus-api',
      timestamp: new Date().toISOString(),
    };
  }
}

import { AxiosInstance } from 'axios';

const TIMEOUT = 60 * 1000;

export default class Flaresolverr {
  constructor(private readonly client: AxiosInstance) {}

  async get(url: string): Promise<string> {
    const result = await this.client.post<FlaresolverrResponse>('', {
      cmd: 'request.get',
      url: url,
      headers: { 'Content-Type': 'application/json' },
      maxTimeout: TIMEOUT,
    });
    return result.data.solution.response;
  }
}

export type FlaresolverrResponse = {
  status: string;
  message: string;
  solution: {
    url: string,
    status: number,
    cookies: {
      domain: string,
      expiry: number,
      httpOnly: boolean,
      name: string,
      path: string,
      sameSite: string,
      secure: boolean,
      value: string,
    }[],
    userAgent: string,
    headers: { [key: string]: string },
    response: string,
  };
}

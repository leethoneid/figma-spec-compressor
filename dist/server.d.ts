import http from 'node:http';
export interface ServerOptions {
    maxBodyBytes?: number;
    apiKey?: string;
}
export declare function createAppServer(options?: ServerOptions): http.Server;

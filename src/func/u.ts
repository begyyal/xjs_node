import * as path from "path";
import { MaybeArray, UType } from "xjs-common";

const s_errCode = 1010;

export function checkPortAvailability(port: number): Promise<boolean> {
    return new Promise(resolve => {
        const server = require('net').createServer();
        server.once('error', () => resolve(false))
            .once('listening', () => { server.close(); resolve(true); })
            .listen(port);
    });
}
export function joinPath(...p: MaybeArray<string>[]): string {
    return path.join(...p.flatMap(UType.takeAsArray));
}
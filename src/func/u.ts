import { createRequire } from "node:module";
import { isSea } from "node:sea";
import * as path from "path";
import { MaybeArray, UType } from "xjs-common";
import { UFile } from "./u-file";

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
/** 
 * imports modules. if running on a single executable, it bypasses encapsulation to import modules. \
 * this references [`cwd`/`node_modules`/ {@link packageName} / {@link modulePath} ] as the module path.
 */
export function externalRequire<T = any>(packageName: string, modulePath: MaybeArray<string>): T | undefined {
    const execDir = isSea() ? path.dirname(process.execPath) : process.cwd();
    const p = joinPath(execDir, "node_modules", packageName, modulePath);
    return UFile.exists(p) ? createRequire(joinPath(execDir, 'index.js'))(p) : undefined
}

import { XjsNodeErrCode } from "../const/xjs-node-err-code";

export class XjsNodeErr extends Error {
    constructor(
        public code: XjsNodeErrCode | -1,
        public msg: string,
        public origin?: any,
    ) { super(`[XJS] ${msg}`); }
}
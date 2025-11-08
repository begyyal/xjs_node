import { Loggable, XjsErr } from "xjs-common";
import { HttpResolverContext } from "./http-resolver-context";
import { ClientOption, HttpResponse, HttpClient, RequestOption } from "../obj/http-client";

export interface ClientMode {
    id: number;
    cipherOrder: number[];
}
export interface ProxyConfig {
    server: string;
    port: number;
    auth?: { name: string, pass: string };
}
const s_cmvRange = 5;
const s_defaultCmv = 138;
export class HttpResolver implements HttpClient {
    /** 
     * @param _baseCmv chrome major version refered when construct a user agent, and the version will be randomized between `n` to `n-4`.
     * @param _l custom logger. default is `console`.
     */
    constructor(
        private _baseCmv: number = s_defaultCmv,
        private _l: Loggable = console) { }
    /**
     * create a http client as new context that keeps some states. (browser type, cookies, ciphers order, etc...)
     * @param op.mode {@link s_clientMode} that is imitated. default is random between chrome or firefox.
     * @param op.proxy proxy configuration.
     * @returns a http client as new context.
     */
    newContext(op?: ClientOption): HttpResolverContext {
        return new HttpResolverContext(this.fixCmv(), op, this._l);
    }
    get(url: string, op?: RequestOption & ClientOption
        & { redirectAsNewRequest?: boolean, responseType: "string" }): Promise<HttpResponse<string>>;
    get(url: string, op?: RequestOption & ClientOption
        & { redirectAsNewRequest?: boolean, responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    get(url: string, op?: RequestOption & ClientOption & { redirectAsNewRequest?: boolean }): Promise<HttpResponse<string>>;
    async get(url: string, op?: RequestOption & ClientOption & { redirectAsNewRequest?: boolean }): Promise<HttpResponse<string | Buffer>> {
        let redirectCount = op?.redirectAsNewRequest && -1;
        const bindOp = () => {
            const option = Object.assign({}, op);
            if (redirectCount) Object.assign(option, { outerRedirectCount: ++redirectCount });
            return option;
        };
        try {
            return await this.newContext(op).get(url, bindOp());
        } catch (e) {
            if (!(e instanceof XjsErr) || e.code !== -1) throw e;
            else return await this.newContext(op).get(e.message, bindOp());
        }
    }
    post(url: string, payload: any, op?: RequestOption & ClientOption & { responseType: "string" }): Promise<HttpResponse<string>>;
    post(url: string, payload: any, op?: RequestOption & ClientOption & { responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    post(url: string, payload: any, op?: RequestOption & ClientOption): Promise<HttpResponse<string>>;
    async post(url: string, payload: any, op?: RequestOption & ClientOption): Promise<HttpResponse<string | Buffer>> {
        return await this.newContext(op).post(url, payload, op);
    }
    private fixCmv(): number {
        return this._baseCmv - Math.floor(Math.random() * s_cmvRange);
    }
}
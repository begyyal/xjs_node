import { XjsErr } from "xjs-common";
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
export const s_defaultClientOption: ClientOption = {
    cmv: 141,
    logger: console,
    logLevel: "warn"
};
export class HttpResolver implements HttpClient {
    public readonly mode?: ClientMode;
    public readonly cmv: number;
    /** 
     * @param op {@link ClientOption}
     */
    constructor(private readonly _op: ClientOption = s_defaultClientOption) {
        this.mode = this._op.mode;
        this.cmv = this._op.cmv;
    }
    /**
     * create a http client as new context that keeps some states. (browser type, cookies, ciphers order, etc...)
     * @param op {@link ClientOption}
     */
    newContext(op?: ClientOption): HttpClient {
        return new HttpResolverContext(Object.assign({}, this._op, op));
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
    put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath"> & ClientOption & { responseType: "string" }): Promise<HttpResponse<string>>;
    put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath"> & ClientOption & { responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath"> & ClientOption): Promise<HttpResponse<string>>;
    async put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath"> & ClientOption): Promise<HttpResponse<string | Buffer>> {
        return await this.newContext(op).put(url, payload, op);
    }
}
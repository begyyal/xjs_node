import { IncomingHttpHeaders, OutgoingHttpHeaders } from "http";
import { ClientMode, ProxyConfig } from "../prcs/http-resolver";
import { s_clientMode } from "../prcs/http-resolver-context";
import { Loggable } from "xjs-common";

export type LogLevel = "log" | "warn" | "error";
export interface ClientOption {
    /**
     * {@link s_clientMode} that is imitated. default is random between chrome or firefox.
     */
    mode?: ClientMode;
    /**
     * proxy configuration.
     */
    proxy?: ProxyConfig;
    /**
     * chrome major version refered when construct an user agent.
     */
    cmv?: number;
    /**
     * custom logger. default is `console`.
     */
    logger?: Loggable;
    /**
     * verbosity of logging.
     */
    logLevel?: LogLevel;
}
export interface RequestOption {
    headers?: OutgoingHttpHeaders;
    /**
     * if true, query part in the `url` is ignored.
     */
    ignoreQuery?: boolean;
    /**
     * destination directory or file path for download. this is only used when `Content-Disposition` header exists. 
     * default is current directory of the process with `filename` of the disposition.
     */
    downloadPath?: string;
    /**
     * timeout milliseconds to wait for socket inactivity. default is infinity.
     */
    timeout?: number;
    /**
     * type of response payload. default is string (utf-8).
     */
    responseType?: "string" | "buffer";
}
export interface HttpResponse<T = string> {
    /**
     * http headers in the response.
     */
    headers?: IncomingHttpHeaders;
    /**
     * response payload which has a type depends on {@link RequestOption.responseType}.
     */
    payload?: T;
}
export interface HttpClient {
    /**
     * {@link s_clientMode} that is imitated. default is random between chrome or firefox.
     */
    readonly mode?: ClientMode;
    /**
     * chrome major version refered when construct an user agent.
     */
    readonly cmv: number;
    /**
     * request GET to the url with new context.
     * @param url target url. (currently https only)
     * @param op.headers http headers.
     * @param op.mode {@link s_clientMode} that is imitated. default is random between chrome or firefox.
     * @param op.proxy proxy configuration.
     * @param op.ignoreQuery {@link RequestOption.ignoreQuery}
     * @param op.downloadPath {@link RequestOption.downloadPath}
     * @param op.timeout {@link RequestOption.timeout}
     * @param op.responseType {@link RequestOption.responseType}
     * @param op.redirectAsNewRequest handle redirect as new request. this may be efficient when using proxy which is implemented reverse proxy.
     * @returns http response. {@link HttpResponse}
    */
    get(url: string, op?: RequestOption & ClientOption
        & { redirectAsNewRequest?: boolean, responseType: "string" }): Promise<HttpResponse<string>>;
    get(url: string, op?: RequestOption & ClientOption
        & { redirectAsNewRequest?: boolean, responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    get(url: string, op?: RequestOption & ClientOption & { redirectAsNewRequest?: boolean }): Promise<HttpResponse<string>>;
    /**
     * request POST to the url with new context.
     * @param url target url. (currently https only)
     * @param payload request payload. if this is a Stream, pipe will be used, otherwise if an object, this is treated as json.
     * @param op.headers http headers.
     * @param op.mode {@link s_clientMode} that is imitated. default is random between chrome or firefox.
     * @param op.proxy proxy configuration.
     * @param op.ignoreQuery {@link RequestOption.ignoreQuery}
     * @param op.downloadPath {@link RequestOption.downloadPath}
     * @param op.timeout {@link RequestOption.timeout}
     * @param op.responseType {@link RequestOption.responseType}
     * @returns http response. {@link HttpResponse}
     */
    post(url: string, payload: any, op?: RequestOption & ClientOption & { responseType: "string" }): Promise<HttpResponse<string>>;
    post(url: string, payload: any, op?: RequestOption & ClientOption & { responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    post(url: string, payload: any, op?: RequestOption & ClientOption): Promise<HttpResponse<string>>;
    /**
     * request PUT to the url with new context.
     * @param url target url. (currently https only)
     * @param payload request payload. if this is a Stream, pipe will be used, otherwise if an object, this is treated as json.
     * @param op.headers http headers.
     * @param op.mode {@link s_clientMode} that is imitated. default is random between chrome or firefox.
     * @param op.proxy proxy configuration.
     * @param op.ignoreQuery {@link RequestOption.ignoreQuery}
     * @param op.timeout {@link RequestOption.timeout}
     * @param op.responseType {@link RequestOption.responseType}
     * @returns http response. {@link HttpResponse}
     */
    put(url: string, payload: any, op?: RequestOption & { downloadPath: never } & ClientOption & { responseType: "string" }): Promise<HttpResponse<string>>;
    put(url: string, payload: any, op?: RequestOption & { downloadPath: never } & ClientOption & { responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    put(url: string, payload: any, op?: RequestOption & { downloadPath: never } & ClientOption): Promise<HttpResponse<string>>;
}
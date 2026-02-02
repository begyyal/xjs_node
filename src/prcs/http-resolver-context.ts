import * as tls from "tls";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import { Agent, request as requestTls, RequestOptions } from "https";
import { request, IncomingMessage, OutgoingHttpHeaders } from "http";
import { AsyncLocalStorage } from "async_hooks";
import { ClientMode, ProxyConfig } from "./http-resolver";
import { ClientOption, HttpResponse, HttpClient, RequestOption, LogLevel } from "../obj/http-client";
import { UFile } from "../func/u-file";
import { joinPath } from "../func/u";
import { HttpMethod, Loggable, UArray, UHttp, UString, UType, XjsErr } from "xjs-common";
import { Stream } from "stream";

interface RequestContext extends RequestOption {
    redirectCount: number;
    proxyAgent?: Agent;
    outerRedirectCount?: number;
}
export const s_clientMode = {
    nodejs: { id: 0, cipherOrder: null },
    chrome: { id: 1, cipherOrder: [2, 0, 1] },
    firefox: { id: 2, cipherOrder: [2, 1, 0] }
};
const s_errCode = 1200;
const s_redirectLimit = 5;
const s_mode2headers = new Map<ClientMode, (cmv: number) => (Record<string, string>)>([
    [s_clientMode.firefox, (cmv: number) => ({
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.5",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${cmv}.0) Gecko/20100101 Firefox/${cmv}.0`
    })],
    [s_clientMode.chrome, (cmv: number) => {
        const uad = cmv < 130
            ? `"Not/A)Brand";v="8", "Chromium";v="${cmv}", "Google Chrome";v="${cmv}"`
            : `"Chromium";v="${cmv}", "Not:A-Brand";v="24", "Google Chrome";v="${cmv}"`;
        const ch = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": uad,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "user-agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${cmv}.0.0.0 Safari/537.36`
        };
        if (cmv >= 124) ch["priority"] = "u=0, i";
        return ch;
    }]]);
const s_logLevelMap = new Map<LogLevel, number>([["log", 30], ["warn", 20], ["error", 10]]);

export class HttpResolverContext implements HttpClient {
    public readonly mode: ClientMode;
    public readonly cmv: number;
    private readonly _als = new AsyncLocalStorage<RequestContext>();
    private readonly _l: Loggable;
    private readonly _logLevel: number;
    private readonly _ciphers: string;
    private readonly _proxyConfig?: ProxyConfig;
    private readonly _chHeaders: Record<string, string>;
    private _cookies?: Record<string, string>;
    constructor(op: ClientOption) {
        this.mode = op.mode ?? UArray.randomPick([s_clientMode.chrome, s_clientMode.firefox]);
        this.cmv = op.cmv;
        this._proxyConfig = op.proxy;
        this._l = op.logger;
        this._logLevel = s_logLevelMap.get(op.logLevel);
        if (this.mode.id > 0) {
            this._ciphers = this.createCiphers(this.mode);
            this._chHeaders = s_mode2headers.get(this.mode)(this.cmv);
        }
    }
    get(url: string, op?: RequestOption & { outerRedirectCount?: number, responseType: "string" }): Promise<HttpResponse<string>>;
    get(url: string, op?: RequestOption & { outerRedirectCount?: number, responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    get(url: string, op?: RequestOption & { outerRedirectCount?: number }): Promise<HttpResponse<string>>;
    async get(url: string, op?: RequestOption & { outerRedirectCount?: number }): Promise<HttpResponse<string | Buffer>> {
        const u = new URL(url);
        const proxyAgent = this._proxyConfig && await this.createProxyAgent(u);
        const rc = { redirectCount: op?.outerRedirectCount ?? 0, proxyAgent };
        Object.assign(rc, op);
        return await this._als.run(rc, this.getIn, u).finally(() => proxyAgent?.destroy());
    }
    post(url: string, payload: any, op?: RequestOption & { responseType: "string" }): Promise<HttpResponse<string>>;
    post(url: string, payload: any, op?: RequestOption & { responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    post(url: string, payload: any, op?: RequestOption): Promise<HttpResponse<string>>;
    async post(url: string, payload: any, op?: RequestOption): Promise<HttpResponse<string | Buffer>> {
        const u = new URL(url);
        const proxyAgent = this._proxyConfig && await this.createProxyAgent(u);
        const rc = { redirectCount: 0, proxyAgent };
        Object.assign(rc, op);
        return await this._als.run(rc, this.postputIn, u, HttpMethod.Post, payload).finally(() => proxyAgent?.destroy());
    }
    put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath"> & { responseType: "string" }): Promise<HttpResponse<string>>;
    put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath"> & { responseType: "buffer" }): Promise<HttpResponse<Buffer>>;
    put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath">): Promise<HttpResponse<string>>;
    async put(url: string, payload: any, op?: Omit<RequestOption, "downloadPath">): Promise<HttpResponse<string | Buffer>> {
        const u = new URL(url);
        const proxyAgent = this._proxyConfig && await this.createProxyAgent(u);
        const rc = { redirectCount: 0, proxyAgent };
        Object.assign(rc, op);
        return await this._als.run(rc, this.postputIn, u, HttpMethod.Put, payload).finally(() => proxyAgent?.destroy());
    }
    private createProxyAgent(u: URL): Promise<Agent> {
        const conf = this._proxyConfig;
        return new Promise((resolve, reject) => {
            const headers = {}
            if (conf.auth) headers['proxy-authorization'] = `Basic ${Buffer.from(conf.auth.name + ':' + conf.auth.pass).toString('base64')}`;
            const req = request({
                host: conf.server,
                port: conf.port,
                method: HttpMethod.Connect,
                path: `${u.hostname}:443`,
                headers
            }).on('connect', (res, socket) => {
                if (res.statusCode === 200) resolve(new Agent({ socket, keepAlive: true }));
                else reject(new XjsErr(s_errCode, "Could not connect to proxy."));
            });
            req.on('error', e => this.handleError(reject, e, "an error occurred on the CONNECT request."));
            req.on('timeout', () => {
                req.destroy();
                reject(new XjsErr(s_errCode, "The http request timeout, maybe server did not respond."));
            });
            req.end();
        });
    }
    private getIn = async (u: URL): Promise<HttpResponse> => {
        const params: RequestOptions = {};
        const rc = this._als.getStore();
        params.method = HttpMethod.Get;
        params.headers = UHttp.normalizeHeaders(rc.headers);
        return await this.reqHttps(u, params);
    };
    private postputIn = async (u: URL, method: HttpMethod.Post | HttpMethod.Put, payload: any): Promise<HttpResponse> => {
        const params: RequestOptions = {};
        const rc = this._als.getStore();
        params.method = method;
        params.headers = UHttp.normalizeHeaders(rc.headers);
        let p = payload;
        if (p instanceof Stream) {
            params.headers["content-type"] ??= "application/octet-stream";
        } else if (UType.isObject(payload)) {
            p = JSON.stringify(payload);
            params.headers["content-length"] = Buffer.byteLength(p);
            params.headers["content-type"] = "application/json";
        }
        return await this.reqHttps(u, params, p);
    }
    private reqHttps(u: URL, params: RequestOptions, payload?: any): Promise<HttpResponse> {
        const rc = this._als.getStore();
        params.timeout = rc.timeout ?? 0;
        params.protocol = u.protocol;
        params.host = u.host;
        params.path = (rc.ignoreQuery || !u.search) ? u.pathname : `${u.pathname}${u.search}`;
        params.agent = rc.proxyAgent;
        if (this.mode.id > 0) {
            params.ciphers = this._ciphers;
            params.headers = params.headers ? Object.assign(params.headers, this._chHeaders) : this._chHeaders
        }
        if (this._cookies) this.setCookies(params.headers as OutgoingHttpHeaders);
        return new Promise<HttpResponse>((resolve, reject) => {
            const req = requestTls(params,
                (res: IncomingMessage) => this.processResponse(resolve, reject, rc, params.host, res));
            req.on('error', e => this.handleError(reject, e, "an error occurred on the request."));
            req.on('timeout', () => {
                req.destroy();
                reject(new XjsErr(s_errCode, "The http request timeout, maybe server did not respond."));
            });
            if (payload instanceof Stream) payload.pipe(req, { end: true });
            else if (!payload) req.end();
            else req.write(payload, e => e
                ? this.handleError(reject, e, "something went wrong in writing payload to the request.")
                : req.end());
        });
    }
    private processResponse(
        resolve: (v: any) => void,
        reject: (r?: any) => void,
        rc: RequestContext,
        host: string,
        res: IncomingMessage): void {
        if (res.headers["set-cookie"]) this.storeCookies(res.headers["set-cookie"]);
        const sc = UHttp.statusCategoryOf(res.statusCode);
        if (sc === 3) {
            this.handleRedirect(res, host).then(resolve).catch(reject).finally(() => res.destroy());
            return;
        }
        if (res.headers["content-disposition"]?.trim().startsWith("attachment")) {
            try {
                const dest = this.resolveDownloadPath(rc.downloadPath, res.headers["content-disposition"]);
                const stream = fs.createWriteStream(dest);
                res.pipe(stream);
                stream.on("finish", () => stream.close());
                stream.on("close", () => resolve({ headers: res.headers }));
                stream.on("error", e => this.handleError(reject, e, "an error occurred on donwloading stream."));
                return;
            } catch (e) {
                if (e instanceof XjsErr) reject(e);
                else {
                    this.error(e);
                    reject(new XjsErr(s_errCode, "Failed to download a file."));
                }
            }
        }
        const bfs: Buffer[] = [];
        const contentEncofing = res.headers["content-encoding"]?.toLocaleLowerCase();
        res.on('data', chunk => bfs.push(chunk));
        res.on('end', () => {
            try {
                let retBuf: Buffer = Buffer.concat(bfs);
                if (contentEncofing == "gzip")
                    retBuf = zlib.gunzipSync(retBuf);
                else if (contentEncofing == "br")
                    retBuf = zlib.brotliDecompressSync(retBuf);
                const data = rc.responseType === "buffer" ? retBuf : retBuf.toString("utf8");
                if (sc !== 2) {
                    if (UType.isString(data) && data.trim()) this.warn(data);
                    reject(new XjsErr(s_errCode, `Https received an error status ${res.statusCode}`));
                } else resolve({ payload: data, headers: res.headers });
            } catch (e) { this.handleError(reject, e, "something went wrong in processing response."); }
        });
    }
    private resolveDownloadPath(opPath: string, disposition: string): string {
        const appendFname = (d: string) => {
            const fname = disposition.split(";")
                .find(f => f.trim().startsWith("filename"))
                ?.replace(/^\s+filename\s+=/, "").trim()
                ?? UFile.reserveFilePath(d, `xjs-download_${UString.simpleTime()}`);
            return joinPath(d, fname);
        };
        if (opPath) {
            const st = UFile.status(opPath);
            if (!st || st.isFile()) {
                if (!UFile.exists(path.dirname(opPath))) throw new XjsErr(s_errCode, "Directory of the download file was not found.");
                return opPath;
            }
            if (st.isDirectory()) {
                if (!UFile.exists(opPath)) throw new XjsErr(s_errCode, "Directory of the download path was not found.");
                return appendFname(opPath);
            }
        }
        return appendFname("./");
    }
    private async handleRedirect(res: IncomingMessage, host: string): Promise<HttpResponse> {
        const rc = this._als.getStore();
        if (!res.headers.location) throw new XjsErr(s_errCode, "Received http redirection, but no location header found.");
        if (rc.redirectCount++ > s_redirectLimit) throw new XjsErr(s_errCode, "Count of http redirection exceeds limit.");
        this.log(`Redirect to ${res.headers.location}. (count is ${rc.redirectCount})`);
        const dest = res.headers.location.startsWith("http") ? res.headers.location : `https://${host}${res.headers.location}`;
        if (rc.outerRedirectCount) throw new XjsErr(-1, dest);
        const u = new URL(dest);
        // consider for proxy which implements reverse proxy.
        if (rc.proxyAgent) {
            rc.proxyAgent?.destroy();
            rc.proxyAgent = await this.createProxyAgent(u);
        }
        return await this.getIn(u);
    }
    private createCiphers(mode: ClientMode): string {
        const defaultCiphers = tls.DEFAULT_CIPHERS.split(':');
        return [
            defaultCiphers[mode.cipherOrder[0]],
            defaultCiphers[mode.cipherOrder[1]],
            defaultCiphers[mode.cipherOrder[2]],
            ...UArray.shuffle(defaultCiphers.slice(3))
        ].join(':');
    }
    private setCookies(headers: OutgoingHttpHeaders): void {
        const exp = this._cookies["expires"];
        if (exp && new Date(exp).getTime() <= Date.now()) {
            this._cookies = null;
            this.log("Cookies was cleared due to an expiraion.");
        } else headers.cookie = Object.keys(this._cookies)
            .filter(ckk => !["expires", "max-age"].includes(ckk))
            .map(ckk => `${ckk}=${this._cookies[ckk]};`).join(" ");
    }
    private storeCookies(cookies: string[]): void {
        this._cookies ??= {};
        cookies.filter(c => c).flatMap(c => c.split(";"))
            .map(c => {
                const idx = c.indexOf("=");
                return idx !== -1 && [c.substring(0, idx).toLowerCase().trim(), c.substring(idx + 1)];
            })
            .filter(cp => cp && cp[0] && !["secure", "path", "domain", "samesite"].includes(cp[0]))
            .forEach(cp => this._cookies[cp[0]] = cp[1]);
        this.log("Store cookies from set-cookie headers.");
        this.log(JSON.stringify(this._cookies));
    }
    private log(msg: string): void {
        if (s_logLevelMap.get("log") <= this._logLevel) this._l.log(`[http-resolver] ${msg}`);
    }
    private warn(msg: string): void {
        if (s_logLevelMap.get("warn") <= this._logLevel) this._l.warn(`[http-resolver] ${msg}`);
    }
    private error(msg: string): void {
        if (s_logLevelMap.get("error") <= this._logLevel) this._l.error(`[http-resolver] ${msg}`);
    }
    private handleError(rj: (r: any) => void, e: any, msg: string): void {
        rj(new XjsErr(s_errCode, msg, e));
    }
}
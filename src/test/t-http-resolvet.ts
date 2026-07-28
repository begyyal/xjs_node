import { ModuleTest, TestCase, TestUnit } from "xjs-test";
import { HttpClient } from "../obj/http-client";
import { HttpResolver } from "../prcs/http-resolver";
import { UHttp } from "xjs-common";

const mt = new ModuleTest("HttpResolver");
mt.appendUnit("get", function (this: TestUnit) {
    this.appendCase("basic functionality.", async function (this: TestCase) {
        const url = "https://books.toscrape.com/index.html";
        const ret = await new HttpResolver().get(url);
        this.check(ret.headers["content-type"] === "text/html");
        this.check([
            "Tipping the Velvet", "Shakespeare&#39;s Sonnets", "It&#39;s Only the Himalayas"
        ].every(e => ret.payload?.includes(e)))
    });
    this.appendCase("request with http.", async function (this: TestCase) {
        const url = "http://httpbin.org/get";
        const ret = await new HttpResolver().get(url);
        const json = JSON.parse(ret.payload);
        this.check(UHttp.isHttpSuccess(ret.status) && json.url === url);
    });
}, { concurrent: true });
mt.appendUnit("get with new context.", function (this: TestUnit<{
    resolverContext: HttpClient
}>) {
    this.chainContextGen(_ => ({ resolverContext: new HttpResolver().newContext() }));
    this.appendCase("basic functionality.", async function (this: TestCase, c) {
        const url = "https://books.toscrape.com/index.html";
        const ret = await c.resolverContext.get(url);
        this.check(ret.headers["content-type"] === "text/html");
        this.check([
            "Tipping the Velvet", "Shakespeare&#39;s Sonnets", "It&#39;s Only the Himalayas"
        ].every(e => ret.payload?.includes(e)))
    });
}, { concurrent: true });

export const T_HttpResolver = mt;
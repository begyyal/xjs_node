[![npm][npm-badge]][npm-url] [![CI][ci-badge]][ci-url] [![publish][publish-badge]][publish-url]

# Overview
Library modules for nodejs + typescript that bundled general-purpose implementations.  
This module focuses on implementation that extends nodejs builtin modules, and dependency is only [xjs-common](https://github.com/begyyal/xjs_common).

# Install
```
npm i xjs-node
```

# Code example (only part)
### Miscellaneous utilities.
```ts
import { checkPortAvailability, UFile } from "xjs-node";

(async () => {
    if (await checkPortAvailability(8080)) console.log("available.");
    else console.log("not available.");

    // in UFile namespace, path arguments type is `MaybeArray`.
    UFile.mkdir("path/to/dir");
    UFile.mkdir(["path", "to", "dir"]);
    // there are basic file manipulations. (read, write, ls, mv, etc...)
    UFile.exists; UFile.read; UFile.write; UFile.ls; UFile.status; UFile.cp; UFile.mv; UFile.rm;

    // decompress `.zip` file. this depends on host os due to using os command for decompression.
    UFile.unzip("path/to/zip");

    // check filename duplication and return file path with incremented number if the duplication detected.
    UFile.reserveFilePath("path/to/dir", "filename");
})();
```
### Enhanced http client.
```ts
import { HttpResolver, s_clientMode } from "xjs-node";

(async () => {
    // can customize logging. (default is console.)
    // const http = new HttpResolver(chromeMajorVersion, logger);
    const http = new HttpResolver();

    // implicitly corresponds to cookies and redirect, and do randomization.
    let res = await http.get("https://begyyal.net");
    const { payload, headers } = res;

    // use proxy by passing the configuration.
    const proxy = { server: "proxy.sample.com", port: 8080, auth: { name: "prx", pass: "****" } }
    res = await http.post("https://begyyal.net", { proxy });

    // switch tls ciphers order pattern by passing clientMode. (default is random between chrome or firefox.)
    res = await http.get("https://begyyal.net", { mode: s_clientMode.chrome });

    // download a file when [Content-Disposition: attachment] exists in the response.
    await http.get("https://begyyal.net/a.txt", { downloadPath: "/path/to/store" });

    // if you want to keep some states of requests (and suppress to randomize), it can create new context to do.
    const context = http.newContext();
    res = await context.get("https://begyyal.net/1");
    // this request sends with cookies that is set by precedent requests. 
    // in POST, payload is treated as json if it is an object. (but also Stream is acceptable.)
    res = await context.post("https://begyyal.net/2", { a: "b" });
})();
```
# Error definition
XJS throws error with `code` property which has one of the following numbers.
|code|thrown by|
|:---|:---|
|1010|`func/u`|
|1040|`func/u-file` |
|1200|`prcs/http/http-resolver`|

# License
[Apache-License](./LICENSE)

[npm-url]: https://npmjs.org/package/xjs-node
[npm-badge]: https://badgen.net/npm/v/xjs-node
[ci-url]: https://github.com/begyyal/xjs_node/actions/workflows/test.yml
[ci-badge]: https://github.com/begyyal/xjs_node/actions/workflows/test.yml/badge.svg 
[publish-url]: https://github.com/begyyal/xjs_node/actions/workflows/publish.yml
[publish-badge]: https://github.com/begyyal/xjs_node/actions/workflows/publish.yml/badge.svg


import { execSync } from "child_process";
import * as fs from "fs";
import { MaybeArray, XjsErr } from "xjs-common";
import { joinPath } from "./u";

const s_errCode = 1040;

export namespace UFile {
    export function mkdir(p: MaybeArray<string>): boolean {
        const dirPath = joinPath(p);
        const e = fs.existsSync(dirPath);
        if (!e) fs.mkdirSync(dirPath, { recursive: true });
        else if (!fs.statSync(dirPath).isDirectory())
            throw new XjsErr(s_errCode, "Already exists a file (not directory) on the path.");
        return !e;
    }
    export function write(p: MaybeArray<string>, c: string): Promise<void> {
        return new Promise((rs, rj) => fs.writeFile(joinPath(p), c, e => e ? rj(e) : rs()));
    }
    /**
     * remove a file. default is no error if the file to be removed doesn't exist.
     * @param p path of the file. if passed as an array those are joined.
     * @param errorIfAbsent raise an error if the file to be removed doesn't exist.
     */
    export function rm(p: MaybeArray<string>, errorIfAbsent?: boolean): Promise<void> {
        return new Promise((rs, rj) => fs.rm(joinPath(p), { recursive: true, force: !errorIfAbsent }, e => e ? rj(e) : rs()));
    }
    export function exists(p: MaybeArray<string>): boolean {
        return !!p && fs.existsSync(joinPath(p));
    }
    /**
     * return a file status. if the file of the status doesn't exist, this returns `null`.
     */
    export function status(p: MaybeArray<string>): fs.Stats {
        const pt = joinPath(p);
        return fs.existsSync(pt) ? fs.statSync(pt) : null;
    }
    export function read(p: MaybeArray<string>): Promise<Buffer>;
    export function read(p: MaybeArray<string>, encoding: BufferEncoding): Promise<string>;
    export function read(p: MaybeArray<string>, encoding?: BufferEncoding): Promise<Buffer | string> {
        return new Promise((rs, rj) => {
            const f = joinPath(p);
            if (fs.existsSync(f)) fs.readFile(f, encoding, (e, d) => e ? rj(e) : rs(d));
            else rj(new XjsErr(s_errCode, `No file found => ${f}`));
        })
    }
    /**
     * read specified file path as a json object.
     * @param p file path
     * @param d default value if the file path doesn't exist. default of this is `{}`.
     * @param encoding encoding used by file reading. default is `utf-8`.
     */
    export async function readAsJson<T = any>(p: MaybeArray<string>, d: any = {}, encoding: BufferEncoding = "utf-8"): Promise<T> {
        return UFile.exists(p) ? JSON.parse(await UFile.read(p, encoding)) : d as T;
    }
    export function cp(from: MaybeArray<string>, to: MaybeArray<string>): Promise<void> {
        return new Promise((rs, rj) => {
            const f = joinPath(from), t = joinPath(to);
            if (fs.existsSync(f)) fs.copyFile(f, t, e => e ? rj(e) : rs());
            else rj(new XjsErr(s_errCode, `No file found => ${f}`));
        });
    }
    export function mv(from: MaybeArray<string>, to: MaybeArray<string>): Promise<void> {
        return new Promise((rs, rj) => {
            const f = joinPath(from), t = joinPath(to);
            if (fs.existsSync(f)) fs.rename(f, t, e => e ? rj(e) : rs());
            else rj(new XjsErr(s_errCode, `No file found => ${f}`));
        });
    }
    export function ls(p: MaybeArray<string>): string[] {
        const pt = joinPath(p)
        if (!pt || !fs.statSync(pt).isDirectory())
            throw new XjsErr(s_errCode, "Specified path for ls is not directory.");
        return fs.readdirSync(pt);
    }
    /**
     * check availability to export a file with specified directory and file name. 
     * if it doesn't, this retries to check after appending incremental number to the filename excluding an extension (e.g. `aaa_1.txt`).
     * @param dir destination directory path.
     * @param fname file name wanna export to.
     */
    export function reserveFilePath(dir: MaybeArray<string>, fname: string): string {
        const pt = joinPath(dir);
        if (!pt || !fs.statSync(pt).isDirectory())
            throw new XjsErr(s_errCode, "Specified directory path is not directory.");
        if (!fname || fname.match(/[\\/:*?"<>|]/))
            throw new XjsErr(s_errCode, "Specified filename is invalid due to empty or including disallowed characters.");
        let dest = joinPath(pt, fname), i = 1;
        while (fs.existsSync(dest)) {
            const ext = fname.match(/^(.+)(\.[^\.]+)$/);
            dest = joinPath(pt, `${ext ? ext[1] : fname}_${i++}${ext ? ext[2] : ""}`);
        }
        return dest;
    }
    /**
     * decompress zip file. this depends on os enviroment due to using the os command.
     * currently this supports only windows (installed `tar` or `unzip` in gnu compiler) and linux systems (installed `unzip`). 
     * @param zipPath zip file to be unzipped.
     * @param destDir directory that the decompress files export to.
     */
    export function unzip(zipPath: MaybeArray<string>, destDir?: MaybeArray<string>): void {
        if (!exists(zipPath)) throw new XjsErr(s_errCode, "There is no file on the zip path.");
        if (!!destDir && !exists(destDir)) throw new XjsErr(s_errCode, "The destination directory is not found.");
        let cmd = "unzip", options = null, availableCmd = true;
        if (destDir) options = `-d "${destDir}"`;
        const check = () => { try { execSync(`${cmd} --help`, { stdio: "ignore" }); } catch { availableCmd = false; } };
        check();
        if (process.platform === "win32") {
            if (!availableCmd) {
                cmd = "tar"; options = "-xf"; availableCmd = true;
                if (destDir) options = `-C "${destDir}" ${options}`;
                check();
            }
        } else if (process.platform === "linux") {
        } else throw new XjsErr(s_errCode, "The os running on is not supported for xjs unzip.");
        if (!availableCmd) throw new XjsErr(s_errCode, `"${cmd}" command is not installed.`);
        try { execSync([cmd, options, `"${zipPath}"`].filter(e => e).join(" "), { stdio: "ignore" }); } catch (e) {
            throw new XjsErr(s_errCode, "Something went wrong at unzip.", e);
        }
    }
}
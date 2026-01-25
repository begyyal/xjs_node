import * as fs from "fs";
import { joinPath } from "../func/u";
import { UFile } from "../func/u-file";
import { ModuleTest } from "./prc/module-test";
import { TestCase } from "./prc/test-case";
import { TestUnit } from "./prc/test-unut";

const s_workingDir = joinPath(__dirname, "tmp");
const mt = new ModuleTest("UFile");
mt.appendUnit("joinPath", function (this: TestUnit) {
    this.appendCase("can accept parameters whether array or variable length.", function (this: TestCase) {
        this.check(s_workingDir === joinPath([__dirname, "tmp"]));
    });
});
mt.appendUnit("[directory manipulations 1]", function (this: TestUnit) {
    this.setFinalizer(() => {
        if (fs.existsSync(s_workingDir)) fs.rmSync(s_workingDir, { recursive: true, force: true });
    });
    this.appendCase("mkdir", function (this: TestCase) {
        UFile.mkdir([__dirname, "tmp"]);
        this.check(fs.existsSync(s_workingDir));
    });
    this.appendCase("exists", function (this: TestCase) {
        this.check(UFile.exists([__dirname, "tmp"]));
    });
    this.appendCase("rm", async function (this: TestCase) {
        await UFile.rm([__dirname, "tmp"]);
        this.check(!UFile.exists(s_workingDir));
        await UFile.rm([__dirname, "tmp"]); // check no error.
    });
    this.appendCase("rm - errorIfAbsent is true.", async function (this: TestCase) {
        this.expectError();
        await UFile.rm([__dirname, "tmp"], true);
    });
});
mt.appendUnit("[file manipulations 1]", function (this: TestUnit) {
    this.setInitializer(() => UFile.mkdir(s_workingDir));
    this.setFinalizer(() => UFile.rm(s_workingDir));
    this.appendCase("write", async function (this: TestCase) {
        await UFile.write([s_workingDir, "a.json"], "{\"aaa\":1}");
        this.check(UFile.exists([s_workingDir, "a.json"]));
    });
    this.appendCase("read", async function (this: TestCase) {
        this.check(await UFile.read([s_workingDir, "a.json"], "utf-8") === "{\"aaa\":1}");
    });
    this.appendCase("readAsJson", async function (this: TestCase) {
        const ary: { aaa: number } = await UFile.readAsJson([s_workingDir, "a.json"]);
        this.check(ary?.aaa === 1);
    });
    this.appendCase("cp", async function (this: TestCase) {
        await UFile.cp([s_workingDir, "a.json"], [s_workingDir, "b.txt"]);
        this.check(UFile.exists([s_workingDir, "b.txt"]));
    });
    this.appendCase("mv", async function (this: TestCase) {
        await UFile.mv([s_workingDir, "a.json"], [s_workingDir, "c.txt"]);
        this.check(!UFile.exists([s_workingDir, "a.txt"]) && UFile.exists([s_workingDir, "c.txt"]));
    });
});
mt.appendUnit("reserveFilePath", function (this: TestUnit) {
    this.setInitializer(() => UFile.mkdir(s_workingDir));
    this.setFinalizer(() => UFile.rm(s_workingDir));
    this.appendCase("reserve fname without any change.", function (this: TestCase) {
        const fname = UFile.reserveFilePath(s_workingDir, "aa.txt");
        this.check(fname === joinPath(s_workingDir, "aa.txt"));
    });
    this.appendCase("reserve fname with a suffix.", async function (this: TestCase) {
        await UFile.write([s_workingDir, "aa.txt"], "");
        const fname = UFile.reserveFilePath(s_workingDir, "aa.txt");
        this.check(fname === joinPath(s_workingDir, "aa_1.txt"), () => fname);
    });
    this.appendCase("reserve fname which doesn't have an extension.", async function (this: TestCase) {
        await UFile.write([s_workingDir, "bb"], "");
        const fname = UFile.reserveFilePath(s_workingDir, "bb");
        this.check(fname === joinPath(s_workingDir, "bb_1"), () => fname);
    });
    this.appendCase("reserve fname which starts with dot.", async function (this: TestCase) {
        await UFile.write([s_workingDir, ".cc"], "");
        const fname = UFile.reserveFilePath(s_workingDir, ".cc");
        this.check(fname === joinPath(s_workingDir, ".cc_1"), () => fname);
    });
    this.appendCase("reserve fname which starts with dot and has an extension.", async function (this: TestCase) {
        await UFile.write([s_workingDir, ".dd.txt"], "");
        const fname = UFile.reserveFilePath(s_workingDir, ".dd.txt");
        this.check(fname === joinPath(s_workingDir, ".dd_1.txt"), () => fname);
    });
});
export const T_UFile = mt;

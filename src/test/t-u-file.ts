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
    this.appendCase("rm", function (this: TestCase) {
        UFile.rm([__dirname, "tmp"]);
        this.check(!UFile.exists(s_workingDir));
        UFile.rm([__dirname, "tmp"]); // check no error.
    });
    this.appendCase("rm - errorIfAbsent is true.", function (this: TestCase) {
        this.expectError();
        UFile.rm([__dirname, "tmp"], true);
    });
});
mt.appendUnit("[file manipulations 1]", function (this: TestUnit) {
    this.setInitializer(() => UFile.mkdir(s_workingDir));
    this.setFinalizer(() => UFile.rm(s_workingDir));
    this.appendCase("write", function (this: TestCase) {
        UFile.write([s_workingDir, "a.json"], "{\"aaa\":1}");
        this.check(UFile.exists([s_workingDir, "a.json"]));
    });
    this.appendCase("read", function (this: TestCase) {
        this.check(UFile.read([s_workingDir, "a.json"], "utf-8") === "{\"aaa\":1}");
    });
    this.appendCase("readAsJson", function (this: TestCase) {
        const ary: { aaa: number } = UFile.readAsJson([s_workingDir, "a.json"]);
        this.check(ary?.aaa === 1);
    });
    this.appendCase("cp", function (this: TestCase) {
        UFile.cp([s_workingDir, "a.json"], [s_workingDir, "b.txt"]);
        this.check(UFile.exists([s_workingDir, "b.txt"]));
    });
    this.appendCase("mv", function (this: TestCase) {
        UFile.mv([s_workingDir, "a.json"], [s_workingDir, "c.txt"]);
        this.check(!UFile.exists([s_workingDir, "a.txt"]) && UFile.exists([s_workingDir, "c.txt"]));
    });
    this.appendCase("reserveFilePath - reserve fname without any change.", function (this: TestCase) {
        const fname = UFile.reserveFilePath(s_workingDir, "d.txt");
        this.check(fname === joinPath(s_workingDir, "d.txt"));
    });
    this.appendCase("reserveFilePath - reserve fname with a suffix.", function (this: TestCase) {
        const fname = UFile.reserveFilePath(s_workingDir, "c.txt");
        this.check(fname === joinPath(s_workingDir, "c.txt.1"));
    });
});
export const T_UFile = mt;

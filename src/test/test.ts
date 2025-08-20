import { T_UFile } from "./t-u-file";

(async () => {
    console.time("total time");
    for (const u of [
        T_UFile
    ]) await u.exe();
    console.timeEnd("total time");
})().catch((e: Error) => {
    console.error(e);
    process.exit(1);
});

import { T_U_File } from "./t-u-file";

(async () => {
    T_U_File();
})().catch(e => {
    console.log(e);
    process.exit(1);
});

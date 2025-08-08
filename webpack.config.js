
/** @type {import('webpack').Configuration} */
export default {
    mode: "production",
    target: "node",
    entry: "./compiled/index.js",
    output: {
        filename: "index.js",
        library: 'xjs-node',
        libraryTarget: 'umd',
        globalObject: 'this'
    },
    resolve: {
        fullySpecified: false,
        extensions: [".js"]
    }
};

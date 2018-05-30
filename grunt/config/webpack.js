const path = require('path');
const webpack = require('webpack');
const warpjsUtils = require('@warp-works/warpjs-utils');

const constants = require('./../../lib/constants');

const projectDir = path.dirname(require.resolve('./../../package.json'));

module.exports = {
    build: {
        target: 'web',
        devtool: 'source-map',
        entry: {
            [constants.SCRIPT_FILENAME]: './client/index.js'
        },
        node: {
            fs: 'empty'
        },
        output: {
            path: `${projectDir}/assets`,
            filename: '[name].min.js'
        },
        plugins: [
            new webpack.optimize.CommonsChunkPlugin({
                names: 'vendor',
                minChunks: (module) => module.context && module.context.indexOf('node_modules') !== -1
            }),
            new webpack.optimize.UglifyJsPlugin({
                compress: false
            })
        ],
        module: {
            loaders: [
                {
                    test: /\.js$/,
                    loader: 'babel-loader'
                },
                {
                    test: /\.hbs$/,
                    loader: 'handlebars-loader',
                    query: {
                        helperDirs: [
                            warpjsUtils.getHandlebarsHelpersDir()
                        ],
                        partialDirs: [
                            warpjsUtils.getHandlebarsPartialsDir()
                        ]
                    }
                }
            ]
        }
    }
};

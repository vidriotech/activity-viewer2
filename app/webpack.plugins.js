// const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  new HtmlWebpackPlugin(),
//   // hack adapted from https://github.com/webpack/webpack/issues/1887#issuecomment-172344694
//   new webpack.DefinePlugin({
//     'process.env.NODE_ENV': '"development"',
//     'global': {}, // 'global is not defined' workaround
// }),
];

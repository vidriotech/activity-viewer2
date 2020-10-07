const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

rules.push(
    {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
    },
    {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        use: {
            loader: 'url-loader',
            options: {
                limit: 100000,
            },
        },
    },
    {
        test: /\.js$/,
        loader: 'ify-loader'
    },
);

module.exports = {
    module: {
        rules,
    },
    target: "web",
    plugins: plugins,
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css']
    },
};

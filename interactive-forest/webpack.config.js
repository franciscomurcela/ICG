const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true, // Limpa a pasta dist antes de cada build
        publicPath: './', // Caminhos relativos para GitHub Pages
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                type: 'asset/resource', // Substitui o uso do file-loader
            },
            {
                test: /\.(glb|gltf)$/,
                type: 'asset/resource',
            },
        ],
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
        open: true, // Abre o navegador automaticamente
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html', // Usa o arquivo index.html da pasta src
            inject: true, // Injeta automaticamente os arquivos CSS e JS
        }),
    ],
    resolve: {
        extensions: ['.js'],
    },
};
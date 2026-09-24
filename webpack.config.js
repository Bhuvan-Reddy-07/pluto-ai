import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    background: './src/background.ts',
    content: './src/content.js',
    'popup/popup': './src/popup/popup.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  experiments: {
    asyncWebAssembly: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'sidebar', to: 'sidebar', noErrorOnMissing: true },
        { from: 'options', to: 'options', noErrorOnMissing: true },
        { from: 'src/models', to: 'models', noErrorOnMissing: true },
        { from: 'icons', to: 'icons', noErrorOnMissing: true },
        { from: 'demo', to: 'demo', noErrorOnMissing: true }
      ]
    })
  ]
};

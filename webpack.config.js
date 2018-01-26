const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: ["./src/index.ts", "./scss/main.scss"],
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: "ts-loader",
      exclude: /node_modules/
    // }, {
    //   test: /\.css$/,
    //   loader: ExtractTextPlugin.extract({
    //     loader: "css-loader?importLoaders=1",
    //   }),
    },{
      test: /\.scss$/,
      loader: ExtractTextPlugin.extract(["css-loader", "sass-loader"])
    }
    ],
  },
  plugins: [
      new ExtractTextPlugin({
        filename: "bundled_style.css",
        allChunks: true,
      }),
      new CopyWebpackPlugin([
          { from: "html/packet_dapper_viz.html", to: "./" },
          { from: "resources", to: "resources" }
      ])
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  resolveLoader: {
    modules: ["./node_modules", "/usr/local/lib/node_modules"]
  },
  output: {
    filename: "./bundled_app.js",
    path: path.resolve(__dirname, "output")
  }
};

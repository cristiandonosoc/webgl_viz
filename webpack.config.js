const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: "ts-loader",
      exclude: /node_modules/
    }]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  resolveLoader: {
    modules: ["/usr/local/lib/node_modules"]
  },
  output: {
    filename: "./bundled_app.js",
    path: path.resolve(__dirname, "output")
  }
};

module.exports = {
  presets: ["module:metro-react-native-babel-preset"],
  plugins: [
    "@realm/babel-plugin",
    [
      "module-resolver",
      {
        root: ["./src"],
        alias: {
          "@shared-components": "./src/shared/components",
          "@shared-constants": "./src/shared/constants",
          "@shared-utils": "./src/shared/utils",
          "@fonts": "./src/shared/theme/fonts",
          "@screens": "./src/screens",
          "@models": "./src/models",
          "@hooks": "./src/hooks",
        },
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    ],
  ],
};

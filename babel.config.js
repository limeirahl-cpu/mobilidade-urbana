module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Must stay last in the plugins list — react-native-reanimated requires it.
    plugins: ["react-native-reanimated/plugin"],
  };
};

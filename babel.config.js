module.exports = {
  plugins: [
    [
      'react-native-reanimated/plugin',
      {
        globals: ['__detectObjects'],
      },
    ]
  ],
  presets: ['module:@react-native/babel-preset'],
};

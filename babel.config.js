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
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    'react-native-worklets-core/plugin',
  ],
};

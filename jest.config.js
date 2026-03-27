module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?)',
    'node_modules/(?!(expo|@expo)())',
    'node_modules/(?!@react-native/js-polyfills)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
};
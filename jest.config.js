module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js"],
  moduleNameMapper: {
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/heritage-buddy-app/src/$1",
  },
};

module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  overrides: [
    {
      // Node-executed tooling and config files.
      env: {
        node: true,
      },
      files: [
        ".eslintrc.{js,cjs}",
        "*.config.js",
        "tests/**/*.ts",
      ],
      parserOptions: {
        sourceType: "script",
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      // node:test files use ESM syntax.
      files: ["tests/**/*.ts", "**/*.test.ts"],
      parserOptions: {
        sourceType: "module",
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    // Props are validated by TypeScript in this project.
    "react/prop-types": "off",
  },
  ignorePatterns: ["*.d.ts", "node_modules/", "dist/", "web-build/", ".expo/"],
};

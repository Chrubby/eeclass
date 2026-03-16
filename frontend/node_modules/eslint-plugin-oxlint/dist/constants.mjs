const aliasPluginNames = {
  // for scripts/generate and src/build-from-oxlint-config
  eslint: "",
  typescript: "@typescript-eslint",
  nextjs: "@next/next",
  node: "n",
  // only for src/build-from-oxlint-config
  react_perf: "react-perf",
  jsx_a11y: "jsx-a11y",
  "import-x": "import"
};
const typescriptRulesExtendEslintRules = [
  "class-methods-use-this",
  "default-param-last",
  "init-declarations",
  "max-params",
  "no-array-constructor",
  "no-dupe-class-members",
  "no-empty-function",
  "no-invalid-this",
  "no-loop-func",
  "no-loss-of-precision",
  "no-magic-numbers",
  "no-redeclare",
  "no-restricted-imports",
  "no-shadow",
  "no-unused-expressions",
  "no-unused-vars",
  "no-use-before-define",
  "no-useless-constructor"
];
const reactHookRulesInsideReactScope = ["rules-of-hooks", "exhaustive-deps"];
const rulesDisabledForVueAndSvelteFiles = [
  "no-unused-vars",
  "@typescript-eslint/no-unused-vars",
  "react-hooks/rules-of-hooks"
  // disabled because its react
];
export {
  aliasPluginNames,
  reactHookRulesInsideReactScope,
  rulesDisabledForVueAndSvelteFiles,
  typescriptRulesExtendEslintRules
};

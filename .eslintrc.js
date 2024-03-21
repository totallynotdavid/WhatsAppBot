module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [`eslint:recommended`, `plugin:prettier/recommended`],
    plugins: [`prettier`],
    overrides: [
        {
            env: {
                node: true,
            },
            files: [`.eslintrc.{js,cjs}`],
            parserOptions: {
                sourceType: `script`,
            },
        },
    ],
    parserOptions: {
        ecmaVersion: `latest`,
        sourceType: `module`,
    },
    rules: {
        "linebreak-style": [`error`, `unix`],
        "quotes": [`error`, `backtick`],
        "semi": [`error`, `always`],
        "multiline-ternary": [`error`, `always-multiline`],
        "no-multi-spaces": [`error`],
    },
};

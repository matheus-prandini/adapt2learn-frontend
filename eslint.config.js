import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// O CRA trazia um ESLint embutido que não carregava o plugin react-hooks;
// este config restaura as regras de hooks e o básico do JS.
export default [
  { ignores: ['build/**', 'node_modules/**', 'public/games/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Heurística voltada ao React Compiler: condena setLoading(true)/reset de
      // estado dentro de efeitos — ou seja, o padrão inteiro de fetch-em-effect
      // com flag de cancelamento que este código usa de forma deliberada.
      // Satisfazê-la exigiria derivar estado ou adotar uma lib de dados; é
      // decisão de arquitetura, não de lint. Revisitar se o Compiler entrar.
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // `React` importado só para o JSX (runtime automático) começa com maiúscula.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.vitest } },
  },
]

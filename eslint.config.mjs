import { defineConfig } from '@vben/eslint-config';

export default defineConfig([
  {
    files: ['pnpm-workspace.yaml'],
    rules: {
      // 保留暂未引用的 catalog 条目（上游模板依赖，后续可能启用）
      'pnpm/yaml-no-unused-catalog-item': 'off',
    },
  },
]);

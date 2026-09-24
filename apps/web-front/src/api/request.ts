import type { AxiosResponseHeaders, RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'antdv-next';
import JSONBigInt from 'json-bigint';

import { useAuthStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const jsonBigInt = JSONBigInt({ storeAsString: true, strict: true });

// json-bigint 用 Object.create(null) 创建解析结果，缺少 hasOwnProperty 等
// 原型方法，会导致 vxe-table（xe-utils）等三方库运行时报错，这里递归恢复为普通对象
function restorePrototype(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => restorePrototype(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, restorePrototype(item)]),
    );
  }
  return value;
}

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    transformResponse: (data: string, headers: AxiosResponseHeaders) =>
      headers.getContentType()?.includes('application/json') && data
        ? restorePrototype(jsonBigInt.parse(data))
        : data,
  });

  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      config.headers.Authorization = accessStore.accessToken
        ? `Bearer ${accessStore.accessToken}`
        : null;
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  client.addResponseInterceptor({
    fulfilled: (response) => response.data,
  });

  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate: async () => {
        await useAuthStore().logout(false);
      },
      doRefreshToken: async () => '',
      enableRefreshToken: false,
      formatToken: (token) => (token ? `Bearer ${token}` : null),
    }),
  );

  client.addResponseInterceptor(
    errorMessageResponseInterceptor((fallback, error) => {
      const response = error?.response?.data;
      message.error(response?.message || fallback);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

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

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    transformResponse: (data: string, headers: AxiosResponseHeaders) =>
      headers.getContentType()?.includes('application/json') && data
        ? JSONBigInt({ storeAsString: true, strict: true }).parse(data)
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

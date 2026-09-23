import { requestClient } from '#/api/request';

export interface LoginParams {
  username_or_mobile: string;
  password: string;
}

export interface LoginResult {
  token: string;
  token_type: string;
  expires_at: null | string;
}

export function loginApi(data: LoginParams) {
  return requestClient.post<LoginResult>('/auth/login', data);
}

export function logoutApi() {
  return requestClient.post('/auth/logout');
}

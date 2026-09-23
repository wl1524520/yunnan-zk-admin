import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

interface AdminUser {
  id: string;
  name: string;
  role: string;
  username: string;
}

export async function getUserInfoApi(): Promise<UserInfo> {
  const user = await requestClient.get<AdminUser>('/auth/me');
  return {
    avatar: '',
    desc: '',
    homePath: '/home',
    realName: user.name,
    roles: [user.role],
    token: '',
    userId: user.id,
    username: user.username,
  };
}

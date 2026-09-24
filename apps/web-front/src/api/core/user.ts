import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

interface Organization {
  code: string;
  id: string;
  name: string;
}

interface Manager {
  id: string;
  name: string;
  role: string;
  username: string;
  district?: null | Organization;
  school?: null | Organization;
}

export interface ManagerUserInfo extends UserInfo {
  role: string;
  district?: null | Organization;
  school?: null | Organization;
}

export async function getUserInfoApi(): Promise<ManagerUserInfo> {
  const manager = await requestClient.get<Manager>('/auth/me');
  return {
    avatar: '',
    desc: '',
    district: manager.district,
    homePath: '/home',
    realName: manager.name,
    role: manager.role,
    roles: [manager.role],
    school: manager.school,
    token: '',
    userId: manager.id,
    username: manager.username,
  };
}

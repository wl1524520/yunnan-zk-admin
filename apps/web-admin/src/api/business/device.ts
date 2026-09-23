import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface Device {
  id: string;
  device_no: string;
  vendor: string;
  model: string;
  device_type: string;
  status: string;
  school?: { id: string; name: string };
}

export interface DeviceKey {
  id: string;
  key_id: string;
  status: string;
  activated_at: string;
  retired_at?: string;
}

export interface IssuedDeviceKey {
  key_id: string;
  secret: string;
}

export interface DevicePayload {
  device_no?: string;
  vendor: string;
  model: string;
  device_type: string;
  status: string;
}

export function getDeviceList(page: number, perPage = 20) {
  return requestClient.get<PageResult<Device>>('/devices', {
    params: { page, per_page: perPage },
  });
}

export function createDevice(data: DevicePayload) {
  return requestClient.post('/devices', data);
}

export function updateDevice(
  id: string,
  data: Omit<DevicePayload, 'device_no'>,
) {
  return requestClient.request(`/devices/${id}`, { data, method: 'PATCH' });
}

export function assignDeviceSchool(id: string, schoolId: string) {
  return requestClient.post(`/devices/${id}/school-assignment`, {
    school_id: schoolId,
    request_id: crypto.randomUUID(),
    offline_sync_confirmed: true,
  });
}

export function getDeviceKeys(id: string) {
  return requestClient.get<PageResult<DeviceKey>>(`/devices/${id}/keys`, {
    params: { page: 1, per_page: 100 },
  });
}

export function issueDeviceKey(id: string) {
  return requestClient.post<IssuedDeviceKey>(`/devices/${id}/keys`);
}

export function revokeDeviceKey(deviceId: string, keyId: string) {
  return requestClient.post(`/devices/${deviceId}/keys/${keyId}/revoke`);
}

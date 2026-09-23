import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface Teacher {
  id: string;
  employee_no: string;
  name: string;
  status: string;
}

export interface Binding {
  id: string;
  school_teacher?: Teacher;
}

export interface Device {
  id: string;
  device_no: string;
  vendor: string;
  model: string;
  device_type: string;
  status: string;
  teacher_bindings: Binding[];
}

export function getDeviceList(page: number, perPage = 20) {
  return requestClient.get<PageResult<Device>>('/devices', {
    params: { page, per_page: perPage },
  });
}

export function bindDeviceTeacher(deviceId: string, teacherId: string) {
  return requestClient.post(`/devices/${deviceId}/teacher-bindings`, {
    school_teacher_id: teacherId,
    request_id: crypto.randomUUID(),
  });
}

export function unbindDeviceTeacher(bindingId: string) {
  return requestClient.delete(`/device-teacher-bindings/${bindingId}`);
}

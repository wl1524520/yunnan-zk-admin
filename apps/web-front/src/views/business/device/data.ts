import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { Binding, Device } from '#/api/business/device';

import { getSchoolTeacherList } from '#/api/business/school-teacher';

async function getActiveTeacherOptions() {
  const result = await getSchoolTeacherList({ page: 1, per_page: 100 });
  return result.items
    .filter((teacher) => teacher.status === 'active')
    .map((teacher) => ({
      label: [teacher.employee_no, teacher.name].filter(Boolean).join(' '),
      value: teacher.id,
    }));
}

export function useBindingSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: { api: getActiveTeacherOptions },
      fieldName: 'teacher_id',
      label: '本校教师',
      rules: 'required',
    },
  ];
}

export function useColumns(): VxeTableGridColumns<Device> {
  return [
    { field: 'device_no', title: '设备编号' },
    { field: 'vendor', title: '厂商' },
    { field: 'model', title: '型号' },
    { field: 'device_type', title: '类型' },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    { field: 'teachers', title: '绑定教师', slots: { default: 'teachers' } },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'action' },
      width: 120,
    },
  ];
}

export function useBindingColumns(): VxeTableGridColumns<Binding> {
  return [
    { field: 'employee_no', title: '工号', slots: { default: 'employee_no' } },
    { field: 'name', title: '教师', slots: { default: 'name' } },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'binding_action' },
      width: 100,
    },
  ];
}

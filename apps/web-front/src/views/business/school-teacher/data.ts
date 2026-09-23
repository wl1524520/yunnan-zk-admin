import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SchoolTeacher } from '#/api/business/school-teacher';

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

export function useFormSchema(isEdit: boolean): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'employee_no',
      label: '校内工号',
      rules: isEdit ? undefined : 'required',
    });
  schema.push({
    component: 'Input',
    fieldName: 'name',
    label: '姓名',
    rules: isEdit ? undefined : 'required',
  });
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'id_number',
      label: '身份证号（仅写入，不回显）',
      rules: isEdit ? undefined : 'required',
    });
  schema.push(
    { component: 'Input', fieldName: 'mobile', label: '手机号' },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { options: statusOptions, allowClear: true },
    },
  );
  return schema;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { allowClear: true, options: statusOptions },
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<SchoolTeacher>,
  canWrite = true,
): VxeTableGridColumns<SchoolTeacher> {
  return [
    { field: 'employee_no', title: '工号' },
    { field: 'name', title: '姓名／名称' },
    { field: 'mobile', title: '手机号' },
    {
      field: 'status',
      title: '状态',
      cellRender: {
        name: 'CellTag',
        options: statusOptions.map((item) => ({
          ...item,
          color: item.value === 'active' ? 'green' : 'default',
        })),
      },
    },
    {
      field: 'operation',
      title: '操作',
      width: 120,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [{ code: 'edit', text: '编辑', show: canWrite }],
      },
    },
  ];
}

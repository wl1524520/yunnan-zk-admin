import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SchoolClass } from '#/api/business/school-class';

const statusOptions = [
  { label: '在用', value: 'active' },
  { label: '关闭', value: 'closed' },
];

export function useFormSchema(isEdit: boolean): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'code',
      label: '班级代码',
      rules: isEdit ? undefined : 'required',
    });
  schema.push(
    {
      component: 'Input',
      fieldName: 'name',
      label: '班级名称',
      rules: isEdit ? undefined : 'required',
    },
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
  onActionClick: OnActionClickFn<SchoolClass>,
  canWrite = true,
): VxeTableGridColumns<SchoolClass> {
  return [
    { field: 'code', title: '代码' },
    { field: 'name', title: '姓名／名称' },
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

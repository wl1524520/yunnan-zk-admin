import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { District } from '#/api/business/district';

import { z } from '#/adapter/form';

const levelOptions = [
  { label: '省', value: 1 },
  { label: '市', value: 2 },
  { label: '县区', value: 3 },
];
const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { class: 'w-full', maxLength: 100 },
      fieldName: 'name',
      label: '名称',
      rules: z.string().min(1, '请输入名称').max(100, '名称不能超过 100 字'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: statusOptions,
        optionType: 'button',
      },
      fieldName: 'status',
      label: '状态',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 0, step: 1 },
      fieldName: 'sort_order',
      label: '排序',
      help: '数字越小越靠前',
      rules: z
        .number({
          invalid_type_error: '请输入排序值',
          required_error: '请输入排序值',
        })
        .int('排序值必须为整数')
        .min(0, '排序值不能小于 0'),
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<District>,
): VxeTableGridColumns<District> {
  return [
    {
      align: 'left',
      field: 'name',
      minWidth: 240,
      title: '名称',
      treeNode: true,
    },
    { field: 'code', title: '代码' },
    {
      field: 'level',
      title: '级别',
      formatter: ({ cellValue }) =>
        levelOptions.find((item) => String(item.value) === String(cellValue))
          ?.label ?? String(cellValue ?? '—'),
    },
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
    { field: 'sort_order', title: '排序' },
    {
      field: 'operation',
      title: '操作',
      width: 120,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [{ code: 'edit', text: '编辑' }],
      },
    },
  ];
}

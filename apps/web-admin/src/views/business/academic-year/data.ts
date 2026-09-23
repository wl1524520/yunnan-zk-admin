import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { AcademicYear } from '#/api/business/academic-year';

export function useFormSchema(isEdit: boolean): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'code',
      label: '学年代码（如 2026-2027）',
      rules: isEdit ? undefined : 'required',
    });
  if (isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'starts_on',
      label: '开始日期',
      componentProps: { type: 'date' },
    });
  if (isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'ends_on',
      label: '结束日期',
      componentProps: { type: 'date' },
    });
  return schema;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [];
}

export function useColumns(
  onActionClick: OnActionClickFn<AcademicYear>,
  canWrite = true,
): VxeTableGridColumns<AcademicYear> {
  return [
    { field: 'code', title: '代码' },
    { field: 'starts_on', title: '开始日期' },
    { field: 'ends_on', title: '结束日期' },
    {
      field: 'operation',
      title: '操作',
      width: 120,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [
          { code: 'edit', text: '编辑', show: canWrite },
          { code: 'terms', text: '学期' },
        ],
      },
    },
  ];
}

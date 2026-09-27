import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ApprovalCase } from '#/api/business/approval';

export const workflowOptions = [
  { label: '直属审批', value: 'district_review' },
  { label: '学校免考', value: 'school_exemption' },
  { label: '学生转学', value: 'student_transfer' },
];
export const statusOptions = [
  'draft',
  'submitted',
  'returned',
  'approved',
  'rejected',
  'applied',
  'declined',
  'closed',
].map((value) => ({ label: value, value }));

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: { allowClear: true, options: workflowOptions },
      fieldName: 'workflow_type',
      label: '审批流程',
    },
    {
      component: 'Select',
      componentProps: { allowClear: true, options: statusOptions },
      fieldName: 'status',
      label: '办理状态',
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<ApprovalCase>,
): VxeTableGridColumns<ApprovalCase> {
  return [
    { field: 'case_no', title: '申请编号' },
    { field: 'school', title: '学校', slots: { default: 'school' } },
    { field: 'case_type', title: '类型' },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    {
      field: 'operation',
      title: '操作',
      width: 130,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [{ code: 'detail', text: '查看办理' }],
      },
    },
  ];
}

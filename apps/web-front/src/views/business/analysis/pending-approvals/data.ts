import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { approvalStatusOptions, workflowOptions } from '../shared';

export function useColumns(): VxeTableGridColumns {
  return [
    {
      cellRender: { name: 'CellTag', options: workflowOptions },
      field: 'workflow_type',
      minWidth: 130,
      title: '审批流程',
    },
    {
      cellRender: { name: 'CellTag', options: approvalStatusOptions },
      field: 'status',
      title: '状态',
      width: 110,
    },
    { field: 'case_count', title: '申请数', width: 90 },
    { field: 'item_count', title: '明细数', width: 90 },
    {
      field: 'actionable',
      formatter: ({ cellValue }) => (cellValue ? '是' : '否'),
      title: '可办理',
      width: 90,
    },
  ];
}

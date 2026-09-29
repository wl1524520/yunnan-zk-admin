import type { VxeTableGridColumns } from '#/adapter/vxe-table';

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'label', minWidth: 180, title: '平台分析分档' },
    { field: 'score_range', minWidth: 180, title: '得分区间' },
    { field: 'count', title: '人数', width: 100 },
    { field: 'share', title: '占比', width: 100 },
  ];
}

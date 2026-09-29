import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { categoryLabels } from '../shared';

export const itemBandTitles = [
  '不及格（<60%）',
  '及格（60%～<80%）',
  '良好（80%～<90%）',
  '优秀（≥90%）',
];

export function useColumns(): VxeTableGridColumns {
  return [
    {
      field: 'item_name',
      formatter: ({ row }) => row.item.name,
      minWidth: 160,
      title: '考试项目',
    },
    {
      field: 'category',
      formatter: ({ row }) =>
        categoryLabels[row.item.category] ?? row.item.category,
      title: '类别',
      width: 110,
    },
    { field: 'calculated_count', title: '已计入', width: 90 },
    ...itemBandTitles.map((title, index) => ({
      field: `band_${index}`,
      formatter: ({ row }: { row: { bands?: { count: number }[] } }) =>
        row.bands?.[index]?.count ?? 0,
      title,
      width: 100,
    })),
  ];
}

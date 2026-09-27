import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { formatRate, genderField, gradeField, termField } from '../shared';

export function useGridFormSchema(): VbenFormSchema[] {
  return [termField(), gradeField(), genderField()];
}

export function useColumns(): VxeTableGridColumns {
  return [
    {
      cellRender: {
        name: 'CellTag',
        options: [
          { label: '学校', value: 'school' },
          { color: 'geekblue', label: '地区', value: 'district' },
        ],
      },
      field: 'kind',
      title: '层级',
      width: 90,
    },
    { field: 'name', minWidth: 200, title: '名称' },
    { field: 'students', title: '学生数', width: 90 },
    { field: 'expected_students', title: '应测学生', width: 100 },
    {
      field: 'participation_rate',
      formatter: ({ cellValue }) => formatRate(cellValue),
      title: '参与率',
      width: 110,
    },
    {
      field: 'completion_rate',
      formatter: ({ cellValue }) => formatRate(cellValue),
      title: '完成率',
      width: 110,
    },
    {
      field: 'missing_rate',
      formatter: ({ cellValue }) => formatRate(cellValue),
      title: '缺测率',
      width: 110,
    },
  ];
}

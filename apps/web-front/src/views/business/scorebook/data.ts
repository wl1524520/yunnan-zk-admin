import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ScoreItem, ScoreRow } from '#/api/business/scorebook';

import { getAcademicTermList } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';
import { getSchoolClassOptions } from '#/api/business/school-class';

const statusOptions = [
  { color: 'default', label: '待测', value: 'pending' },
  { color: 'orange', label: '部分完成', value: 'partial' },
  { color: 'green', label: '已完成', value: 'completed' },
];

async function getScorebookTermOptions() {
  const { items } = await getAcademicTermList();
  return items
    .toSorted((a, b) => {
      const yearOrder = (b.academic_year?.code ?? '').localeCompare(
        a.academic_year?.code ?? '',
      );
      return yearOrder || b.term_no - a.term_no;
    })
    .map((term) => ({
      label: [term.academic_year?.code ?? '', `第 ${term.term_no} 学期`]
        .filter(Boolean)
        .join(' '),
      value: term.id,
    }));
}

/** 展开行项目徽标，按特殊处置、结果状态与分数依次判定。 */
export interface ItemBadge {
  color?: string;
  key: string;
  label: string;
  tip?: string;
}

export function resolveItemBadges(items: ScoreItem[]): ItemBadge[] {
  return items.map((item, index) => {
    const key = `${item.exam_item_code}-${index}`;
    const prefix = `${item.item_name}：`;
    const isZeroScore =
      item.score !== null &&
      item.score !== undefined &&
      Number(item.score) === 0;
    if (item.special_disposition && isZeroScore)
      return { color: 'red', key, label: `${prefix}计零`, tip: '特殊处置' };
    if (item.special_disposition)
      return { color: 'blue', key, label: `${prefix}免考` };
    if (item.result_status === 'missing')
      return {
        color: 'red',
        key,
        label: `${prefix}缺考`,
        tip: item.missing_reason ?? undefined,
      };
    if (item.result_status === 'missing_baseline')
      return { color: 'orange', key, label: `${prefix}缺基线` };
    if (item.result_status === 'baseline_only')
      return { color: 'default', key, label: `${prefix}仅基线` };
    if (item.score !== null && item.score !== undefined)
      return { key, label: `${prefix}${item.score}` };
    return { color: 'default', key, label: `${prefix}待测` };
  });
}

export function useGridFormSchema(
  showSchoolFilter: boolean,
  schoolKeyword: Ref<string>,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    {
      component: 'ApiSelect',
      componentProps: {
        api: getScorebookTermOptions,
        filterOption: (inputValue: string, option: { label: string }) =>
          option.label.includes(inputValue),
        placeholder: '请选择学期',
        showSearch: true,
      },
      fieldName: 'academic_term_id',
      label: '学期',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '姓名模糊搜索' },
      fieldName: 'name',
      label: '姓名',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '学籍号精确查询' },
      fieldName: 'student_no',
      label: '学籍号',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [7, 8, 9].map((value) => ({
          label: `${value} 年级`,
          value,
        })),
      },
      fieldName: 'grade',
      label: '年级',
    },
    {
      component: 'ApiSelect',
      componentProps: { allowClear: true, api: getSchoolClassOptions },
      fieldName: 'school_class_id',
      label: '班级',
    },
  ];
  // 省/市/县角色可跨校查看，追加学校筛选；学校与教师的数据范围已由后端锁定本校。
  if (showSchoolFilter) {
    schema.push({
      component: 'ApiSelect',
      componentProps: () => ({
        allowClear: true,
        api: ({ keyword }: { keyword?: string }) => getSchoolOptions(keyword),
        filterOption: false,
        onSearch: (keyword: string) => {
          schoolKeyword.value = keyword;
        },
        params: { keyword: schoolKeyword.value },
        placeholder: '搜索学校',
        showSearch: true,
      }),
      fieldName: 'school_id',
      label: '学校',
    });
  }
  return schema;
}

export function useColumns(
  onActionClick: OnActionClickFn<ScoreRow>,
): VxeTableGridColumns<ScoreRow> {
  return [
    { slots: { content: 'items' }, type: 'expand', width: 50 },
    {
      field: 'student_no',
      formatter: ({ row }) => row.student.student_no,
      title: '学籍号',
    },
    {
      field: 'name',
      formatter: ({ row }) => row.student.name,
      title: '姓名',
    },
    {
      field: 'school',
      formatter: ({ row }) => row.school?.name ?? '—',
      title: '学校',
    },
    {
      field: 'school_class',
      formatter: ({ row }) => row.school_class?.name ?? '—',
      title: '班级',
    },
    {
      field: 'grade',
      formatter: ({ cellValue }) => cellValue ?? '—',
      title: '年级',
    },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: '状态',
    },
    {
      field: 'completion',
      formatter: ({ row }) =>
        `${row.completed_item_count} / ${row.expected_item_count}`,
      title: '完成情况',
    },
    { field: 'term_score', slots: { default: 'term_score' }, title: '学期分' },
    {
      field: 'grade_score',
      slots: { default: 'grade_score' },
      title: '年级分',
    },
    {
      field: 'total_score',
      slots: { default: 'total_score' },
      title: '总分',
    },
    {
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [{ code: 'detail', text: '查看档案' }],
      },
      field: 'operation',
      fixed: 'right',
      title: '操作',
      width: 120,
    },
  ];
}

// cspell:ignore unbanded unscored
import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { StatisticView } from '#/api/business/statistic';

import {
  getAcademicTermOptions,
  getAcademicYearOptions,
} from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';
import { getSchoolClassOptions } from '#/api/business/school-class';

export const viewOptions: { label: string; value: StatisticView }[] = [
  { label: '概览', value: 'overview' },
  { label: '项目分档', value: 'items' },
  { label: '总分分布', value: 'total-scores' },
  { label: '校际对比', value: 'comparisons' },
  { label: '异常名单', value: 'anomalies' },
  { label: '待审批', value: 'pending-approvals' },
];

export const anomalyTypeOptions = [
  { color: 'orange', label: '未评分或评分失败', value: 'unscored' },
  { color: 'red', label: '缺测', value: 'missing' },
  { color: 'red', label: '最终犯规', value: 'foul' },
  { color: 'orange', label: '需补基线', value: 'missing_baseline' },
  { color: 'purple', label: '规则校验异常', value: 'rule_mismatch' },
  { color: 'blue', label: '待锁定', value: 'pending_lock' },
];

const anomalyStatusOptions = [
  { label: '有效', value: 'valid' },
  { label: '犯规', value: 'foul' },
  { label: '缺考', value: 'absent' },
  { label: '已接收', value: 'received' },
  { label: '已评定', value: 'evaluated' },
  { label: '已作废', value: 'voided' },
  { label: '待评分', value: 'pending' },
  { label: '已评分', value: 'scored' },
  { label: '缺基线', value: 'missing_baseline' },
  { label: '不适用', value: 'not_applicable' },
];

const workflowOptions = [
  { label: '直属审批', value: 'district_review' },
  { label: '学校免考', value: 'school_exemption' },
  { label: '学生转学', value: 'student_transfer' },
];

const approvalStatusOptions = [
  { color: 'default', label: '草稿', value: 'draft' },
  { color: 'blue', label: '已提交', value: 'submitted' },
  { color: 'orange', label: '退回补正', value: 'returned' },
  { color: 'green', label: '已批准', value: 'approved' },
  { color: 'red', label: '已拒绝', value: 'rejected' },
  { color: 'green', label: '已应用', value: 'applied' },
  { color: 'red', label: '已拒收', value: 'declined' },
  { color: 'default', label: '已关闭', value: 'closed' },
];

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];

const categoryLabels: Record<string, string> = {
  basic: '基础项目',
  health: '体质健康',
  skill: '专项技能',
};

// 与后端 StatisticsCaliber::BANDS 同序的五档。
const bandTitles = [
  '不足 20%',
  '20%～40%',
  '40%～60%',
  '60%～80%',
  '80%～100%',
];

export function formatRate(rate: null | string | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

export function useGridFormSchema(
  view: StatisticView,
  showSchoolFilter: boolean,
  schoolKeyword: Ref<string>,
): VbenFormSchema[] {
  if (view === 'pending-approvals') return [];
  const termRequired = view !== 'total-scores';
  const schema: VbenFormSchema[] = [
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: !termRequired,
        api: getAcademicTermOptions,
        filterOption: (inputValue: string, option: { label: string }) =>
          option.label.includes(inputValue),
        placeholder: '请选择学期',
        showSearch: true,
      },
      fieldName: 'academic_term_id',
      label: '学期',
      rules: termRequired ? 'required' : undefined,
    },
  ];
  if (view === 'total-scores') {
    schema.push({
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: getAcademicYearOptions,
        placeholder: '学期与学年至少选一项',
      },
      fieldName: 'academic_year_id',
      label: '学年',
    });
  }
  if (view === 'anomalies') {
    schema.push(
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
    );
  }
  schema.push(
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [7, 8, 9].map((value) => ({ label: `${value} 年级`, value })),
      },
      fieldName: 'grade',
      label: '年级',
    },
    {
      component: 'Select',
      componentProps: { allowClear: true, options: genderOptions },
      fieldName: 'gender',
      label: '性别',
    },
  );
  if (view === 'overview' || view === 'anomalies') {
    schema.push({
      component: 'ApiSelect',
      componentProps: { allowClear: true, api: getSchoolClassOptions },
      fieldName: 'school_class_id',
      label: '班级',
    });
  }
  if (view === 'anomalies') {
    schema.push(
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '考试项目编码' },
        fieldName: 'exam_item_code',
        label: '考试项目',
      },
      {
        component: 'Select',
        componentProps: {
          allowClear: true,
          options: anomalyTypeOptions,
          placeholder: '选择后列出该类型名单',
        },
        fieldName: 'type',
        label: '异常类型',
      },
      {
        component: 'Select',
        componentProps: { allowClear: true, options: anomalyStatusOptions },
        // 状态只作用于记录型异常：未选类型或待锁定时不展示，避免触发后端 422。
        dependencies: {
          show: (values) =>
            Boolean(values.type) && values.type !== 'pending_lock',
          triggerFields: ['type'],
        },
        fieldName: 'status',
        label: '状态',
      },
    );
  }
  // 校际对比本身是跨校视图，不再提供学校筛选；省/市/县角色其余视图追加学校远程搜索。
  if (showSchoolFilter && view !== 'comparisons') {
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

export function useColumns(view: StatisticView): VxeTableGridColumns {
  switch (view) {
    case 'anomalies': {
      return [
        {
          field: 'student_no',
          formatter: ({ row }) => row.student?.student_no ?? '—',
          minWidth: 130,
          title: '学籍号',
        },
        {
          field: 'name',
          formatter: ({ row }) => row.student?.name ?? '—',
          minWidth: 110,
          title: '姓名',
        },
        {
          field: 'grade',
          formatter: ({ cellValue }) => cellValue ?? '—',
          title: '年级',
          width: 80,
        },
        {
          field: 'school',
          formatter: ({ row }) => row.school?.name ?? '—',
          minWidth: 160,
          title: '学校',
        },
        {
          field: 'school_class',
          formatter: ({ row }) => row.school_class?.name ?? '—',
          minWidth: 120,
          title: '班级',
        },
        {
          field: 'item',
          formatter: ({ row }) => row.item?.name ?? '—',
          minWidth: 120,
          title: '考试项目',
        },
        {
          cellRender: { name: 'CellTag', options: anomalyTypeOptions },
          field: 'type',
          title: '异常类型',
          width: 150,
        },
        {
          field: 'score',
          formatter: ({ row }) => row.score ?? row.term_score?.score ?? '—',
          title: '得分',
          width: 90,
        },
        {
          field: 'tested_at',
          formatter: ({ cellValue }) =>
            cellValue ? String(cellValue).slice(0, 16).replace('T', ' ') : '—',
          title: '测试时间',
          width: 150,
        },
      ];
    }
    case 'comparisons': {
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
    case 'items': {
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
        { field: 'unbanded_count', title: '无法归一化', width: 110 },
        ...bandTitles.map((title, index) => ({
          field: `band_${index}`,
          formatter: ({ row }: { row: { bands?: { count: number }[] } }) =>
            row.bands?.[index]?.count ?? 0,
          title,
          width: 100,
        })),
      ];
    }
    case 'pending-approvals': {
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
    case 'total-scores': {
      return [
        { field: 'label', minWidth: 180, title: '分档' },
        {
          field: 'range',
          formatter: ({ row }) =>
            row.lower_score !== undefined && row.upper_score !== undefined
              ? `${row.lower_score} ～ ${row.upper_score}`
              : '—',
          minWidth: 160,
          title: '得分区间',
        },
        { field: 'count', title: '人数', width: 100 },
      ];
    }
    default: {
      return [];
    }
  }
}

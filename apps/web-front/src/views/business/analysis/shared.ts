// cspell:ignore unbanded unscored
import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';

import {
  getAcademicTermList,
  getAcademicTermOptions,
} from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';

export const anomalyTypeOptions = [
  { color: 'orange', label: '未评分或评分失败', value: 'unscored' },
  { color: 'red', label: '缺测', value: 'missing' },
  { color: 'red', label: '最终犯规', value: 'foul' },
  { color: 'orange', label: '需补基线', value: 'missing_baseline' },
  { color: 'purple', label: '规则校验异常', value: 'rule_mismatch' },
  { color: 'blue', label: '待锁定', value: 'pending_lock' },
];

export const anomalyStatusOptions = [
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

export const workflowOptions = [
  { label: '直属审批', value: 'district_review' },
  { label: '学校免考', value: 'school_exemption' },
  { label: '学生转学', value: 'student_transfer' },
];

export const approvalStatusOptions = [
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

export const categoryLabels: Record<string, string> = {
  basic: '基础项目',
  health: '体质健康',
  skill: '专项技能',
};

// 与后端 StatisticsCaliber::BANDS 同序的五档。
export const bandTitles = [
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

export function termField(required = true): VbenFormSchema {
  return {
    component: 'ApiSelect',
    componentProps: {
      allowClear: !required,
      api: getAcademicTermOptions,
      filterOption: (inputValue: string, option: { label: string }) =>
        option.label.includes(inputValue),
      placeholder: '请选择学期',
      showSearch: true,
    },
    fieldName: 'academic_term_id',
    label: '学期',
    rules: required ? 'required' : undefined,
  };
}

export function gradeField(): VbenFormSchema {
  return {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [7, 8, 9].map((value) => ({ label: `${value} 年级`, value })),
    },
    fieldName: 'grade',
    label: '年级',
  };
}

export function genderField(): VbenFormSchema {
  return {
    component: 'Select',
    componentProps: { allowClear: true, options: genderOptions },
    fieldName: 'gender',
    label: '性别',
  };
}

// 省/市/县角色追加学校远程搜索；校际对比本身是跨校视图，不提供学校筛选。
export function schoolField(schoolKeyword: Ref<string>): VbenFormSchema {
  return {
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
  };
}

// 进入页面默认选中当前学期：以今天落在学期起止日期内判定，找不到则由用户手选。
export async function applyCurrentTerm(setTerm: (termId: string) => unknown) {
  const { items } = await getAcademicTermList();
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const current = items.find(
    (term) =>
      term.starts_on &&
      term.ends_on &&
      term.starts_on <= today &&
      today <= term.ends_on,
  );
  if (current) await setTerm(current.id);
}

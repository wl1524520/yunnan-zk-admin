import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';

import { getAcademicTermOptions } from '#/api/business/academic-term';
import { getStudentOptions } from '#/api/business/student';

export function useFilterSchema(
  studentKeyword: Ref<string>,
  onTermChange: (value: string) => void,
  onStudentChange: (value: string) => void,
): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: getAcademicTermOptions,
        onChange: (value: unknown) => onTermChange(String(value ?? '')),
      },
      fieldName: 'academic_term_id',
      label: '学期',
    },
    {
      component: 'ApiSelect',
      componentProps: () => ({
        api: ({ keyword }: { keyword?: string }) => getStudentOptions(keyword),
        filterOption: false,
        onChange: (value: unknown) => onStudentChange(String(value ?? '')),
        onSearch: (keyword: string) => {
          studentKeyword.value = keyword;
        },
        params: { keyword: studentKeyword.value },
        showSearch: true,
      }),
      fieldName: 'student_id',
      label: '学生',
    },
  ];
}

import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { RosterRow } from '#/api/business/exam-plan';

export function useRosterColumns(): VxeTableGridColumns<RosterRow> {
  return [
    { type: 'expand', slots: { content: 'items' }, width: 50 },
    { field: 'student_no', title: '学籍号' },
    { field: 'name', title: '姓名' },
    { field: 'grade', title: '年级' },
    { field: 'school_class', title: '班级', slots: { default: 'class' } },
    { field: 'progress', title: '完成情况', slots: { default: 'progress' } },
    { field: 'status', title: '状态', slots: { default: 'status' } },
  ];
}

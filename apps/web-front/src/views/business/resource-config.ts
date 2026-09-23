export interface Option {
  label: string;
  value: number | string;
}

export interface Field {
  name: string;
  label: string;
  required?: boolean;
  createOnly?: boolean;
  editOnly?: boolean;
  type?: 'number' | 'password' | 'date' | 'select' | 'lookup';
  options?: Option[];
  lookup?: 'school-classes';
}

export interface ResourceConfig {
  title: string;
  endpoint: string;
  columns: string[];
  fields: Field[];
  filters?: string[];
  canCreate?: boolean;
  canEdit?: boolean;
}

const activation: Option[] = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

export const resourceConfigs: Record<string, ResourceConfig> = {
  'school-classes': {
    title: '班级管理',
    endpoint: '/school-classes',
    columns: ['code', 'name', 'status'],
    filters: ['status'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'code', label: '班级代码', required: true, createOnly: true },
      { name: 'name', label: '班级名称', required: true },
      { name: 'status', label: '状态', type: 'select', options: [
        { label: '在用', value: 'active' },
        { label: '关闭', value: 'closed' },
      ] },
    ],
  },
  'school-teachers': {
    title: '教师管理',
    endpoint: '/school-teachers',
    columns: ['employee_no', 'name', 'mobile', 'status'],
    filters: ['status'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'employee_no', label: '校内工号', required: true, createOnly: true },
      { name: 'name', label: '姓名', required: true },
      { name: 'id_number', label: '身份证号（仅写入，不回显）', required: true, createOnly: true },
      { name: 'mobile', label: '手机号' },
      { name: 'status', label: '状态', type: 'select', options: activation },
    ],
  },
  students: {
    title: '学生档案',
    endpoint: '/students',
    columns: ['student_no', 'name', 'gender', 'school_class_id', 'status'],
    filters: ['school_class_id'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'student_no', label: '学籍号', required: true, createOnly: true },
      { name: 'name', label: '姓名', required: true },
      { name: 'gender', label: '性别', required: true, type: 'select', options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ] },
      { name: 'birth_date', label: '出生日期', type: 'date' },
      { name: 'id_number', label: '身份证号（仅写入，不回显）', createOnly: true },
      { name: 'school_class_id', label: '班级', type: 'lookup', lookup: 'school-classes', createOnly: true },
      { name: 'enrollment_month', label: '入学年月（YYYY-MM）', required: true, createOnly: true },
      { name: 'status', label: '状态', type: 'select', editOnly: true, options: [
        { label: '在籍', value: 'active' },
        { label: '毕业', value: 'graduated' },
        { label: '退学', value: 'withdrawn' },
      ] },
    ],
  },
};

export const fieldLabels: Record<string, string> = {
  code: '代码',
  name: '姓名／名称',
  status: '状态',
  employee_no: '工号',
  mobile: '手机号',
  student_no: '学籍号',
  gender: '性别',
  school_class_id: '班级',
};

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
  lookup?: 'districts' | 'schools';
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
  districts: {
    title: '地区管理',
    endpoint: '/districts',
    columns: ['code', 'name', 'level', 'status', 'sort_order'],
    filters: ['level', 'parent_id', 'status'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'code', label: '地区代码', required: true, createOnly: true },
      { name: 'name', label: '名称', required: true },
      {
        name: 'level', label: '级别', type: 'select', required: true,
        createOnly: true,
        options: [
          { label: '省', value: 1 },
          { label: '市', value: 2 },
          { label: '县区', value: 3 },
        ],
      },
      { name: 'parent_id', label: '上级地区', type: 'lookup', lookup: 'districts', createOnly: true },
      { name: 'status', label: '状态', type: 'select', options: activation },
      { name: 'sort_order', label: '排序', type: 'number' },
    ],
  },
  schools: {
    title: '学校管理',
    endpoint: '/schools',
    columns: ['code', 'name', 'school_type', 'status', 'district_id'],
    filters: ['district_id', 'status'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'code', label: '学校代码', required: true, createOnly: true },
      { name: 'name', label: '学校名称', required: true },
      { name: 'district_id', label: '所在地区', required: true, type: 'lookup', lookup: 'districts', createOnly: true },
      { name: 'supervising_district_id', label: '主管地区', required: true, type: 'lookup', lookup: 'districts', createOnly: true },
      { name: 'filing_district_id', label: '备案地区', type: 'lookup', lookup: 'districts' },
      { name: 'address', label: '地址' },
      { name: 'school_type', label: '学校类型', type: 'select', options: [
        { label: '初中', value: 'junior_high' },
        { label: '九年一贯制', value: 'nine_year' },
        { label: '完全中学', value: 'complete' },
        { label: '十二年一贯制', value: 'twelve_year' },
        { label: '其他', value: 'other' },
      ] },
      { name: 'status', label: '状态', type: 'select', options: activation },
    ],
  },
  'academic-years': {
    title: '学年与学期',
    endpoint: '/academic-years',
    columns: ['code', 'starts_on', 'ends_on'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'code', label: '学年代码（如 2026-2027）', required: true, createOnly: true },
      { name: 'starts_on', label: '开始日期', type: 'date', editOnly: true },
      { name: 'ends_on', label: '结束日期', type: 'date', editOnly: true },
    ],
  },
  'admin-users': {
    title: '平台账号',
    endpoint: '/admin-users',
    columns: ['username', 'name', 'mobile', 'role', 'status'],
    filters: ['role', 'status'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'username', label: '用户名', required: true, createOnly: true },
      { name: 'name', label: '姓名', required: true },
      { name: 'mobile', label: '手机号' },
      { name: 'password', label: '密码（至少 10 位，含字母和数字）', type: 'password', required: true },
      { name: 'role', label: '角色', type: 'select', required: true, createOnly: true, options: [
        { label: '超级管理员', value: 'super' },
        { label: '管理员', value: 'admin' },
      ] },
      { name: 'status', label: '状态', type: 'select', options: activation },
    ],
  },
  managers: {
    title: '业务账号',
    endpoint: '/managers',
    columns: ['username', 'name', 'role', 'mobile', 'status'],
    filters: ['role', 'district_id', 'school_id', 'status'],
    canCreate: true,
    canEdit: true,
    fields: [
      { name: 'username', label: '用户名', required: true, createOnly: true },
      { name: 'name', label: '姓名', required: true },
      { name: 'mobile', label: '手机号' },
      { name: 'password', label: '初始密码（至少 10 位，含字母和数字）', type: 'password', required: true, createOnly: true },
      { name: 'role', label: '角色', type: 'select', required: true, createOnly: true, options: [
        { label: '省级教体局', value: 'province' },
        { label: '市级教体局', value: 'city' },
        { label: '县级教体局', value: 'county' },
        { label: '学校', value: 'school' },
        { label: '教师', value: 'teacher' },
      ] },
      { name: 'district_id', label: '所属地区', type: 'lookup', lookup: 'districts', createOnly: true },
      { name: 'school_id', label: '所属学校', type: 'lookup', lookup: 'schools', createOnly: true },
      { name: 'status', label: '状态', type: 'select', options: activation },
    ],
  },
};

export const fieldLabels: Record<string, string> = {
  code: '代码',
  name: '名称',
  level: '级别',
  status: '状态',
  sort_order: '排序',
  school_type: '学校类型',
  district_id: '所在地区',
  starts_on: '开始日期',
  ends_on: '结束日期',
  username: '用户名',
  mobile: '手机号',
  role: '角色',
};

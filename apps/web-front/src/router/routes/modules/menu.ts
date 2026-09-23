import type { RouteRecordRaw } from 'vue-router';

const ResourcePage = () => import('#/views/business/resource-page.vue');
const schoolRoles = ['school'];

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/business/home.vue'),
    meta: { affixTab: true, icon: 'lucide:house', order: -1, title: '工作台' },
    name: 'Home',
    path: '/home',
  },
  {
    component: () => import('#/views/business/exam-plans.vue'),
    meta: { icon: 'lucide:calendar-check', order: 10, title: '考试计划' },
    name: 'ExamPlans',
    path: '/exam-plans',
  },
  {
    component: () => import('#/views/business/plan-roster.vue'),
    meta: { hideInMenu: true, title: '应考名单' },
    name: 'PlanRoster',
    path: '/exam-plans/:id/roster',
  },
  {
    component: ResourcePage,
    meta: { icon: 'lucide:graduation-cap', order: 11, resource: 'students', title: '学生档案' },
    name: 'Students',
    path: '/students',
  },
  {
    component: () => import('#/views/business/student-detail.vue'),
    meta: { hideInMenu: true, title: '学生详情' },
    name: 'StudentDetail',
    path: '/students/:id',
  },
  {
    component: ResourcePage,
    meta: { authority: schoolRoles, icon: 'lucide:network', order: 12, resource: 'school-classes', title: '班级管理' },
    name: 'SchoolClasses',
    path: '/school-classes',
  },
  {
    component: ResourcePage,
    meta: { authority: schoolRoles, icon: 'lucide:contact-round', order: 13, resource: 'school-teachers', title: '教师管理' },
    name: 'SchoolTeachers',
    path: '/school-teachers',
  },
  {
    component: () => import('#/views/business/selections.vue'),
    meta: { authority: ['school', 'teacher'], icon: 'lucide:list-checks', order: 14, title: '选测确认' },
    name: 'Selections',
    path: '/selections',
  },
  {
    component: () => import('#/views/business/approvals.vue'),
    meta: { authority: ['province', 'city', 'county', 'school'], icon: 'lucide:clipboard-check', order: 15, title: '审批办理' },
    name: 'Approvals',
    path: '/approvals',
  },
  {
    component: () => import('#/views/business/approval-create.vue'),
    meta: { authority: schoolRoles, hideInMenu: true, title: '发起审批' },
    name: 'ApprovalCreate',
    path: '/approvals/new',
  },
  {
    component: () => import('#/views/business/imports.vue'),
    meta: { authority: schoolRoles, icon: 'lucide:file-up', order: 16, title: '学生导入' },
    name: 'Imports',
    path: '/imports',
  },
  {
    component: () => import('#/views/business/devices.vue'),
    meta: { authority: schoolRoles, icon: 'lucide:tablet-smartphone', order: 17, title: '学校设备' },
    name: 'Devices',
    path: '/devices',
  },
  {
    component: () => import('#/views/business/statistics.vue'),
    meta: { icon: 'lucide:chart-no-axes-combined', order: 18, title: '成绩统计' },
    name: 'Statistics',
    path: '/statistics',
  },
  {
    component: () => import('#/views/business/scorebook.vue'),
    meta: { authority: ['province', 'city', 'county', 'school'], icon: 'lucide:book-open-check', order: 19, title: '成绩册' },
    name: 'Scorebook',
    path: '/scorebook',
  },
  {
    component: () => import('#/views/business/exports.vue'),
    meta: { authority: ['province', 'city', 'county', 'school'], icon: 'lucide:file-down', order: 20, title: '导出任务' },
    name: 'Exports',
    path: '/exports',
  },
];

export default routes;

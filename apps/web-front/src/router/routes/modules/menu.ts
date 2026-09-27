import type { RouteRecordRaw } from 'vue-router';

const schoolRoles = ['school'];

// 教师只能访问异常名单（其余分析视图后端 403）。
const analysisRoles = ['province', 'city', 'county', 'school'];

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/business/home/index.vue'),
    meta: { affixTab: true, icon: 'lucide:house', order: -1, title: '工作台' },
    name: 'Home',
    path: '/home',
  },
  {
    component: () => import('#/views/business/exam-plan/list.vue'),
    meta: { icon: 'lucide:calendar-check', order: 10, title: '考试计划' },
    name: 'ExamPlans',
    path: '/exam-plans',
  },
  {
    component: () => import('#/views/business/exam-plan/roster.vue'),
    meta: { hideInMenu: true, title: '应考名单' },
    name: 'PlanRoster',
    path: '/exam-plans/:id/roster',
  },
  {
    component: () => import('#/views/business/student/list.vue'),
    meta: { icon: 'lucide:graduation-cap', order: 11, title: '学生档案' },
    name: 'Students',
    path: '/students',
  },
  {
    component: () => import('#/views/business/school-class/list.vue'),
    meta: {
      authority: schoolRoles,
      icon: 'lucide:network',
      order: 12,
      title: '班级管理',
    },
    name: 'SchoolClasses',
    path: '/school-classes',
  },
  {
    component: () => import('#/views/business/school-teacher/list.vue'),
    meta: {
      authority: schoolRoles,
      icon: 'lucide:contact-round',
      order: 13,
      title: '教师管理',
    },
    name: 'SchoolTeachers',
    path: '/school-teachers',
  },
  {
    component: () => import('#/views/business/approval/list.vue'),
    meta: {
      authority: ['province', 'city', 'county', 'school'],
      icon: 'lucide:clipboard-check',
      order: 15,
      title: '审批办理',
    },
    name: 'Approvals',
    path: '/approvals',
  },
  {
    component: () => import('#/views/business/approval/create.vue'),
    meta: { authority: schoolRoles, hideInMenu: true, title: '发起审批' },
    name: 'ApprovalCreate',
    path: '/approvals/new',
  },
  {
    component: () => import('#/views/business/device/list.vue'),
    meta: {
      authority: schoolRoles,
      icon: 'lucide:tablet-smartphone',
      order: 17,
      title: '学校设备',
    },
    name: 'Devices',
    path: '/devices',
  },
  {
    meta: {
      icon: 'lucide:chart-no-axes-combined',
      order: 18,
      title: '成绩分析',
    },
    name: 'Analysis',
    path: '/analysis',
    redirect: '/analysis/overview',
    children: [
      {
        component: () => import('#/views/business/analysis/overview/index.vue'),
        meta: { authority: analysisRoles, title: '概览' },
        name: 'AnalysisOverview',
        path: 'overview',
      },
      {
        component: () =>
          import('#/views/business/analysis/item-bands/index.vue'),
        meta: { authority: analysisRoles, title: '项目分档' },
        name: 'AnalysisItemBands',
        path: 'item-bands',
      },
      {
        component: () =>
          import('#/views/business/analysis/score-distribution/index.vue'),
        meta: { authority: analysisRoles, title: '总分分布' },
        name: 'AnalysisScoreDistribution',
        path: 'score-distribution',
      },
      {
        component: () =>
          import('#/views/business/analysis/school-comparison/index.vue'),
        meta: { authority: analysisRoles, title: '校际对比' },
        name: 'AnalysisSchoolComparison',
        path: 'school-comparison',
      },
      {
        component: () =>
          import('#/views/business/analysis/anomalies/index.vue'),
        meta: { title: '异常名单' },
        name: 'AnalysisAnomalies',
        path: 'anomalies',
      },
      {
        component: () =>
          import('#/views/business/analysis/pending-approvals/index.vue'),
        meta: { authority: analysisRoles, title: '待审批' },
        name: 'AnalysisPendingApprovals',
        path: 'pending-approvals',
      },
    ],
  },
  {
    component: () => import('#/views/business/scorebook/list.vue'),
    meta: {
      authority: ['province', 'city', 'county', 'school'],
      icon: 'lucide:book-open-check',
      order: 19,
      title: '成绩册',
    },
    name: 'Scorebook',
    path: '/scorebook',
  },
  {
    component: () => import('#/views/business/export/list.vue'),
    meta: {
      authority: ['province', 'city', 'county', 'school'],
      icon: 'lucide:file-down',
      order: 20,
      title: '导出任务',
    },
    name: 'Exports',
    path: '/exports',
  },
];

export default routes;

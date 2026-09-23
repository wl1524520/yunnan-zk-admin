import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/business/home/index.vue'),
    meta: { affixTab: true, icon: 'lucide:house', order: -1, title: '工作台' },
    name: 'Home',
    path: '/home',
  },
  {
    component: () => import('#/views/business/district/list.vue'),
    meta: { icon: 'lucide:map', order: 10, title: '地区管理' },
    name: 'Districts',
    path: '/districts',
  },
  {
    component: () => import('#/views/business/school/list.vue'),
    meta: { icon: 'lucide:school', order: 11, title: '学校管理' },
    name: 'Schools',
    path: '/schools',
  },
  {
    component: () => import('#/views/business/academic-year/list.vue'),
    meta: { icon: 'lucide:calendar-range', order: 12, title: '学年学期' },
    name: 'AcademicYears',
    path: '/academic-years',
  },
  {
    component: () => import('#/views/business/manager/list.vue'),
    meta: { icon: 'lucide:users', order: 13, title: '业务账号' },
    name: 'Managers',
    path: '/managers',
  },
  {
    component: () => import('#/views/business/admin-user/list.vue'),
    meta: {
      authority: ['super'],
      icon: 'lucide:shield-user',
      order: 14,
      title: '平台账号',
    },
    name: 'AdminUsers',
    path: '/admin-users',
  },
  {
    component: () => import('#/views/business/import/list.vue'),
    meta: { icon: 'lucide:file-up', order: 15, title: '批量导入' },
    name: 'Imports',
    path: '/imports',
  },
  {
    component: () => import('#/views/business/device/list.vue'),
    meta: { icon: 'lucide:tablet-smartphone', order: 16, title: '设备台账' },
    name: 'Devices',
    path: '/devices',
  },
];

export default routes;

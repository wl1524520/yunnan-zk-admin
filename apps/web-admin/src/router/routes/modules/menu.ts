import type { RouteRecordRaw } from 'vue-router';

const ResourcePage = () => import('#/views/business/resource-page.vue');

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/business/home.vue'),
    meta: { affixTab: true, icon: 'lucide:house', order: -1, title: '工作台' },
    name: 'Home',
    path: '/home',
  },
  {
    component: ResourcePage,
    meta: { icon: 'lucide:map', order: 10, resource: 'districts', title: '地区管理' },
    name: 'Districts',
    path: '/districts',
  },
  {
    component: ResourcePage,
    meta: { icon: 'lucide:school', order: 11, resource: 'schools', title: '学校管理' },
    name: 'Schools',
    path: '/schools',
  },
  {
    component: ResourcePage,
    meta: { icon: 'lucide:calendar-range', order: 12, resource: 'academic-years', title: '学年学期' },
    name: 'AcademicYears',
    path: '/academic-years',
  },
  {
    component: ResourcePage,
    meta: { icon: 'lucide:users', order: 13, resource: 'managers', title: '业务账号' },
    name: 'Managers',
    path: '/managers',
  },
  {
    component: ResourcePage,
    meta: { authority: ['super'], icon: 'lucide:shield-user', order: 14, resource: 'admin-users', title: '平台账号' },
    name: 'AdminUsers',
    path: '/admin-users',
  },
  {
    component: () => import('#/views/business/imports.vue'),
    meta: { icon: 'lucide:file-up', order: 15, title: '批量导入' },
    name: 'Imports',
    path: '/imports',
  },
  {
    component: () => import('#/views/business/devices.vue'),
    meta: { icon: 'lucide:tablet-smartphone', order: 16, title: '设备台账' },
    name: 'Devices',
    path: '/devices',
  },
];

export default routes;

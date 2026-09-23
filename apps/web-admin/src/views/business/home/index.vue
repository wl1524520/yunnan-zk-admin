<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Card, Statistic } from 'antdv-next';

import { getAcademicYearList } from '#/api/business/academic-year';
import { getDistrictList } from '#/api/business/district';
import { getManagerList } from '#/api/business/manager';
import { getSchoolList } from '#/api/business/school';

const router = useRouter();
const sections = ref([
  {
    title: '地区',
    path: '/districts',
    load: () => getDistrictList({ page: 1, per_page: 1 }),
    total: 0,
  },
  {
    title: '学校',
    path: '/schools',
    load: () => getSchoolList({ page: 1, per_page: 1 }),
    total: 0,
  },
  {
    title: '学年',
    path: '/academic-years',
    load: () => getAcademicYearList({ page: 1, per_page: 1 }),
    total: 0,
  },
  {
    title: '业务账号',
    path: '/managers',
    load: () => getManagerList({ page: 1, per_page: 1 }),
    total: 0,
  },
]);

onMounted(async () => {
  await Promise.all(
    sections.value.map(async (section) => {
      try {
        const result = await section.load();
        section.total = result.total;
      } catch {
        section.total = 0;
      }
    }),
  );
});
</script>

<template>
  <Page title="平台工作台" description="维护地区、学校、考试学年和业务账号。">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="section in sections"
        :key="section.path"
        class="cursor-pointer"
        hoverable
        @click="router.push(section.path)"
      >
        <Statistic :title="section.title" :value="section.total" />
        <div class="mt-3 text-sm text-primary">进入管理 →</div>
      </Card>
    </div>
  </Page>
</template>

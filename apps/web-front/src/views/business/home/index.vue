<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Card, Statistic } from 'antdv-next';

import { getExamPlanList } from '#/api/business/exam-plan';
import { getStudentList } from '#/api/business/student';

const router = useRouter();
const userStore = useUserStore();
const sections = ref([
  {
    title: '考试计划',
    path: '/exam-plans',
    load: () => getExamPlanList(1, 1),
    total: 0,
  },
  {
    title: '学生档案',
    path: '/students',
    load: () => getStudentList({ page: 1, per_page: 1 }),
    total: 0,
  },
]);
const greeting = computed(
  () => `你好，${userStore.userInfo?.realName || '老师'}`,
);

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
  <Page
    :title="greeting"
    description="查看当前管理范围内的考试计划和学生档案。"
  >
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card
        v-for="section in sections"
        :key="section.path"
        class="cursor-pointer"
        hoverable
        @click="router.push(section.path)"
      >
        <Statistic :title="section.title" :value="section.total" />
        <div class="mt-3 text-sm text-primary">进入查看 →</div>
      </Card>
    </div>
  </Page>
</template>

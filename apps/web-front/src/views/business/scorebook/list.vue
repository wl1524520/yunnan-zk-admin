<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ScoreRow } from '#/api/business/scorebook';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Alert, Card, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getScorebook } from '#/api/business/scorebook';

import { useColumns, useFilterSchema } from './data';

const router = useRouter();
const academicTermId = ref('');
const caliber = ref('');
const generatedAt = ref('');
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          if (!academicTermId.value) return { items: [], total: 0 };
          const response = await getScorebook(
            academicTermId.value,
            page.currentPage,
            page.pageSize,
          );
          caliber.value = response.caliber_version || '';
          generatedAt.value = response.generated_at || '';
          return {
            ...response,
            items: response.items.map((row) => ({
              ...row,
              id: row.student.id,
            })),
          };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: true, zoom: true },
  } as VxeTableGridOptions<ScoreRow & { id: string }>,
});
const [FilterForm] = useVbenForm({
  layout: 'vertical',
  schema: useFilterSchema((id) => {
    academicTermId.value = id;
    gridApi.query();
  }),
  showDefaultActions: false,
});
</script>

<template>
  <Page
    title="班级成绩册"
    description="分数未形成时保持空值；档案和成绩按学生当前学校、班级归属。"
    auto-content-height
  >
    <Card class="mb-4"><FilterForm /></Card>
    <Alert
      v-if="caliber"
      class="mb-4"
      type="info"
      :message="`口径：${caliber} · 查询时间：${generatedAt}`"
    />
    <Grid>
      <template #student_no="{ row }">{{ row.student.student_no }}</template>
      <template #name="{ row }">{{ row.student.name }}</template>
      <template #school="{ row }">{{ row.school?.name || '—' }}</template>
      <template #class="{ row }">{{ row.school_class?.name || '—' }}</template>
      <template #completion="{ row }">
        {{ row.completed_item_count }} / {{ row.expected_item_count }}
        <Tag>{{ row.status }}</Tag>
      </template>
      <template #term="{ row }">{{ row.term_score?.score ?? '—' }}</template>
      <template #grade_score="{ row }">
        {{ row.grade_score?.score ?? '—' }}
      </template>
      <template #total="{ row }">{{ row.total_score?.score ?? '—' }}</template>
      <template #action="{ row }">
        <a @click="router.push(`/students/${row.student.id}`)">查看档案</a>
      </template>
      <template #items="{ row }">
        <div class="flex flex-wrap gap-2">
          <Tag v-for="item in row.items" :key="item.exam_item_code">
            {{ item.item_name }}：{{
              item.score ?? (item.completed ? '已完成' : '待测')
            }}
          </Tag>
        </div>
      </template>
    </Grid>
  </Page>
</template>

<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ExamPlan, RosterRow } from '#/api/business/exam-plan';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Space, Switch, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPlanRoster } from '#/api/business/exam-plan';

import { useRosterColumns } from './roster-data';

const plan = ref<ExamPlan>();
const title = computed(() =>
  plan.value ? `应考名单 · ${plan.value.name}` : '应考名单',
);
const incompleteOnly = ref(false);
const rosterStatuses: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待测' },
  partial: { color: 'blue', label: '部分完成' },
  completed: { color: 'green', label: '已完成' },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useRosterColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    rowConfig: { keyField: 'student_id' },
    toolbarConfig: { refresh: true, zoom: true },
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: ({ page }) => {
          if (!plan.value) throw new Error('未选择考试计划');
          return getPlanRoster(
            plan.value.id,
            page.currentPage,
            incompleteOnly.value,
            page.pageSize,
          );
        },
      },
    },
  } as VxeTableGridOptions<RosterRow>,
});

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(open) {
    if (!open) return;
    plan.value = drawerApi.getData<ExamPlan>();
    incompleteOnly.value = false;
  },
  onOpened() {
    gridApi.query();
  },
});
</script>

<template>
  <Drawer class="w-full max-w-[90%]" :title="title">
    <Grid>
      <template #toolbar-tools>
        <Space>
          <span>仅看未完成</span>
          <Switch v-model:checked="incompleteOnly" @change="gridApi.query()" />
        </Space>
      </template>
      <template #class="{ row }">{{ row.school_class?.name || '—' }}</template>
      <template #progress="{ row }">
        {{ row.completed_item_count }} / {{ row.expected_item_count }}
      </template>
      <template #status="{ row }">
        <Tag :color="rosterStatuses[row.status]?.color ?? 'default'">
          {{ rosterStatuses[row.status]?.label ?? row.status }}
        </Tag>
      </template>
      <template #items="{ row }">
        <div class="min-h-28 px-6 py-5">
          <div class="mb-3 text-sm font-medium">应测项目</div>
          <div v-if="row.items.length > 0" class="flex flex-wrap gap-3">
            <Tag
              v-for="item in row.items"
              :key="item.exam_item_code"
              :color="item.completed ? 'green' : 'orange'"
              class="m-0 px-3 py-1"
            >
              {{ item.item_name }}：{{
                item.completed ? '完成' : item.missing_reason || '待测'
              }}
            </Tag>
          </div>
          <span v-else class="text-muted-foreground text-sm">暂无应测项目</span>
        </div>
      </template>
    </Grid>
  </Drawer>
</template>

<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RosterRow } from '#/api/business/exam-plan';

import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Space, Switch, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPlanRoster } from '#/api/business/exam-plan';

import { useRosterColumns } from './roster-data';

const route = useRoute();
const router = useRouter();
const planId = computed(() => String(route.params.id));
const incompleteOnly = ref(false);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useRosterColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) =>
          getPlanRoster(
            planId.value,
            page.currentPage,
            incompleteOnly.value,
            page.pageSize,
          ),
      },
    },
    rowConfig: { keyField: 'student_id' },
    toolbarConfig: { refresh: true, zoom: true },
  } as VxeTableGridOptions<RosterRow>,
});
</script>

<template>
  <Page
    title="应考名单"
    description="名单与应测项目根据学生当前归属和已确认选项实时生成。"
    auto-content-height
  >
    <Grid>
      <template #toolbar-tools>
        <Space>
          <Button @click="router.push('/exam-plans')">返回计划</Button>
          <span>仅看未完成</span>
          <Switch v-model:checked="incompleteOnly" @change="gridApi.query()" />
        </Space>
      </template>
      <template #class="{ row }">{{ row.school_class?.name || '—' }}</template>
      <template #progress="{ row }">
        {{ row.completed_item_count }} / {{ row.expected_item_count }}
      </template>
      <template #status="{ row }">
        <Tag :color="row.status === 'completed' ? 'green' : 'orange'">
          {{ row.status }}
        </Tag>
      </template>
      <template #items="{ row }">
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="item in row.items"
            :key="item.exam_item_code"
            :color="item.completed ? 'green' : 'orange'"
          >
            {{ item.item_name }}：{{
              item.completed ? '完成' : item.missing_reason || '待测'
            }}
          </Tag>
        </div>
      </template>
    </Grid>
  </Page>
</template>

<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ExamPlan } from '#/api/business/exam-plan';

import { computed } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, message, Modal, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getExamPlanList, runExamPlanAction } from '#/api/business/exam-plan';

import { useColumns } from './data';
import Form from './modules/form.vue';
import Postpone from './modules/postpone.vue';
import Roster from './roster.vue';

const userStore = useUserStore();
const isBureau = computed(
  () =>
    userStore.userInfo?.roles?.some((role) =>
      ['city', 'county', 'province'].includes(role),
    ) ?? false,
);
const districtId = computed(() => userStore.userInfo?.district?.id);

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [PostponeDrawer, postponeDrawerApi] = useVbenDrawer({
  connectedComponent: Postpone,
  destroyOnClose: true,
});
const [RosterDrawer, rosterDrawerApi] = useVbenDrawer({
  connectedComponent: Roster,
  destroyOnClose: true,
});
const planStatuses: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '已发布' },
  closed: { color: 'gray', label: '已关闭' },
  cancelled: { color: 'red', label: '已取消' },
};
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick, canOperate),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) => getExamPlanList(page.currentPage, page.pageSize),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ExamPlan>,
});

function canOperate(plan: ExamPlan) {
  return isBureau.value && plan.publisher_district_id === districtId.value;
}

function runAction(plan: ExamPlan, action: 'cancel' | 'close' | 'publish') {
  Modal.confirm({
    title: `确认${
      { publish: '发布', close: '关闭', cancel: '取消' }[action]
    }计划「${plan.name}」？`,
    async onOk() {
      await runExamPlanAction(plan.id, action);
      message.success('操作成功');
      gridApi.query();
    },
  });
}

function onActionClick({ code, row }: OnActionClickParams<ExamPlan>) {
  if (code === 'roster') rosterDrawerApi.setData(row).open();
  if (code === 'publish') runAction(row, 'publish');
  if (code === 'postpone') postponeDrawerApi.setData(row).open();
  if (code === 'close') runAction(row, 'close');
  if (code === 'cancel') runAction(row, 'cancel');
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <PostponeDrawer @success="gridApi.query()" />
    <RosterDrawer />
    <Grid>
      <template #toolbar-tools>
        <Button v-if="isBureau" type="primary" @click="formDrawerApi.open()">
          新建计划
        </Button>
      </template>
      <template #term="{ row }">
        {{ row.academic_term?.academic_year?.code }}
        第 {{ row.academic_term?.term_no }} 学期
      </template>
      <template #schools="{ row }">
        {{ row.schools?.map((school) => school.name).join('、') || '—' }}
      </template>
      <template #status="{ row }">
        <Tag :color="planStatuses[row.status]?.color ?? 'default'">
          {{ planStatuses[row.status]?.label ?? row.status }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>

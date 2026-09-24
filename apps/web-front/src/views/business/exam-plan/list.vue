<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ExamPlan } from '#/api/business/exam-plan';

import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Input, message, Modal, Space, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getExamPlanList,
  runExamPlanAction,
  updateExamPlanDeadline,
} from '#/api/business/exam-plan';

import { useColumns } from './data';
import Form from './modules/form.vue';

const router = useRouter();
const userStore = useUserStore();
const isBureau = computed(
  () =>
    userStore.userInfo?.roles?.some((role) =>
      ['city', 'county', 'province'].includes(role),
    ) ?? false,
);
const districtId = computed(() => userStore.userInfo?.district?.id);
const deadlineOpen = ref(false);
const deadlinePlan = ref<ExamPlan>();
const saving = ref(false);
const deadline = reactive({ ends_at: '', reason: '' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) => getExamPlanList(page.currentPage, page.pageSize),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: true, zoom: true },
  } as VxeTableGridOptions<ExamPlan>,
});

function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { hour12: false })
    : '—';
}

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

function openDeadline(plan: ExamPlan) {
  deadlinePlan.value = plan;
  deadline.ends_at = '';
  deadline.reason = '';
  deadlineOpen.value = true;
}

async function updateDeadline() {
  if (!deadlinePlan.value || !deadline.ends_at || !deadline.reason) {
    message.error('请填写新的结束时间和原因');
    return;
  }
  saving.value = true;
  try {
    await updateExamPlanDeadline(
      deadlinePlan.value.id,
      new Date(deadline.ends_at).toISOString(),
      deadline.reason,
    );
    message.success('截止时间已更新');
    deadlineOpen.value = false;
    gridApi.query();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline -->
  <Page
    title="考试计划"
    description="教体局创建和发布计划；学校与教师查看本校已发布计划及应考名单。"
    auto-content-height
  >
    <FormDrawer @success="gridApi.query()" />
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
      <template #starts_at="{ row }">{{ formatDate(row.starts_at) }}</template>
      <template #ends_at="{ row }">{{ formatDate(row.ends_at) }}</template>
      <template #status="{ row }">
        <Tag :color="row.status === 'published' ? 'green' : 'default'">
          {{ row.status }}
        </Tag>
      </template>
      <template #actions="{ row }">
        <Space>
          <Button
            type="link"
            size="small"
            @click="router.push(`/exam-plans/${row.id}/roster`)"
          >
            名单
          </Button>
          <template v-if="canOperate(row)">
            <Button
              v-if="row.status === 'draft'"
              type="link"
              size="small"
              @click="runAction(row, 'publish')"
            >
              发布
            </Button>
            <Button
              v-if="row.status === 'published'"
              type="link"
              size="small"
              @click="openDeadline(row)"
            >
              延期
            </Button>
            <Button
              v-if="row.status === 'published'"
              type="link"
              size="small"
              @click="runAction(row, 'close')"
            >
              关闭
            </Button>
            <Button
              v-if="row.status === 'draft'"
              danger
              type="link"
              size="small"
              @click="runAction(row, 'cancel')"
            >
              取消
            </Button>
          </template>
        </Space>
      </template>
    </Grid>
    <Modal
      v-model:open="deadlineOpen"
      title="调整截止时间"
      :confirm-loading="saving"
      @ok="updateDeadline"
    >
      <div class="grid gap-4">
        <label
          >新的截止时间
          <Input v-model:value="deadline.ends_at" type="datetime-local"
        /></label>
        <label>调整原因 <Input v-model:value="deadline.reason" /></label>
      </div>
    </Modal>
  </Page>
</template>

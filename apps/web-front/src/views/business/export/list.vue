<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ExportJob } from '#/api/business/export';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, message, Space, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createExportJob,
  downloadExportJob,
  getExportJob,
} from '#/api/business/export';

import { useColumns, useFormSchema } from './data';

const userStore = useUserStore();
const storageKey = computed(
  () => `yunnan-zk-exports:${userStore.userInfo?.userId || 'anonymous'}`,
);
const saving = ref(false);
const loading = ref(false);

const [ExportForm, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<ExportJob>,
});

function storedIds(): string[] {
  try {
    return JSON.parse(
      localStorage.getItem(storageKey.value) || '[]',
    ) as string[];
  } catch {
    return [];
  }
}

async function loadJobs() {
  loading.value = true;
  try {
    const results = await Promise.all(
      storedIds().map(async (id) => {
        try {
          return await getExportJob(id);
        } catch {
          return undefined;
        }
      }),
    );
    gridApi.setGridOptions({
      data: results.filter((job): job is ExportJob => !!job),
    });
  } finally {
    loading.value = false;
  }
}

async function createExport() {
  const { valid } = await formApi.validate();
  if (!valid) {
    message.error('请选择学期');
    return;
  }
  const values = await formApi.getValues();
  saving.value = true;
  try {
    const job = await createExportJob(
      String(values.type) as 'scorebook' | 'statistics',
      String(values.academic_term_id),
    );
    localStorage.setItem(
      storageKey.value,
      JSON.stringify(
        [job.id, ...storedIds().filter((id) => id !== job.id)].slice(0, 30),
      ),
    );
    message.success('导出任务已受理，请稍后刷新状态');
    await loadJobs();
  } finally {
    saving.value = false;
  }
}

async function download(job: ExportJob) {
  const blob = await downloadExportJob(job.id);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${job.type_label}-${job.id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  void loadJobs();
});
</script>

<template>
  <Page
    title="私有导出"
    description="导出异步生成；下载时重新核对当前权限和学生归属。"
  >
    <Card class="mb-4">
      <Space wrap>
        <ExportForm />
        <Button type="primary" :loading="saving" @click="createExport">
          申请 CSV 导出
        </Button>
      </Space>
    </Card>
    <Alert
      class="mb-4"
      type="info"
      message="任务仅对申请账号可见；本机只保存任务编号。文件过期或范围变动后请重新申请。"
    />
    <Grid table-title="我的导出任务" :loading="loading">
      <template #toolbar-tools>
        <Button :loading="loading" @click="loadJobs">刷新状态</Button>
      </template>
      <template #status="{ row }">
        <Tag>{{ row.status_label || row.status }}</Tag>
      </template>
      <template #action="{ row }">
        <Button v-if="row.downloadable" type="link" @click="download(row)">
          下载
        </Button>
        <template v-else>{{ row.error_code || '—' }}</template>
      </template>
    </Grid>
  </Page>
</template>

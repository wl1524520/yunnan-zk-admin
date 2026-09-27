<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ExportJob } from '#/api/business/export';

import { computed } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { downloadExportJob, getExportJob } from '#/api/business/export';

import { useColumns } from './data';
import Apply from './modules/apply.vue';

const userStore = useUserStore();
const storageKey = computed(
  () => `yunnan-zk-exports:${userStore.userInfo?.userId || 'anonymous'}`,
);
const [ApplyDrawer, applyDrawerApi] = useVbenDrawer({
  connectedComponent: Apply,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    proxyConfig: {
      ajax: {
        // 后端无导出列表接口：按本机保存的任务编号逐个拉取详情，不走服务端分页。
        query: async () => await loadJobs(),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
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

async function loadJobs(): Promise<ExportJob[]> {
  const results = await Promise.all(
    storedIds().map(async (id) => {
      try {
        return await getExportJob(id);
      } catch {
        return undefined;
      }
    }),
  );
  return results.filter((job): job is ExportJob => !!job);
}

function onActionClick({ code, row }: OnActionClickParams<ExportJob>) {
  if (code === 'download') download(row);
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
</script>

<template>
  <Page auto-content-height>
    <ApplyDrawer @success="gridApi.query()" />
    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="applyDrawerApi.open()">申请导出</Button>
        <Button class="ml-2" @click="gridApi.query()">刷新状态</Button>
      </template>
    </Grid>
  </Page>
</template>

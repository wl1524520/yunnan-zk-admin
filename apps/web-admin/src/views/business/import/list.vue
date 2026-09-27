<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ImportBatch, ImportRow } from '#/api/business/import';

import { computed, nextTick, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, message, Modal, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getImportBatch,
  getImportList,
  getImportRows,
  runImportAction,
} from '#/api/business/import';

import {
  resourceTypeOptions,
  useColumns,
  useGridFormSchema,
  usePreviewColumns,
} from './data';
import Upload from './modules/upload.vue';

const userStore = useUserStore();
const isAdmin = computed(
  () =>
    userStore.userInfo?.roles?.some((role) =>
      ['admin', 'super'].includes(role),
    ) ?? false,
);
const resourceOptions = computed(() =>
  isAdmin.value
    ? resourceTypeOptions.filter((item) => item.value !== 'students')
    : resourceTypeOptions.filter((item) => item.value === 'students'),
);
const saving = ref(false);
const selected = ref<ImportBatch>();

const [UploadDrawer, uploadDrawerApi] = useVbenDrawer({
  connectedComponent: Upload,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: false,
    schema: useGridFormSchema(resourceOptions.value),
    showCollapseButton: false,
    submitOnChange: true,
    wrapperClass: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getImportList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ImportBatch>,
});

const [PreviewGrid, previewGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: usePreviewColumns(),
    height: 420,
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) =>
          selected.value
            ? getImportRows(selected.value.id, page.currentPage, page.pageSize)
            : Promise.resolve({ items: [], total: 0 }),
      },
    },
    rowConfig: { keyField: 'row_no' },
  } as VxeTableGridOptions<ImportRow>,
});

function onActionClick({ code, row }: OnActionClickParams<ImportBatch>) {
  if (code === 'preview') openBatch(row.id);
}

async function openBatch(id: string) {
  selected.value = await getImportBatch(id);
  await nextTick();
  previewGridApi.query();
}

async function action(kind: 'commit' | 'validate') {
  if (!selected.value) return;
  saving.value = true;
  try {
    await runImportAction(selected.value.id, kind);
    message.success(kind === 'validate' ? '校验任务已提交' : '导入已提交');
    await openBatch(selected.value.id);
    gridApi.query();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <UploadDrawer @success="gridApi.query()" />
    <Grid table-title="批量导入">
      <template #toolbar-tools>
        <Button type="primary" @click="uploadDrawerApi.open()">
          上传文件
        </Button>
      </template>
    </Grid>
    <Modal
      :open="!!selected"
      title="导入预览"
      width="900px"
      :footer="null"
      @cancel="selected = undefined"
    >
      <template v-if="selected">
        <Alert
          class="mb-4"
          type="info"
          :message="`状态：${selected.status} · 有效 ${
            selected.valid_rows
          } 行 · 错误 ${selected.invalid_rows} 行`"
        />
        <Space class="mb-4">
          <Button
            v-if="selected.status === 'uploaded'"
            type="primary"
            :loading="saving"
            @click="action('validate')"
          >
            发起校验
          </Button>
          <Button
            v-if="selected.status === 'validated'"
            type="primary"
            :loading="saving"
            @click="action('commit')"
          >
            整批提交
          </Button>
          <Button @click="openBatch(selected.id)">刷新状态</Button>
        </Space>
        <PreviewGrid>
          <template #data="{ row }">
            <pre class="whitespace-pre-wrap">{{
              JSON.stringify(row.data, null, 2)
            }}</pre>
          </template>
          <template #errors="{ row }">
            <pre class="whitespace-pre-wrap">{{
              JSON.stringify(row.errors)
            }}</pre>
          </template>
        </PreviewGrid>
      </template>
    </Modal>
  </Page>
</template>

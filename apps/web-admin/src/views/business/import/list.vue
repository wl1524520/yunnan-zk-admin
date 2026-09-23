<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ImportBatch, ImportRow } from '#/api/business/import';

import { computed, nextTick, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, message, Modal, Space, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getImportBatch,
  getImportList,
  getImportRows,
  runImportAction,
  uploadImport,
} from '#/api/business/import';

import { useColumns, usePreviewColumns, useUploadSchema } from './data';

const userStore = useUserStore();
const isAdmin = computed(
  () =>
    userStore.userInfo?.roles?.some((role) =>
      ['admin', 'super'].includes(role),
    ) ?? false,
);
const resourceOptions = computed(() =>
  isAdmin.value
    ? [
        { label: '地区', value: 'districts' },
        { label: '学校', value: 'schools' },
        { label: '班级', value: 'school_classes' },
        { label: '教师', value: 'school_teachers' },
      ]
    : [{ label: '学生', value: 'students' }],
);
const file = ref<File>();
const saving = ref(false);
const selected = ref<ImportBatch>();

const [UploadForm, uploadFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useUploadSchema(resourceOptions.value),
  showDefaultActions: false,
});
watch(resourceOptions, (options) => {
  uploadFormApi.setState({ schema: useUploadSchema(options) });
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) => getImportList(page.currentPage, page.pageSize),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: true, zoom: true },
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

function selectFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0];
}

async function upload() {
  const { valid } = await uploadFormApi.validate();
  if (!valid || !file.value) {
    message.error('请选择导入类型和文件');
    return;
  }
  const { resource_type } = await uploadFormApi.getValues();
  saving.value = true;
  try {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      await file.value.arrayBuffer(),
    );
    const sha256 = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const data = new FormData();
    data.append('resource_type', String(resource_type));
    data.append('file', file.value);
    data.append('sha256', sha256);
    data.append('request_id', crypto.randomUUID());
    await uploadImport(data);
    file.value = undefined;
    message.success('文件已上传，请发起预览校验');
    gridApi.query();
  } finally {
    saving.value = false;
  }
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
  <Page
    title="批量导入"
    description="先上传文件，再校验预览；全部行通过后才能整批提交。"
  >
    <Card class="mb-4">
      <Space wrap>
        <UploadForm />
        <input type="file" accept=".csv,.xls,.xlsx" @change="selectFile" />
        <Button type="primary" :loading="saving" @click="upload">
          上传文件
        </Button>
      </Space>
    </Card>
    <Grid table-title="导入批次">
      <template #status="{ row }">
        <Tag>{{ row.status }}</Tag>
      </template>
      <template #action="{ row }">
        <Button type="link" @click="openBatch(row.id)">预览</Button>
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

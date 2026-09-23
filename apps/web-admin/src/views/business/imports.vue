<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number }
interface ImportBatch {
  id: string; resource_type: string; status: string; total_rows: number;
  valid_rows: number; invalid_rows: number; created_at: string;
}
interface ImportRow {
  row_no: number; validation_status: string; errors: unknown; data: Record<string, unknown>;
  regulation_package?: { code: string; name: string };
}

const userStore = useUserStore();
const isAdmin = computed(() => userStore.userInfo?.roles?.some((role) => ['super', 'admin'].includes(role)) ?? false);
const resourceOptions = computed(() => isAdmin.value ? [
  { label: '地区', value: 'districts' }, { label: '学校', value: 'schools' },
  { label: '班级', value: 'school_classes' }, { label: '教师', value: 'school_teachers' },
] : [{ label: '学生', value: 'students' }]);
const resourceType = ref('');
const file = ref<File>();
const rows = ref<ImportBatch[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const selected = ref<ImportBatch>();
const previewRows = ref<ImportRow[]>([]);
const previewPage = ref(1);
const previewTotal = ref(0);

async function loadRows() {
  loading.value = true;
  try {
    const result = await requestClient.get<PageResult<ImportBatch>>('/imports', {
      params: { page: page.value, per_page: 20 },
    });
    rows.value = result.items;
    total.value = result.total;
  } finally { loading.value = false; }
}

function selectFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0];
}

async function upload() {
  if (!resourceType.value || !file.value) { message.error('请选择导入类型和文件'); return; }
  saving.value = true;
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.value.arrayBuffer());
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const data = new FormData();
    data.append('resource_type', resourceType.value);
    data.append('file', file.value);
    data.append('sha256', sha256);
    data.append('request_id', crypto.randomUUID());
    await requestClient.post('/imports', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    file.value = undefined;
    message.success('文件已上传，请发起预览校验');
    await loadRows();
  } finally { saving.value = false; }
}

async function openBatch(id: string) {
  selected.value = await requestClient.get<ImportBatch>(`/imports/${id}`);
  previewPage.value = 1;
  await loadPreview();
}

async function loadPreview() {
  if (!selected.value) return;
  const result = await requestClient.get<PageResult<ImportRow>>(`/imports/${selected.value.id}/rows`, {
    params: { page: previewPage.value, per_page: 20 },
  });
  previewRows.value = result.items;
  previewTotal.value = result.total;
}

async function action(kind: 'commit' | 'validate') {
  if (!selected.value) return;
  saving.value = true;
  try {
    await requestClient.post(`/imports/${selected.value.id}/${kind}`);
    message.success(kind === 'validate' ? '校验任务已提交' : '导入已提交');
    await Promise.all([openBatch(selected.value.id), loadRows()]);
  } finally { saving.value = false; }
}

onMounted(() => { void loadRows(); });
</script>

<template>
  <Page title="批量导入" description="先上传文件，再校验预览；全部行通过后才能整批提交。">
    <Card class="mb-4">
      <Space wrap>
        <Select v-model:value="resourceType" :options="resourceOptions" placeholder="导入类型" class="min-w-36" />
        <input type="file" accept=".csv,.xls,.xlsx" @change="selectFile" />
        <Button type="primary" :loading="saving" @click="upload">上传文件</Button>
      </Space>
    </Card>
    <Card title="导入批次">
      <Table :data-source="rows" row-key="id" :loading="loading" :columns="[
        { title: '类型', dataIndex: 'resource_type', key: 'resource_type' },
        { title: '状态', key: 'status' }, { title: '总行数', dataIndex: 'total_rows', key: 'total_rows' },
        { title: '有效', dataIndex: 'valid_rows', key: 'valid_rows' },
        { title: '错误', dataIndex: 'invalid_rows', key: 'invalid_rows' },
        { title: '创建时间', dataIndex: 'created_at', key: 'created_at' }, { title: '操作', key: 'action' },
      ]" :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }" @change="(pagination) => { page = pagination.current || 1; loadRows(); }">
        <template #bodyCell="{ column, record }">
          <Tag v-if="column.key === 'status'">{{ record.status }}</Tag>
          <Button v-else-if="column.key === 'action'" type="link" @click="openBatch(record.id)">预览</Button>
        </template>
      </Table>
    </Card>
    <Modal :open="!!selected" title="导入预览" width="900px" :footer="null" @cancel="selected = undefined">
      <template v-if="selected">
        <Alert class="mb-4" type="info" :message="`状态：${selected.status} · 有效 ${selected.valid_rows} 行 · 错误 ${selected.invalid_rows} 行`" />
        <Space class="mb-4">
          <Button v-if="selected.status === 'uploaded'" type="primary" :loading="saving" @click="action('validate')">发起校验</Button>
          <Button v-if="selected.status === 'validated'" type="primary" :loading="saving" @click="action('commit')">整批提交</Button>
          <Button @click="openBatch(selected.id)">刷新状态</Button>
        </Space>
        <Table :data-source="previewRows" row-key="row_no" :scroll="{ x: 700 }" :columns="[
          { title: '行号', dataIndex: 'row_no', key: 'row_no' },
          { title: '校验状态', dataIndex: 'validation_status', key: 'validation_status' },
          { title: '内容（敏感字段已脱敏）', key: 'data' },
          { title: '错误', key: 'errors' },
        ]" :pagination="{ current: previewPage, pageSize: 20, total: previewTotal, showSizeChanger: false }" @change="(pagination) => { previewPage = pagination.current || 1; loadPreview(); }">
          <template #bodyCell="{ column, record }">
            <pre v-if="column.key === 'data'" class="whitespace-pre-wrap">{{ JSON.stringify(record.data, null, 2) }}</pre>
            <pre v-else-if="column.key === 'errors'" class="whitespace-pre-wrap">{{ JSON.stringify(record.errors) }}</pre>
          </template>
        </Table>
      </template>
    </Modal>
  </Page>
</template>

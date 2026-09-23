<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, message, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number }
interface AcademicTerm { id: string; term_no: number; academic_year?: { code: string } }
interface ExportJob {
  id: string; type: string; type_label: string; status: string; status_label: string;
  requested_at: string; completed_at?: string; expires_at?: string;
  row_count?: number; downloadable: boolean; error_code?: string;
}

const userStore = useUserStore();
const storageKey = computed(() => `yunnan-zk-exports:${userStore.userInfo?.userId || 'anonymous'}`);
const termOptions = ref<{ label: string; value: string }[]>([]);
const academicTermId = ref('');
const type = ref<'scorebook' | 'statistics'>('scorebook');
const jobs = ref<ExportJob[]>([]);
const saving = ref(false);
const loading = ref(false);
const columns = [
  { title: '类型', dataIndex: 'type_label', key: 'type_label' },
  { title: '状态', key: 'status' },
  { title: '申请时间', dataIndex: 'requested_at', key: 'requested_at' },
  { title: '行数', dataIndex: 'row_count', key: 'row_count' },
  { title: '过期时间', dataIndex: 'expires_at', key: 'expires_at' },
  { title: '操作', key: 'action' },
];

function storedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(storageKey.value) || '[]') as string[]; }
  catch { return []; }
}

async function loadTerms() {
  const response = await requestClient.get<PageResult<AcademicTerm>>('/academic-terms', { params: { page: 1, per_page: 100 } });
  termOptions.value = response.items.map((term) => ({ label: `${term.academic_year?.code || ''} 第 ${term.term_no} 学期`, value: term.id }));
}

async function loadJobs() {
  loading.value = true;
  try {
    const results = await Promise.all(storedIds().map(async (id) => {
      try { return await requestClient.get<ExportJob>(`/exports/${id}`); }
      catch { return undefined; }
    }));
    jobs.value = results.filter((job): job is ExportJob => !!job);
  } finally { loading.value = false; }
}

async function createExport() {
  if (!academicTermId.value) { message.error('请选择学期'); return; }
  saving.value = true;
  try {
    const job = await requestClient.post<ExportJob>('/exports', {
      type: type.value, format: 'csv', filters: { academic_term_id: academicTermId.value },
      request_id: crypto.randomUUID(),
    });
    localStorage.setItem(storageKey.value, JSON.stringify([job.id, ...storedIds().filter((id) => id !== job.id)].slice(0, 30)));
    message.success('导出任务已受理，请稍后刷新状态');
    await loadJobs();
  } finally { saving.value = false; }
}

async function download(job: ExportJob) {
  const blob = await requestClient.request<Blob>(`/exports/${job.id}/download`, { method: 'GET', responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${job.type_label}-${job.id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

onMounted(() => { void Promise.all([loadTerms(), loadJobs()]); });
</script>

<template>
  <Page title="私有导出" description="导出异步生成；下载时重新核对当前权限和学生归属。">
    <Card class="mb-4">
      <Space wrap>
        <Select v-model:value="type" :options="[{ label: '班级成绩册', value: 'scorebook' }, { label: '统计汇总', value: 'statistics' }]" class="min-w-36" />
        <Select v-model:value="academicTermId" :options="termOptions" placeholder="选择学期" class="min-w-56" />
        <Button type="primary" :loading="saving" @click="createExport">申请 CSV 导出</Button>
      </Space>
    </Card>
    <Alert class="mb-4" type="info" message="任务仅对申请账号可见；本机只保存任务编号。文件过期或范围变动后请重新申请。" />
    <Card title="我的导出任务">
      <template #extra><Button :loading="loading" @click="loadJobs">刷新状态</Button></template>
      <Table :columns="columns" :data-source="jobs" :loading="loading" row-key="id" :scroll="{ x: 860 }" :pagination="false">
        <template #bodyCell="{ column, record }">
          <Tag v-if="column.key === 'status'">{{ record.status_label || record.status }}</Tag>
          <Button v-else-if="column.key === 'action' && record.downloadable" type="link" @click="download(record)">下载</Button>
          <template v-else-if="column.key === 'action'">{{ record.error_code || '—' }}</template>
        </template>
      </Table>
    </Card>
  </Page>
</template>

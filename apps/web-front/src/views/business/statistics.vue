<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, Select, Space, Statistic, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number }
interface AcademicTerm { id: string; term_no: number; academic_year?: { code: string } }
interface Metric { count: number; denominator: number; rate: string | null }
interface StatisticsResult {
  caliber_version: string; generated_at: string; students?: number; expected_students?: number;
  participation?: Metric; completion?: Metric; missing?: Metric;
  items?: Record<string, unknown>[]; districts?: Record<string, unknown>[];
  counts?: { type: string; label: string; count: number }[];
  distribution?: { level: string; denominator: number; unbanded_count: number; bands?: Record<string, unknown>[] };
  case_total?: number; item_total?: number; total?: number;
  meta?: { current_page: number; per_page: number; total: number };
  unavailable_indicators?: { code: string; status: string }[];
}

const userStore = useUserStore();
const isTeacher = computed(() => userStore.userInfo?.roles?.includes('teacher') ?? false);
const termOptions = ref<{ label: string; value: string }[]>([]);
const academicTermId = ref('');
const grade = ref<number>();
const gender = ref<string>();
const view = ref('overview');
const anomalyType = ref<string>();
const anomalyPage = ref(1);
const result = ref<StatisticsResult>();
const loading = ref(false);
const viewOptions = computed(() => isTeacher.value
  ? [{ label: '成绩异常', value: 'anomalies' }]
  : [
      { label: '总体概览', value: 'overview' }, { label: '项目分布', value: 'items' },
      { label: '总分分布', value: 'total-scores' }, { label: '学校对比', value: 'comparisons' },
      { label: '成绩异常', value: 'anomalies' }, { label: '待审事项', value: 'pending-approvals' },
    ]);
const anomalyOptions = [
  { label: '未评分', value: 'unscored' }, { label: '缺测', value: 'missing' },
  { label: '最终犯规', value: 'foul' }, { label: '需补基线', value: 'missing_baseline' },
  { label: '规则异常', value: 'rule_mismatch' }, { label: '待锁定', value: 'pending_lock' },
];
const itemColumns = computed(() => {
  const first = result.value?.items?.[0];
  return first ? Object.keys(first).filter((key) => !['id', 'student_id'].includes(key))
    .map((key) => ({ key, dataIndex: key, title: key })) : [];
});

async function loadTerms() {
  const response = await requestClient.get<PageResult<AcademicTerm>>('/academic-terms', {
    params: { page: 1, per_page: 100 },
  });
  termOptions.value = response.items.map((term) => ({
    label: `${term.academic_year?.code || ''} 第 ${term.term_no} 学期`, value: term.id,
  }));
}

async function load() {
  if (view.value !== 'pending-approvals' && !academicTermId.value) return;
  loading.value = true;
  try {
    const params: Record<string, unknown> = view.value === 'pending-approvals' ? {} : {
      academic_term_id: academicTermId.value,
      ...(grade.value ? { grade: grade.value } : {}),
      ...(gender.value ? { gender: gender.value } : {}),
    };
    if (view.value === 'anomalies' && anomalyType.value) {
      params.type = anomalyType.value;
      params.page = anomalyPage.value;
      params.per_page = 20;
    }
    result.value = await requestClient.get<StatisticsResult>(`/statistics/${view.value}`, { params });
  } finally { loading.value = false; }
}

function display(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object' && !Array.isArray(value) && 'name' in value) {
    return String(value.name);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function rowKey(record: Record<string, unknown>, index?: number): string {
  return String(record.id ?? record.exam_item_code ?? record.type ?? index ?? '');
}

onMounted(() => {
  if (isTeacher.value) view.value = 'anomalies';
  void loadTerms();
});
</script>

<template>
  <Page title="授权统计" description="按学生当前学校与班级计算；比率保留后端固定口径和分母。">
    <Card class="mb-4">
      <Space wrap>
        <Select v-model:value="view" :options="viewOptions" class="min-w-40" @change="result = undefined; anomalyPage = 1" />
        <Select v-if="view !== 'pending-approvals'" v-model:value="academicTermId" :options="termOptions" placeholder="选择学期" class="min-w-56" />
        <Select v-if="view !== 'pending-approvals'" v-model:value="grade" :options="[7, 8, 9].map((value) => ({ label: `${value} 年级`, value }))" allow-clear placeholder="年级" class="min-w-28" />
        <Select v-if="view !== 'pending-approvals'" v-model:value="gender" :options="[{ label: '男', value: 'male' }, { label: '女', value: 'female' }]" allow-clear placeholder="性别" class="min-w-24" />
        <Select v-if="view === 'anomalies'" v-model:value="anomalyType" :options="anomalyOptions" allow-clear placeholder="异常类型" class="min-w-36" @change="anomalyPage = 1" />
        <Button type="primary" :loading="loading" @click="load">查询</Button>
      </Space>
    </Card>

    <template v-if="result">
      <Alert class="mb-4" type="info" :message="`统计口径 ${result.caliber_version} · 生成时间 ${result.generated_at}`" />
      <template v-if="view === 'overview'">
        <div class="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card><Statistic title="学生数" :value="result.students ?? 0" /></Card>
          <Card><Statistic title="有应测项学生" :value="result.expected_students ?? 0" /></Card>
          <Card><Statistic title="参与率" :value="result.participation?.rate ?? '—'" /><small>{{ result.participation?.count }} / {{ result.participation?.denominator }}</small></Card>
          <Card><Statistic title="完成率" :value="result.completion?.rate ?? '—'" /><small>{{ result.completion?.count }} / {{ result.completion?.denominator }}</small></Card>
          <Card><Statistic title="缺测率" :value="result.missing?.rate ?? '—'" /><small>{{ result.missing?.count }} / {{ result.missing?.denominator }}</small></Card>
        </div>
        <Alert v-if="result.unavailable_indicators?.length" type="warning" message="合格率和优秀率的阈值尚未确认，平台不提供默认值。" />
      </template>
      <template v-else-if="view === 'anomalies'">
        <div class="mb-4 flex flex-wrap gap-2"><Tag v-for="count in result.counts" :key="count.type">{{ count.label }}：{{ count.count }}</Tag></div>
        <Table v-if="anomalyType" :data-source="result.items || []" :pagination="{ current: anomalyPage, pageSize: 20, total: result.meta?.total || 0, showSizeChanger: false }" :columns="itemColumns" :row-key="rowKey" @change="(pagination) => { anomalyPage = pagination.current || 1; load(); }">
          <template #bodyCell="{ column, record }">{{ display(record[String(column.key)]) }}</template>
        </Table>
      </template>
      <template v-else-if="view === 'total-scores' || view === 'items'">
        <Card v-if="result.distribution" class="mb-4">
          计入 {{ result.distribution.denominator }} 条 · 无法归一化 {{ result.distribution.unbanded_count }} 条
          <div class="mt-3 flex flex-wrap gap-2"><Tag v-for="band in result.distribution.bands" :key="String(band.key)">{{ display(band.label) }}：{{ display(band.count) }}</Tag></div>
        </Card>
        <Table v-if="result.items" :data-source="result.items" :pagination="false" :columns="itemColumns" :row-key="rowKey">
          <template #bodyCell="{ column, record }">{{ display(record[String(column.key)]) }}</template>
        </Table>
      </template>
      <template v-else>
        <Card v-if="view === 'pending-approvals'" class="mb-4">申请 {{ result.case_total }} 件，明细 {{ result.item_total }} 条</Card>
        <Table :data-source="result.items || []" :pagination="false" :columns="itemColumns" :row-key="rowKey">
          <template #bodyCell="{ column, record }">{{ display(record[String(column.key)]) }}</template>
        </Table>
        <Card v-if="result.districts?.length" title="地区汇总" class="mt-4">
          <pre class="whitespace-pre-wrap text-sm">{{ JSON.stringify(result.districts, null, 2) }}</pre>
        </Card>
      </template>
    </template>
  </Page>
</template>

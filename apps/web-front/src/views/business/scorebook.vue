<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number; caliber_version?: string; generated_at?: string }
interface AcademicTerm { id: string; term_no: number; academic_year?: { code: string } }
interface ScoreRow {
  student: { id: string; student_no: string; name: string };
  grade?: number; school?: { name: string }; school_class?: { name: string };
  status: string; expected_item_count: number; completed_item_count: number;
  items: { exam_item_code: string; item_name: string; score?: string; completed: boolean }[];
  term_score?: { score?: string; status: string };
  grade_score?: { score?: string; status: string };
  total_score?: { score?: string; status: string };
}

const router = useRouter();
const academicTermId = ref('');
const termOptions = ref<{ label: string; value: string }[]>([]);
const rows = ref<ScoreRow[]>([]);
const page = ref(1);
const total = ref(0);
const caliber = ref('');
const generatedAt = ref('');
const loading = ref(false);
const columns = [
  { title: '学籍号', key: 'student_no' }, { title: '姓名', key: 'name' },
  { title: '学校', key: 'school' }, { title: '班级', key: 'class' },
  { title: '年级', dataIndex: 'grade', key: 'grade' },
  { title: '完成情况', key: 'completion' }, { title: '学期分', key: 'term' },
  { title: '年级分', key: 'grade_score' }, { title: '总分', key: 'total' },
  { title: '操作', key: 'action' },
];

async function loadTerms() {
  const response = await requestClient.get<PageResult<AcademicTerm>>('/academic-terms', { params: { page: 1, per_page: 100 } });
  termOptions.value = response.items.map((term) => ({ label: `${term.academic_year?.code || ''} 第 ${term.term_no} 学期`, value: term.id }));
}

async function load() {
  if (!academicTermId.value) return;
  loading.value = true;
  try {
    const response = await requestClient.get<PageResult<ScoreRow>>('/scorebooks', {
      params: { academic_term_id: academicTermId.value, page: page.value, per_page: 20 },
    });
    rows.value = response.items;
    total.value = response.total;
    caliber.value = response.caliber_version || '';
    generatedAt.value = response.generated_at || '';
  } finally { loading.value = false; }
}

onMounted(() => { void loadTerms(); });
</script>

<template>
  <Page title="班级成绩册" description="分数未形成时保持空值；档案和成绩按学生当前学校、班级归属。">
    <Card class="mb-4">
      <Space>
        <Select v-model:value="academicTermId" :options="termOptions" placeholder="选择学期" class="min-w-56" @change="page = 1; load()" />
        <Button :loading="loading" @click="load">刷新</Button>
      </Space>
    </Card>
    <Alert v-if="caliber" class="mb-4" type="info" :message="`口径：${caliber} · 查询时间：${generatedAt}`" />
    <Card>
      <Table :columns="columns" :data-source="rows" :loading="loading" :scroll="{ x: 1000 }" :row-key="(row: ScoreRow) => row.student.id" :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }" @change="(pagination) => { page = pagination.current || 1; load(); }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'student_no'">{{ record.student.student_no }}</template>
          <template v-else-if="column.key === 'name'">{{ record.student.name }}</template>
          <template v-else-if="column.key === 'school'">{{ record.school?.name || '—' }}</template>
          <template v-else-if="column.key === 'class'">{{ record.school_class?.name || '—' }}</template>
          <template v-else-if="column.key === 'completion'">{{ record.completed_item_count }} / {{ record.expected_item_count }} <Tag>{{ record.status }}</Tag></template>
          <template v-else-if="column.key === 'term'">{{ record.term_score?.score ?? '—' }}</template>
          <template v-else-if="column.key === 'grade_score'">{{ record.grade_score?.score ?? '—' }}</template>
          <template v-else-if="column.key === 'total'">{{ record.total_score?.score ?? '—' }}</template>
          <Button v-else-if="column.key === 'action'" type="link" @click="router.push(`/students/${record.student.id}`)">查看档案</Button>
        </template>
        <template #expandedRowRender="{ record }">
          <div class="flex flex-wrap gap-2"><Tag v-for="item in record.items" :key="item.exam_item_code">{{ item.item_name }}：{{ item.score ?? (item.completed ? '已完成' : '待测') }}</Tag></div>
        </template>
      </Table>
    </Card>
  </Page>
</template>

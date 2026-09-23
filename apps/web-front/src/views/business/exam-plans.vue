<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Card, Input, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface AcademicTerm {
  id: string;
  term_no: number;
  academic_year?: { code: string };
}
interface School { id: string; code: string; name: string }
interface ExamPlan {
  id: string;
  name: string;
  status: string;
  academic_term_id: string;
  academic_term?: AcademicTerm;
  publisher_district_id: string;
  starts_at: string;
  ends_at: string;
  schools: School[];
}
interface PageResult<T> { items: T[]; total: number }

const router = useRouter();
const userStore = useUserStore();
const isBureau = computed(() => userStore.userInfo?.roles?.some((role) => ['province', 'city', 'county'].includes(role)) ?? false);
const districtId = computed(() => userStore.userInfo?.district?.id);
const rows = ref<ExamPlan[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const termOptions = ref<{ label: string; value: string }[]>([]);
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const createOpen = ref(false);
const deadlineOpen = ref(false);
const deadlinePlan = ref<ExamPlan>();
const deadline = reactive({ ends_at: '', reason: '' });
const form = reactive({
  academic_term_id: '',
  school_ids: [] as string[],
  name: '',
  starts_at: '',
  ends_at: '',
  request_id: '',
});

const columns = [
  { title: '计划名称', dataIndex: 'name', key: 'name' },
  { title: '学期', key: 'term' },
  { title: '学校', key: 'schools' },
  { title: '开始时间', dataIndex: 'starts_at', key: 'starts_at' },
  { title: '结束时间', dataIndex: 'ends_at', key: 'ends_at' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions', width: 310 },
];

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
}

function canOperate(plan: ExamPlan) {
  return isBureau.value && plan.publisher_district_id === districtId.value;
}

async function loadRows() {
  loading.value = true;
  try {
    const result = await requestClient.get<PageResult<ExamPlan>>('/exam-plans', {
      params: { page: page.value, per_page: 20 },
    });
    rows.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function loadTerms() {
  const result = await requestClient.get<PageResult<AcademicTerm>>('/academic-terms', {
    params: { page: 1, per_page: 100 },
  });
  termOptions.value = result.items.map((term) => ({
    label: `${term.academic_year?.code || ''} 第 ${term.term_no} 学期`,
    value: term.id,
  }));
}

async function loadSchools(keyword = '') {
  const result = await requestClient.get<PageResult<School>>('/schools', {
    params: { page: 1, per_page: 100, ...(keyword ? { keyword } : {}) },
  });
  schoolOptions.value = result.items.map((school) => ({
    label: `${school.code} ${school.name}`,
    value: school.id,
  }));
}

async function openCreate() {
  Object.assign(form, {
    academic_term_id: '', school_ids: [], name: '', starts_at: '', ends_at: '', request_id: crypto.randomUUID(),
  });
  await Promise.all([loadTerms(), loadSchools()]);
  createOpen.value = true;
}

async function createPlan() {
  if (!form.academic_term_id || !form.name || !form.starts_at || !form.ends_at || !form.school_ids.length) {
    message.error('请填写学期、学校、计划名称和起止时间');
    return;
  }
  saving.value = true;
  try {
    await requestClient.post('/exam-plans', {
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    });
    message.success('计划已创建');
    createOpen.value = false;
    await loadRows();
  } finally {
    saving.value = false;
  }
}

async function runAction(plan: ExamPlan, action: 'publish' | 'close' | 'cancel') {
  Modal.confirm({
    title: `确认${{ publish: '发布', close: '关闭', cancel: '取消' }[action]}计划「${plan.name}」？`,
    async onOk() {
      await requestClient.post(`/exam-plans/${plan.id}/${action}`);
      message.success('操作成功');
      await loadRows();
    },
  });
}

async function updateDeadline() {
  if (!deadlinePlan.value || !deadline.ends_at || !deadline.reason) {
    message.error('请填写新的结束时间和原因');
    return;
  }
  saving.value = true;
  try {
    await requestClient.request(`/exam-plans/${deadlinePlan.value.id}/deadline`, {
      data: { ends_at: new Date(deadline.ends_at).toISOString(), reason: deadline.reason },
      method: 'PATCH',
    });
    message.success('截止时间已更新');
    deadlineOpen.value = false;
    await loadRows();
  } finally {
    saving.value = false;
  }
}

onMounted(() => { void loadRows(); });
</script>

<template>
  <Page title="考试计划" description="教体局创建和发布计划；学校与教师查看本校已发布计划及应考名单。">
    <Card>
      <div class="mb-4 flex justify-between">
        <Button @click="loadRows">刷新</Button>
        <Button v-if="isBureau" type="primary" @click="openCreate">新建计划</Button>
      </div>
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }"
        :scroll="{ x: 1200 }"
        row-key="id"
        @change="(pagination) => { page = pagination.current || 1; loadRows(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'term'">{{ record.academic_term?.academic_year?.code }} 第 {{ record.academic_term?.term_no }} 学期</template>
          <template v-else-if="column.key === 'schools'">{{ record.schools?.map((school) => school.name).join('、') || '—' }}</template>
          <template v-else-if="column.key === 'starts_at'">{{ formatDate(record.starts_at) }}</template>
          <template v-else-if="column.key === 'ends_at'">{{ formatDate(record.ends_at) }}</template>
          <Tag v-else-if="column.key === 'status'" :color="record.status === 'published' ? 'green' : 'default'">{{ record.status }}</Tag>
          <Space v-else-if="column.key === 'actions'">
            <Button type="link" size="small" @click="router.push(`/exam-plans/${record.id}/roster`)">名单</Button>
            <template v-if="canOperate(record)">
              <Button v-if="record.status === 'draft'" type="link" size="small" @click="runAction(record, 'publish')">发布</Button>
              <Button v-if="record.status === 'published'" type="link" size="small" @click="deadlinePlan = record; deadline.ends_at = ''; deadline.reason = ''; deadlineOpen = true">延期</Button>
              <Button v-if="record.status === 'published'" type="link" size="small" @click="runAction(record, 'close')">关闭</Button>
              <Button v-if="record.status === 'draft'" danger type="link" size="small" @click="runAction(record, 'cancel')">取消</Button>
            </template>
          </Space>
        </template>
      </Table>
    </Card>

    <Modal v-model:open="createOpen" title="新建考试计划" :confirm-loading="saving" width="640px" @ok="createPlan">
      <div class="grid grid-cols-1 gap-4">
        <label>学期 <Select v-model:value="form.academic_term_id" :options="termOptions" class="w-full" /></label>
        <label>覆盖学校 <Select v-model:value="form.school_ids" mode="multiple" :options="schoolOptions" show-search :filter-option="false" class="w-full" @search="loadSchools" /></label>
        <label>计划名称 <Input v-model:value="form.name" /></label>
        <label>开始时间 <Input v-model:value="form.starts_at" type="datetime-local" /></label>
        <label>结束时间 <Input v-model:value="form.ends_at" type="datetime-local" /></label>
      </div>
    </Modal>

    <Modal v-model:open="deadlineOpen" title="调整截止时间" :confirm-loading="saving" @ok="updateDeadline">
      <div class="grid gap-4">
        <label>新的截止时间 <Input v-model:value="deadline.ends_at" type="datetime-local" /></label>
        <label>调整原因 <Input v-model:value="deadline.reason" /></label>
      </div>
    </Modal>
  </Page>
</template>

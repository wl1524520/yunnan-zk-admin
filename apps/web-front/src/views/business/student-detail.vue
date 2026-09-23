<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Card, Input, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number }
interface Student {
  id: string; student_no: string; name: string; gender: string; status: string;
  school_id: string; school_class_id?: string;
  school?: { name: string }; school_class?: { name: string }; regulation_package_code: string;
}
interface Movement { id: string; movement_type: string; moved_at: string; reason: string; from_school_class?: { name: string }; to_school_class?: { name: string } }
interface GradeProfile { id: string; grade: number; academic_year_id: string; academic_year?: { code: string } }
interface Attempt {
  id: string; source_record_no: string; item?: { name: string }; result_status: string;
  scoring_status: string; process_status: string; score?: string; tested_at: string;
  tested_school?: { name: string }; current_school?: { name: string };
}
interface TermResult {
  id: string; academic_term?: { id: string; term_no: number }; academic_year?: { code: string };
  status: string; term_score?: string; source_revision: number; calculated_revision: number;
  pending_exam_item_codes: string[];
}
interface GradeResult { id: string; grade: number; academic_year?: { code: string }; grade_score?: string; status: string }
interface TotalResult { total_score?: string; status: string }
interface AcademicTerm { id: string; term_no: number; academic_year?: { id: string; code: string } }

const route = useRoute();
const studentId = computed(() => String(route.params.id));
const userStore = useUserStore();
const canWrite = computed(() => userStore.userInfo?.roles?.includes('school') ?? false);
const student = ref<Student>();
const profiles = ref<GradeProfile[]>([]);
const attempts = ref<Attempt[]>([]);
const termResults = ref<TermResult[]>([]);
const gradeResults = ref<GradeResult[]>([]);
const movements = ref<Movement[]>([]);
const classOptions = ref<{ label: string; value: string }[]>([]);
const movementOpen = ref(false);
const targetClassId = ref('');
const movementReason = ref('');
const totalResult = ref<TotalResult>();
const termOptions = ref<AcademicTerm[]>([]);
const profileOpen = ref(false);
const voidAttempt = ref<Attempt>();
const voidReason = ref('');
const saving = ref(false);
const profileForm = reactive({ academic_year_id: '', grade: 7 });

const yearOptions = computed(() => [...new Map(termOptions.value
  .filter((term) => term.academic_year)
  .map((term) => [term.academic_year!.id, { label: term.academic_year!.code, value: term.academic_year!.id }])).values()]);

async function load() {
  const base = `/students/${studentId.value}`;
  const [detail, gradeProfiles, testAttempts, terms, grades, movementRows] = await Promise.all([
    requestClient.get<Student>(base),
    requestClient.get<PageResult<GradeProfile>>(`${base}/grade-profiles`, { params: { page: 1, per_page: 100 } }),
    requestClient.get<PageResult<Attempt>>(`${base}/attempts`, { params: { page: 1, per_page: 100 } }),
    requestClient.get<PageResult<TermResult>>(`${base}/term-result`, { params: { page: 1, per_page: 100 } }),
    requestClient.get<PageResult<GradeResult>>(`${base}/grade-results`, { params: { page: 1, per_page: 100 } }),
    requestClient.get<PageResult<Movement>>(`${base}/movements`, { params: { page: 1, per_page: 100 } }),
  ]);
  student.value = detail;
  profiles.value = gradeProfiles.items;
  attempts.value = testAttempts.items;
  termResults.value = terms.items;
  gradeResults.value = grades.items;
  movements.value = movementRows.items.sort((a, b) => b.moved_at.localeCompare(a.moved_at));
  totalResult.value = grades.items.length
    ? await requestClient.get<TotalResult>(`${base}/total-result`).catch(() => undefined)
    : undefined;
}

async function loadTerms() {
  const result = await requestClient.get<PageResult<AcademicTerm>>('/academic-terms', { params: { page: 1, per_page: 100 } });
  termOptions.value = result.items;
}

async function openMovement() {
  const response = await requestClient.get<PageResult<{ id: string; code: string; name: string }>>('/school-classes', {
    params: { page: 1, per_page: 100 },
  });
  classOptions.value = response.items.map((entry) => ({ label: `${entry.code} ${entry.name}`, value: entry.id }));
  targetClassId.value = '';
  movementReason.value = '';
  movementOpen.value = true;
}

async function saveMovement() {
  if (!student.value || !targetClassId.value || !movementReason.value.trim()) { message.error('请选择班级并填写原因'); return; }
  saving.value = true;
  try {
    await requestClient.post(`/students/${studentId.value}/movements`, {
      movement_type: student.value.school_class_id ? 'class_change' : 'class_assignment',
      request_id: crypto.randomUUID(),
      expected_school_id: student.value.school_id,
      ...(student.value.school_class_id ? { expected_school_class_id: student.value.school_class_id } : {}),
      expected_latest_movement_id: movements.value[0]?.id || null,
      target_school_class_id: targetClassId.value,
      reason: movementReason.value.trim(),
    });
    message.success('班级流转已记录');
    movementOpen.value = false;
    await load();
  } finally { saving.value = false; }
}

async function saveProfile() {
  if (!profileForm.academic_year_id) { message.error('请选择学年'); return; }
  saving.value = true;
  try {
    await requestClient.post(`/students/${studentId.value}/grade-profiles`, { ...profileForm });
    message.success('年级资料已保存');
    profileOpen.value = false;
    await load();
  } finally { saving.value = false; }
}

async function submitVoid() {
  if (!voidAttempt.value || !voidReason.value.trim()) { message.error('请填写作废原因'); return; }
  saving.value = true;
  try {
    await requestClient.post(`/attempts/${voidAttempt.value.id}/void`, { reason: voidReason.value.trim() });
    message.success('记录已作废');
    voidAttempt.value = undefined;
    await load();
  } finally { saving.value = false; }
}

async function lockTerm(row: TermResult) {
  if (!row.academic_term?.id) return;
  Modal.confirm({
    title: `确认锁定 ${row.academic_year?.code} 第 ${row.academic_term.term_no} 学期成绩？`,
    async onOk() {
      await requestClient.post(`/students/${studentId.value}/term-results/${row.academic_term!.id}/lock`);
      message.success('学期成绩已锁定');
      await load();
    },
  });
}

onMounted(() => { void Promise.all([load(), loadTerms()]); });
</script>

<template>
  <Page :title="student ? `${student.name} · ${student.student_no}` : '学生档案'" description="按学生当前归属读取档案和成绩；测试地点单独显示。">
    <Card v-if="student" class="mb-4">
      <div class="grid gap-3 text-sm md:grid-cols-3">
        <div>性别：{{ student.gender === 'male' ? '男' : '女' }}</div>
        <div>在籍状态：{{ student.status }}</div>
        <div>规则版本：{{ student.regulation_package_code }}</div>
        <div>当前学校：{{ student.school?.name || '—' }}</div>
        <div>当前班级：{{ student.school_class?.name || '—' }}</div>
      </div>
    </Card>

    <Card title="年级资料" class="mb-4">
      <template #extra><Button v-if="canWrite" type="primary" @click="profileOpen = true">新增年级资料</Button></template>
      <Table :data-source="profiles" row-key="id" :pagination="false" :columns="[
        { title: '学年', key: 'year' }, { title: '年级', dataIndex: 'grade', key: 'grade' },
      ]">
        <template #bodyCell="{ column, record }"><template v-if="column.key === 'year'">{{ record.academic_year?.code }}</template></template>
      </Table>
    </Card>

    <Card title="班级流转" class="mb-4">
      <template #extra><Button v-if="canWrite" @click="openMovement">{{ student?.school_class_id ? '同校转班' : '初次分班' }}</Button></template>
      <Table :data-source="movements" row-key="id" :pagination="false" :columns="[
        { title: '类型', dataIndex: 'movement_type', key: 'movement_type' },
        { title: '原班级', key: 'from' }, { title: '新班级', key: 'to' },
        { title: '时间', dataIndex: 'moved_at', key: 'moved_at' },
        { title: '原因', dataIndex: 'reason', key: 'reason' },
      ]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'from'">{{ record.from_school_class?.name || '—' }}</template>
          <template v-else-if="column.key === 'to'">{{ record.to_school_class?.name || '—' }}</template>
        </template>
      </Table>
    </Card>

    <Card title="测试记录" class="mb-4">
      <Table :data-source="attempts" row-key="id" :scroll="{ x: 1000 }" :columns="[
        { title: '记录号', dataIndex: 'source_record_no', key: 'source_record_no' },
        { title: '项目', key: 'item' }, { title: '认定', dataIndex: 'result_status', key: 'result_status' },
        { title: '评分', dataIndex: 'scoring_status', key: 'scoring_status' },
        { title: '处理', key: 'process_status' }, { title: '得分', dataIndex: 'score', key: 'score' },
        { title: '测试学校', key: 'tested_school' }, { title: '操作', key: 'action' },
      ]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'item'">{{ record.item?.name || '—' }}</template>
          <Tag v-else-if="column.key === 'process_status'">{{ record.process_status }}</Tag>
          <template v-else-if="column.key === 'tested_school'">{{ record.tested_school?.name || '—' }}</template>
          <Button v-else-if="column.key === 'action' && canWrite && record.process_status !== 'voided'" type="link" danger @click="voidAttempt = record">作废</Button>
        </template>
      </Table>
    </Card>

    <Card title="学期成绩" class="mb-4">
      <Table :data-source="termResults" row-key="id" :pagination="false" :columns="[
        { title: '学年', key: 'year' }, { title: '学期', key: 'term' },
        { title: '得分', dataIndex: 'term_score', key: 'term_score' },
        { title: '状态', key: 'status' }, { title: '修订', key: 'revision' }, { title: '操作', key: 'action' },
      ]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'year'">{{ record.academic_year?.code }}</template>
          <template v-else-if="column.key === 'term'">第 {{ record.academic_term?.term_no }} 学期</template>
          <Tag v-else-if="column.key === 'status'">{{ record.status }}</Tag>
          <template v-else-if="column.key === 'revision'">{{ record.calculated_revision }} / {{ record.source_revision }}</template>
          <Button v-else-if="column.key === 'action' && canWrite && record.status === 'draft'" type="link" @click="lockTerm(record)">锁定</Button>
        </template>
      </Table>
    </Card>

    <Card title="年级与总分">
      <Space wrap><Tag v-for="result in gradeResults" :key="result.id">{{ result.academic_year?.code }} · {{ result.grade }} 年级：{{ result.grade_score ?? '待形成' }}（{{ result.status }}）</Tag></Space>
      <p class="mt-3">总分：{{ totalResult?.total_score ?? '待形成' }}</p>
    </Card>

    <Modal v-model:open="profileOpen" title="新增年级资料" :confirm-loading="saving" @ok="saveProfile">
      <div class="grid gap-3">
        <Select v-model:value="profileForm.academic_year_id" :options="yearOptions" placeholder="学年" />
        <Select v-model:value="profileForm.grade" :options="[7, 8, 9].map((grade) => ({ label: `${grade} 年级`, value: grade }))" />
      </div>
    </Modal>
    <Modal :open="!!voidAttempt" title="作废测试记录" :confirm-loading="saving" @ok="submitVoid" @cancel="voidAttempt = undefined">
      <Input v-model:value="voidReason" placeholder="作废原因" />
    </Modal>
    <Modal v-model:open="movementOpen" :title="student?.school_class_id ? '同校转班' : '初次分班'" :confirm-loading="saving" @ok="saveMovement">
      <div class="grid gap-3">
        <Select v-model:value="targetClassId" :options="classOptions" placeholder="目标班级" />
        <Input v-model:value="movementReason" placeholder="流转原因" />
      </div>
    </Modal>
  </Page>
</template>

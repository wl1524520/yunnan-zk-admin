<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AcademicTerm } from '#/api/business/academic-term';
import type {
  Attempt,
  GradeProfile,
  GradeResult,
  Movement,
  StudentDetail,
  TermResult,
  TotalResult,
} from '#/api/business/student-detail';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Card, Input, message, Modal, Space, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import {
  createStudentGradeProfile,
  createStudentMovement,
  getStudentAttempts,
  getStudentDetail,
  getStudentGradeProfiles,
  getStudentGradeResults,
  getStudentMovements,
  getStudentTermResults,
  getStudentTotalResult,
  lockStudentTermResult,
  voidStudentAttempt,
} from '#/api/business/student-detail';

import {
  useAttemptColumns,
  useMovementColumns,
  useMovementSchema,
  useProfileColumns,
  useProfileSchema,
  useTermColumns,
} from './detail-data';

const route = useRoute();
const studentId = computed(() => String(route.params.id));
const userStore = useUserStore();
const canWrite = computed(
  () => userStore.userInfo?.roles?.includes('school') ?? false,
);
const student = ref<StudentDetail>();
const movements = ref<Movement[]>([]);
const gradeResults = ref<GradeResult[]>([]);
const totalResult = ref<TotalResult>();
const termOptions = ref<AcademicTerm[]>([]);
const yearOptions = computed(() => {
  const options = new Map<string, { label: string; value: string }>();
  for (const term of termOptions.value) {
    if (term.academic_year) {
      options.set(term.academic_year.id, {
        label: term.academic_year.code,
        value: term.academic_year.id,
      });
    }
  }
  return [...options.values()];
});
const movementOpen = ref(false);
const voidAttempt = ref<Attempt>();
const voidReason = ref('');
const saving = ref(false);

const [ProfileGrid, profileGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useProfileColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<GradeProfile>,
});
const [MovementGrid, movementGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useMovementColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<Movement>,
});
const [AttemptGrid, attemptGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useAttemptColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<Attempt>,
});
const [TermGrid, termGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useTermColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<TermResult>,
});

const [ProfileForm, profileFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useProfileSchema(yearOptions),
  showDefaultActions: false,
});
const [ProfileDrawer, profileDrawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await profileFormApi.validate();
    if (!valid) return;
    const values = await profileFormApi.getValues();
    profileDrawerApi.lock();
    try {
      await createStudentGradeProfile(
        studentId.value,
        String(values.academic_year_id),
        Number(values.grade ?? 7),
      );
      message.success('年级资料已保存');
      profileDrawerApi.close();
      await load();
    } finally {
      profileDrawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (open) await profileFormApi.resetForm();
  },
});
const [MovementForm, movementFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useMovementSchema(),
  showDefaultActions: false,
});

async function load() {
  const id = studentId.value;
  const [detail, gradeProfiles, testAttempts, terms, grades, movementRows] =
    await Promise.all([
      getStudentDetail(id),
      getStudentGradeProfiles(id),
      getStudentAttempts(id),
      getStudentTermResults(id),
      getStudentGradeResults(id),
      getStudentMovements(id),
    ]);
  student.value = detail;
  movements.value = movementRows.items.toSorted((a, b) =>
    b.moved_at.localeCompare(a.moved_at),
  );
  gradeResults.value = grades.items;
  profileGridApi.setGridOptions({ data: gradeProfiles.items });
  movementGridApi.setGridOptions({ data: movements.value });
  attemptGridApi.setGridOptions({ data: testAttempts.items });
  termGridApi.setGridOptions({ data: terms.items });
  totalResult.value =
    grades.items.length > 0
      ? await getStudentTotalResult(id).catch(() => undefined)
      : undefined;
}

async function loadTerms() {
  const result = await getAcademicTermList();
  termOptions.value = result.items;
}

async function openMovement() {
  await movementFormApi.resetForm();
  movementOpen.value = true;
}

async function saveMovement() {
  if (!student.value) return;
  const { valid } = await movementFormApi.validate();
  if (!valid) return;
  const values = await movementFormApi.getValues();
  saving.value = true;
  try {
    await createStudentMovement(studentId.value, {
      movement_type: student.value.school_class_id
        ? 'class_change'
        : 'class_assignment',
      request_id: crypto.randomUUID(),
      expected_school_id: student.value.school_id,
      ...(student.value.school_class_id
        ? { expected_school_class_id: student.value.school_class_id }
        : {}),
      expected_latest_movement_id: movements.value[0]?.id || null,
      target_school_class_id: String(values.target_school_class_id),
      reason: String(values.reason).trim(),
    });
    message.success('班级流转已记录');
    movementOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function submitVoid() {
  if (!voidAttempt.value || !voidReason.value.trim()) {
    message.error('请填写作废原因');
    return;
  }
  saving.value = true;
  try {
    await voidStudentAttempt(voidAttempt.value.id, voidReason.value.trim());
    message.success('记录已作废');
    voidAttempt.value = undefined;
    await load();
  } finally {
    saving.value = false;
  }
}

function lockTerm(row: TermResult) {
  const termId = row.academic_term?.id;
  if (!termId) return;
  const termNo = row.academic_term?.term_no;
  Modal.confirm({
    title: `确认锁定 ${row.academic_year?.code} 第 ${termNo} 学期成绩？`,
    async onOk() {
      await lockStudentTermResult(studentId.value, termId);
      message.success('学期成绩已锁定');
      await load();
    },
  });
}

onMounted(() => {
  void Promise.all([load(), loadTerms()]);
});
</script>

<template>
  <Page
    :title="student ? `${student.name} · ${student.student_no}` : '学生档案'"
    description="按学生当前归属读取档案和成绩；测试地点单独显示。"
  >
    <Card v-if="student" class="mb-4">
      <div class="grid gap-3 text-sm md:grid-cols-3">
        <div>性别：{{ student.gender === 'male' ? '男' : '女' }}</div>
        <div>在籍状态：{{ student.status }}</div>
        <div>规则版本：{{ student.regulation_package_code }}</div>
        <div>当前学校：{{ student.school?.name || '—' }}</div>
        <div>当前班级：{{ student.school_class?.name || '—' }}</div>
      </div>
    </Card>

    <ProfileDrawer title="新增年级资料"><ProfileForm /></ProfileDrawer>
    <Card title="年级资料" class="mb-4">
      <template #extra>
        <Button v-if="canWrite" type="primary" @click="profileDrawerApi.open()">
          新增年级资料
        </Button>
      </template>
      <ProfileGrid>
        <template #year="{ row }">{{ row.academic_year?.code }}</template>
      </ProfileGrid>
    </Card>

    <Card title="班级流转" class="mb-4">
      <template #extra>
        <Button v-if="canWrite" @click="openMovement">
          {{ student?.school_class_id ? '同校转班' : '初次分班' }}
        </Button>
      </template>
      <MovementGrid>
        <template #from="{ row }">
          {{ row.from_school_class?.name || '—' }}
        </template>
        <template #to="{ row }">
          {{ row.to_school_class?.name || '—' }}
        </template>
      </MovementGrid>
    </Card>

    <Card title="测试记录" class="mb-4">
      <AttemptGrid>
        <template #item="{ row }">{{ row.item?.name || '—' }}</template>
        <template #process_status="{ row }">
          <Tag>{{ row.process_status }}</Tag>
        </template>
        <template #tested_school="{ row }">
          {{ row.tested_school?.name || '—' }}
        </template>
        <template #attempt_action="{ row }">
          <Button
            v-if="canWrite && row.process_status !== 'voided'"
            type="link"
            danger
            @click="voidAttempt = row"
          >
            作废
          </Button>
        </template>
      </AttemptGrid>
    </Card>

    <Card title="学期成绩" class="mb-4">
      <TermGrid>
        <template #term_year="{ row }">{{ row.academic_year?.code }}</template>
        <template #term="{ row }">
          第 {{ row.academic_term?.term_no }} 学期
        </template>
        <template #term_status="{ row }">
          <Tag>{{ row.status }}</Tag>
        </template>
        <template #revision="{ row }">
          {{ row.calculated_revision }} / {{ row.source_revision }}
        </template>
        <template #term_action="{ row }">
          <Button
            v-if="canWrite && row.status === 'draft'"
            type="link"
            @click="lockTerm(row)"
          >
            锁定
          </Button>
        </template>
      </TermGrid>
    </Card>

    <Card title="年级与总分">
      <Space wrap>
        <Tag v-for="result in gradeResults" :key="result.id">
          {{ result.academic_year?.code }} · {{ result.grade }} 年级：
          {{ result.grade_score ?? '待形成' }}（{{ result.status }}）
        </Tag>
      </Space>
      <p class="mt-3">总分：{{ totalResult?.total_score ?? '待形成' }}</p>
    </Card>

    <Modal
      :open="!!voidAttempt"
      title="作废测试记录"
      :confirm-loading="saving"
      @ok="submitVoid"
      @cancel="voidAttempt = undefined"
    >
      <Input v-model:value="voidReason" placeholder="作废原因" />
    </Modal>
    <Modal
      v-model:open="movementOpen"
      :title="student?.school_class_id ? '同校转班' : '初次分班'"
      :confirm-loading="saving"
      @ok="saveMovement"
    >
      <MovementForm />
    </Modal>
  </Page>
</template>

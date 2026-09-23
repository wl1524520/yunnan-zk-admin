<script lang="ts" setup>
import type { AcademicTerm } from '#/api/business/academic-term';
import type {
  ApprovalAttempt as Attempt,
  TransferTarget,
} from '#/api/business/approval';

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  message,
  Select,
  Space,
} from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { getAcademicTermList } from '#/api/business/academic-term';
import {
  createApprovalCase,
  getApprovalStudentAttempts,
  getTransferTargets,
} from '#/api/business/approval';
import { getStudentList } from '#/api/business/student';

import { specialOptions, useCommonSchema } from './create-data';

const router = useRouter();
const students = ref<{ label: string; value: string }[]>([]);
const terms = ref<AcademicTerm[]>([]);
const targetSchools = ref<TransferTarget[]>([]);
const attempts = ref<Attempt[]>([]);
const saving = ref(false);
const form = reactive({
  case_type: 'special_student',
  reason: '',
  student_id: '',
  academic_year_id: '',
  academic_term_id: '',
  special_type: 'annual_exemption',
  special_note: '',
  special_item_codes: '',
  continuous_year_ids: [] as string[],
  target_school_id: '',
  intended_school_class_id: '',
  target_attempt_id: '',
  component_code: '',
  corrected_value: '',
  corrected_unit: '',
  corrected_valid: true,
  foul_code: '',
  competition_name: '',
  competition_level: 'county',
  competition_item: '',
  competition_on: '',
  rank: 1,
  is_team_event: false,
  participant_play_seconds: 0,
  match_total_seconds: 0,
  qualified_through_provincial_selection: false,
  score: 0,
});
const yearOptions = computed(() => [
  ...new Map(
    terms.value.map((term) => [
      term.academic_year_id,
      {
        label: term.academic_year?.code || term.academic_year_id,
        value: term.academic_year_id,
      },
    ]),
  ).values(),
]);
const termOptions = computed(() =>
  terms.value
    .filter((term) => term.academic_year_id === form.academic_year_id)
    .map((term) => ({ label: `第 ${term.term_no} 学期`, value: term.id })),
);
const selectedTarget = computed(() =>
  targetSchools.value.find((school) => school.id === form.target_school_id),
);
const targetClassOptions = computed(() =>
  (selectedTarget.value?.classes || []).map((entry) => ({
    label: `${entry.code} ${entry.name}`,
    value: entry.id,
  })),
);
const selectedAttempt = computed(() =>
  attempts.value.find((attempt) => attempt.id === form.target_attempt_id),
);
const needsTerm = computed(
  () =>
    form.case_type === 'score_correction' ||
    (form.case_type === 'special_student' &&
      [
        'cheating_item_zero',
        'cheating_term_zero',
        'disability_partial',
        'out_of_province',
      ].includes(form.special_type)),
);
const needsItemCodes = computed(() =>
  ['cheating_item_zero', 'disability_partial'].includes(form.special_type),
);

const [CommonForm, commonFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useCommonSchema(
    students,
    yearOptions,
    termOptions,
    needsTerm.value,
    loadStudents,
    (field, value) => {
      if (field === 'case_type') form.case_type = String(value);
      if (field === 'student_id') form.student_id = String(value ?? '');
      if (field === 'academic_year_id')
        form.academic_year_id = String(value ?? '');
    },
  ),
  showDefaultActions: false,
});

async function loadStudents(name = '') {
  const result = await getStudentList({
    page: 1,
    per_page: 100,
    ...(name ? { name } : {}),
  });
  students.value = result.items.map((student) => ({
    label: [student.student_no, student.name].filter(Boolean).join(' '),
    value: student.id,
  }));
}

async function loadTerms() {
  const result = await getAcademicTermList();
  terms.value = result.items;
}

async function loadTargets(keyword = '') {
  const result = await getTransferTargets(keyword);
  targetSchools.value = result.items;
}

async function loadAttempts() {
  if (!form.student_id || !form.academic_term_id) return;
  const result = await getApprovalStudentAttempts(
    form.student_id,
    form.academic_term_id,
  );
  attempts.value = result.items.filter(
    (attempt) => attempt.effective_measurements.length > 0,
  );
}

function createPayload(): Record<string, unknown> | undefined {
  if (!form.reason.trim() || !form.student_id || !form.academic_year_id) {
    message.error('请填写申请理由、学生和学年');
    return;
  }
  if (needsTerm.value && !form.academic_term_id) {
    message.error('请选择学期');
    return;
  }
  const base: Record<string, unknown> = {
    student_id: form.student_id,
    academic_year_id: form.academic_year_id,
  };
  let workflow = 'district_review';
  switch (form.case_type) {
    case 'competition_bonus': {
      if (
        !form.competition_name ||
        !form.competition_item ||
        !form.competition_on
      ) {
        message.error('请填写赛事信息');
        return;
      }
      base.proposed_snapshot = {
        competition: {
          competition_name: form.competition_name,
          competition_level: form.competition_level,
          competition_item: form.competition_item,
          competition_on: form.competition_on,
          rank: form.rank,
          is_team_event: form.is_team_event,
          ...(form.is_team_event
            ? {
                participant_play_seconds: form.participant_play_seconds,
                match_total_seconds: form.match_total_seconds,
              }
            : {}),
          qualified_through_provincial_selection:
            form.qualified_through_provincial_selection,
          score: form.score,
        },
      };

      break;
    }
    case 'score_correction': {
      const attempt = selectedAttempt.value;
      if (!attempt || !form.component_code) {
        message.error('请选择原始记录和更正子项');
        return;
      }
      const original = attempt.effective_measurements.find(
        (row) => row.component_code === form.component_code,
      );
      if (form.corrected_valid && !form.corrected_value.trim()) {
        message.error('请输入更正后的取值');
        return;
      }
      const numeric = Number(form.corrected_value);
      let correctedValue: null | number | string = null;
      if (form.corrected_valid) {
        correctedValue =
          Number.isFinite(numeric) && form.corrected_value.trim()
            ? numeric
            : form.corrected_value.trim();
      }
      base.academic_term_id = form.academic_term_id;
      base.target_attempt_id = attempt.id;
      base.expected_checksum = attempt.measurements_checksum;
      base.proposed_snapshot = {
        corrections: [
          {
            component_code: form.component_code,
            is_valid: form.corrected_valid,
            value: correctedValue,
            unit: form.corrected_unit || original?.unit || null,
            foul_code:
              !form.corrected_valid && form.foul_code.trim()
                ? form.foul_code.trim()
                : null,
          },
        ],
      };

      break;
    }
    case 'student_transfer': {
      if (!form.target_school_id) {
        message.error('请选择目标学校');
        return;
      }
      workflow = 'student_transfer';
      base.target_school_id = form.target_school_id;
      if (form.intended_school_class_id)
        base.intended_school_class_id = form.intended_school_class_id;

      break;
    }
    default: {
      if (!form.special_note.trim()) {
        message.error('请填写认定事实说明');
        return;
      }
      workflow = ['annual_exemption', 'continuous_exemption'].includes(
        form.special_type,
      )
        ? 'school_exemption'
        : 'district_review';
      if (needsTerm.value) base.academic_term_id = form.academic_term_id;
      const itemCodes = form.special_item_codes
        .split(/[,，\s]+/)
        .filter(Boolean);
      if (needsItemCodes.value && itemCodes.length === 0) {
        message.error('请填写项目编码');
        return;
      }
      base.proposed_snapshot = {
        special: {
          case_type: form.special_type,
          note: form.special_note.trim(),
          ...(needsItemCodes.value ? { exam_item_codes: itemCodes } : {}),
        },
      };
    }
  }
  const yearIds =
    form.case_type === 'special_student' &&
    form.special_type === 'continuous_exemption'
      ? form.continuous_year_ids
      : [form.academic_year_id];
  if (yearIds.length === 0) {
    message.error('请选择连续免考涉及的全部学年');
    return;
  }
  return {
    workflow_type: workflow,
    case_type: form.case_type,
    reason: form.reason.trim(),
    items: yearIds.map((academicYearId) => ({
      ...base,
      academic_year_id: academicYearId,
    })),
  };
}

async function save() {
  const { valid } = await commonFormApi.validate();
  if (!valid) return;
  const values = await commonFormApi.getValues();
  form.case_type = String(values.case_type ?? form.case_type);
  form.student_id = String(values.student_id ?? '');
  form.academic_year_id = String(values.academic_year_id ?? '');
  form.academic_term_id = String(values.academic_term_id ?? '');
  form.reason = String(values.reason ?? '');
  const payload = createPayload();
  if (!payload) return;
  saving.value = true;
  try {
    await createApprovalCase(payload);
    message.success('申请草稿已创建，请上传材料后提交审核');
    await router.push('/approvals');
  } finally {
    saving.value = false;
  }
}

watch(
  () => form.academic_year_id,
  () => {
    form.academic_term_id = '';
    commonFormApi.setValues({ academic_term_id: '' });
  },
);
watch(needsTerm, () => {
  commonFormApi.setState({
    schema: useCommonSchema(
      students,
      yearOptions,
      termOptions,
      needsTerm.value,
      loadStudents,
      (field, value) => {
        if (field === 'case_type') form.case_type = String(value);
        if (field === 'student_id') form.student_id = String(value ?? '');
        if (field === 'academic_year_id')
          form.academic_year_id = String(value ?? '');
      },
    ),
  });
});
watch(
  () => [form.student_id, form.academic_term_id],
  () => {
    form.target_attempt_id = '';
    attempts.value = [];
    if (form.case_type === 'score_correction') void loadAttempts();
  },
);
onMounted(() => {
  void Promise.all([loadStudents(), loadTerms(), loadTargets()]);
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline -->
  <Page
    title="发起审批"
    description="学校按申请类型填写事实，平台按规则与当前范围复核。"
  >
    <Card>
      <CommonForm />

      <div
        v-if="form.case_type === 'student_transfer'"
        class="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label class="grid gap-1"
          >目标学校<Select
            v-model:value="form.target_school_id"
            :options="
              targetSchools.map((school) => ({
                label: `${school.code} ${school.name}`,
                value: school.id,
              }))
            "
            show-search
            :filter-option="false"
            placeholder="搜索目标学校"
            @search="loadTargets"
        /></label>
        <label class="grid gap-1"
          >意向班级<Select
            v-model:value="form.intended_school_class_id"
            :options="targetClassOptions"
            allow-clear
            placeholder="由接收校最终确认班级"
        /></label>
      </div>

      <div
        v-if="form.case_type === 'special_student'"
        class="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label class="grid gap-1"
          >处置类型<Select
            v-model:value="form.special_type"
            :options="specialOptions"
        /></label>
        <label
          v-if="form.special_type === 'continuous_exemption'"
          class="grid gap-1"
          >全部申报学年<Select
            v-model:value="form.continuous_year_ids"
            mode="multiple"
            :options="yearOptions"
            placeholder="从当前年级至九年级的全部学年"
        /></label>
        <label v-if="needsItemCodes" class="grid gap-1"
          >目标项目编码<Input
            v-model:value="form.special_item_codes"
            placeholder="多个编码以逗号分隔"
        /></label>
        <label class="md:col-span-2 grid gap-1"
          >认定事实说明<Input v-model:value="form.special_note"
        /></label>
        <Alert
          v-if="
            ['continuous_exemption', 'annual_exemption'].includes(
              form.special_type,
            )
          "
          class="md:col-span-2"
          type="warning"
          message="免考申请须在草稿中上传资格和公示证明后才能提交；平均分口径未确认前批准后也不能应用。"
        />
      </div>

      <div
        v-if="form.case_type === 'score_correction'"
        class="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label class="grid gap-1"
          >目标记录<Select
            v-model:value="form.target_attempt_id"
            :options="
              attempts.map((attempt) => ({
                label: `${attempt.source_record_no} ${attempt.item?.name || ''}`,
                value: attempt.id,
              }))
            "
            placeholder="先选择学生和学期"
        /></label>
        <label class="grid gap-1"
          >更正子项<Select
            v-model:value="form.component_code"
            :options="
              (selectedAttempt?.effective_measurements || []).map((entry) => ({
                label: `${entry.component_code}（原值 ${entry.value ?? '无'} ${entry.unit || ''}）`,
                value: entry.component_code,
              }))
            "
        /></label>
        <label class="grid gap-1"
          >更正后的取值<Input
            v-model:value="form.corrected_value"
            :disabled="!form.corrected_valid"
        /></label>
        <label class="grid gap-1"
          >单位<Input
            v-model:value="form.corrected_unit"
            placeholder="留空沿用原单位"
        /></label>
        <Checkbox v-model:checked="form.corrected_valid">有效测量事实</Checkbox>
        <label v-if="!form.corrected_valid" class="grid gap-1"
          >犯规代码<Input v-model:value="form.foul_code"
        /></label>
      </div>

      <div
        v-if="form.case_type === 'competition_bonus'"
        class="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label class="grid gap-1"
          >比赛名称<Input v-model:value="form.competition_name"
        /></label>
        <label class="grid gap-1"
          >比赛级别<Select
            v-model:value="form.competition_level"
            :options="[
              { label: '国家级', value: 'national' },
              { label: '省级', value: 'provincial' },
              { label: '州市级', value: 'prefecture' },
              { label: '县级', value: 'county' },
              { label: '校级', value: 'school' },
            ]"
        /></label>
        <label class="grid gap-1"
          >比赛小项<Input v-model:value="form.competition_item"
        /></label>
        <label class="grid gap-1"
          >比赛日期<Input v-model:value="form.competition_on" type="date"
        /></label>
        <label class="grid gap-1"
          >名次<InputNumber v-model:value="form.rank" :min="1" class="w-full"
        /></label>
        <label class="grid gap-1"
          >申报分值<InputNumber
            v-model:value="form.score"
            :min="0"
            class="w-full"
        /></label>
        <Checkbox v-model:checked="form.is_team_event">集体项目</Checkbox>
        <Checkbox v-model:checked="form.qualified_through_provincial_selection">
          经省级选拔参加国家级比赛
        </Checkbox>
        <template v-if="form.is_team_event">
          <label class="grid gap-1"
            >本人参赛秒数<InputNumber
              v-model:value="form.participant_play_seconds"
              :min="0"
              class="w-full"
          /></label>
          <label class="grid gap-1"
            >比赛总秒数<InputNumber
              v-model:value="form.match_total_seconds"
              :min="1"
              class="w-full"
          /></label>
        </template>
      </div>

      <Space class="mt-6">
        <Button type="primary" :loading="saving" @click="save">创建草稿</Button
        ><Button @click="router.push('/approvals')">返回列表</Button>
      </Space>
    </Card>
  </Page>
</template>

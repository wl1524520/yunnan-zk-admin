<script lang="ts" setup>
import type { ConfirmedSelection, ItemOptions } from '#/api/business/selection';
import type { Student } from '#/api/business/student';

import { computed, reactive, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Alert,
  Checkbox,
  CheckboxGroup,
  Input,
  message,
  Select,
  Spin,
  Tag,
} from 'antdv-next';

import { getAcademicTermOptions } from '#/api/business/academic-term';
import {
  getConfirmedSelections,
  getItemOptions,
  submitSelections,
} from '#/api/business/selection';

const emit = defineEmits(['success']);

/** 本次打开 drawer 时选中的学生（已由列表页保证同班级）。 */
const students = ref<Student[]>([]);
/** 已有确认记录、被排除在本次批量确认之外的学生。 */
const excluded = ref<Student[]>([]);
const academicTermId = ref('');
const termOptions = ref<{ label: string; value: string }[]>([]);
const options = ref<ItemOptions>();
const existing = ref<ConfirmedSelection[]>([]);
const loading = ref(false);
const mode = ref<'confirm' | 'correct'>('confirm');
const emptyReason = ref('');
const reason = ref('');
const offlineSyncConfirmed = ref(false);
const selectedCodes = reactive<Record<string, string[]>>({});
const selectedVariants = reactive<Record<string, string>>({});

const submitCount = computed(() =>
  mode.value === 'correct'
    ? students.value.length
    : students.value.length - excluded.value.length,
);
const title = computed(() =>
  submitCount.value > 1
    ? `选测确认（${submitCount.value} 名学生）`
    : '选测确认',
);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    await submit();
  },
  async onOpenChange(open) {
    if (!open) return;
    const data = drawerApi.getData<{ students: Student[] }>();
    students.value = data?.students ?? [];
    reason.value = '';
    offlineSyncConfirmed.value = false;
    if (termOptions.value.length === 0)
      termOptions.value = await getAcademicTermOptions();
    // 默认取学期目录第一项，与原选测确认页一致。
    if (!academicTermId.value && termOptions.value[0])
      academicTermId.value = String(termOptions.value[0].value);
    await loadContent();
  },
});

async function onTermChange() {
  if (academicTermId.value) await loadContent();
}

/**
 * 读取候选组并按约定口径装配内容：已确认学生剔除出批量确认，
 * 仅选一名已确认学生时转入纠错模式（提交完整目标集合）。
 */
async function loadContent() {
  const first = students.value[0];
  if (!academicTermId.value || !first) return;
  loading.value = true;
  options.value = undefined;
  emptyReason.value = '';
  try {
    const [firstOptions, ...confirmedLists] = await Promise.all([
      getItemOptions(academicTermId.value, first.id),
      ...students.value.map((student) =>
        getConfirmedSelections(academicTermId.value, student.id),
      ),
    ]);
    resetSelections();
    excluded.value = students.value.filter(
      (_, index) => (confirmedLists[index]?.length ?? 0) > 0,
    );
    const pending = students.value.filter(
      (student) => !excluded.value.some((entry) => entry.id === student.id),
    );

    if (pending.length === 0) {
      if (students.value.length === 1) {
        mode.value = 'correct';
        options.value = firstOptions;
        existing.value = confirmedLists[0] ?? [];
        prefillSelections(existing.value);
        return;
      }
      mode.value = 'confirm';
      existing.value = [];
      options.value = undefined;
      emptyReason.value =
        '所选学生均已确认选测项目；如需纠错，请单独选择一名学生。';
      return;
    }

    mode.value = 'confirm';
    existing.value = [];
    // 候选组必须以本次实际提交的学生为准：首名学生若已被排除，改取待确认的首名学生的年级与性别口径。
    const anchor = pending[0] ?? first;
    options.value =
      anchor.id === first.id
        ? firstOptions
        : await getItemOptions(academicTermId.value, anchor.id);
  } finally {
    loading.value = false;
  }
}

function resetSelections() {
  for (const key of Object.keys(selectedCodes)) delete selectedCodes[key];
  for (const key of Object.keys(selectedVariants)) delete selectedVariants[key];
  reason.value = '';
  offlineSyncConfirmed.value = false;
}

function prefillSelections(selections: ConfirmedSelection[]) {
  for (const selection of selections) {
    selectedCodes[selection.group_code] = selection.items.map(
      (item) => item.exam_item_code,
    );
    for (const item of selection.items) {
      if (item.variant_code)
        selectedVariants[item.exam_item_code] = item.variant_code;
    }
  }
}

async function submit() {
  if (emptyReason.value || !options.value || !academicTermId.value) return;
  const targets =
    mode.value === 'correct'
      ? students.value
      : students.value.filter(
          (student) => !excluded.value.some((entry) => entry.id === student.id),
        );
  const payload: Record<string, unknown> = {
    academic_term_id: academicTermId.value,
    student_ids: targets.map((student) => student.id),
  };
  for (const group of options.value.groups) {
    const isConfirmed = existing.value.some(
      (entry) => entry.group_code === group.code,
    );
    if (mode.value === 'correct' && !isConfirmed) continue;
    if (mode.value === 'confirm' && isConfirmed) continue;
    const selected = selectedCodes[group.code] || [];
    if (selected.length === 0) continue;
    if (selected.length !== group.choose) {
      message.error(`「${group.code}」应选择 ${group.choose} 项`);
      return;
    }
    if (
      group.at_least_one.length > 0 &&
      !selected.some((code) => group.at_least_one.includes(code))
    ) {
      message.error('专项组须至少选择一项三大球项目');
      return;
    }
    payload[
      group.code === 'basic_option'
        ? 'basic_optional_exam_item_codes'
        : 'skill_exam_item_codes'
    ] = selected;
  }
  if (
    !payload.basic_optional_exam_item_codes &&
    !payload.skill_exam_item_codes
  ) {
    message.error('请至少选择一组选测项目');
    return;
  }
  const selectedSkill = (payload.skill_exam_item_codes || []) as string[];
  const variants = Object.fromEntries(
    selectedSkill
      .filter((code) => selectedVariants[code])
      .map((code) => [code, selectedVariants[code]]),
  );
  if (Object.keys(variants).length > 0) payload.skill_variants = variants;
  if (mode.value === 'correct') {
    if (!reason.value.trim() || !offlineSyncConfirmed.value) {
      message.error('纠错须填写原因并确认离线记录已同步');
      return;
    }
    payload.reason = reason.value.trim();
    payload.offline_sync_confirmed = true;
  }
  drawerApi.lock();
  try {
    await submitSelections(mode.value, payload);
    message.success(mode.value === 'confirm' ? '选项已确认' : '选项已纠正');
    emit('success');
    drawerApi.close();
  } finally {
    drawerApi.unlock();
  }
}
</script>

<template>
  <Drawer class="w-full max-w-[720px]" :title="title">
    <Spin :spinning="loading" class="mx-4 block">
      <div class="mb-4 flex items-center gap-3">
        <span class="shrink-0">学期</span>
        <Select
          v-model:value="academicTermId"
          :options="termOptions"
          class="max-w-64"
          @change="onTermChange"
        />
      </div>

      <template v-if="options">
        <Alert
          class="mb-4"
          type="info"
          show-icon
          :message="`年级 ${options.grade} · ${options.gender === 'male' ? '男' : '女'} · 规则版本 ${options.regulation_package_code}`"
        />
        <Alert
          v-if="mode === 'correct'"
          class="mb-4"
          type="warning"
          show-icon
          message="该学生本学期已确认过选项，本次为纠错提交，将按新集合整体替换。"
        />
        <Alert
          v-else-if="excluded.length > 0"
          class="mb-4"
          type="info"
          show-icon
          :message="`已排除 ${excluded.length} 名已有确认记录的学生，本次提交 ${submitCount} 人`"
        />
        <div v-for="group in options.groups" :key="group.code" class="mb-6">
          <h3 class="mb-2 text-base font-semibold">
            {{ group.code === 'basic_option' ? '基础选测' : '专项选测' }}
            <Tag>选 {{ group.choose }} 项</Tag>
          </h3>
          <p
            v-if="existing.some((entry) => entry.group_code === group.code)"
            class="mb-2 text-sm text-gray-500"
          >
            已确认：{{
              existing.find((entry) => entry.group_code === group.code)
                ?.confirmed_by?.name
            }}
            ·
            {{
              existing.find((entry) => entry.group_code === group.code)
                ?.confirmed_at
            }}
          </p>
          <p
            v-if="group.at_least_one.length > 0"
            class="mb-2 text-sm text-gray-500"
          >
            须至少选择一项三大球项目
          </p>
          <CheckboxGroup
            v-model:value="selectedCodes[group.code]"
            class="flex flex-wrap gap-3"
          >
            <Checkbox
              v-for="item in group.items"
              :key="item.code"
              :value="item.code"
            >
              {{ item.name }}
            </Checkbox>
          </CheckboxGroup>
          <div
            v-for="item in group.items.filter(
              (entry) =>
                selectedCodes[group.code]?.includes(entry.code) &&
                entry.variants.length > 0,
            )"
            :key="item.code"
            class="mt-3 max-w-72"
          >
            <label>{{ item.name }}分支</label>
            <Select
              v-model:value="selectedVariants[item.code]"
              :options="
                item.variants.map((variant) => ({
                  label: variant,
                  value: variant,
                }))
              "
              class="w-full"
            />
          </div>
        </div>
        <Alert
          v-if="options.groups.length === 0"
          type="info"
          show-icon
          message="所选学生本学期没有需要确认的选测组。"
        />
        <div v-if="mode === 'correct'" class="grid gap-3">
          <Input v-model:value="reason" placeholder="纠错原因" />
          <Checkbox v-model:checked="offlineSyncConfirmed">
            确认相关设备离线记录已同步完成
          </Checkbox>
        </div>
      </template>

      <Alert
        v-else-if="emptyReason"
        type="warning"
        show-icon
        :message="emptyReason"
      />
      <Alert v-else-if="!loading" type="info" show-icon message="请选择学期" />
    </Spin>
  </Drawer>
</template>

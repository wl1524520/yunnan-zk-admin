<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Checkbox, CheckboxGroup, Input, message, Select, Space, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface OptionItem { code: string; name: string; variants: string[] }
interface OptionGroup { code: string; choose: number; at_least_one: string[]; items: OptionItem[] }
interface ItemOptions { groups: OptionGroup[]; grade: number; gender: string; regulation_package_code: string }
interface PageResult<T> { items: T[]; total: number }
interface Student { id: string; student_no: string; name: string }
interface AcademicTerm { id: string; term_no: number; academic_year?: { code: string } }
interface ConfirmedSelection { group_code: string; confirmed_at: string; confirmed_by?: { name: string }; items: { exam_item_code: string; variant_code?: string }[] }

const academicTermId = ref('');
const studentId = ref('');
const termOptions = ref<{ label: string; value: string }[]>([]);
const studentOptions = ref<{ label: string; value: string }[]>([]);
const options = ref<ItemOptions>();
const existing = ref<ConfirmedSelection[]>([]);
const loading = ref(false);
const saving = ref(false);
const mode = ref<'confirm' | 'correct'>('confirm');
const reason = ref('');
const offlineSyncConfirmed = ref(false);
const selectedCodes = reactive<Record<string, string[]>>({});
const selectedVariants = reactive<Record<string, string>>({});

async function loadTerms() {
  const result = await requestClient.get<PageResult<AcademicTerm>>('/academic-terms', {
    params: { page: 1, per_page: 100 },
  });
  termOptions.value = result.items.map((term) => ({
    label: `${term.academic_year?.code || ''} 第 ${term.term_no} 学期`,
    value: term.id,
  }));
}

async function loadStudents(name = '') {
  const result = await requestClient.get<PageResult<Student>>('/students', {
    params: { page: 1, per_page: 100, ...(name ? { name } : {}) },
  });
  studentOptions.value = result.items.map((student) => ({
    label: `${student.student_no} ${student.name}`,
    value: student.id,
  }));
}

async function loadOptions() {
  if (!academicTermId.value || !studentId.value) return;
  loading.value = true;
  try {
    options.value = await requestClient.get<ItemOptions>('/exam-items', {
      params: { academic_term_id: academicTermId.value, student_id: studentId.value },
    });
    existing.value = await requestClient.get<ConfirmedSelection[]>(
      `/students/${studentId.value}/item-selections`,
      { params: { academic_term_id: academicTermId.value } },
    );
    for (const key of Object.keys(selectedCodes)) delete selectedCodes[key];
    for (const key of Object.keys(selectedVariants)) delete selectedVariants[key];
    for (const selection of existing.value) {
      selectedCodes[selection.group_code] = selection.items.map((item) => item.exam_item_code);
      for (const item of selection.items) {
        if (item.variant_code) selectedVariants[item.exam_item_code] = item.variant_code;
      }
    }
    mode.value = existing.value.length ? 'correct' : 'confirm';
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!academicTermId.value || !studentId.value || !options.value) {
    message.error('请选择学期和学生');
    return;
  }
  const payload: Record<string, unknown> = {
    academic_term_id: academicTermId.value,
    student_ids: [studentId.value],
  };
  for (const group of options.value.groups) {
    const isConfirmed = existing.value.some((entry) => entry.group_code === group.code);
    if (mode.value === 'correct' && !isConfirmed) continue;
    if (mode.value === 'confirm' && isConfirmed) continue;
    const selected = selectedCodes[group.code] || [];
    if (selected.length === 0) continue;
    if (selected.length !== group.choose) {
      message.error(`「${group.code}」应选择 ${group.choose} 项`);
      return;
    }
    if (group.at_least_one.length && !selected.some((code) => group.at_least_one.includes(code))) {
      message.error('专项组须至少选择一项三大球项目');
      return;
    }
    payload[group.code === 'basic_option' ? 'basic_optional_exam_item_codes' : 'skill_exam_item_codes'] = selected;
  }
  if (!payload.basic_optional_exam_item_codes && !payload.skill_exam_item_codes) {
    message.error('请至少选择一组选测项目');
    return;
  }
  const selectedSkill = (payload.skill_exam_item_codes || []) as string[];
  const variants = Object.fromEntries(selectedSkill
    .filter((code) => selectedVariants[code])
    .map((code) => [code, selectedVariants[code]]));
  if (Object.keys(variants).length) payload.skill_variants = variants;
  if (mode.value === 'correct') {
    if (!reason.value.trim() || !offlineSyncConfirmed.value) {
      message.error('纠错须填写原因并确认离线记录已同步');
      return;
    }
    payload.reason = reason.value.trim();
    payload.offline_sync_confirmed = true;
  }
  saving.value = true;
  try {
    await requestClient.post(`/student-item-selections/batch-${mode.value}`, payload);
    message.success(mode.value === 'confirm' ? '选项已确认' : '选项已纠正');
    await loadOptions();
  } finally {
    saving.value = false;
  }
}

watch([academicTermId, studentId], () => { options.value = undefined; existing.value = []; });
onMounted(() => { void Promise.all([loadTerms(), loadStudents()]); });
</script>

<template>
  <Page title="选测确认" description="按学生绑定的规则版本展示该学期、年级和性别适用的候选项目。">
    <Card>
      <Space class="mb-5" wrap>
        <Select v-model:value="academicTermId" :options="termOptions" placeholder="选择学期" class="min-w-56" />
        <Select v-model:value="studentId" :options="studentOptions" placeholder="搜索学生" show-search :filter-option="false" class="min-w-64" @search="loadStudents" />
        <Button :loading="loading" type="primary" @click="loadOptions">读取可选项目</Button>
      </Space>

      <template v-if="options">
        <Alert class="mb-4" type="info" show-icon :message="`年级 ${options.grade} · ${options.gender === 'male' ? '男' : '女'} · 规则版本 ${options.regulation_package_code}`" />
        <div v-for="group in options.groups" :key="group.code" class="mb-6">
          <h3 class="mb-2 text-base font-semibold">{{ group.code === 'basic_option' ? '基础选测' : '专项选测' }} <Tag>选 {{ group.choose }} 项</Tag></h3>
          <p v-if="existing.find((entry) => entry.group_code === group.code)" class="mb-2 text-sm text-gray-500">已确认：{{ existing.find((entry) => entry.group_code === group.code)?.confirmed_by?.name }} · {{ existing.find((entry) => entry.group_code === group.code)?.confirmed_at }}</p>
          <p v-if="group.at_least_one.length" class="mb-2 text-sm text-gray-500">须至少选择一项三大球项目</p>
          <CheckboxGroup v-model:value="selectedCodes[group.code]" class="flex flex-wrap gap-3">
            <Checkbox v-for="item in group.items" :key="item.code" :value="item.code">{{ item.name }}</Checkbox>
          </CheckboxGroup>
          <div v-for="item in group.items.filter((entry) => selectedCodes[group.code]?.includes(entry.code) && entry.variants.length)" :key="item.code" class="mt-3 max-w-72">
            <label>{{ item.name }}分支</label>
            <Select v-model:value="selectedVariants[item.code]" :options="item.variants.map((variant) => ({ label: variant, value: variant }))" class="w-full" />
          </div>
        </div>
        <Alert v-if="!options.groups.length" type="info" show-icon message="该学生本学期没有需要确认的选测组。" />
        <div v-else class="mt-6 border-t pt-4">
          <Space class="mb-3">
            <Button :type="mode === 'confirm' ? 'primary' : 'default'" @click="mode = 'confirm'">首次确认</Button>
            <Button :type="mode === 'correct' ? 'primary' : 'default'" @click="mode = 'correct'">选项纠错</Button>
          </Space>
          <div v-if="mode === 'correct'" class="mb-4 grid gap-3">
            <Input v-model:value="reason" placeholder="纠错原因" />
            <Checkbox v-model:checked="offlineSyncConfirmed">确认相关设备离线记录已同步完成</Checkbox>
          </div>
          <Button :loading="saving" type="primary" @click="submit">{{ mode === 'confirm' ? '确认选项' : '提交纠错' }}</Button>
        </div>
      </template>
    </Card>
  </Page>
</template>

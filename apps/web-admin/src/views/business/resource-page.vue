<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, Input, InputNumber, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

import { fieldLabels, resourceConfigs } from './resource-config';
import type { Field, Option } from './resource-config';

type Row = Record<string, any>;
interface PageResult { items: Row[]; total: number }
interface Term { id: string; term_no: number; starts_on: string; ends_on: string }

const route = useRoute();
const resourceKey = computed(() => String(route.meta.resource || 'districts'));
const config = computed(() => resourceConfigs[resourceKey.value]!);
const rows = ref<Row[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string>();
const form = reactive<Record<string, any>>({});
const filters = reactive<Record<string, any>>({});
const lookupOptions = reactive<Record<string, Option[]>>({});
const termsOpen = ref(false);
const terms = ref<Term[]>([]);
const termSaving = ref(false);
const passwordOpen = ref(false);
const passwordTarget = ref<string>();
const newPassword = ref('');

const fields = computed(() => config.value.fields.filter((field) =>
  editingId.value ? !field.createOnly : !field.editOnly,
));
const filterFields = computed(() => (config.value.filters || [])
  .map((name) => config.value.fields.find((field) => field.name === name))
  .filter((field): field is Field => Boolean(field)));
const columns = computed(() => [
  ...config.value.columns.map((name) => ({
    key: name,
    dataIndex: name,
    title: fieldLabels[name] || config.value.fields.find((field) => field.name === name)?.label || name,
  })),
  { key: 'actions', title: '操作', width: resourceKey.value === 'academic-years' ? 160 : 110 },
]);

function optionsFor(field: Field): Option[] {
  return field.lookup ? lookupOptions[field.lookup] || [] : field.options || [];
}

function displayValue(name: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const field = config.value.fields.find((item) => item.name === name);
  const option = field && optionsFor(field).find((item) => String(item.value) === String(value));
  return option?.label || String(value);
}

async function loadLookups() {
  const endpoints = [...new Set(config.value.fields
    .map((field) => field.lookup)
    .filter((value): value is 'districts' | 'schools' => Boolean(value)))];
  await Promise.all(endpoints.map(async (endpoint) => {
    const response = await requestClient.get<PageResult>(`/${endpoint}`, {
      params: { page: 1, per_page: 100 },
    });
    lookupOptions[endpoint] = response.items.map((item) => ({
      label: `${item.code || ''} ${item.name}`.trim(),
      value: item.id,
    }));
  }));
}

async function loadRows() {
  loading.value = true;
  try {
    const response = await requestClient.get<PageResult>(config.value.endpoint, {
      params: { page: page.value, per_page: 20, ...filters },
    });
    rows.value = response.items;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = undefined;
  for (const key of Object.keys(form)) delete form[key];
  dialogOpen.value = true;
}

function openEdit(row: Row) {
  editingId.value = row.id;
  for (const key of Object.keys(form)) delete form[key];
  for (const field of config.value.fields) {
    if (!field.createOnly && field.type !== 'password') {
      form[field.name] = row[field.name] ?? undefined;
    }
  }
  dialogOpen.value = true;
}

async function save() {
  const payload: Row = {};
  for (const field of fields.value) {
    const value = form[field.name];
    if (field.required && !editingId.value && (value === '' || value === null || value === undefined)) {
      message.error(`请填写${field.label}`);
      return;
    }
    if (value !== '' && value !== undefined) payload[field.name] = value;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      await requestClient.request(`${config.value.endpoint}/${editingId.value}`, { data: payload, method: 'PATCH' });
    } else {
      await requestClient.post(config.value.endpoint, payload);
    }
    message.success('保存成功');
    dialogOpen.value = false;
    await loadRows();
    await loadLookups();
  } finally {
    saving.value = false;
  }
}

async function openTerms(row: Row) {
  const year = await requestClient.get<Row>(`${config.value.endpoint}/${row.id}`);
  terms.value = (year.terms || []).map((term: Term) => ({ ...term }));
  termsOpen.value = true;
}

async function saveTerm(term: Term) {
  termSaving.value = true;
  try {
    await requestClient.request(`/academic-terms/${term.id}`, {
      data: { starts_on: term.starts_on, ends_on: term.ends_on },
      method: 'PATCH',
    });
    message.success('学期日期已更新');
    await loadRows();
  } finally {
    termSaving.value = false;
  }
}

async function resetPassword() {
  if (!passwordTarget.value || !newPassword.value) return;
  saving.value = true;
  try {
    await requestClient.post(`/managers/${passwordTarget.value}/reset-password`, {
      password: newPassword.value,
    });
    message.success('密码已重置');
    passwordOpen.value = false;
    newPassword.value = '';
  } finally {
    saving.value = false;
  }
}

watch(resourceKey, () => {
  page.value = 1;
  for (const key of Object.keys(filters)) delete filters[key];
  void Promise.all([loadRows(), loadLookups()]);
});
onMounted(() => { void Promise.all([loadRows(), loadLookups()]); });
</script>

<template>
  <Page :title="config.title">
    <Card>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space wrap>
          <template v-for="field in filterFields" :key="field.name">
            <Select
              v-model:value="filters[field.name]"
              :allow-clear="true"
              :options="optionsFor(field)"
              :placeholder="field.label"
              class="min-w-36"
              @change="page = 1; loadRows()"
            />
          </template>
          <Button @click="loadRows">刷新</Button>
        </Space>
        <Button v-if="config.canCreate" type="primary" @click="openCreate">新增</Button>
      </div>
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }"
        row-key="id"
        :scroll="{ x: 900 }"
        @change="(pagination) => { page = pagination.current || 1; loadRows(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <Space>
              <Button v-if="config.canEdit" type="link" size="small" @click="openEdit(record)">编辑</Button>
              <Button v-if="resourceKey === 'academic-years'" type="link" size="small" @click="openTerms(record)">学期</Button>
              <Button v-if="resourceKey === 'managers'" type="link" size="small" @click="passwordTarget = record.id; passwordOpen = true">重置密码</Button>
            </Space>
          </template>
          <Tag v-else-if="column.key === 'status'" :color="record.status === 'active' ? 'green' : 'default'">
            {{ displayValue('status', record.status) }}
          </Tag>
          <template v-else>{{ displayValue(String(column.key), record[String(column.key)]) }}</template>
        </template>
      </Table>
    </Card>

    <Modal v-model:open="dialogOpen" :title="editingId ? `编辑${config.title}` : `新增${config.title}`" :confirm-loading="saving" width="640px" @ok="save">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label v-for="field in fields" :key="field.name" class="flex flex-col gap-1">
          <span>{{ field.label }} <span v-if="field.required && !editingId" class="text-red-500">*</span></span>
          <Select v-if="field.type === 'select' || field.type === 'lookup'" v-model:value="form[field.name]" :options="optionsFor(field)" allow-clear class="w-full" />
          <InputNumber v-else-if="field.type === 'number'" v-model:value="form[field.name]" class="w-full" />
          <Input v-else v-model:value="form[field.name]" :type="field.type === 'password' ? 'password' : field.type === 'date' ? 'date' : 'text'" />
        </label>
      </div>
    </Modal>

    <Modal v-model:open="termsOpen" title="学期日期" :footer="null" width="640px">
      <div v-for="term in terms" :key="term.id" class="mb-4 flex flex-wrap items-end gap-3">
        <strong>第 {{ term.term_no }} 学期</strong>
        <label>开始日期 <Input v-model:value="term.starts_on" type="date" /></label>
        <label>结束日期 <Input v-model:value="term.ends_on" type="date" /></label>
        <Button :loading="termSaving" type="primary" @click="saveTerm(term)">保存</Button>
      </div>
    </Modal>

    <Modal v-model:open="passwordOpen" title="重置业务账号密码" :confirm-loading="saving" @ok="resetPassword">
      <p class="mb-2">新密码至少 10 位，且包含字母和数字。</p>
      <Input v-model:value="newPassword" type="password" />
    </Modal>
  </Page>
</template>

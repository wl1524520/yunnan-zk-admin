<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Card, Input, InputNumber, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

import { fieldLabels, resourceConfigs } from './resource-config';
import type { Field, Option } from './resource-config';

type Row = Record<string, any>;
interface PageResult { items: Row[]; total: number }
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const canWrite = computed(() => userStore.userInfo?.roles?.includes('school') ?? false);
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
  ...(canWrite.value || resourceKey.value === 'students' ? [{ key: 'actions', title: '操作', width: 130 }] : []),
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
    .filter((value): value is 'school-classes' => Boolean(value)))];
  if (!canWrite.value) return;
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
        <Button v-if="config.canCreate && canWrite" type="primary" @click="openCreate">新增</Button>
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
              <Button v-if="resourceKey === 'students'" type="link" size="small" @click="router.push(`/students/${record.id}`)">档案</Button>
              <Button v-if="config.canEdit && canWrite" type="link" size="small" @click="openEdit(record)">编辑</Button>
            </Space>
          </template>
          <Tag v-else-if="column.key === 'status'" :color="record.status === 'active' ? 'green' : 'default'">
            {{ displayValue('status', record.status) }}
          </Tag>
          <template v-else-if="column.key === 'school_class_id'">{{ record.school_class?.name || displayValue('school_class_id', record.school_class_id) }}</template>
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

  </Page>
</template>

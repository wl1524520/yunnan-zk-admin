<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Checkbox, Input, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number }
interface Device {
  id: string; device_no: string; vendor: string; model: string; device_type: string;
  status: string; school?: { id: string; name: string };
}
interface DeviceKey { id: string; key_id: string; status: string; activated_at: string; retired_at?: string }

const devices = ref<Device[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const editOpen = ref(false);
const editing = ref<Device>();
const schoolDevice = ref<Device>();
const keyDevice = ref<Device>();
const keys = ref<DeviceKey[]>([]);
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const selectedSchoolId = ref('');
const offlineSyncConfirmed = ref(false);
const issuedKey = ref<{ key_id: string; secret: string }>();
const form = reactive({ device_no: '', vendor: '', model: '', device_type: 'automatic', status: 'enabled' });
const columns = [
  { title: '设备编号', dataIndex: 'device_no', key: 'device_no' },
  { title: '厂商', dataIndex: 'vendor', key: 'vendor' },
  { title: '型号', dataIndex: 'model', key: 'model' },
  { title: '类型', dataIndex: 'device_type', key: 'device_type' },
  { title: '学校', key: 'school' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions' },
];

async function load() {
  loading.value = true;
  try {
    const result = await requestClient.get<PageResult<Device>>('/devices', { params: { page: page.value, per_page: 20 } });
    devices.value = result.items;
    total.value = result.total;
  } finally { loading.value = false; }
}

function openEdit(device?: Device) {
  editing.value = device;
  Object.assign(form, device ? {
    device_no: device.device_no, vendor: device.vendor, model: device.model,
    device_type: device.device_type, status: device.status,
  } : { device_no: '', vendor: '', model: '', device_type: 'automatic', status: 'enabled' });
  editOpen.value = true;
}

async function save() {
  if (!form.device_no || !form.vendor || !form.model) { message.error('请填写设备编号、厂商和型号'); return; }
  saving.value = true;
  try {
    if (editing.value) {
      const { vendor, model, device_type, status } = form;
      await requestClient.request(`/devices/${editing.value.id}`, { data: { vendor, model, device_type, status }, method: 'PATCH' });
    } else await requestClient.post('/devices', { ...form });
    message.success('设备已保存');
    editOpen.value = false;
    await load();
  } finally { saving.value = false; }
}

async function searchSchools(keyword = '') {
  const result = await requestClient.get<PageResult<{ id: string; code: string; name: string }>>('/schools', {
    params: { page: 1, per_page: 100, ...(keyword ? { keyword } : {}) },
  });
  schoolOptions.value = result.items.map((school) => ({ label: `${school.code} ${school.name}`, value: school.id }));
}

async function openAssignment(device: Device) {
  schoolDevice.value = device;
  selectedSchoolId.value = device.school?.id || '';
  offlineSyncConfirmed.value = false;
  await searchSchools();
}

async function assignSchool() {
  if (!schoolDevice.value || !selectedSchoolId.value || !offlineSyncConfirmed.value) {
    message.error('选择学校并确认离线数据已同步'); return;
  }
  saving.value = true;
  try {
    await requestClient.post(`/devices/${schoolDevice.value.id}/school-assignment`, {
      school_id: selectedSchoolId.value, request_id: crypto.randomUUID(), offline_sync_confirmed: true,
    });
    message.success('学校已分配');
    schoolDevice.value = undefined;
    await load();
  } finally { saving.value = false; }
}

async function openKeys(device: Device) {
  keyDevice.value = device;
  await loadKeys();
}

async function loadKeys() {
  if (!keyDevice.value) return;
  const result = await requestClient.get<PageResult<DeviceKey>>(`/devices/${keyDevice.value.id}/keys`, {
    params: { page: 1, per_page: 100 },
  });
  keys.value = result.items;
}

async function issueKey() {
  if (!keyDevice.value) return;
  saving.value = true;
  try {
    issuedKey.value = await requestClient.post<{ key_id: string; secret: string }>(`/devices/${keyDevice.value.id}/keys`);
    await loadKeys();
  } finally { saving.value = false; }
}

async function revokeKey(key: DeviceKey) {
  if (!keyDevice.value) return;
  await requestClient.post(`/devices/${keyDevice.value.id}/keys/${key.id}/revoke`);
  message.success('密钥已撤销');
  await loadKeys();
}

onMounted(() => { void load(); });
</script>

<template>
  <Page title="设备台账" description="登记设备、分配学校并管理签名密钥；新密钥明文只显示一次。">
    <Card>
      <div class="mb-4 flex justify-between"><Button @click="load">刷新</Button><Button type="primary" @click="openEdit()">新增设备</Button></div>
      <Table :columns="columns" :data-source="devices" row-key="id" :loading="loading" :scroll="{ x: 1050 }" :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }" @change="(pagination) => { page = pagination.current || 1; load(); }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'school'">{{ record.school?.name || '未分配' }}</template>
          <Tag v-else-if="column.key === 'status'">{{ record.status }}</Tag>
          <Space v-else-if="column.key === 'actions'">
            <Button type="link" @click="openEdit(record)">编辑</Button>
            <Button type="link" @click="openAssignment(record)">分配学校</Button>
            <Button type="link" @click="openKeys(record)">密钥</Button>
          </Space>
        </template>
      </Table>
    </Card>

    <Modal v-model:open="editOpen" :title="editing ? '编辑设备' : '新增设备'" :confirm-loading="saving" @ok="save">
      <div class="grid gap-3">
        <Input v-model:value="form.device_no" :disabled="!!editing" placeholder="设备编号" />
        <Input v-model:value="form.vendor" placeholder="厂商" />
        <Input v-model:value="form.model" placeholder="型号" />
        <Select v-model:value="form.device_type" :options="[{ label: '自动设备', value: 'automatic' }, { label: '手持设备', value: 'handheld' }]" />
        <Select v-model:value="form.status" :options="[{ label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' }]" />
      </div>
    </Modal>
    <Modal :open="!!schoolDevice" title="分配设备学校" :confirm-loading="saving" @ok="assignSchool" @cancel="schoolDevice = undefined">
      <div class="grid gap-3">
        <Select v-model:value="selectedSchoolId" :options="schoolOptions" show-search :filter-option="false" placeholder="搜索学校" @search="searchSchools" />
        <Checkbox v-model:checked="offlineSyncConfirmed">确认该设备未上传的离线记录已同步完成</Checkbox>
      </div>
    </Modal>
    <Modal :open="!!keyDevice" title="设备签名密钥" width="720px" :footer="null" @cancel="keyDevice = undefined; issuedKey = undefined">
      <template v-if="keyDevice">
        <Alert v-if="issuedKey" type="warning" class="mb-4" show-icon message="请立即安全保存以下密钥；关闭后将无法再次读取。" />
        <div v-if="issuedKey" class="mb-4 break-all rounded border p-3 font-mono text-sm">标识：{{ issuedKey.key_id }}<br />密钥：{{ issuedKey.secret }}</div>
        <Space class="mb-3"><Button type="primary" :loading="saving" @click="issueKey">签发／轮换密钥</Button><Button @click="loadKeys">刷新</Button></Space>
        <Table :data-source="keys" row-key="id" :pagination="false" :columns="[
          { title: '密钥标识', dataIndex: 'key_id', key: 'key_id' },
          { title: '状态', dataIndex: 'status', key: 'status' },
          { title: '生效时间', dataIndex: 'activated_at', key: 'activated_at' },
          { title: '操作', key: 'action' },
        ]">
          <template #bodyCell="{ column, record }"><Button v-if="column.key === 'action' && record.status !== 'revoked'" type="link" danger @click="revokeKey(record)">撤销</Button></template>
        </Table>
      </template>
    </Modal>
  </Page>
</template>

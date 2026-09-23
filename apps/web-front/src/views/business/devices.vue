<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, message, Modal, Select, Space, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface PageResult<T> { items: T[]; total: number }
interface Teacher { id: string; employee_no: string; name: string; status: string }
interface Binding { id: string; school_teacher?: Teacher }
interface Device { id: string; device_no: string; vendor: string; model: string; device_type: string; status: string; teacher_bindings: Binding[] }

const devices = ref<Device[]>([]);
const teachers = ref<Teacher[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const selected = ref<Device>();
const teacherId = ref('');
const teacherOptions = ref<{ label: string; value: string }[]>([]);
const columns = [
  { title: '设备编号', dataIndex: 'device_no', key: 'device_no' },
  { title: '厂商', dataIndex: 'vendor', key: 'vendor' },
  { title: '型号', dataIndex: 'model', key: 'model' },
  { title: '类型', dataIndex: 'device_type', key: 'device_type' },
  { title: '状态', key: 'status' },
  { title: '绑定教师', key: 'teachers' },
  { title: '操作', key: 'action' },
];

async function load() {
  loading.value = true;
  try {
    const result = await requestClient.get<PageResult<Device>>('/devices', { params: { page: page.value, per_page: 20 } });
    devices.value = result.items;
    total.value = result.total;
    if (selected.value) selected.value = devices.value.find((item) => item.id === selected.value?.id);
  } finally { loading.value = false; }
}

async function openBindings(device: Device) {
  selected.value = device;
  teacherId.value = '';
  const result = await requestClient.get<PageResult<Teacher>>('/school-teachers', { params: { page: 1, per_page: 100 } });
  teachers.value = result.items;
  teacherOptions.value = result.items.filter((teacher) => teacher.status === 'active')
    .map((teacher) => ({ label: `${teacher.employee_no} ${teacher.name}`, value: teacher.id }));
}

async function bind() {
  if (!selected.value || !teacherId.value) { message.error('请选择教师'); return; }
  saving.value = true;
  try {
    await requestClient.post(`/devices/${selected.value.id}/teacher-bindings`, {
      school_teacher_id: teacherId.value, request_id: crypto.randomUUID(),
    });
    message.success('已绑定教师');
    await load();
  } finally { saving.value = false; }
}

async function unbind(binding: Binding) {
  await requestClient.delete(`/device-teacher-bindings/${binding.id}`);
  message.success('已解除绑定');
  await load();
}

onMounted(() => { void load(); });
</script>

<template>
  <Page title="学校设备" description="查看本校设备并维护教师绑定；设备登记和密钥由平台端办理。">
    <Card>
      <Button class="mb-4" @click="load">刷新</Button>
      <Table :columns="columns" :data-source="devices" row-key="id" :loading="loading" :scroll="{ x: 950 }" :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }" @change="(pagination) => { page = pagination.current || 1; load(); }">
        <template #bodyCell="{ column, record }">
          <Tag v-if="column.key === 'status'">{{ record.status }}</Tag>
          <template v-else-if="column.key === 'teachers'">{{ record.teacher_bindings?.map((binding) => binding.school_teacher?.name).filter(Boolean).join('、') || '—' }}</template>
          <Button v-else-if="column.key === 'action'" type="link" @click="openBindings(record)">教师绑定</Button>
        </template>
      </Table>
    </Card>
    <Modal :open="!!selected" title="教师绑定" width="680px" :footer="null" @cancel="selected = undefined">
      <template v-if="selected">
        <Space class="mb-4" wrap>
          <Select v-model:value="teacherId" :options="teacherOptions" placeholder="选择本校教师" class="min-w-60" />
          <Button type="primary" :loading="saving" @click="bind">绑定</Button>
        </Space>
        <Table :data-source="selected.teacher_bindings" row-key="id" :pagination="false" :columns="[
          { title: '工号', key: 'employee_no' }, { title: '教师', key: 'name' }, { title: '操作', key: 'action' },
        ]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'employee_no'">{{ record.school_teacher?.employee_no }}</template>
            <template v-else-if="column.key === 'name'">{{ record.school_teacher?.name }}</template>
            <Button v-else-if="column.key === 'action'" type="link" danger @click="unbind(record)">解绑</Button>
          </template>
        </Table>
      </template>
    </Modal>
  </Page>
</template>

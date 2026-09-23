<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { Binding, Device } from '#/api/business/device';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  bindDeviceTeacher,
  getDeviceList,
  unbindDeviceTeacher,
} from '#/api/business/device';

import { useBindingColumns, useBindingSchema, useColumns } from './data';

const selected = ref<Device>();
const saving = ref(false);
const currentPage = ref(1);
const currentPageSize = ref(20);

const [BindingForm, bindingFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBindingSchema(),
  showDefaultActions: false,
});
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) => {
          currentPage.value = page.currentPage;
          currentPageSize.value = page.pageSize;
          return getDeviceList(page.currentPage, page.pageSize);
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: true, zoom: true },
  } as VxeTableGridOptions<Device>,
});
const [BindingGrid, bindingGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useBindingColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<Binding>,
});

function openBindings(device: Device) {
  selected.value = device;
  bindingFormApi.resetForm();
  bindingGridApi.setGridOptions({ data: device.teacher_bindings ?? [] });
}

async function reload() {
  const result = await getDeviceList(currentPage.value, currentPageSize.value);
  if (selected.value) {
    selected.value = result.items.find(
      (device) => device.id === selected.value?.id,
    );
    bindingGridApi.setGridOptions({
      data: selected.value?.teacher_bindings ?? [],
    });
  }
  gridApi.query();
}

async function bind() {
  if (!selected.value) return;
  const { valid } = await bindingFormApi.validate();
  if (!valid) return;
  const { teacher_id } = await bindingFormApi.getValues();
  saving.value = true;
  try {
    await bindDeviceTeacher(selected.value.id, String(teacher_id));
    message.success('已绑定教师');
    await reload();
    bindingFormApi.resetForm();
  } finally {
    saving.value = false;
  }
}

async function unbind(binding: Binding) {
  await unbindDeviceTeacher(binding.id);
  message.success('已解除绑定');
  await reload();
}
</script>

<template>
  <Page
    title="学校设备"
    description="查看本校设备并维护教师绑定；设备登记和密钥由平台端办理。"
    auto-content-height
  >
    <Grid>
      <template #status="{ row }">
        <Tag>{{ row.status }}</Tag>
      </template>
      <template #teachers="{ row }">
        {{
          row.teacher_bindings
            ?.map((binding) => binding.school_teacher?.name)
            .filter(Boolean)
            .join('、') || '—'
        }}
      </template>
      <template #action="{ row }">
        <Button type="link" @click="openBindings(row)">教师绑定</Button>
      </template>
    </Grid>
    <Modal
      :open="!!selected"
      title="教师绑定"
      width="680px"
      :footer="null"
      @cancel="selected = undefined"
    >
      <template v-if="selected">
        <Space class="mb-4" wrap>
          <BindingForm />
          <Button type="primary" :loading="saving" @click="bind">绑定</Button>
        </Space>
        <BindingGrid>
          <template #employee_no="{ row }">
            {{ row.school_teacher?.employee_no }}
          </template>
          <template #name="{ row }">{{ row.school_teacher?.name }}</template>
          <template #binding_action="{ row }">
            <Button type="link" danger @click="unbind(row)">解绑</Button>
          </template>
        </BindingGrid>
      </template>
    </Modal>
  </Page>
</template>

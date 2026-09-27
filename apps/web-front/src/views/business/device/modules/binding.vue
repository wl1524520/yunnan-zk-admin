<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { Binding, Device } from '#/api/business/device';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, message, Space } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { bindDeviceTeacher, unbindDeviceTeacher } from '#/api/business/device';

import { useBindingColumns, useBindingSchema } from '../data';

const emit = defineEmits(['success']);
const selected = ref<Device>();
const saving = ref(false);

const [BindingForm, bindingFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBindingSchema(),
  showDefaultActions: false,
});
const [BindingGrid, bindingGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useBindingColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<Binding>,
});
const [Drawer, drawerApi] = useVbenDrawer({
  onOpenChange(open) {
    if (!open) return;
    const device = drawerApi.getData<Device>();
    selected.value = device;
    bindingFormApi.resetForm();
    bindingGridApi.setGridOptions({ data: device?.teacher_bindings ?? [] });
  },
});

async function bind() {
  if (!selected.value) return;
  const { valid } = await bindingFormApi.validate();
  if (!valid) return;
  const { teacher_id } = await bindingFormApi.getValues();
  saving.value = true;
  try {
    await bindDeviceTeacher(selected.value.id, String(teacher_id));
    message.success('已绑定教师');
    emit('success');
    drawerApi.close();
  } finally {
    saving.value = false;
  }
}

async function unbind(binding: Binding) {
  await unbindDeviceTeacher(binding.id);
  message.success('已解除绑定');
  emit('success');
  drawerApi.close();
}
</script>

<template>
  <Drawer class="w-full max-w-[680px]" title="教师绑定">
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
  </Drawer>
</template>

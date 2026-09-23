<script lang="ts" setup>
import type { Device, DevicePayload } from '#/api/business/device';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { createDevice, updateDevice } from '#/api/business/device';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const editing = ref<Device>();
const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(false),
  showDefaultActions: false,
});
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const payload = {
      device_no: String(values.device_no ?? ''),
      vendor: String(values.vendor ?? ''),
      model: String(values.model ?? ''),
      device_type: String(values.device_type ?? 'automatic'),
      status: String(values.status ?? 'enabled'),
    } satisfies DevicePayload;
    drawerApi.lock();
    try {
      if (editing.value) {
        const { device_no: _deviceNo, ...update } = payload;
        await updateDevice(editing.value.id, update);
      } else {
        await createDevice(payload);
      }
      message.success('设备已保存');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    editing.value = drawerApi.getData<Device>();
    formApi.setState({ schema: useFormSchema(Boolean(editing.value)) });
    await formApi.resetForm();
    await nextTick();
    formApi.setValues(
      editing.value
        ? {
            vendor: editing.value.vendor,
            model: editing.value.model,
            device_type: editing.value.device_type,
            status: editing.value.status,
          }
        : { device_type: 'automatic', status: 'enabled' },
    );
  },
});
const title = computed(() => (editing.value ? '编辑设备' : '新增设备'));
</script>

<template>
  <Drawer :title="title"><Form /></Drawer>
</template>

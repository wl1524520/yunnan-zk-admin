<script lang="ts" setup>
import type { District } from '#/api/business/district';

import { nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { updateDistrict } from '#/api/business/district';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const editingId = ref<string>();
const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'gap-y-4',
});
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const id = editingId.value;
    if (!id) return;
    const values = await formApi.getValues();
    const payload = Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => value !== '' && value !== undefined,
      ),
    );
    drawerApi.lock();
    try {
      await updateDistrict(id, payload);
      message.success('保存成功');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const row = drawerApi.getData<District>();
    editingId.value = row?.id;
    await formApi.resetForm();
    await nextTick();
    if (row) {
      formApi.setValues({
        name: row.name,
        sort_order: row.sort_order,
        status: row.status,
      });
    }
  },
});
</script>

<template>
  <Drawer title="编辑地区"><Form /></Drawer>
</template>

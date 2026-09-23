<script lang="ts" setup>
import type { School } from '#/api/business/school';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { createSchool, updateSchool } from '#/api/business/school';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const editingId = ref<string>();
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
    const payload = Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => value !== '' && value !== undefined,
      ),
    );
    drawerApi.lock();
    try {
      await (editingId.value
        ? updateSchool(editingId.value, payload)
        : createSchool(payload));
      message.success('保存成功');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const row = drawerApi.getData<School>();
    editingId.value = row?.id;
    formApi.setState({ schema: useFormSchema(Boolean(row)) });
    await formApi.resetForm();
    await nextTick();
    if (row) {
      const values = { ...row };
      delete values.password;
      formApi.setValues(values);
    }
  },
});
const title = computed(() =>
  editingId.value ? '编辑学校管理' : '新增学校管理',
);
</script>

<template>
  <Drawer :title="title"><Form /></Drawer>
</template>

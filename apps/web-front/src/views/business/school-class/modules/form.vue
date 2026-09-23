<script lang="ts" setup>
import type { SchoolClass } from '#/api/business/school-class';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import {
  createSchoolClass,
  updateSchoolClass,
} from '#/api/business/school-class';

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
        ? updateSchoolClass(editingId.value, payload)
        : createSchoolClass(payload));
      message.success('保存成功');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const row = drawerApi.getData<SchoolClass>();
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
  editingId.value ? '编辑班级管理' : '新增班级管理',
);
</script>

<template>
  <Drawer :title="title"><Form /></Drawer>
</template>

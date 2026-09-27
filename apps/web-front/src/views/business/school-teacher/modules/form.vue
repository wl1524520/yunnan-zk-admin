<script lang="ts" setup>
import type { SchoolTeacher } from '#/api/business/school-teacher';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import {
  createSchoolTeacher,
  updateSchoolTeacher,
} from '#/api/business/school-teacher';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const editingId = ref<string>();
const breakpoints = useBreakpoints(breakpointsTailwind);
const isHorizontal = computed(() => breakpoints.greaterOrEqual('md').value);
const [Form, formApi] = useVbenForm({
  commonConfig: {
    colon: true,
    formItemClass: 'col-span-2 md:col-span-1',
  },
  schema: useFormSchema(false),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 gap-x-4',
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
        ? updateSchoolTeacher(editingId.value, payload)
        : createSchoolTeacher(payload));
      message.success('保存成功');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const row = drawerApi.getData<SchoolTeacher>();
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
  editingId.value ? '编辑教师管理' : '新增教师管理',
);
</script>

<template>
  <Drawer class="w-full max-w-[800px]" :title="title">
    <Form class="mx-4" :layout="isHorizontal ? 'horizontal' : 'vertical'" />
  </Drawer>
</template>

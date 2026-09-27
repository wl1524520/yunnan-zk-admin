<script lang="ts" setup>
import type { ExamPlan } from '#/api/business/exam-plan';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { updateExamPlanDeadline } from '#/api/business/exam-plan';

import { usePostponeSchema } from '../data';

const emit = defineEmits(['success']);
const plan = ref<ExamPlan>();
const breakpoints = useBreakpoints(breakpointsTailwind);
const isHorizontal = computed(() => breakpoints.greaterOrEqual('md').value);
const [Form, formApi] = useVbenForm({
  commonConfig: {
    colon: true,
    formItemClass: 'col-span-2 md:col-span-1',
  },
  schema: usePostponeSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 gap-x-4',
});
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!plan.value) return;
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      await updateExamPlanDeadline(
        plan.value.id,
        new Date(String(values.ends_at)).toISOString(),
        String(values.reason),
      );
      message.success('截止时间已更新');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    plan.value = drawerApi.getData<ExamPlan>();
    await formApi.resetForm();
  },
});
</script>

<template>
  <Drawer class="w-full max-w-[520px]" title="调整截止时间">
    <Form class="mx-4" :layout="isHorizontal ? 'horizontal' : 'vertical'" />
  </Drawer>
</template>

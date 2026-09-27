<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { createExamPlan } from '#/api/business/exam-plan';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const schoolKeyword = ref('');
const breakpoints = useBreakpoints(breakpointsTailwind);
const isHorizontal = computed(() => breakpoints.greaterOrEqual('md').value);
const [Form, formApi] = useVbenForm({
  commonConfig: {
    colon: true,
    formItemClass: 'col-span-2 md:col-span-1',
  },
  schema: useFormSchema(schoolKeyword),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 gap-x-4',
});
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const schoolIds = Array.isArray(values.school_ids)
      ? values.school_ids.map(String)
      : [];
    if (schoolIds.length === 0) {
      message.error('请选择覆盖学校');
      return;
    }
    drawerApi.lock();
    try {
      await createExamPlan({
        academic_term_id: String(values.academic_term_id),
        school_ids: schoolIds,
        name: String(values.name),
        starts_at: new Date(String(values.starts_at)).toISOString(),
        ends_at: new Date(String(values.ends_at)).toISOString(),
        request_id: crypto.randomUUID(),
      });
      message.success('计划已创建');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (open) {
      schoolKeyword.value = '';
      await formApi.resetForm();
    }
  },
});
</script>

<template>
  <Drawer class="w-full max-w-[800px]" title="新建考试计划">
    <Form class="mx-4" :layout="isHorizontal ? 'horizontal' : 'vertical'" />
  </Drawer>
</template>

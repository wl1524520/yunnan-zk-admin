<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { createExamPlan } from '#/api/business/exam-plan';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const schoolKeyword = ref('');
const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(schoolKeyword),
  showDefaultActions: false,
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
  <Drawer title="新建考试计划"><Form /></Drawer>
</template>

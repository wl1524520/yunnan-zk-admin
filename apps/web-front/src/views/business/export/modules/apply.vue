<script lang="ts" setup>
import { computed } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { createExportJob } from '#/api/business/export';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const userStore = useUserStore();
// 后端无导出列表接口：本机 localStorage 只保存任务编号（每账号最多 30 条）。
const storageKey = computed(
  () => `yunnan-zk-exports:${userStore.userInfo?.userId || 'anonymous'}`,
);
const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      const job = await createExportJob(
        String(values.type) as 'scorebook' | 'statistics',
        String(values.academic_term_id),
      );
      localStorage.setItem(
        storageKey.value,
        JSON.stringify(
          [job.id, ...storedIds().filter((id) => id !== job.id)].slice(0, 30),
        ),
      );
      message.success('导出任务已受理，请稍后刷新状态');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    await formApi.resetForm();
  },
});

function storedIds(): string[] {
  try {
    return JSON.parse(
      localStorage.getItem(storageKey.value) || '[]',
    ) as string[];
  } catch {
    return [];
  }
}
</script>

<template>
  <Drawer class="w-full max-w-[520px]" title="申请导出">
    <Form class="mx-4" />
  </Drawer>
</template>

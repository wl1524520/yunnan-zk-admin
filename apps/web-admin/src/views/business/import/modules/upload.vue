<script lang="ts" setup>
import { computed, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { uploadImport } from '#/api/business/import';

import { resourceTypeOptions, useUploadSchema } from '../data';

const emit = defineEmits(['success']);

const userStore = useUserStore();
const isAdmin = computed(
  () =>
    userStore.userInfo?.roles?.some((role) =>
      ['admin', 'super'].includes(role),
    ) ?? false,
);
const resourceOptions = computed(() =>
  isAdmin.value
    ? resourceTypeOptions.filter((item) => item.value !== 'students')
    : resourceTypeOptions.filter((item) => item.value === 'students'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useUploadSchema(resourceOptions.value),
  showDefaultActions: false,
});
watch(resourceOptions, (options) => {
  formApi.setState({ schema: useUploadSchema(options) });
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const { file: fileList, resource_type } = await formApi.getValues();
    const file = (fileList as undefined | { originFileObj?: File }[])?.[0]
      ?.originFileObj;
    if (!file) {
      message.error('请选择导入文件');
      return;
    }
    drawerApi.lock();
    try {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        await file.arrayBuffer(),
      );
      const sha256 = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const data = new FormData();
      data.append('resource_type', String(resource_type));
      data.append('file', file);
      data.append('sha256', sha256);
      data.append('request_id', crypto.randomUUID());
      await uploadImport(data);
      message.success('文件已上传，请发起预览校验');
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
</script>

<template>
  <Drawer title="上传导入文件" confirm-text="上传文件">
    <p class="text-muted-foreground mb-3 text-sm">
      先上传文件，再校验预览；全部行通过后才能整批提交。
    </p>
    <Form />
  </Drawer>
</template>

<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const formSchema = computed(
  (): VbenFormSchema[] => [
    {
      component: 'VbenInput',
      componentProps: { placeholder: '请输入用户名或手机号' },
      fieldName: 'username_or_mobile',
      label: '用户名或手机号',
      rules: z.string().min(1, '请输入用户名或手机号'),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: '请输入密码' },
      fieldName: 'password',
      label: '密码',
      rules: z.string().min(1, '请输入密码'),
    },
  ],
);
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="authStore.authLogin"
  />
</template>

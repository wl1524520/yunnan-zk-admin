<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, markRaw, onMounted, useTemplateRef } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vben/common-ui';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const loginRef =
  useTemplateRef<InstanceType<typeof AuthenticationLogin>>('loginRef');
const rememberedAccountKey = `REMEMBER_ME_FRONT_ACCOUNT_${location.hostname}`;

const formSchema = computed((): VbenFormSchema[] => [
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
  {
    component: markRaw(SliderCaptcha),
    fieldName: 'captcha',
    rules: z.boolean().refine((value) => value, {
      message: '请完成滑块验证',
    }),
  },
  {
    component: 'VbenCheckbox',
    fieldName: 'remember_account',
    renderComponentContent: () => ({ default: () => '记住账号' }),
  },
]);

onMounted(() => {
  const account = localStorage.getItem(rememberedAccountKey);
  if (!account) return;

  const formApi = loginRef.value?.getFormApi();
  formApi?.setFieldValue('username_or_mobile', account);
  formApi?.setFieldValue('remember_account', true);
});

async function onSubmit(params: Recordable<any>) {
  try {
    await authStore.authLogin(params);
    if (params.remember_account) {
      localStorage.setItem(
        rememberedAccountKey,
        String(params.username_or_mobile),
      );
    } else {
      localStorage.removeItem(rememberedAccountKey);
    }
  } catch {
    const formApi = loginRef.value?.getFormApi();
    formApi?.setFieldValue('captcha', false, false);
    formApi
      ?.getFieldComponentRef<InstanceType<typeof SliderCaptcha>>('captcha')
      ?.resume();
  }
}
</script>

<template>
  <AuthenticationLogin
    ref="loginRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="false"
    :show-third-party-login="false"
    @submit="onSubmit"
  />
</template>

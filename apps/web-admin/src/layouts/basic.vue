<script lang="ts" setup>
import { computed } from 'vue';

import { BasicLayout, UserDropdown } from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';

const userStore = useUserStore();
const authStore = useAuthStore();
const avatar = computed(
  () => userStore.userInfo?.avatar || preferences.app.defaultAvatar,
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="authStore.logout(false)">
    <template #user-dropdown>
      <UserDropdown
        :avatar="avatar"
        :menus="[]"
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.username"
        @logout="authStore.logout(false)"
      />
    </template>
  </BasicLayout>
</template>

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
// 当前单位名称：教体局角色取 district，学校/教师角色取 school（两者互斥）
const unitName = computed(
  () => userStore.userInfo?.district?.name ?? userStore.userInfo?.school?.name,
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="authStore.logout(false)">
    <template #header-left-1>
      <p
        v-if="unitName"
        class="hidden px-2 font-bold whitespace-nowrap lg:block"
      >
        {{ unitName }}
      </p>
    </template>
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

<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { Manager } from '#/api/business/manager';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, Input, message, Modal } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getManagerList, resetManagerPassword } from '#/api/business/manager';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const canWrite = true;
const passwordOpen = ref(false);
const passwordTarget = ref<string>();
const newPassword = ref('');
const passwordSaving = ref(false);
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick, canWrite),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getManagerList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<Manager>,
});

function onActionClick({ code, row }: OnActionClickParams<Manager>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
  if (code === 'password') {
    passwordTarget.value = row.id;
    passwordOpen.value = true;
  }
}

async function savePassword() {
  if (!passwordTarget.value || !newPassword.value) return;
  passwordSaving.value = true;
  try {
    await resetManagerPassword(passwordTarget.value, newPassword.value);
    message.success('密码已重置');
    passwordOpen.value = false;
    newPassword.value = '';
  } finally {
    passwordSaving.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="业务账号">
      <template #toolbar-tools>
        <Button
          v-if="canWrite"
          type="primary"
          @click="formDrawerApi.setData({}).open()"
        >
          新增
        </Button>
      </template>
    </Grid>

    <Modal
      v-model:open="passwordOpen"
      title="重置业务账号密码"
      :confirm-loading="passwordSaving"
      @ok="savePassword"
    >
      <Input v-model:value="newPassword" type="password" />
    </Modal>
  </Page>
</template>

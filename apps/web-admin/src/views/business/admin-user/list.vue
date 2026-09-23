<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { AdminUser } from '#/api/business/admin-user';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAdminUserList } from '#/api/business/admin-user';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const canWrite = true;

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
          getAdminUserList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<AdminUser>,
});

function onActionClick({ code, row }: OnActionClickParams<AdminUser>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="平台账号">
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
  </Page>
</template>

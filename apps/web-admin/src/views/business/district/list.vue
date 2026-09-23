<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { District } from '#/api/business/district';

import { nextTick } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAllDistricts } from '#/api/business/district';

import { useColumns } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const districts = await getAllDistricts();
          gridApi.setGridOptions({
            treeConfig: {
              expandRowKeys: districts
                .filter((district) => district.level === 1)
                .map((district) => district.id),
              parentField: 'parent_id',
              rowField: 'id',
              transform: true,
            },
          });
          await nextTick();
          return districts;
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
    treeConfig: {
      parentField: 'parent_id',
      rowField: 'id',
      transform: true,
    },
  } as VxeTableGridOptions<District>,
});

function onActionClick({ code, row }: OnActionClickParams<District>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="地区管理" />
  </Page>
</template>

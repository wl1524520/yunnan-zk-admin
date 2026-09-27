<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { Device } from '#/api/business/device';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDeviceList } from '#/api/business/device';

import { useColumns } from './data';
import Binding from './modules/binding.vue';

const [BindingDrawer, bindingDrawerApi] = useVbenDrawer({
  connectedComponent: Binding,
  destroyOnClose: true,
});

function onActionClick({ code, row }: OnActionClickParams<Device>) {
  if (code === 'binding') bindingDrawerApi.setData(row).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) => getDeviceList(page.currentPage, page.pageSize),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<Device>,
});
</script>

<template>
  <Page auto-content-height>
    <BindingDrawer @success="gridApi.query()" />
    <Grid>
      <template #status="{ row }">
        <Tag>{{ row.status }}</Tag>
      </template>
      <template #teachers="{ row }">
        {{
          row.teacher_bindings
            ?.map((binding) => binding.school_teacher?.name)
            .filter(Boolean)
            .join('、') || '—'
        }}
      </template>
    </Grid>
  </Page>
</template>

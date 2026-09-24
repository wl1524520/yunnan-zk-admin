<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { School } from '#/api/business/school';

import { onMounted, reactive } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDistrictOptions } from '#/api/business/district';
import { getSchoolList } from '#/api/business/school';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const canWrite = true;
const lookupLabels = reactive<Record<string, string>>({});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick, canWrite, lookupLabels),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getSchoolList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<School>,
});

function onActionClick({ code, row }: OnActionClickParams<School>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
}

onMounted(async () => {
  for (const option of await getDistrictOptions())
    lookupLabels[String(option.value)] = option.label;
});
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="学校管理">
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

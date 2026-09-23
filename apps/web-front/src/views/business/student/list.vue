<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { Student } from '#/api/business/student';

import { onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSchoolClassOptions } from '#/api/business/school-class';
import { getStudentList } from '#/api/business/student';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const canWrite = useUserStore().userInfo?.roles?.includes('school') ?? false;
const lookupLabels = reactive<Record<string, string>>({});
const router = useRouter();
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(canWrite), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick, canWrite, lookupLabels),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getStudentList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<Student>,
});

function onActionClick({ code, row }: OnActionClickParams<Student>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
  if (code === 'detail') void router.push(`/students/${row.id}`);
}

onMounted(async () => {
  if (!canWrite) return;
  for (const option of await getSchoolClassOptions())
    lookupLabels[String(option.value)] = option.label;
});
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="学生档案">
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

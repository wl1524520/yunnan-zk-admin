<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ApprovalCase } from '#/api/business/approval';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getApprovalList } from '#/api/business/approval';

import { useColumns, useGridFormSchema } from './data';
import Detail from './modules/detail.vue';

const router = useRouter();
const role = computed(() => useUserStore().userInfo?.roles?.[0] || '');

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

function onActionClick({ code, row }: OnActionClickParams<ApprovalCase>) {
  if (code === 'detail') detailDrawerApi.setData(row).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getApprovalList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ApprovalCase>,
});
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer @success="gridApi.query()" />
    <Grid>
      <template #toolbar-tools>
        <Button
          v-if="role === 'school'"
          type="primary"
          @click="router.push('/approvals/new')"
        >
          发起申请
        </Button>
      </template>
      <template #school="{ row }">{{ row.school?.name || '—' }}</template>
      <template #status="{ row }">
        <Tag>{{ row.status }}</Tag>
      </template>
    </Grid>
  </Page>
</template>

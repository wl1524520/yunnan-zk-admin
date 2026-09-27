<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { PendingApprovalsResult } from '#/api/business/statistic';

import { Page } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStatistics } from '#/api/business/statistic';

import { useColumns } from './data';

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const response = await getStatistics<PendingApprovalsResult>(
            'pending-approvals',
            {},
          );
          const rows = response.items ?? [];
          return {
            items: rows.map((row) => ({
              ...row,
              __row_id: `${row.workflow_type}-${row.status}`,
            })),
            total: rows.length,
          };
        },
      },
    },
    rowConfig: { keyField: '__row_id' },
    toolbarConfig: { refresh: true, zoom: true },
  } as VxeTableGridOptions,
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col">
      <div class="min-h-0 flex-1">
        <Grid />
      </div>
    </div>
  </Page>
</template>

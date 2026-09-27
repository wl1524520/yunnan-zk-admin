<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AnomaliesResult } from '#/api/business/statistic';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStatistics } from '#/api/business/statistic';

import { applyCurrentTerm } from '../shared';
import { useColumns, useGridFormSchema } from './data';

const roles = useUserStore().userInfo?.roles ?? [];
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);
const schoolKeyword = ref('');

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(showSchoolFilter, schoolKeyword),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const values = formValues ?? {};
          // 学期必选，缺失时不发请求。
          if (!values.academic_term_id) {
            return { items: [], total: 0 };
          }
          const params = {
            ...values,
            academic_term_id: String(values.academic_term_id),
          };
          // 待锁定不接受 status；未选类型时只返回各类型数量，清单为空。
          if (!params.type || params.type === 'pending_lock') {
            delete params.status;
          }
          const response = await getStatistics<AnomaliesResult>('anomalies', {
            ...params,
            page: page.currentPage,
            per_page: page.pageSize,
          });
          const rows = response.items ?? [];
          // 未选类型时响应只有各类型数量（total 为数量合计），清单为空、分页总数取 0。
          return {
            items: rows.map((row, index) => ({
              ...row,
              __row_id: String(row.attempt_id ?? row.term_score?.id ?? index),
            })),
            total: response.meta?.total ?? rows.length,
          };
        },
      },
    },
    rowConfig: { keyField: '__row_id' },
    toolbarConfig: { refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions,
});

onMounted(() =>
  applyCurrentTerm((termId) =>
    gridApi.formApi.setValues({ academic_term_id: termId }),
  ),
);
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

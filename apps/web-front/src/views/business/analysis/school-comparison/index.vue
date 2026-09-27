<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ComparisonsResult } from '#/api/business/statistic';

import { onMounted } from 'vue';

import { Page } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStatistics } from '#/api/business/statistic';

import { applyCurrentTerm } from '../shared';
import { useColumns, useGridFormSchema } from './data';

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_page, formValues) => {
          const values = formValues ?? {};
          // 学期必选，缺失时不发请求。
          if (!values.academic_term_id) {
            return { items: [], total: 0 };
          }
          const response = await getStatistics<ComparisonsResult>(
            'comparisons',
            { ...values, academic_term_id: String(values.academic_term_id) },
          );
          // 地区汇总并入同一表格，以层级列区分。
          const rows = [
            ...response.items.map((row) => ({
              ...row,
              __row_id: `school-${row.school?.id}`,
              kind: 'school',
              name: row.school?.name ?? '—',
            })),
            ...(response.districts ?? []).map((row) => ({
              ...row,
              __row_id: `district-${row.district?.id}`,
              kind: 'district',
              name: row.district?.name ?? '—',
            })),
          ];
          return { items: rows, total: rows.length };
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

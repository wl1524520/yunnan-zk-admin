<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TotalScoresResult } from '#/api/business/statistic';

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
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_page, formValues) => {
          const values = formValues ?? {};
          // 学期与学年至少一项，都缺失时不发请求。
          if (!values.academic_term_id && !values.academic_year_id) {
            return { items: [], total: 0 };
          }
          const params = { ...values };
          if (params.academic_term_id) {
            params.academic_term_id = String(params.academic_term_id);
          }
          const response = await getStatistics<TotalScoresResult>(
            'total-scores',
            params,
          );
          const rows = response.distribution?.bands ?? [];
          return {
            items: rows.map((row) => ({ ...row, __row_id: row.key })),
            total: rows.length,
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

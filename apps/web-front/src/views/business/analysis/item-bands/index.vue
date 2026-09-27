<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ItemsResult } from '#/api/business/statistic';

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
          // 学期必选，缺失时不发请求。
          if (!values.academic_term_id) {
            return { items: [], total: 0 };
          }
          const response = await getStatistics<ItemsResult>('items', {
            ...values,
            academic_term_id: String(values.academic_term_id),
          });
          const rows = response.items ?? [];
          return {
            items: rows.map((row) => ({
              ...row,
              __row_id: row.item.exam_item_code,
            })),
            total: response.total ?? rows.length,
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

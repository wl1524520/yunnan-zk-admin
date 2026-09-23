<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { AcademicTerm, AcademicYear } from '#/api/business/academic-year';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, Input, message, Modal } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getAcademicYear,
  getAcademicYearList,
  updateAcademicTerm,
} from '#/api/business/academic-year';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const canWrite = true;
const termsOpen = ref(false);
const terms = ref<AcademicTerm[]>([]);
const termSaving = ref(false);
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick, canWrite),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getAcademicYearList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<AcademicYear>,
});

function onActionClick({ code, row }: OnActionClickParams<AcademicYear>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
  if (code === 'terms') void openTerms(row);
}

async function openTerms(row: AcademicYear) {
  const year = await getAcademicYear(row.id);
  terms.value = year.terms.map((term) => ({ ...term }));
  termsOpen.value = true;
}
async function saveTerm(term: AcademicTerm) {
  termSaving.value = true;
  try {
    await updateAcademicTerm(term.id, {
      starts_on: term.starts_on,
      ends_on: term.ends_on,
    });
    message.success('学期日期已更新');
    gridApi.query();
  } finally {
    termSaving.value = false;
  }
}
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline -->
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="学年与学期">
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

    <Modal
      v-model:open="termsOpen"
      title="学期日期"
      :footer="null"
      width="640px"
    >
      <div
        v-for="term in terms"
        :key="term.id"
        class="mb-4 flex flex-wrap items-end gap-3"
      >
        <strong>第 {{ term.term_no }} 学期</strong>
        <label
          >开始日期 <Input v-model:value="term.starts_on" type="date"
        /></label>
        <label
          >结束日期 <Input v-model:value="term.ends_on" type="date"
        /></label>
        <Button :loading="termSaving" type="primary" @click="saveTerm(term)">
          保存
        </Button>
      </div>
    </Modal>
  </Page>
</template>

<script lang="ts" setup>
// cspell:ignore unbanded
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { StatisticsResult } from '#/api/business/statistic';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, Statistic, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStatistics } from '#/api/business/statistic';

import { useFilterSchema, useItemColumns } from './data';

const userStore = useUserStore();
const isTeacher = computed(
  () => userStore.userInfo?.roles?.includes('teacher') ?? false,
);
const view = ref(isTeacher.value ? 'anomalies' : 'overview');
const academicTermId = ref('');
const grade = ref<number>();
const gender = ref<string>();
const anomalyType = ref<string>();
const result = ref<StatisticsResult>();
const loading = ref(false);
const showTable = computed(
  () =>
    Boolean(result.value?.items) &&
    (view.value !== 'anomalies' || Boolean(anomalyType.value)),
);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [],
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          if (view.value !== 'pending-approvals' && !academicTermId.value) {
            return { items: [], total: 0 };
          }
          const params: Record<string, unknown> =
            view.value === 'pending-approvals'
              ? {}
              : {
                  academic_term_id: academicTermId.value,
                  ...(grade.value ? { grade: grade.value } : {}),
                  ...(gender.value ? { gender: gender.value } : {}),
                };
          if (view.value === 'anomalies' && anomalyType.value) {
            params.type = anomalyType.value;
            params.page = page.currentPage;
            params.per_page = page.pageSize;
          }
          loading.value = true;
          try {
            const response = await getStatistics(view.value, params);
            result.value = response;
            const items = response.items ?? [];
            gridApi.setGridOptions({ columns: useItemColumns(items) });
            return {
              items: items.map((row, index) => ({
                ...row,
                __row_id: String(
                  row.id ?? row.exam_item_code ?? row.type ?? index,
                ),
              })),
              total: response.meta?.total ?? items.length,
            };
          } finally {
            loading.value = false;
          }
        },
      },
    },
    rowConfig: { keyField: '__row_id' },
    toolbarConfig: { refresh: false },
  } as VxeTableGridOptions<Record<string, unknown>>,
});
const [FilterForm, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFilterSchema(view.value, isTeacher.value, onFilterChange),
  showDefaultActions: false,
});

function onFilterChange(field: string, value: unknown) {
  switch (field) {
    case 'academic_term_id': {
      academicTermId.value = String(value ?? '');

      break;
    }
    case 'anomaly_type': {
      anomalyType.value = value ? String(value) : undefined;

      break;
    }
    case 'gender': {
      gender.value = value ? String(value) : undefined;

      break;
    }
    case 'grade': {
      grade.value = value === undefined ? undefined : Number(value);

      break;
    }
    case 'view': {
      view.value = String(value);
      result.value = undefined;
      formApi.setState({
        schema: useFilterSchema(view.value, isTeacher.value, onFilterChange),
      });

      break;
    }
    // No default
  }
}

function load() {
  if (view.value !== 'pending-approvals' && !academicTermId.value) return;
  gridApi.reload();
}

function display(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object' && !Array.isArray(value) && 'name' in value) {
    return String(value.name);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>

<template>
  <Page
    title="授权统计"
    description="按学生当前学校与班级计算；比率保留后端固定口径和分母。"
  >
    <!-- eslint-disable vue/html-closing-bracket-newline -->
    <Card class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <FilterForm />
        <Button type="primary" :loading="loading" @click="load">查询</Button>
      </div>
    </Card>

    <template v-if="result">
      <Alert
        class="mb-4"
        type="info"
        :message="`统计口径 ${result.caliber_version} · 生成时间 ${
          result.generated_at
        }`"
      />
      <template v-if="view === 'overview'">
        <div class="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <Statistic title="学生数" :value="result.students ?? 0" />
          </Card>
          <Card>
            <Statistic
              title="有应测项学生"
              :value="result.expected_students ?? 0"
            />
          </Card>
          <Card>
            <Statistic
              title="参与率"
              :value="result.participation?.rate ?? '—'"
            /><small
              >{{ result.participation?.count }} /
              {{ result.participation?.denominator }}</small
            >
          </Card>
          <Card>
            <Statistic
              title="完成率"
              :value="result.completion?.rate ?? '—'"
            /><small
              >{{ result.completion?.count }} /
              {{ result.completion?.denominator }}</small
            >
          </Card>
          <Card>
            <Statistic
              title="缺测率"
              :value="result.missing?.rate ?? '—'"
            /><small
              >{{ result.missing?.count }} /
              {{ result.missing?.denominator }}</small
            >
          </Card>
        </div>
        <Alert
          v-if="result.unavailable_indicators?.length"
          type="warning"
          message="合格率和优秀率的阈值尚未确认，平台不提供默认值。"
        />
      </template>
      <template v-else-if="view === 'anomalies'">
        <div class="mb-4 flex flex-wrap gap-2">
          <Tag v-for="count in result.counts" :key="count.type">
            {{ count.label }}：{{ count.count }}
          </Tag>
        </div>
      </template>
      <template v-else-if="view === 'total-scores' || view === 'items'">
        <Card v-if="result.distribution" class="mb-4">
          计入 {{ result.distribution.denominator }} 条 · 无法归一化
          {{ result.distribution.unbanded_count }} 条
          <div class="mt-3 flex flex-wrap gap-2">
            <Tag
              v-for="band in result.distribution.bands"
              :key="String(band.key)"
            >
              {{ display(band.label) }}：{{ display(band.count) }}
            </Tag>
          </div>
        </Card>
      </template>
      <Card v-else-if="view === 'pending-approvals'" class="mb-4">
        申请 {{ result.case_total }} 件，明细 {{ result.item_total }} 条
      </Card>
      <Card v-if="result.districts?.length" title="地区汇总" class="mt-4">
        <pre class="whitespace-pre-wrap text-sm">{{
          JSON.stringify(result.districts, null, 2)
        }}</pre>
      </Card>
    </template>
    <Grid v-show="showTable" />
  </Page>
</template>

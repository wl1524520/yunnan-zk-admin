<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  AnomaliesResult,
  ComparisonsResult,
  ItemsResult,
  OverviewResult,
  PendingApprovalsResult,
  StatisticView,
  TotalScoresResult,
} from '#/api/business/statistic';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Card, Segmented, Statistic } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import { getStatistics } from '#/api/business/statistic';

import { formatRate, useColumns, useGridFormSchema, viewOptions } from './data';

const roles = useUserStore().userInfo?.roles ?? [];
// 教师只能访问异常名单（其余视图后端 403）。
const isTeacher = roles.includes('teacher');
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);
const schoolKeyword = ref('');
const view = ref<StatisticView>(isTeacher ? 'anomalies' : 'overview');
const switcherOptions = isTeacher
  ? viewOptions.filter((option) => option.value === 'anomalies')
  : viewOptions;
const overview = ref<OverviewResult>();

// 仅异常名单分页，其余视图一次返回全量。
function pagerOf(current: StatisticView) {
  return current === 'anomalies' ? { pageSize: 20 } : { enabled: false };
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(view.value, showSchoolFilter, schoolKeyword),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(view.value),
    height: 'auto',
    pagerConfig: pagerOf(view.value),
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const current = view.value;
          const values = formValues ?? {};
          // 必填条件缺失时不发请求：概览/项目/对比/异常需学期，总分分布需学期或学年。
          if (
            current !== 'pending-approvals' &&
            current !== 'total-scores' &&
            !values.academic_term_id
          ) {
            return { items: [], total: 0 };
          }
          if (
            current === 'total-scores' &&
            !values.academic_term_id &&
            !values.academic_year_id
          ) {
            return { items: [], total: 0 };
          }
          const params = { ...values };
          if (params.academic_term_id) {
            params.academic_term_id = String(params.academic_term_id);
          }
          switch (current) {
            case 'anomalies': {
              // 待锁定不接受 status；未选类型时只返回各类型数量，清单为空。
              if (!params.type || params.type === 'pending_lock') {
                delete params.status;
              }
              const response = await getStatistics<AnomaliesResult>(
                'anomalies',
                { ...params, page: page.currentPage, per_page: page.pageSize },
              );
              const rows = response.items ?? [];
              // 未选类型时响应只有各类型数量（total 为数量合计），清单为空、分页总数取 0。
              return {
                items: rows.map((row, index) => ({
                  ...row,
                  __row_id: String(
                    row.attempt_id ?? row.term_score?.id ?? index,
                  ),
                })),
                total: response.meta?.total ?? rows.length,
              };
            }
            case 'comparisons': {
              const response = await getStatistics<ComparisonsResult>(
                'comparisons',
                params,
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
            }
            case 'items': {
              const response = await getStatistics<ItemsResult>(
                'items',
                params,
              );
              const rows = response.items ?? [];
              return {
                items: rows.map((row) => ({
                  ...row,
                  __row_id: row.item.exam_item_code,
                })),
                total: response.total ?? rows.length,
              };
            }
            case 'overview': {
              overview.value = await getStatistics<OverviewResult>(
                'overview',
                params,
              );
              return { items: [], total: 0 };
            }
            case 'pending-approvals': {
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
            }
            case 'total-scores': {
              const response = await getStatistics<TotalScoresResult>(
                'total-scores',
                params,
              );
              const rows = response.distribution?.bands ?? [];
              return {
                items: rows.map((row) => ({ ...row, __row_id: row.key })),
                total: rows.length,
              };
            }
          }
        },
      },
    },
    rowConfig: { keyField: '__row_id' },
    toolbarConfig: { refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions,
});

// 进入页面或切换视图时默认选中当前学期：以今天落在学期起止日期内判定。
async function applyCurrentTerm() {
  if (view.value === 'pending-approvals') return;
  const { items } = await getAcademicTermList();
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const current = items.find(
    (term) =>
      term.starts_on &&
      term.ends_on &&
      term.starts_on <= today &&
      today <= term.ends_on,
  );
  if (current)
    await gridApi.formApi.setValues({ academic_term_id: current.id });
}

async function onViewChange(value: StatisticView) {
  view.value = value;
  overview.value = undefined;
  gridApi.setGridOptions({
    columns: useColumns(value),
    pagerConfig: pagerOf(value),
  });
  gridApi.formApi.setState({
    schema: useGridFormSchema(value, showSchoolFilter, schoolKeyword),
  });
  await gridApi.formApi.resetForm();
  await applyCurrentTerm();
  await gridApi.query();
}

onMounted(applyCurrentTerm);
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col">
      <div class="mb-4">
        <Segmented
          :value="view"
          :options="switcherOptions"
          @change="(value) => onViewChange(value as StatisticView)"
        />
      </div>
      <div
        v-if="view === 'overview'"
        class="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
      >
        <Card>
          <Statistic title="学生数" :value="overview?.students ?? 0" />
        </Card>
        <Card>
          <Statistic
            title="有应测项学生"
            :value="overview?.expected_students ?? 0"
          />
        </Card>
        <Card>
          <Statistic
            title="参与率"
            :value="formatRate(overview?.participation?.rate)"
          />
          <small>
            {{ overview?.participation?.count ?? 0 }} /
            {{ overview?.participation?.denominator ?? 0 }}
          </small>
        </Card>
        <Card>
          <Statistic
            title="完成率"
            :value="formatRate(overview?.completion?.rate)"
          />
          <small>
            {{ overview?.completion?.count ?? 0 }} /
            {{ overview?.completion?.denominator ?? 0 }}
          </small>
        </Card>
        <Card>
          <Statistic
            title="缺测率"
            :value="formatRate(overview?.missing?.rate)"
          />
          <small>
            {{ overview?.missing?.count ?? 0 }} /
            {{ overview?.missing?.denominator ?? 0 }}
          </small>
        </Card>
      </div>
      <div class="min-h-0 flex-1">
        <Grid v-show="view !== 'overview'" />
      </div>
    </div>
  </Page>
</template>

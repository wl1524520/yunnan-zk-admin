<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ScoreRow } from '#/api/business/scorebook';

import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Tag, Tooltip } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import { getScorebook } from '#/api/business/scorebook';

import Detail from '../student/modules/detail.vue';
import { resolveItemBadges, useColumns, useGridFormSchema } from './data';

const roles = useUserStore().userInfo?.roles ?? [];
const route = useRoute();
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);
const showClassFilter = roles.includes('school');
const schoolKeyword = ref(
  typeof route.query.school_keyword === 'string'
    ? route.query.school_keyword
    : '',
);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

function onActionClick({ code, row }: OnActionClickParams<ScoreRow>) {
  if (code === 'detail') detailDrawerApi.setData(row.student).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(showSchoolFilter, showClassFilter, schoolKeyword),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          // 未选择学期时不发请求
          if (!formValues?.academic_term_id) {
            return { items: [], total: 0 };
          }
          return await getScorebook({
            ...formValues,
            academic_term_id: String(formValues?.academic_term_id),
            page: page.currentPage,
            per_page: page.pageSize,
          });
        },
      },
    },
    rowConfig: { keyField: 'student.id' },
    toolbarConfig: { refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ScoreRow>,
});

// 从概览进入时保留共同的筛选条件；直接进入时仍默认当前学期。
onMounted(async () => {
  const query = route.query;
  if (typeof query.academic_term_id === 'string') {
    const values: Record<string, number | string> = {
      academic_term_id: query.academic_term_id,
    };
    if (
      typeof query.grade === 'string' &&
      ['7', '8', '9'].includes(query.grade)
    ) {
      values.grade = Number(query.grade);
    }
    if (showSchoolFilter && typeof query.school_id === 'string') {
      values.school_id = query.school_id;
    }
    if (showClassFilter && typeof query.school_class_id === 'string') {
      values.school_class_id = query.school_class_id;
    }
    await gridApi.formApi.setValues(values);
    return;
  }

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
});
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer @success="gridApi.query()" />
    <Grid>
      <template #term_score="{ row }">
        <Tooltip v-if="!row.term_score" title="尚有项目未完成，成绩未生成">
          <span>—</span>
        </Tooltip>
        <template v-else>
          <span :class="{ 'opacity-60': row.term_score.status === 'draft' }">
            {{ row.term_score.score }}
          </span>
          <Tag v-if="row.term_score.status === 'draft'" class="ml-1">
            未锁定
          </Tag>
        </template>
      </template>
      <template #grade_score="{ row }">
        <Tooltip v-if="!row.grade_score" title="尚有项目未完成，成绩未生成">
          <span>—</span>
        </Tooltip>
        <span v-else>{{ row.grade_score.score }}</span>
      </template>
      <template #total_score="{ row }">
        <Tooltip v-if="!row.total_score" title="尚有项目未完成，成绩未生成">
          <span>—</span>
        </Tooltip>
        <span v-else>{{ row.total_score.score }}</span>
      </template>
      <template #items="{ row }">
        <div class="min-h-28 px-6 py-5">
          <div class="mb-3 text-sm font-medium">考试项目</div>
          <div v-if="row.items.length > 0" class="flex flex-wrap gap-3">
            <Tooltip
              v-for="badge in resolveItemBadges(row.items)"
              :key="badge.key"
              :title="badge.tip"
            >
              <Tag :color="badge.color" class="m-0 px-3 py-1">
                {{ badge.label }}
              </Tag>
            </Tooltip>
          </div>
          <span v-else class="text-muted-foreground text-sm">
            暂无考试项目
          </span>
        </div>
      </template>
    </Grid>
  </Page>
</template>

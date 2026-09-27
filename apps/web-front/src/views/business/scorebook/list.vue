<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ScoreRow } from '#/api/business/scorebook';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Tag, Tooltip } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import { getScorebook } from '#/api/business/scorebook';

import Detail from '../student/modules/detail.vue';
import { resolveItemBadges, useColumns, useGridFormSchema } from './data';

const roles = useUserStore().userInfo?.roles ?? [];
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);
const schoolKeyword = ref('');

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

function onActionClick({ code, row }: OnActionClickParams<ScoreRow>) {
  if (code === 'detail') detailDrawerApi.setData(row.student).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(showSchoolFilter, schoolKeyword),
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

// 进入页面默认选中当前学期：以今天落在学期起止日期内判定，找不到则由用户手选。
onMounted(async () => {
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
        <div v-if="row.items.length > 0" class="flex flex-wrap gap-2">
          <Tooltip
            v-for="badge in resolveItemBadges(row.items)"
            :key="badge.key"
            :title="badge.tip"
          >
            <Tag :color="badge.color">{{ badge.label }}</Tag>
          </Tooltip>
        </div>
        <span v-else>暂无考试项目</span>
      </template>
    </Grid>
  </Page>
</template>

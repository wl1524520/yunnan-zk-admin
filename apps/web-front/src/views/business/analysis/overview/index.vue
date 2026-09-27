<script lang="ts" setup>
import type { OverviewResult } from '#/api/business/statistic';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Statistic } from 'antdv-next';

import { getStatistics } from '#/api/business/statistic';

import { applyCurrentTerm, formatRate } from '../shared';

const overview = ref<OverviewResult>();

onMounted(() =>
  applyCurrentTerm(async (termId) => {
    overview.value = await getStatistics<OverviewResult>('overview', {
      academic_term_id: termId,
    });
  }),
);
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
    </div>
  </Page>
</template>

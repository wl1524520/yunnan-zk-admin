<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AcademicTerm } from '#/api/business/academic-term';
import type { BandRow, TotalScoresResult } from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, Select, Spin } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';
import { getStatistics } from '#/api/business/statistic';

import { useColumns } from './data';
import TotalScoreChart from './modules/total-score-chart.vue';

const roles = useUserStore().userInfo?.roles ?? [];
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);

const terms = ref<AcademicTerm[]>([]);
const yearId = ref<string>();
const grade = ref<number>();
const gender = ref<string>();
const schoolId = ref<string>();
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const result = ref<TotalScoresResult>();
const loadingYears = ref(false);
const loadingScores = ref(false);
const yearError = ref(false);
const scoresError = ref('');
let latestRequest = 0;
let latestSchoolSearch = 0;

const yearOptions = computed(() => {
  const years = new Map<string, string>();
  for (const term of terms.value) {
    if (term.academic_year) {
      years.set(term.academic_year.id, term.academic_year.code);
    }
  }
  return [...years.entries()]
    .map(([value, label]) => ({ label, value }))
    .toSorted((a, b) => b.label.localeCompare(a.label));
});
const selectedSchool = computed(() =>
  schoolOptions.value.find((school) => school.value === schoolId.value),
);
const hasYear = computed(() => Boolean(yearId.value));
const resultLabel = computed(() =>
  grade.value ? `${grade.value} 年级最终分` : '本学年各年级最终分',
);
const scopeNote = computed(() => {
  const year = yearOptions.value.find(
    (option) => option.value === yearId.value,
  )?.label;
  const score = grade.value
    ? `当前统计该学年 ${grade.value} 年级的最终年级成绩，按该年级满分归一化。`
    : '未选年级时合并该学年七至九年级已形成的最终年级成绩，每条按所属年级满分归一化；三年累计总分不计入。';
  return `${year ? `${year} 学年。` : ''}${score}`;
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    data: [],
    height: 'auto',
    pagerConfig: { enabled: false },
    rowConfig: { keyField: '__row_id' },
    toolbarConfig: { zoom: true },
  } as VxeTableGridOptions,
});
const [Drawer, drawerApi] = useVbenDrawer({ footer: false });

function clearScores() {
  result.value = undefined;
  gridApi.setGridOptions({ data: [] });
}

function scoreRange(band: BandRow, isLast: boolean): string {
  if (band.lower_score === undefined || band.upper_score === undefined) {
    return '按各自满分换算';
  }
  return isLast
    ? `≥${band.lower_score}`
    : `${band.lower_score}～<${band.upper_score}`;
}

async function loadScores() {
  const requestId = ++latestRequest;
  clearScores();
  scoresError.value = '';
  if (!hasYear.value) {
    loadingScores.value = false;
    return;
  }

  loadingScores.value = true;
  try {
    const response = await getStatistics<TotalScoresResult>('total-scores', {
      academic_year_id: yearId.value,
      ...(grade.value ? { grade: grade.value } : {}),
      ...(gender.value ? { gender: gender.value } : {}),
      ...(schoolId.value ? { school_id: schoolId.value } : {}),
    });
    if (requestId !== latestRequest) {
      return;
    }
    result.value = response;
    const denominator = response.distribution.denominator;
    const bands = response.distribution.bands;
    gridApi.setGridOptions({
      data: bands.map((band, index) => ({
        ...band,
        __row_id: band.key,
        score_range: scoreRange(band, index === bands.length - 1),
        share:
          denominator > 0
            ? `${((band.count / denominator) * 100).toFixed(1)}%`
            : '—',
      })),
    });
  } catch (error) {
    if (requestId === latestRequest) {
      const response = (error as { response?: { data?: { message?: string } } })
        ?.response?.data;
      scoresError.value = response?.message ?? '年级成绩分布加载失败';
    }
  } finally {
    if (requestId === latestRequest) {
      loadingScores.value = false;
    }
  }
}

async function loadYears() {
  loadingYears.value = true;
  yearError.value = false;
  try {
    const { items } = await getAcademicTermList();
    terms.value = items.toSorted((a, b) => {
      const yearOrder = (b.academic_year?.code ?? '').localeCompare(
        a.academic_year?.code ?? '',
      );
      return yearOrder || b.term_no - a.term_no;
    });
    const today = new Intl.DateTimeFormat('sv-SE', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
    }).format(new Date());
    yearId.value = items.find(
      (term) =>
        term.starts_on &&
        term.ends_on &&
        term.starts_on <= today &&
        today <= term.ends_on,
    )?.academic_year_id;
  } catch {
    yearError.value = true;
  } finally {
    loadingYears.value = false;
  }
}

async function loadSchools(keyword = '') {
  const searchId = ++latestSchoolSearch;
  try {
    const options = await getSchoolOptions(keyword);
    if (searchId !== latestSchoolSearch) {
      return;
    }
    const selected = selectedSchool.value;
    schoolOptions.value =
      selected && !options.some((option) => option.value === selected.value)
        ? [selected, ...options]
        : options;
  } catch {
    if (searchId === latestSchoolSearch && !schoolId.value) {
      schoolOptions.value = [];
    }
  }
}

watch([yearId, grade, gender, schoolId], () => void loadScores());

onMounted(() => {
  void loadYears();
  if (showSchoolFilter) {
    void loadSchools();
  }
});
</script>

<template>
  <Page
    title="年级成绩分布"
    description="按本学年最终年级成绩的得分率查看平台分析四档分布。"
  >
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-wrap items-center gap-4">
          <label class="flex w-full items-center gap-2 sm:w-auto">
            <span>学年</span>
            <Select
              v-model:value="yearId"
              allow-clear
              :loading="loadingYears"
              :options="yearOptions"
              class="w-full min-w-0 sm:w-44"
              placeholder="请选择学年"
            />
          </label>
          <label class="flex w-full items-center gap-2 sm:w-auto">
            <span>年级</span>
            <Select
              v-model:value="grade"
              allow-clear
              class="w-full min-w-0 sm:w-28"
              :options="
                [7, 8, 9].map((value) => ({ label: `${value} 年级`, value }))
              "
              placeholder="全部年级"
            />
          </label>
          <label class="flex w-full items-center gap-2 sm:w-auto">
            <span>性别</span>
            <Select
              v-model:value="gender"
              allow-clear
              class="w-full min-w-0 sm:w-28"
              :options="[
                { label: '男', value: 'male' },
                { label: '女', value: 'female' },
              ]"
              placeholder="全部性别"
            />
          </label>
          <label
            v-if="showSchoolFilter"
            class="flex w-full items-center gap-2 sm:w-auto"
          >
            <span>学校</span>
            <Select
              v-model:value="schoolId"
              allow-clear
              class="w-full min-w-0 sm:w-52"
              :filter-option="false"
              :options="schoolOptions"
              placeholder="搜索学校"
              show-search
              @search="loadSchools"
            />
          </label>
          <Button
            :disabled="!hasYear"
            :loading="loadingScores"
            @click="loadScores"
          >
            刷新
          </Button>
        </div>
      </Card>

      <Alert v-if="hasYear" show-icon type="info" :message="scopeNote" />
      <div v-if="yearError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="学年列表加载失败" />
        <Button size="small" @click="loadYears">重试</Button>
      </div>
      <Alert
        v-else-if="!loadingYears && !hasYear"
        show-icon
        type="info"
        message="当前日期没有对应学年，请选择学年。"
      />
      <div v-if="scoresError" class="flex items-center gap-2">
        <Alert show-icon type="error" :message="scoresError" />
        <Button size="small" @click="loadScores">重试</Button>
      </div>

      <Spin :spinning="loadingScores">
        <div v-if="loadingScores" class="min-h-40">
          <span class="sr-only">正在加载年级成绩分布</span>
        </div>
        <TotalScoreChart
          v-else-if="!scoresError && result"
          :bands="result.distribution.bands"
          :denominator="result.distribution.denominator"
          :result-label="resultLabel"
          @open-details="drawerApi.open()"
        />
      </Spin>
    </div>
    <Drawer class="w-full max-w-[820px]" title="分档明细">
      <p class="mb-4 text-sm text-muted-foreground">
        平台分析分档（非政策等级）；占比以本次计入人数为分母。不同年级或规则满分并存时，得分区间按各自满分换算。
      </p>
      <Grid />
    </Drawer>
  </Page>
</template>

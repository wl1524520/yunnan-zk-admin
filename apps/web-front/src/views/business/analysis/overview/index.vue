<script lang="ts" setup>
import type { AcademicTerm } from '#/api/business/academic-term';
import type { OverviewResult } from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, Select, Spin, Statistic } from 'antdv-next';

import { getAcademicTermList } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';
import { getSchoolClassOptions } from '#/api/business/school-class';
import { getStatistics } from '#/api/business/statistic';

import { formatRate } from '../shared';

const router = useRouter();
const roles = useUserStore().userInfo?.roles ?? [];
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);
const showClassFilter = roles.includes('school');
const isDevelopment = import.meta.env.DEV;

const terms = ref<AcademicTerm[]>([]);
const termId = ref<string>();
const grade = ref<number>();
const schoolId = ref<string>();
const schoolClassId = ref<string>();
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const classOptions = ref<{ label: string; value: string }[]>([]);
const overview = ref<OverviewResult>();
const loadingTerms = ref(false);
const loadingOverview = ref(false);
const termError = ref(false);
const overviewError = ref(false);
let latestRequest = 0;
let latestSchoolSearch = 0;

const termOptions = computed(() =>
  terms.value.map((term) => ({
    label: `${term.academic_year?.code ?? ''} 第 ${term.term_no} 学期`.trim(),
    value: term.id,
  })),
);
const selectedTerm = computed(() =>
  termOptions.value.find((term) => term.value === termId.value),
);
const selectedSchool = computed(() =>
  schoolOptions.value.find((school) => school.value === schoolId.value),
);
const rateMetrics = computed(() => {
  if (!overview.value) {
    return [];
  }
  return [
    { title: '参与率', ...overview.value.participation },
    { title: '完成率', ...overview.value.completion },
    { title: '缺测率', ...overview.value.missing },
  ];
});

async function loadTerms() {
  loadingTerms.value = true;
  termError.value = false;
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
    termId.value = items.find(
      (term) =>
        term.starts_on &&
        term.ends_on &&
        term.starts_on <= today &&
        today <= term.ends_on,
    )?.id;
  } catch {
    termError.value = true;
  } finally {
    loadingTerms.value = false;
  }
}

async function loadOverview() {
  const requestId = ++latestRequest;
  overview.value = undefined;
  overviewError.value = false;
  if (!termId.value) {
    loadingOverview.value = false;
    return;
  }

  loadingOverview.value = true;
  try {
    const result = await getStatistics<OverviewResult>('overview', {
      academic_term_id: termId.value,
      ...(grade.value ? { grade: grade.value } : {}),
      ...(schoolId.value ? { school_id: schoolId.value } : {}),
      ...(schoolClassId.value ? { school_class_id: schoolClassId.value } : {}),
    });
    if (requestId === latestRequest) {
      overview.value = result;
    }
  } catch {
    if (requestId === latestRequest) {
      overviewError.value = true;
    }
  } finally {
    if (requestId === latestRequest) {
      loadingOverview.value = false;
    }
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

async function loadClasses() {
  try {
    classOptions.value = await getSchoolClassOptions();
  } catch {
    classOptions.value = [];
  }
}

function openScorebook() {
  if (!termId.value) {
    return;
  }
  void router.push({
    name: 'Scorebook',
    query: {
      academic_term_id: termId.value,
      ...(grade.value ? { grade: String(grade.value) } : {}),
      ...(schoolId.value ? { school_id: schoolId.value } : {}),
      ...(schoolId.value && selectedSchool.value
        ? { school_keyword: selectedSchool.value.label.split(' ')[0] }
        : {}),
      ...(schoolClassId.value ? { school_class_id: schoolClassId.value } : {}),
    },
  });
}

watch([termId, grade, schoolId, schoolClassId], () => void loadOverview());

onMounted(() => {
  void loadTerms();
  if (showSchoolFilter) {
    void loadSchools();
  }
  if (showClassFilter) {
    void loadClasses();
  }
});
</script>

<template>
  <Page
    title="成绩概览"
    description="按学生当前学校和班级归属统计在籍且具备所选学年年级资料的学生。"
  >
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-wrap items-end gap-4">
          <label class="grid min-w-56 gap-1">
            <span>学期</span>
            <Select
              v-model:value="termId"
              :loading="loadingTerms"
              :options="termOptions"
              class="w-full"
              placeholder="请选择学期"
              show-search
              :filter-option="
                (input, option) => String(option?.label ?? '').includes(input)
              "
            />
          </label>
          <label class="grid min-w-32 gap-1">
            <span>年级</span>
            <Select
              v-model:value="grade"
              allow-clear
              class="w-full"
              :options="
                [7, 8, 9].map((value) => ({ label: `${value} 年级`, value }))
              "
              placeholder="全部年级"
            />
          </label>
          <label v-if="showSchoolFilter" class="grid min-w-56 gap-1">
            <span>学校</span>
            <Select
              v-model:value="schoolId"
              allow-clear
              class="w-full"
              :filter-option="false"
              :options="schoolOptions"
              placeholder="搜索学校"
              show-search
              @search="loadSchools"
            />
          </label>
          <label v-if="showClassFilter" class="grid min-w-48 gap-1">
            <span>班级</span>
            <Select
              v-model:value="schoolClassId"
              allow-clear
              class="w-full"
              :options="classOptions"
              placeholder="全部班级"
              show-search
              :filter-option="
                (input, option) => String(option?.label ?? '').includes(input)
              "
            />
          </label>
          <Button
            :disabled="!termId"
            :loading="loadingOverview"
            @click="loadOverview"
          >
            刷新
          </Button>
        </div>
      </Card>

      <div v-if="termError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="学期列表加载失败" />
        <Button size="small" @click="loadTerms">重试</Button>
      </div>
      <Alert
        v-else-if="!loadingTerms && !termId"
        show-icon
        type="info"
        message="当前日期没有对应学期，请先选择学期。"
      />
      <div v-if="overviewError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="概览加载失败" />
        <Button size="small" @click="loadOverview">重试</Button>
      </div>

      <Spin :spinning="loadingOverview">
        <div v-if="loadingOverview" class="min-h-40">
          <span class="sr-only">正在加载概览</span>
        </div>
        <template v-if="overview">
          <Alert
            v-if="overview.students === 0"
            class="mb-4"
            show-icon
            type="info"
            :message="`${selectedTerm?.label ?? '所选学期'}在当前筛选范围内没有符合统计口径的学生，可切换学期或调整筛选。`"
          />
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm text-muted-foreground">
              {{ selectedTerm?.label }} ·
              参与率以学生数为分母，完成率与缺测率以有应测项学生数为分母
            </span>
            <Button type="link" @click="openScorebook">查看成绩册 →</Button>
          </div>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card><Statistic title="学生数" :value="overview.students" /></Card>
            <Card>
              <Statistic
                title="有应测项学生"
                :value="overview.expected_students"
              />
            </Card>
            <Card v-for="metric in rateMetrics" :key="metric.title">
              <Statistic
                :title="metric.title"
                :value="formatRate(metric.rate)"
              />
              <small class="mt-2 block text-muted-foreground">
                {{ metric.count }} / {{ metric.denominator }}
              </small>
            </Card>
          </div>
          <div class="grid gap-2 pt-4">
            <Alert
              show-icon
              type="info"
              message="参与按有效测试认定或已生效特殊处置统计；完成按全部应测项的有效认定统计。已有成绩不一定代表这些认定齐全。"
            />
            <Alert
              v-if="isDevelopment && overview.students > 0"
              show-icon
              type="warning"
              message="开发演示数据中的部分成绩直接生成了结果，未生成对应原始测试认定，参与和完成统计可能低于已有成绩人数。"
            />
            <Alert
              v-if="overview.unavailable_indicators.length > 0"
              show-icon
              type="info"
              message="合格率和优秀率的判定规则尚未确认，暂不提供这两项指标。"
            />
          </div>
        </template>
      </Spin>
    </div>
  </Page>
</template>

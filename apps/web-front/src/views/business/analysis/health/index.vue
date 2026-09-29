<script lang="ts" setup>
import type {
  HealthMonitoringResult,
  HealthMonitoringRow,
} from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Segmented,
  Select,
  Spin,
  Statistic,
} from 'antdv-next';

import { getAcademicTermList } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';
import { getStatistics } from '#/api/business/statistic';

import { formatRate } from '../shared';
import HealthCharts from './modules/health-charts.vue';

const roles = useUserStore().userInfo?.roles ?? [];
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);

const yearOptions = ref<{ label: string; value: string }[]>([]);
const yearId = ref<string>();
const grade = ref<number>();
const gender = ref<string>();
const schoolId = ref<string>();
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const rows = ref<HealthMonitoringRow[]>([]);
const indicatorOptions = [
  { label: '身高体重指数', value: '10024' },
  { label: '肺活量体重指数', value: '10025' },
];
const indicatorCode = ref('10024');
const indicatorName = computed(
  () =>
    indicatorOptions.find((option) => option.value === indicatorCode.value)
      ?.label ?? '身高体重指数',
);
const indicatorFormula = computed(() =>
  indicatorCode.value === '10024'
    ? '身高体重指数（BMI）= 体重（千克）÷ 身高（米）的平方。'
    : '肺活量体重指数 = 肺活量（毫升）÷ 体重（千克）。',
);
const loadingYears = ref(false);
const loadingHealth = ref(false);
const yearError = ref(false);
const healthError = ref(false);
let latestRequest = 0;
let latestSchoolSearch = 0;

const [Drawer, drawerApi] = useVbenDrawer({ footer: false });
const visibleRows = computed(() =>
  rows.value.filter(
    (row) =>
      row.item.exam_item_code === indicatorCode.value &&
      (!grade.value || row.grade === grade.value),
  ),
);
const hasStudents = computed(() =>
  visibleRows.value.some((row) => row.students > 0),
);
const selectedSchool = computed(() =>
  schoolOptions.value.find((school) => school.value === schoolId.value),
);

async function loadYears() {
  loadingYears.value = true;
  yearError.value = false;
  try {
    const { items } = await getAcademicTermList();
    const years = new Map<
      string,
      { ends: string; label: string; starts: string }
    >();
    for (const term of items) {
      const year = term.academic_year;
      if (!year) continue;
      const existing = years.get(year.id);
      years.set(year.id, {
        label: year.code,
        starts:
          [existing?.starts, term.starts_on].filter(Boolean).toSorted()[0] ??
          '',
        ends:
          [existing?.ends, term.ends_on].filter(Boolean).toSorted().at(-1) ??
          '',
      });
    }
    yearOptions.value = [...years.entries()]
      .map(([value, year]) => ({ label: year.label, value }))
      .toSorted((a, b) => b.label.localeCompare(a.label));
    const today = new Intl.DateTimeFormat('sv-SE', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
    }).format(new Date());
    yearId.value = [...years.entries()].find(
      ([, year]) => year.starts <= today && today <= year.ends,
    )?.[0];
  } catch {
    yearError.value = true;
  } finally {
    loadingYears.value = false;
  }
}

async function loadHealth() {
  const requestId = ++latestRequest;
  rows.value = [];
  healthError.value = false;
  if (!yearId.value) {
    loadingHealth.value = false;
    return;
  }

  loadingHealth.value = true;
  try {
    const result = await getStatistics<HealthMonitoringResult>('health', {
      academic_year_id: yearId.value,
      ...(grade.value ? { grade: grade.value } : {}),
      ...(gender.value ? { gender: gender.value } : {}),
      ...(schoolId.value ? { school_id: schoolId.value } : {}),
    });
    if (requestId === latestRequest) rows.value = result.items;
  } catch {
    if (requestId === latestRequest) healthError.value = true;
  } finally {
    if (requestId === latestRequest) loadingHealth.value = false;
  }
}

async function loadSchools(keyword = '') {
  const searchId = ++latestSchoolSearch;
  try {
    const options = await getSchoolOptions(keyword);
    if (searchId !== latestSchoolSearch) return;
    const selected = selectedSchool.value;
    schoolOptions.value =
      selected && !options.some((option) => option.value === selected.value)
        ? [selected, ...options]
        : options;
  } catch {
    if (searchId === latestSchoolSearch && !schoolId.value)
      schoolOptions.value = [];
  }
}

watch([yearId, grade, gender, schoolId], () => void loadHealth());
onMounted(() => {
  void loadYears();
  if (showSchoolFilter) void loadSchools();
});
</script>

<template>
  <Page
    title="体质健康"
    description="按学年查看体质健康指数的监测覆盖、年级分布与同人变化。"
  >
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-wrap items-center gap-4">
          <label class="flex w-full items-center gap-2 sm:w-auto">
            <span>学年</span>
            <Select
              v-model:value="yearId"
              :loading="loadingYears"
              :options="yearOptions"
              class="w-full min-w-0 sm:w-52"
              placeholder="请选择学年"
              show-search
              :filter-option="
                (input, option) => String(option?.label ?? '').includes(input)
              "
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
            :disabled="!yearId"
            :loading="loadingHealth"
            @click="loadHealth"
          >
            刷新
          </Button>
        </div>
      </Card>

      <Card size="small">
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-medium">监测指标</span>
          <div class="w-full sm:w-auto">
            <Segmented
              v-model:value="indicatorCode"
              :options="indicatorOptions"
              block
            />
          </div>
        </div>
      </Card>

      <div v-if="yearError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="学年列表加载失败" />
        <Button size="small" @click="loadYears">重试</Button>
      </div>
      <Alert
        v-else-if="!loadingYears && !yearId"
        show-icon
        type="info"
        message="当前日期没有对应学年，请先选择学年。"
      />
      <div v-if="healthError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="体质健康统计加载失败" />
        <Button size="small" @click="loadHealth">重试</Button>
      </div>

      <Spin :spinning="loadingHealth">
        <div v-if="loadingHealth" class="min-h-40">
          <span class="sr-only">正在加载体质健康统计</span>
        </div>
        <div
          v-else-if="!healthError && yearId && hasStudents"
          class="flex flex-col gap-4"
        >
          <Card :title="`${indicatorName} · 监测覆盖`">
            <template #extra>
              <Button @click="drawerApi.open()">监测统计明细</Button>
            </template>
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="row in visibleRows"
                :key="`${row.grade}-${row.item.exam_item_code}`"
                class="rounded-md border p-4"
              >
                <div class="mb-3 font-medium">{{ row.grade }} 年级</div>
                <div class="grid grid-cols-3 gap-2">
                  <Statistic title="在籍" :value="row.students" />
                  <Statistic title="有效" :value="row.measured" />
                  <Statistic
                    title="覆盖率"
                    :value="formatRate(row.coverage_rate)"
                  />
                </div>
                <div class="mt-2 text-sm text-muted-foreground">
                  缺当前值 {{ row.missing_current }} 人 · 均值
                  {{ row.summary?.mean ?? '—' }}
                </div>
              </div>
            </div>
          </Card>
          <HealthCharts :indicator-name="indicatorName" :rows="visibleRows" />
          <Alert
            show-icon
            type="info"
            message="七年级指数仅作基线，不计分。各年级分布是不同学生群体；同人变化仅比较数值升降，不表示健康改善或退步。"
          />
          <Alert show-icon type="info" :message="indicatorFormula" />
        </div>
        <Card v-else-if="!healthError && yearId">
          <div class="py-12 text-center text-muted-foreground">
            当前筛选范围暂无在籍学生
          </div>
        </Card>
      </Spin>
    </div>

    <Drawer
      class="w-full max-w-[90%]"
      :title="`${indicatorName} · 监测统计明细`"
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-2">年级</th>
              <th class="p-2">在籍</th>
              <th class="p-2">有效</th>
              <th class="p-2">缺当前值</th>
              <th class="p-2">覆盖率</th>
              <th class="p-2">均值</th>
              <th class="p-2">最小 / Q1 / 中位 / Q3 / 最大</th>
              <th class="p-2">配对</th>
              <th class="p-2">上升 / 持平 / 下降</th>
              <th class="p-2">缺上年值</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="`${row.grade}-${row.item.exam_item_code}`"
              class="border-b"
            >
              <td class="p-2">{{ row.grade }} 年级</td>
              <td class="p-2">{{ row.students }}</td>
              <td class="p-2">{{ row.measured }}</td>
              <td class="p-2">{{ row.missing_current }}</td>
              <td class="p-2">{{ formatRate(row.coverage_rate) }}</td>
              <td class="p-2">{{ row.summary?.mean ?? '—' }}</td>
              <td class="p-2">
                {{
                  row.summary
                    ? [
                        row.summary.min,
                        row.summary.q1,
                        row.summary.median,
                        row.summary.q3,
                        row.summary.max,
                      ].join(' / ')
                    : '—'
                }}
              </td>
              <td class="p-2">{{ row.change?.paired ?? '—' }}</td>
              <td class="p-2">
                {{
                  row.change
                    ? [row.change.up, row.change.same, row.change.down].join(
                        ' / ',
                      )
                    : '—'
                }}
              </td>
              <td class="p-2">{{ row.change?.missing_prior ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Drawer>
  </Page>
</template>

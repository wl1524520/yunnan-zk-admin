<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AcademicTerm } from '#/api/business/academic-term';
import type {
  ClassComparisonsResult,
  ComparisonRow,
  ComparisonsResult,
  StatisticView,
} from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Alert, Button, Card, Select, Spin } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import { getComparisonSchoolOptions } from '#/api/business/school';
import { getStatistics } from '#/api/business/statistic';

import { formatRate } from '../shared';
import ComparisonChart from './modules/comparison-chart.vue';

const props = defineProps<{ mode: 'class' | 'school' }>();
type SortKey = 'completion_rate' | 'missing_rate' | 'participation_rate';

const pageTitle = computed(() =>
  props.mode === 'school' ? '校际对比' : '班级对比',
);
const groupName = computed(() => (props.mode === 'school' ? '学校' : '班级'));
const terms = ref<AcademicTerm[]>([]);
const termId = ref<string>();
const grade = ref<number>();
const gender = ref<string>();
const schoolIds = ref<string[]>([]);
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const result = ref<ClassComparisonsResult | ComparisonsResult>();
const sortKey = ref<SortKey>('completion_rate');
const loadingTerms = ref(false);
const loadingRows = ref(false);
const termError = ref(false);
const schoolOptionsError = ref(false);
const rowsError = ref('');
let latestRequest = 0;
let latestSchoolSearch = 0;

const termOptions = computed(() =>
  terms.value.map((term) => ({
    label: `${term.academic_year?.code ?? ''} 第 ${term.term_no} 学期`.trim(),
    value: term.id,
  })),
);
const sortedRows = computed(() => {
  const rows = result.value?.items ?? [];
  return rows.toSorted((left, right) => {
    const leftRate = left[sortKey.value];
    const rightRate = right[sortKey.value];
    if (leftRate === null || rightRate === null) {
      if (leftRate !== rightRate) {
        return leftRate === null ? 1 : -1;
      }
    } else {
      const difference = Number(leftRate) - Number(rightRate);
      if (difference !== 0) {
        return sortKey.value === 'missing_rate' ? difference : -difference;
      }
    }
    const leftCode = left.school?.code ?? left.school_class?.code ?? '';
    const rightCode = right.school?.code ?? right.school_class?.code ?? '';
    return leftCode.localeCompare(rightCode);
  });
});
const districtRows = computed(() =>
  result.value && 'districts' in result.value ? result.value.districts : [],
);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'name', minWidth: 200, title: '名称' },
      { field: 'students', title: '学生数', width: 100 },
      { field: 'expected_students', title: '应测学生', width: 100 },
      { field: 'participating_students', title: '参与人数', width: 100 },
      {
        field: 'participation_rate',
        formatter: ({ cellValue }) => formatRate(cellValue),
        title: '参与率',
        width: 110,
      },
      { field: 'completed_students', title: '完成人数', width: 100 },
      {
        field: 'completion_rate',
        formatter: ({ cellValue }) => formatRate(cellValue),
        title: '完成率',
        width: 110,
      },
      { field: 'missing_students', title: '缺测人数', width: 100 },
      {
        field: 'missing_rate',
        formatter: ({ cellValue }) => formatRate(cellValue),
        title: '缺测率',
        width: 110,
      },
    ],
    data: [],
    height: 'auto',
    pagerConfig: { enabled: false },
    rowConfig: { keyField: '__row_id' },
    toolbarConfig: { zoom: true },
  } as VxeTableGridOptions,
});
const [Drawer, drawerApi] = useVbenDrawer({ footer: false });

function nameOf(row: ComparisonRow): string {
  const group = props.mode === 'school' ? row.school : row.school_class;
  return group ? `${group.code} ${group.name}` : '—';
}

async function loadRows() {
  const requestId = ++latestRequest;
  result.value = undefined;
  rowsError.value = '';
  if (!termId.value) {
    loadingRows.value = false;
    return;
  }

  loadingRows.value = true;
  try {
    const view: StatisticView =
      props.mode === 'school' ? 'comparisons' : 'class-comparisons';
    const response = await getStatistics<
      ClassComparisonsResult | ComparisonsResult
    >(view, {
      academic_term_id: termId.value,
      ...(grade.value ? { grade: grade.value } : {}),
      ...(gender.value ? { gender: gender.value } : {}),
      ...(props.mode === 'school' && schoolIds.value.length > 0
        ? { school_ids: schoolIds.value }
        : {}),
    });
    if (requestId === latestRequest) {
      result.value = response;
    }
  } catch (error) {
    if (requestId === latestRequest) {
      rowsError.value =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? `${pageTitle.value}加载失败`;
    }
  } finally {
    if (requestId === latestRequest) {
      loadingRows.value = false;
    }
  }
}

async function loadTerms() {
  loadingTerms.value = true;
  termError.value = false;
  try {
    const { items } = await getAcademicTermList();
    terms.value = items.toSorted((left, right) => {
      const yearOrder = (right.academic_year?.code ?? '').localeCompare(
        left.academic_year?.code ?? '',
      );
      return yearOrder || right.term_no - left.term_no;
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

async function loadSchools(keyword = '') {
  const searchId = ++latestSchoolSearch;
  schoolOptionsError.value = false;
  try {
    const options = await getComparisonSchoolOptions(keyword);
    if (searchId !== latestSchoolSearch) {
      return;
    }
    const selected = schoolOptions.value.filter((option) =>
      schoolIds.value.includes(option.value),
    );
    schoolOptions.value = [
      ...selected,
      ...options.filter(
        (option) => !selected.some((item) => item.value === option.value),
      ),
    ];
  } catch {
    if (searchId === latestSchoolSearch) {
      schoolOptionsError.value = true;
    }
  }
}

watch(
  [termId, grade, gender, schoolIds, () => props.mode],
  () => void loadRows(),
);
watch(sortedRows, (rows) => {
  gridApi.setGridOptions({
    data: rows.map((row) => ({
      ...row,
      __row_id: row.school?.id ?? row.school_class?.id,
      name: nameOf(row),
    })),
  });
});

onMounted(() => {
  void loadTerms();
  if (props.mode === 'school') {
    void loadSchools();
  }
});
</script>

<template>
  <Page
    :title="pageTitle"
    :description="`按相同学期范围比较${groupName}的参与、完成与缺测情况。`"
  >
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-wrap items-center gap-4">
          <label class="flex w-full items-center gap-2 sm:w-auto">
            <span>学期</span>
            <Select
              v-model:value="termId"
              :loading="loadingTerms"
              :options="termOptions"
              class="w-full min-w-0 sm:w-52"
              placeholder="请选择学期"
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
            v-if="mode === 'school'"
            class="flex w-full items-center gap-2 sm:w-auto"
          >
            <span>学校</span>
            <Select
              v-model:value="schoolIds"
              allow-clear
              class="w-full min-w-0 sm:w-64"
              :filter-option="false"
              mode="multiple"
              :options="schoolOptions"
              placeholder="全部授权学校"
              show-search
              @search="loadSchools"
            />
          </label>
          <Button :disabled="!termId" :loading="loadingRows" @click="loadRows">
            刷新
          </Button>
        </div>
      </Card>

      <Alert
        show-icon
        type="info"
        message="参与率以在籍可测学生数为分母；完成率与缺测率以有应测项的学生数为分母。比例无分母时显示“—”。"
      />
      <Alert
        v-if="mode === 'class' && !grade"
        show-icon
        type="info"
        message="当前为全校跨年级班级对比；选择年级可比较同年级班级。"
      />
      <div v-if="termError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="学期列表加载失败" />
        <Button size="small" @click="loadTerms">重试</Button>
      </div>
      <Alert
        v-else-if="!loadingTerms && !termId"
        show-icon
        type="info"
        message="当前日期没有对应学期，请选择学期。"
      />
      <div v-if="schoolOptionsError" class="flex items-center gap-2">
        <Alert show-icon type="error" message="学校选项加载失败" />
        <Button size="small" @click="loadSchools()">重试</Button>
      </div>
      <div v-if="rowsError" class="flex items-center gap-2">
        <Alert show-icon type="error" :message="rowsError" />
        <Button size="small" @click="loadRows">重试</Button>
      </div>

      <Spin :spinning="loadingRows">
        <Card v-if="termId && !rowsError" :title="`${groupName}指标对比`">
          <template #extra>
            <div class="flex items-center gap-2">
              <Select
                v-model:value="sortKey"
                class="w-44"
                :options="[
                  { label: '完成率从高到低', value: 'completion_rate' },
                  { label: '参与率从高到低', value: 'participation_rate' },
                  { label: '缺测率从低到高', value: 'missing_rate' },
                ]"
              />
              <Button @click="drawerApi.open()">对比明细</Button>
            </div>
          </template>
          <ComparisonChart
            v-if="sortedRows.length > 0"
            :mode="mode"
            :rows="sortedRows"
          />
          <div
            v-else-if="!loadingRows"
            class="py-16 text-center text-muted-foreground"
          >
            当前筛选范围暂无可比较的{{ groupName }}数据
          </div>
          <div v-else class="min-h-40"></div>
        </Card>
      </Spin>

      <Card
        v-if="mode === 'school' && districtRows.length > 0 && !rowsError"
        title="地区汇总"
      >
        <p class="mb-4 text-sm text-muted-foreground">
          按当前学校筛选范围汇总，不与学校行混排。
        </p>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr>
                <th class="p-2">地区</th>
                <th class="p-2">学生数</th>
                <th class="p-2">应测学生</th>
                <th class="p-2">参与率</th>
                <th class="p-2">完成率</th>
                <th class="p-2">缺测率</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in districtRows"
                :key="row.district?.id"
                class="border-t"
              >
                <td class="p-2">{{ row.district?.name }}</td>
                <td class="p-2">{{ row.students }}</td>
                <td class="p-2">{{ row.expected_students }}</td>
                <td class="p-2">{{ formatRate(row.participation_rate) }}</td>
                <td class="p-2">{{ formatRate(row.completion_rate) }}</td>
                <td class="p-2">{{ formatRate(row.missing_rate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
    <Drawer class="w-full max-w-[90%]" title="对比明细"><Grid /></Drawer>
  </Page>
</template>

<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AcademicTerm } from '#/api/business/academic-term';
import type {
  ItemDistributionRow,
  ItemsResult,
} from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, Select, Spin } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAcademicTermList } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';
import { getStatistics } from '#/api/business/statistic';

import { useColumns } from './data';
import ItemBandCharts from './modules/item-band-charts.vue';

const props = defineProps<{ category: 'basic' | 'skill' }>();
const pageTitle = computed(() =>
  props.category === 'basic' ? '基础体能' : '专项技能',
);

const roles = useUserStore().userInfo?.roles ?? [];
const showSchoolFilter = roles.some((role) =>
  ['city', 'county', 'province'].includes(role),
);

const terms = ref<AcademicTerm[]>([]);
const termId = ref<string>();
const grade = ref<number>();
const gender = ref<string>();
const schoolId = ref<string>();
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const rows = ref<ItemDistributionRow[]>([]);
const selectedItemCode = ref<string>();
const loadingTerms = ref(false);
const loadingItems = ref(false);
const termError = ref(false);
const itemsError = ref(false);
let latestRequest = 0;
let latestSchoolSearch = 0;

const termOptions = computed(() =>
  terms.value.map((term) => ({
    label: `${term.academic_year?.code ?? ''} 第 ${term.term_no} 学期`.trim(),
    value: term.id,
  })),
);
const selectedSchool = computed(() =>
  schoolOptions.value.find((school) => school.value === schoolId.value),
);

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

function clearItems() {
  rows.value = [];
  selectedItemCode.value = undefined;
  gridApi.setGridOptions({ data: [] });
}

async function loadItems() {
  const requestId = ++latestRequest;
  clearItems();
  itemsError.value = false;
  if (!termId.value) {
    loadingItems.value = false;
    return;
  }

  loadingItems.value = true;
  try {
    const result = await getStatistics<ItemsResult>('items', {
      academic_term_id: termId.value,
      category: props.category,
      ...(grade.value ? { grade: grade.value } : {}),
      ...(gender.value ? { gender: gender.value } : {}),
      ...(schoolId.value ? { school_id: schoolId.value } : {}),
    });
    if (requestId !== latestRequest) {
      return;
    }
    rows.value = result.items ?? [];
    selectedItemCode.value = rows.value[0]?.item.exam_item_code;
    gridApi.setGridOptions({
      data: rows.value.map((row) => ({
        ...row,
        __row_id: row.item.exam_item_code,
      })),
    });
  } catch {
    if (requestId === latestRequest) {
      itemsError.value = true;
    }
  } finally {
    if (requestId === latestRequest) {
      loadingItems.value = false;
    }
  }
}

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

watch(
  [termId, grade, gender, schoolId, () => props.category],
  () => void loadItems(),
);

onMounted(() => {
  void loadTerms();
  if (showSchoolFilter) {
    void loadSchools();
  }
});
</script>

<template>
  <Page
    :title="pageTitle"
    description="平台分析分档（非政策等级）：按项目得分率划分不及格、及格、良好、优秀；不同项目的计入人数可能不同。"
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
            :disabled="!termId"
            :loading="loadingItems"
            @click="loadItems"
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
      <div v-if="itemsError" class="flex items-center gap-2">
        <Alert show-icon type="error" :message="`${pageTitle}分档加载失败`" />
        <Button size="small" @click="loadItems">重试</Button>
      </div>

      <Spin :spinning="loadingItems">
        <div v-if="loadingItems" class="min-h-40">
          <span class="sr-only">正在加载{{ pageTitle }}分档</span>
        </div>
        <ItemBandCharts
          v-if="!loadingItems && !itemsError && rows.length > 0"
          v-model:selected-item-code="selectedItemCode"
          :rows="rows"
          @open-details="drawerApi.open()"
        />
        <Card v-else-if="!loadingItems && !itemsError && termId">
          <div class="py-12 text-center text-muted-foreground">
            当前筛选范围暂无已计入的项目成绩
          </div>
        </Card>
      </Spin>
    </div>
    <Drawer class="w-full max-w-[90%]" title="分档明细">
      <Grid />
    </Drawer>
  </Page>
</template>

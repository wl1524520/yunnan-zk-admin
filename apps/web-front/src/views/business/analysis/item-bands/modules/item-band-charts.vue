<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { ItemDistributionRow } from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Button, Card, Select, Statistic, TabPane, Tabs } from 'antdv-next';

import { bandTitles, categoryLabels } from '../../shared';

const props = defineProps<{
  rows: ItemDistributionRow[];
  selectedItemCode?: string;
}>();
const emit = defineEmits<{
  openDetails: [];
  'update:selectedItemCode': [value: string];
}>();

const bandColors = ['#f97316', '#fbbf24', '#60a5fa', '#22c55e', '#6366f1'];
const activeTab = ref<'detail' | 'overview'>('overview');
const overviewRef = ref<EchartsUIType>();
const detailRef = ref<EchartsUIType>();
const { renderEcharts: renderOverview } = useEcharts(overviewRef);
const { renderEcharts: renderDetail } = useEcharts(detailRef);

const selectedRow = computed(() =>
  props.rows.find((row) => row.item.exam_item_code === props.selectedItemCode),
);
const selectedBandedCount = computed(() =>
  selectedRow.value ? bandedCount(selectedRow.value) : 0,
);
const lowBandCount = computed(() => selectedRow.value?.bands[0]?.count ?? 0);
const highBandCount = computed(() => selectedRow.value?.bands[4]?.count ?? 0);
const lowBandShare = computed(() =>
  share(lowBandCount.value, selectedBandedCount.value).toFixed(1),
);
const highBandShare = computed(() =>
  share(highBandCount.value, selectedBandedCount.value).toFixed(1),
);
const itemOptions = computed(() =>
  props.rows.map((row) => ({
    label: row.item.name,
    value: row.item.exam_item_code,
  })),
);
const overviewHeight = computed(() =>
  Math.max(360, props.rows.length * 60 + 90),
);

function bandedCount(row: ItemDistributionRow): number {
  return row.calculated_count - row.unbanded_count;
}

function share(count: number, denominator: number): number {
  return denominator > 0 ? (count / denominator) * 100 : 0;
}

function tooltipLine(label: string, count: number, denominator: number) {
  const line = document.createElement('div');
  line.textContent = `${label}：${count} 人（${share(count, denominator).toFixed(1)}%）`;
  return line;
}

function selectItem(value: unknown) {
  if (typeof value === 'string') {
    emit('update:selectedItemCode', value);
  }
}

async function drawOverview() {
  const chart = await renderOverview({
    animationDuration: 350,
    color: bandColors,
    grid: { bottom: 66, containLabel: false, left: 260, right: 24, top: 16 },
    legend: { bottom: 4, data: bandTitles, type: 'scroll' },
    series: bandTitles.map((title, bandIndex) => ({
      barMaxWidth: 24,
      data: props.rows.map((row) =>
        share(row.bands[bandIndex]?.count ?? 0, bandedCount(row)),
      ),
      emphasis: { focus: 'series' },
      name: title,
      stack: 'distribution',
      type: 'bar' as const,
    })),
    tooltip: {
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        const row = props.rows[first?.dataIndex ?? -1];
        if (!row) {
          return '';
        }
        const container = document.createElement('div');
        const heading = document.createElement('strong');
        heading.textContent = row.item.name;
        container.append(heading);
        const denominator = bandedCount(row);
        const summary = document.createElement('div');
        summary.textContent = `已计入 ${row.calculated_count} 人 · 已分档 ${denominator} 人 · 无法归一化 ${row.unbanded_count} 人`;
        container.append(summary);
        if (denominator === 0) {
          const empty = document.createElement('div');
          empty.textContent = '暂无可分档数据';
          container.append(empty);
        } else {
          row.bands.forEach((band, index) => {
            container.append(
              tooltipLine(
                bandTitles[index] ?? band.label,
                band.count,
                denominator,
              ),
            );
          });
        }
        return container;
      },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { formatter: '{value}%' },
      max: 100,
      min: 0,
      type: 'value',
    },
    yAxis: {
      axisLabel: {
        formatter: (code: string) => {
          const row = props.rows.find(
            (item) => item.item.exam_item_code === code,
          );
          if (!row) {
            return code;
          }
          const name =
            bandedCount(row) === 0
              ? `${row.item.name} · 暂无可分档数据`
              : row.item.name;
          return `${name}\n已计入 ${row.calculated_count} · 无法归一化 ${row.unbanded_count}`;
        },
        lineHeight: 16,
        overflow: 'truncate',
        width: 240,
      },
      data: props.rows.map((row) => row.item.exam_item_code),
      inverse: true,
      triggerEvent: true,
      type: 'category',
    },
  });
  chart?.off('click');
  chart?.on('click', (event) => {
    const row =
      event.componentType === 'yAxis'
        ? props.rows.find((item) => item.item.exam_item_code === event.value)
        : props.rows[event.dataIndex];
    if (row) {
      emit('update:selectedItemCode', row.item.exam_item_code);
      activeTab.value = 'detail';
    }
  });
}

function drawDetail() {
  const row = selectedRow.value;
  const denominator = selectedBandedCount.value;
  if (!row || denominator === 0) {
    return;
  }
  void renderDetail({
    animationDuration: 350,
    grid: { bottom: 30, left: 92, right: 110, top: 10 },
    series: [
      {
        barMaxWidth: 24,
        data: row.bands.map((band, index) => ({
          itemStyle: { color: bandColors[index] },
          label: {
            formatter: `${share(band.count, denominator).toFixed(1)}% · ${band.count} 人`,
            position: 'right' as const,
            show: true,
          },
          value: share(band.count, denominator),
        })),
        type: 'bar',
      },
    ],
    tooltip: {
      formatter: (params) => {
        const entry = Array.isArray(params) ? params[0] : params;
        const band = row.bands[entry?.dataIndex ?? -1];
        return band
          ? tooltipLine(
              bandTitles[entry?.dataIndex ?? -1] ?? band.label,
              band.count,
              denominator,
            )
          : '';
      },
      trigger: 'item',
    },
    xAxis: {
      axisLabel: { formatter: '{value}%' },
      max: 100,
      min: 0,
      type: 'value',
    },
    yAxis: {
      data: bandTitles,
      inverse: true,
      type: 'category',
    },
  });
}

onMounted(() => {
  void drawOverview();
});
watch(
  () => props.rows,
  () => {
    if (activeTab.value === 'overview') {
      void drawOverview();
    }
  },
  { flush: 'post' },
);
watch(
  () => props.selectedItemCode,
  () => {
    if (activeTab.value === 'detail') {
      drawDetail();
    }
  },
  { flush: 'post' },
);
watch(
  activeTab,
  (tab) => {
    if (tab === 'overview') {
      void drawOverview();
    } else {
      drawDetail();
    }
  },
  { flush: 'post' },
);
</script>

<template>
  <Card title="项目分档">
    <template #extra>
      <Button @click="emit('openDetails')">分档明细</Button>
    </template>
    <Tabs v-model:active-key="activeTab" destroy-on-hidden>
      <TabPane key="overview" tab="各项目五档占比">
        <p class="mb-3 text-sm text-muted-foreground">
          每条以该项目已分档人数为
          100%；悬停可查看五档人数，点击项目可查看详情。
        </p>
        <div class="overflow-x-auto md:overflow-visible">
          <EchartsUI
            ref="overviewRef"
            :height="`${overviewHeight}px`"
            aria-label="各项目五档得分率占比图"
            class="min-w-[640px] md:min-w-0"
            role="img"
          />
        </div>
      </TabPane>

      <TabPane key="detail" tab="项目分档详情">
        <div class="flex flex-col gap-4">
          <label class="grid gap-1">
            <span>考试项目</span>
            <Select
              :options="itemOptions"
              :value="selectedItemCode"
              show-search
              :filter-option="
                (input, option) => String(option?.label ?? '').includes(input)
              "
              @update:value="selectItem"
            />
          </label>
          <template v-if="selectedRow">
            <div class="grid grid-cols-3 gap-3">
              <Statistic title="已计入" :value="selectedRow.calculated_count" />
              <Statistic title="已分档" :value="selectedBandedCount" />
              <Statistic
                title="无法归一化"
                :value="selectedRow.unbanded_count"
              />
            </div>
            <div v-if="selectedBandedCount > 0" class="grid grid-cols-2 gap-3">
              <div
                class="rounded-md border-l-4 border-orange-500 bg-orange-50 p-3 dark:bg-orange-950/30"
              >
                <div class="text-sm">不足 20%</div>
                <div class="text-lg font-semibold">{{ lowBandShare }}%</div>
                <div class="text-sm text-muted-foreground">
                  {{ lowBandCount }} 人
                </div>
              </div>
              <div
                class="rounded-md border-l-4 border-indigo-500 bg-indigo-50 p-3 dark:bg-indigo-950/30"
              >
                <div class="text-sm">80%～100%</div>
                <div class="text-lg font-semibold">{{ highBandShare }}%</div>
                <div class="text-sm text-muted-foreground">
                  {{ highBandCount }} 人
                </div>
              </div>
            </div>
            <p class="text-sm text-muted-foreground">
              {{
                categoryLabels[selectedRow.item.category] ??
                selectedRow.item.category
              }}
              · 五档按项目得分率划分；无法归一化的记录不参与占比计算。
            </p>
            <EchartsUI
              v-if="selectedBandedCount > 0"
              ref="detailRef"
              height="320px"
              :aria-label="`${selectedRow.item.name}五档人数和占比图`"
              role="img"
            />
            <div
              v-else
              class="flex h-[320px] items-center justify-center text-muted-foreground"
            >
              暂无可分档数据
            </div>
          </template>
        </div>
      </TabPane>
    </Tabs>
  </Card>
</template>

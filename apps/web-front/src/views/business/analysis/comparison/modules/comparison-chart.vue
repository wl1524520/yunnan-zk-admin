<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { ComparisonRow } from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const props = defineProps<{
  mode: 'class' | 'school';
  rows: ComparisonRow[];
}>();

const metrics = [
  {
    color: '#3b82f6',
    count: 'participating_students',
    label: '参与率',
    rate: 'participation_rate',
    total: 'students',
  },
  {
    color: '#16a34a',
    count: 'completed_students',
    label: '完成率',
    rate: 'completion_rate',
    total: 'expected_students',
  },
  {
    color: '#ef4444',
    count: 'missing_students',
    label: '缺测率',
    rate: 'missing_rate',
    total: 'expected_students',
  },
] as const;

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const height = computed(
  () => `${Math.max(340, props.rows.length * 92 + 80)}px`,
);

function nameOf(row: ComparisonRow): string {
  const group = props.mode === 'school' ? row.school : row.school_class;
  return group ? `${group.code} ${group.name}` : '—';
}

function percent(rate: null | string): string {
  return rate === null ? '—' : `${(Number(rate) * 100).toFixed(2)}%`;
}

function tooltip(row: ComparisonRow): HTMLDivElement {
  const content = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = nameOf(row);
  content.append(heading);
  for (const metric of metrics) {
    const line = document.createElement('div');
    line.textContent = `${metric.label}：${row[metric.count]} / ${row[metric.total]} 人（${percent(row[metric.rate])}）`;
    content.append(line);
  }
  return content;
}

function drawChart() {
  if (props.rows.length === 0) {
    return;
  }

  void renderEcharts({
    animationDuration: 300,
    grid: { bottom: 40, left: 210, right: 72, top: 45 },
    legend: { data: metrics.map((metric) => metric.label), top: 4 },
    series: metrics.map((metric) => ({
      barMaxWidth: 16,
      data: props.rows.map((row) =>
        row[metric.rate] === null ? null : Number(row[metric.rate]) * 100,
      ),
      itemStyle: { color: metric.color },
      label: {
        formatter: (params: { dataIndex: number }) =>
          percent(props.rows[params.dataIndex]?.[metric.rate] ?? null),
        position: 'right' as const,
        show: true,
      },
      name: metric.label,
      type: 'bar' as const,
    })),
    tooltip: {
      formatter: (params) => {
        const entries = Array.isArray(params) ? params : [params];
        const row = props.rows[entries[0]?.dataIndex ?? -1];
        return row ? tooltip(row) : '';
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
      axisLabel: { overflow: 'truncate', width: 185 },
      data: props.rows.map((row) => nameOf(row)),
      inverse: true,
      type: 'category',
    },
  });
}

onMounted(drawChart);
watch(() => [props.rows, props.mode], drawChart, { flush: 'post' });
</script>

<template>
  <div class="overflow-x-auto md:overflow-visible">
    <EchartsUI
      ref="chartRef"
      :height="height"
      :aria-label="`${mode === 'school' ? '学校' : '班级'}参与率、完成率和缺测率对比图`"
      class="min-w-[760px] md:min-w-0"
      role="img"
    />
  </div>
</template>

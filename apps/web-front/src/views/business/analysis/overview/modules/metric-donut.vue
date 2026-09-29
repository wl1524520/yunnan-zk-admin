<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { Metric } from '#/api/business/statistic';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card } from 'antdv-next';

import { formatRate } from '../../shared';

const props = defineProps<{
  firstLabel: string;
  metric: Metric;
  secondLabel: string;
  title: string;
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function renderChart() {
  if (props.metric.denominator === 0) {
    return;
  }

  void renderEcharts({
    color: ['#1677ff', '#faad14'],
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        data: [
          { name: props.firstLabel, value: props.metric.count },
          {
            name: props.secondLabel,
            value: props.metric.denominator - props.metric.count,
          },
        ],
        label: { show: false },
        radius: ['55%', '75%'],
        type: 'pie',
      },
    ],
    tooltip: { formatter: '{b}：{c} 人（{d}%）', trigger: 'item' },
  });
}

onMounted(renderChart);
watch(
  () => [
    props.metric.count,
    props.metric.denominator,
    props.firstLabel,
    props.secondLabel,
  ],
  renderChart,
  { flush: 'post' },
);
</script>

<template>
  <Card :title="title">
    <template v-if="metric.denominator > 0">
      <EchartsUI ref="chartRef" height="260px" />
      <p class="text-center text-sm text-muted-foreground">
        {{ firstLabel }} {{ metric.count }} 人，占比
        {{ formatRate(metric.rate) }}； {{ secondLabel }}
        {{ metric.denominator - metric.count }} 人。
      </p>
    </template>
    <div
      v-else
      class="flex h-[260px] items-center justify-center text-muted-foreground"
    >
      暂无可统计数据
    </div>
  </Card>
</template>

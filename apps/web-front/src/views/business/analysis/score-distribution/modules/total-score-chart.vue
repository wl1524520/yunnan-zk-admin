<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { BandRow } from '#/api/business/statistic';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Button, Card, Statistic } from 'antdv-next';

const props = defineProps<{
  bands: BandRow[];
  denominator: number;
  resultLabel: string;
}>();
const emit = defineEmits<{ openDetails: [] }>();

const bandColors = ['#ef4444', '#f59e0b', '#3b82f6', '#16a34a'];
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function share(count: number): number {
  return props.denominator > 0 ? (count / props.denominator) * 100 : 0;
}

function tooltipLine(band: BandRow): HTMLDivElement {
  const line = document.createElement('div');
  line.textContent = `${band.label}：${band.count} 人（${share(band.count).toFixed(1)}%）`;
  return line;
}

function drawChart() {
  if (props.denominator === 0) {
    return;
  }

  void renderEcharts({
    animationDuration: 350,
    grid: { bottom: 30, left: 180, right: 110, top: 12 },
    series: [
      {
        barMaxWidth: 28,
        data: props.bands.map((band, index) => ({
          itemStyle: { color: bandColors[index] },
          label: {
            formatter: `${share(band.count).toFixed(1)}% · ${band.count} 人`,
            position: 'right' as const,
            show: true,
          },
          value: share(band.count),
        })),
        type: 'bar',
      },
    ],
    tooltip: {
      formatter: (params) => {
        const entry = Array.isArray(params) ? params[0] : params;
        const band = props.bands[entry?.dataIndex ?? -1];
        return band ? tooltipLine(band) : '';
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
      data: props.bands.map((band) => band.label),
      inverse: true,
      type: 'category',
    },
  });
}

onMounted(drawChart);
watch(() => [props.bands, props.denominator], drawChart, { flush: 'post' });
</script>

<template>
  <Card :title="`${resultLabel}四档分布`">
    <template #extra>
      <Button @click="emit('openDetails')">分档明细</Button>
    </template>
    <div class="flex flex-col gap-4">
      <Statistic title="计入人数" :value="denominator" />
      <p class="text-sm text-muted-foreground">
        平台分析分档（非政策等级）：按每条成绩与其对应满分的得分率划分，占比以计入人数为分母。
      </p>
      <div v-if="denominator > 0" class="overflow-x-auto md:overflow-visible">
        <EchartsUI
          ref="chartRef"
          height="340px"
          :aria-label="`${resultLabel}四档人数和占比图`"
          class="min-w-[620px] md:min-w-0"
          role="img"
        />
      </div>
      <div
        v-else
        class="flex h-64 items-center justify-center text-muted-foreground"
      >
        暂无可统计年级成绩
      </div>
    </div>
  </Card>
</template>

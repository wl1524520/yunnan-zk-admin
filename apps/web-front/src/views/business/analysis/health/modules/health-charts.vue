<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { HealthMonitoringRow } from '#/api/business/statistic';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card } from 'antdv-next';

import HealthBoxPlot from './health-boxplot.vue';

const props = defineProps<{ rows: HealthMonitoringRow[] }>();
type ChangeRow = HealthMonitoringRow & {
  change: NonNullable<HealthMonitoringRow['change']>;
};

const changeRef = ref<EchartsUIType>();
const { renderEcharts: renderChange } = useEcharts(changeRef);

const bmiRows = computed(() =>
  props.rows.filter((row) => row.item.exam_item_code === '10024'),
);
const vitalRows = computed(() =>
  props.rows.filter((row) => row.item.exam_item_code === '10025'),
);
const changeRows = computed(() =>
  props.rows.filter((row): row is ChangeRow => row.change !== null),
);

function drawChanges() {
  if (changeRows.value.length === 0) return;
  const colors = ['#3b82f6', '#94a3b8', '#f97316'];
  const keys = ['up', 'same', 'down'] as const;
  const labels = ['上升', '持平', '下降'];
  void renderChange({
    animationDuration: 350,
    color: colors,
    grid: { bottom: 45, left: 180, right: 30, top: 20 },
    legend: { bottom: 0, data: labels },
    series: keys.map((key, index) => ({
      data: changeRows.value.map((row) =>
        row.change.paired > 0 ? (row.change[key] / row.change.paired) * 100 : 0,
      ),
      name: labels[index],
      stack: 'change',
      type: 'bar' as const,
    })),
    tooltip: {
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        const row = changeRows.value[first?.dataIndex ?? -1];
        const change = row?.change;
        if (!row || !change) return '';
        const element = document.createElement('div');
        element.textContent = `${row.grade} 年级 · ${row.item.name}｜配对 ${change.paired} 人｜上升 ${change.up} 人｜持平 ${change.same} 人｜下降 ${change.down} 人｜缺上年值 ${change.missing_prior} 人`;
        return element;
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
      data: changeRows.value.map(
        (row) =>
          `${row.grade} 年级 · ${row.item.name}${row.change.paired === 0 ? ' · 无配对数据' : ''}`,
      ),
      inverse: true,
      type: 'category',
    },
  });
}

function draw() {
  drawChanges();
}

onMounted(draw);
watch(() => props.rows, draw, { flush: 'post' });
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-4 xl:grid-cols-2">
      <Card title="BMI 年级分布">
        <p class="mb-3 text-sm text-muted-foreground">
          箱体为四分位区间，横线为中位数，橙点为均值。
        </p>
        <HealthBoxPlot :rows="bmiRows" title="各年级 BMI 箱线图及均值" />
      </Card>
      <Card title="肺活量体重指数年级分布">
        <p class="mb-3 text-sm text-muted-foreground">
          各年级为不同学生群体，不能解释为同一学生的变化。
        </p>
        <HealthBoxPlot
          :rows="vitalRows"
          title="各年级肺活量体重指数箱线图及均值"
        />
      </Card>
    </div>
    <Card v-if="changeRows.length > 0" title="同一学生较上一年指数变化">
      <p class="mb-3 text-sm text-muted-foreground">
        每条以本年和上年都有有效指数的学生为
        100%；按两位小数比较数值升降，不代表健康改善或退步。
      </p>
      <EchartsUI
        v-if="changeRows.some((row) => row.change?.paired)"
        ref="changeRef"
        :height="`${Math.max(300, changeRows.length * 62 + 85)}px`"
        aria-label="八、九年级同人指数升降占比图"
        role="img"
      />
      <div v-else class="py-12 text-center text-muted-foreground">
        暂无可配对的监测结果
      </div>
    </Card>
  </div>
</template>

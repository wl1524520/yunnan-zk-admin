<script lang="ts" setup>
import type { HealthMonitoringRow } from '#/api/business/statistic';

import { computed } from 'vue';

const props = defineProps<{ rows: HealthMonitoringRow[]; title: string }>();
type MeasuredRow = HealthMonitoringRow & {
  summary: NonNullable<HealthMonitoringRow['summary']>;
};

const measuredRows = computed(() =>
  props.rows.filter((row): row is MeasuredRow => row.summary !== null),
);
const bounds = computed(() => {
  const values = measuredRows.value.flatMap((row) => [
    Number(row.summary.min),
    Number(row.summary.max),
  ]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.1, 0.5);
  return { min: min - padding, max: max + padding };
});
const ticks = computed(() =>
  Array.from(
    { length: 5 },
    (_, index) =>
      bounds.value.min + ((bounds.value.max - bounds.value.min) * index) / 4,
  ),
);

function y(value: number | string): number {
  return (
    245 -
    ((Number(value) - bounds.value.min) /
      (bounds.value.max - bounds.value.min)) *
      190
  );
}

function x(index: number): number {
  return measuredRows.value.length === 1
    ? 335
    : 145 + index * (390 / (measuredRows.value.length - 1));
}

function description(row: MeasuredRow): string {
  const summary = row.summary;
  return `${row.grade} 年级，有效 ${row.measured} 人，均值 ${summary.mean}，最小 ${summary.min}，下四分位 ${summary.q1}，中位 ${summary.median}，上四分位 ${summary.q3}，最大 ${summary.max}`;
}
</script>

<template>
  <svg
    v-if="measuredRows.length > 0"
    :aria-label="title"
    class="h-auto w-full"
    role="img"
    viewBox="0 0 680 315"
  >
    <g v-for="tick in ticks" :key="tick">
      <line
        x1="70"
        x2="600"
        :y1="y(tick)"
        :y2="y(tick)"
        stroke="#cbd5e1"
        stroke-dasharray="3 4"
      />
      <text
        x="62"
        :y="y(tick) + 4"
        text-anchor="end"
        class="fill-current text-xs"
      >
        {{ tick.toFixed(2) }}
      </text>
    </g>
    <g v-for="(row, index) in measuredRows" :key="row.grade">
      <title>{{ description(row) }}</title>
      <line
        :x1="x(index)"
        :x2="x(index)"
        :y1="y(row.summary.max)"
        :y2="y(row.summary.min)"
        stroke="#2563eb"
        stroke-width="2"
      />
      <line
        :x1="x(index) - 18"
        :x2="x(index) + 18"
        :y1="y(row.summary.max)"
        :y2="y(row.summary.max)"
        stroke="#2563eb"
        stroke-width="2"
      />
      <line
        :x1="x(index) - 18"
        :x2="x(index) + 18"
        :y1="y(row.summary.min)"
        :y2="y(row.summary.min)"
        stroke="#2563eb"
        stroke-width="2"
      />
      <rect
        :x="x(index) - 30"
        :y="y(row.summary.q3)"
        width="60"
        :height="Math.max(1, y(row.summary.q1) - y(row.summary.q3))"
        fill="#bfdbfe"
        stroke="#2563eb"
        stroke-width="2"
      />
      <line
        :x1="x(index) - 30"
        :x2="x(index) + 30"
        :y1="y(row.summary.median)"
        :y2="y(row.summary.median)"
        stroke="#1d4ed8"
        stroke-width="3"
      />
      <circle :cx="x(index)" :cy="y(row.summary.mean)" r="6" fill="#f97316" />
      <text
        :x="x(index)"
        y="274"
        text-anchor="middle"
        class="fill-current text-sm"
      >
        {{ row.grade }} 年级
      </text>
      <text
        :x="x(index)"
        y="297"
        text-anchor="middle"
        class="fill-current text-xs"
      >
        有效 {{ row.measured }} 人 · 均值 {{ row.summary.mean }}
      </text>
    </g>
  </svg>
  <div v-else class="py-12 text-center text-muted-foreground">
    暂无有效监测结果
  </div>
</template>

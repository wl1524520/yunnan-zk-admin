<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, Space, Switch, Table, Tag } from 'antdv-next';

import { requestClient } from '#/api/request';

interface RosterItem {
  exam_item_code: string;
  item_name: string;
  completed: boolean;
  missing_reason?: string;
}
interface RosterRow {
  student_id: string;
  student_no: string;
  name: string;
  school_class?: { code: string; name: string };
  grade: number;
  status: string;
  expected_item_count: number;
  completed_item_count: number;
  items: RosterItem[];
}
interface PageResult { items: RosterRow[]; total: number }

const route = useRoute();
const router = useRouter();
const planId = computed(() => String(route.params.id));
const rows = ref<RosterRow[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const incompleteOnly = ref(false);

const columns = [
  { title: '学籍号', dataIndex: 'student_no', key: 'student_no' },
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '年级', dataIndex: 'grade', key: 'grade' },
  { title: '班级', dataIndex: 'school_class', key: 'school_class' },
  { title: '完成情况', key: 'progress' },
  { title: '状态', key: 'status' },
];

async function loadRows() {
  loading.value = true;
  try {
    const response = await requestClient.get<PageResult>(`/exam-plans/${planId.value}/students`, {
      params: { page: page.value, per_page: 20, incomplete_only: incompleteOnly.value ? '1' : '0' },
    });
    rows.value = response.items;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
}

onMounted(() => { void loadRows(); });
</script>

<template>
  <Page title="应考名单" description="名单与应测项目根据学生当前归属和已确认选项实时生成。">
    <Card>
      <Space class="mb-4">
        <Button @click="router.push('/exam-plans')">返回计划</Button>
        <span>仅看未完成</span>
        <Switch v-model:checked="incompleteOnly" @change="page = 1; loadRows()" />
        <Button @click="loadRows">刷新</Button>
      </Space>
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }"
        row-key="student_id"
        @change="(pagination) => { page = pagination.current || 1; loadRows(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'progress'">{{ record.completed_item_count }} / {{ record.expected_item_count }}</template>
          <template v-else-if="column.key === 'school_class'">{{ record.school_class?.name || '—' }}</template>
          <Tag v-else-if="column.key === 'status'" :color="record.status === 'completed' ? 'green' : 'orange'">{{ record.status }}</Tag>
        </template>
        <template #expandedRowRender="{ record }">
          <div class="flex flex-wrap gap-2">
            <Tag v-for="item in record.items" :key="item.exam_item_code" :color="item.completed ? 'green' : 'orange'">
              {{ item.item_name }}：{{ item.completed ? '完成' : (item.missing_reason || '待测') }}
            </Tag>
          </div>
        </template>
      </Table>
    </Card>
  </Page>
</template>

<script lang="ts" setup>
import type { MenuProps } from 'antdv-next';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { Student } from '#/api/business/student';

import { onMounted, reactive, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Dropdown, Menu, MenuItem, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSchoolClassOptions } from '#/api/business/school-class';
import { getStudentList } from '#/api/business/student';

import { useColumns, useGridFormSchema } from './data';
import Detail from './modules/detail.vue';
import Form from './modules/form.vue';
import StudentImport from './modules/import.vue';
import Selection from './modules/selection.vue';
import Transcript from './modules/transcript.vue';

const roles = useUserStore().userInfo?.roles ?? [];
const canWrite = roles.includes('school');
// 选测确认对学校与教师开放（与原"选测确认"菜单口径一致）。
const canConfirm = canWrite || roles.includes('teacher');
const lookupLabels = reactive<Record<string, string>>({});
/** 选中学生 id；翻页、查询与操作成功后清空，不保留跨页选中。 */
const selectRows = ref<string[]>([]);
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});
const [TranscriptDrawer, transcriptDrawerApi] = useVbenDrawer({
  connectedComponent: Transcript,
  destroyOnClose: true,
});
const [ImportDrawer, importDrawerApi] = useVbenDrawer({
  connectedComponent: StudentImport,
  destroyOnClose: true,
});
const [SelectionDrawer, selectionDrawerApi] = useVbenDrawer({
  connectedComponent: Selection,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridEvents: {
    checkboxAll: onCheckboxChange,
    checkboxChange: onCheckboxChange,
  },
  gridOptions: {
    checkboxConfig: { checkAll: false, highlight: true },
    columns: useColumns(onActionClick, canWrite, canConfirm, lookupLabels),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getStudentList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: false, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<Student>,
});

function onCheckboxChange({ records }: { records: Student[] }) {
  selectRows.value = records.map((record) => record.id);
}

function onRefresh() {
  gridApi.query();
  selectRows.value = [];
}

function onActionClick({ code, row }: OnActionClickParams<Student>) {
  if (code === 'edit') formDrawerApi.setData(row).open();
  if (code === 'detail') detailDrawerApi.setData(row).open();
  if (code === 'transcript') transcriptDrawerApi.setData(row).open();
}

const onBatchMenuClick: MenuProps['onClick'] = ({ key }) => {
  if (key === 'selection-confirm') openSelectionDrawer();
};

function openSelectionDrawer() {
  const records = (gridApi.grid?.getCheckboxRecords() ?? []) as Student[];
  if (records.length === 0) {
    message.warning('请先选择学生');
    return;
  }
  // 同口径校验：所选学生须为同年级、同性别且适用同一规则包，才允许批量确认选测。
  if (records.some((row) => row.grade === null || row.grade === undefined)) {
    message.warning('所选学生中存在未建档年级资料的学生，无法确认选测');
    return;
  }
  const criteria = new Set(
    records.map((row) =>
      [row.grade, row.gender, row.regulation_package_code]
        .map((value) => String(value ?? ''))
        .join('|'),
    ),
  );
  if (criteria.size > 1) {
    message.warning('请选择同年级、同性别的学生');
    return;
  }
  selectionDrawerApi.setData({ students: records }).open();
}

onMounted(async () => {
  if (!canWrite) return;
  for (const option of await getSchoolClassOptions())
    lookupLabels[String(option.value)] = option.label;
});
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="onRefresh()" />
    <DetailDrawer @success="onRefresh()" />
    <TranscriptDrawer />
    <ImportDrawer @success="onRefresh()" />
    <SelectionDrawer @success="onRefresh()" />
    <Grid>
      <template #toolbar-actions>
        <Dropdown v-if="canConfirm">
          <template #popupRender>
            <Menu @click="onBatchMenuClick">
              <MenuItem key="selection-confirm">选测确认</MenuItem>
            </Menu>
          </template>
          <Button type="primary" :disabled="selectRows.length === 0">
            批量操作
          </Button>
        </Dropdown>
      </template>
      <template #toolbar-tools>
        <Button v-if="canWrite" type="primary" @click="importDrawerApi.open()">
          导入
        </Button>
        <Button
          v-if="canWrite"
          class="ml-2"
          type="primary"
          @click="formDrawerApi.setData({}).open()"
        >
          新增
        </Button>
      </template>
    </Grid>
  </Page>
</template>

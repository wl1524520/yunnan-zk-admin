<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { Device, DeviceKey, IssuedDeviceKey } from '#/api/business/device';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Alert,
  Button,
  Checkbox,
  message,
  Modal,
  Select,
  Space,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  assignDeviceSchool,
  getDeviceKeys,
  getDeviceList,
  issueDeviceKey,
  revokeDeviceKey,
} from '#/api/business/device';
import { getSchoolList } from '#/api/business/school';

import { useColumns, useGridFormSchema, useKeyColumns } from './data';
import Form from './modules/form.vue';

const canWrite = true;

const saving = ref(false);
const schoolDevice = ref<Device>();
const keyDevice = ref<Device>();
const schoolOptions = ref<{ label: string; value: string }[]>([]);
const selectedSchoolId = ref('');
const offlineSyncConfirmed = ref(false);
const issuedKey = ref<IssuedDeviceKey>();

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick, canWrite),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }, formValues) =>
          getDeviceList({
            ...formValues,
            page: page.currentPage,
            per_page: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<Device>,
});
const [KeyGrid, keyGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useKeyColumns(),
    data: [],
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<DeviceKey>,
});

async function searchSchools(keyword = '') {
  const result = await getSchoolList({
    page: 1,
    per_page: 100,
    ...(keyword ? { keyword } : {}),
  });
  schoolOptions.value = result.items.map((school) => ({
    label: [school.code, school.name].filter(Boolean).join(' '),
    value: school.id,
  }));
}

async function openAssignment(device: Device) {
  schoolDevice.value = device;
  selectedSchoolId.value = device.school?.id || '';
  offlineSyncConfirmed.value = false;
  await searchSchools();
}

async function assignSchool() {
  if (
    !schoolDevice.value ||
    !selectedSchoolId.value ||
    !offlineSyncConfirmed.value
  ) {
    message.error('选择学校并确认离线数据已同步');
    return;
  }
  saving.value = true;
  try {
    await assignDeviceSchool(schoolDevice.value.id, selectedSchoolId.value);
    message.success('学校已分配');
    schoolDevice.value = undefined;
    gridApi.query();
  } finally {
    saving.value = false;
  }
}

async function openKeys(device: Device) {
  keyDevice.value = device;
  await loadKeys();
}

async function loadKeys() {
  if (!keyDevice.value) return;
  const result = await getDeviceKeys(keyDevice.value.id);
  keyGridApi.setGridOptions({ data: result.items });
}

async function issueKey() {
  if (!keyDevice.value) return;
  saving.value = true;
  try {
    issuedKey.value = await issueDeviceKey(keyDevice.value.id);
    await loadKeys();
  } finally {
    saving.value = false;
  }
}

async function revokeKey(key: DeviceKey) {
  if (!keyDevice.value) return;
  await revokeDeviceKey(keyDevice.value.id, key.id);
  message.success('密钥已撤销');
  await loadKeys();
}

function onActionClick({ code, row }: OnActionClickParams<Device>) {
  switch (code) {
    case 'assign-school': {
      openAssignment(row);
      break;
    }
    case 'edit': {
      formDrawerApi.setData(row).open();
      break;
    }
    case 'keys': {
      openKeys(row);
      break;
    }
    // 无默认分支
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="gridApi.query()" />
    <Grid table-title="设备台账">
      <template #toolbar-tools>
        <Button
          v-if="canWrite"
          type="primary"
          @click="formDrawerApi.setData({}).open()"
        >
          新增
        </Button>
      </template>
    </Grid>

    <Modal
      :open="!!schoolDevice"
      title="分配设备学校"
      :confirm-loading="saving"
      @ok="assignSchool"
      @cancel="schoolDevice = undefined"
    >
      <div class="grid gap-3">
        <Select
          v-model:value="selectedSchoolId"
          :options="schoolOptions"
          show-search
          :filter-option="false"
          placeholder="搜索学校"
          @search="searchSchools"
        />
        <Checkbox v-model:checked="offlineSyncConfirmed">
          确认该设备未上传的离线记录已同步完成
        </Checkbox>
      </div>
    </Modal>
    <Modal
      :open="!!keyDevice"
      title="设备签名密钥"
      width="720px"
      :footer="null"
      @cancel="
        keyDevice = undefined;
        issuedKey = undefined;
      "
    >
      <template v-if="keyDevice">
        <Alert
          v-if="issuedKey"
          type="warning"
          class="mb-4"
          show-icon
          message="请立即安全保存以下密钥；关闭后将无法再次读取。"
        />
        <div
          v-if="issuedKey"
          class="mb-4 break-all rounded border p-3 font-mono text-sm"
        >
          标识：{{ issuedKey.key_id }}<br />密钥：{{ issuedKey.secret }}
        </div>
        <Alert
          type="info"
          class="mb-4"
          show-icon
          message="新密钥明文仅在签发时显示一次，请提前准备安全的保存方式。"
        />
        <Space class="mb-3">
          <Button type="primary" :loading="saving" @click="issueKey">
            签发／轮换密钥
          </Button>
          <Button @click="loadKeys">刷新</Button>
        </Space>
        <KeyGrid>
          <template #action="{ row }">
            <Button
              v-if="row.status !== 'revoked'"
              type="link"
              danger
              @click="revokeKey(row)"
            >
              撤销
            </Button>
          </template>
        </KeyGrid>
      </template>
    </Modal>
  </Page>
</template>

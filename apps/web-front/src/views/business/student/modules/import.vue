<script lang="ts" setup>
import type { UploadProps } from 'antdv-next';

import type { ImportBatch, ImportRow } from '#/api/business/import';

import { onBeforeUnmount, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Button, message, Spin, Upload } from 'antdv-next';

import {
  getImportBatch,
  getImportList,
  getImportRows,
  runImportAction,
  uploadImport,
} from '#/api/business/import';

const emit = defineEmits(['success']);

// 轮询节奏与上限：2.5 秒一次，超过 2 分钟停止并提示用户稍后查看
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120_000;
// 错误行列表最多展示 50 条，超出部分只提示总数
const ERROR_LIST_LIMIT = 50;
// 忽略批次记录的本地存储键与保留条数
const IGNORED_STORAGE_KEY = 'import-student-ignored-batches';
const IGNORED_STORAGE_MAX = 50;

// 未终结的批次状态：打开抽屉时自动恢复继续处理
const RESUMABLE_STATUSES = new Set(['uploaded', 'validated', 'validating']);
const SETTLED_STATUSES = new Set(['failed', 'invalid', 'validated']);

type Phase = 'checking' | 'committing' | 'result' | 'running' | 'select';

const phase = ref<Phase>('checking');
const statusText = ref('');
const inlineError = ref('');
const fileList = ref<UploadProps['fileList']>([]);
const batch = ref<ImportBatch>();
const restored = ref(false);
const pollTimedOut = ref(false);
const errorRows = ref<ImportRow[]>([]);
const errorTotal = ref(0);

// 异步流程守卫：每次打开/关闭抽屉、发起新导入时自增，
// 旧流程在 await 之后发现序号变化即自行退出，避免串台
let currentRun = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractErrorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || '操作失败，请稍后重试'
  );
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await file.arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function loadIgnoredIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(IGNORED_STORAGE_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((id) => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

function resetToSelect() {
  phase.value = 'select';
  statusText.value = '';
  inlineError.value = '';
  fileList.value = [];
  batch.value = undefined;
  restored.value = false;
  pollTimedOut.value = false;
  errorRows.value = [];
  errorTotal.value = 0;
}

function ignoreBatch() {
  const id = batch.value?.id;
  if (!id) return;
  const ids = loadIgnoredIds().filter((item) => item !== id);
  ids.push(id);
  try {
    localStorage.setItem(
      IGNORED_STORAGE_KEY,
      JSON.stringify(ids.slice(-IGNORED_STORAGE_MAX)),
    );
  } catch {
    // 本地存储不可用时忽略即可，代价只是下次仍会恢复该批次
  }
  resetToSelect();
}

function downloadTemplate() {
  const link = document.createElement('a');
  link.href = `${import.meta.env.BASE_URL}student-import-template.xlsx`;
  link.download = '学生导入模板.xlsx';
  link.click();
}

// 打开抽屉时查找最近一个未终结且未被忽略的批次，接续对应步骤
async function tryResume(my: number) {
  try {
    const res = await getImportList(1, 10);
    if (my !== currentRun) return;
    const ignored = loadIgnoredIds();
    const pending = res.items.find(
      (item) =>
        !ignored.includes(item.id) && RESUMABLE_STATUSES.has(item.status),
    );
    if (!pending) {
      phase.value = 'select';
      return;
    }
    batch.value = pending;
    restored.value = true;
    if (pending.status === 'validated') {
      phase.value = 'result';
      return;
    }
    if (pending.status === 'uploaded') {
      await runImportAction(pending.id, 'validate');
      if (my !== currentRun) return;
    }
    await pollBatch(my);
  } catch {
    if (my !== currentRun) return;
    resetToSelect();
  }
}

async function pollBatch(my: number) {
  const id = batch.value?.id;
  if (!id) return;
  phase.value = 'running';
  pollTimedOut.value = false;
  statusText.value = '正在校验数据，请稍候…';
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (my === currentRun) {
    await sleep(POLL_INTERVAL_MS);
    if (my !== currentRun) return;
    // 超时判断放在请求之前：即使请求持续失败也能保证轮询会终止
    if (Date.now() >= deadline) {
      pollTimedOut.value = true;
      return;
    }
    try {
      batch.value = await getImportBatch(id);
    } catch {
      // 单次查询失败（如网络抖动）不中断轮询，等待下一轮
      continue;
    }
    if (my !== currentRun) return;
    if (SETTLED_STATUSES.has(batch.value.status)) {
      await enterResult(my);
      return;
    }
  }
}

function continuePoll() {
  const id = batch.value?.id;
  if (!id) return;
  void pollBatch(++currentRun);
}

async function enterResult(my: number) {
  const current = batch.value;
  if (!current) return;
  if (current.status === 'invalid') {
    const res = await getImportRows(current.id, 1, ERROR_LIST_LIMIT, 'invalid');
    if (my !== currentRun) return;
    errorRows.value = res.items;
    errorTotal.value = res.total;
  }
  phase.value = 'result';
}

async function start() {
  const file = fileList.value?.[0]?.originFileObj as File | undefined;
  if (!file) {
    message.error('请先选择导入文件');
    return;
  }
  const my = ++currentRun;
  resetToSelect();
  phase.value = 'running';
  statusText.value = '正在上传文件…';
  try {
    const sha256 = await sha256Hex(file);
    if (my !== currentRun) return;
    const data = new FormData();
    data.append('resource_type', 'students');
    data.append('file', file);
    data.append('sha256', sha256);
    data.append('request_id', crypto.randomUUID());
    const created = await uploadImport(data);
    if (my !== currentRun) return;
    batch.value = created;
    statusText.value = '上传完成，正在校验…';
    await runImportAction(created.id, 'validate');
    if (my !== currentRun) return;
    await pollBatch(my);
  } catch (error) {
    if (my !== currentRun) return;
    inlineError.value = extractErrorMessage(error);
    phase.value = 'select';
  }
}

async function confirmCommit() {
  const current = batch.value;
  if (!current || phase.value !== 'result') return;
  const my = ++currentRun;
  phase.value = 'committing';
  try {
    const committed = await runImportAction(current.id, 'commit');
    if (my !== currentRun) return;
    message.success(`导入成功，共 ${committed.total_rows} 行学生数据`);
    emit('success');
    drawerApi.close();
  } catch (error) {
    if (my !== currentRun) return;
    // 提交冲突等错误停留在结果步骤，便于处理后再重试
    inlineError.value = extractErrorMessage(error);
    phase.value = 'result';
  }
}

function formatRowErrors(row: ImportRow): string {
  return (row.errors ?? []).map((item) => item.message).join('；');
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(open) {
    if (!open) {
      currentRun++;
      return;
    }
    const my = ++currentRun;
    resetToSelect();
    phase.value = 'checking';
    await tryResume(my);
  },
});

onBeforeUnmount(() => {
  currentRun++;
});
</script>

<template>
  <Drawer class="w-full max-w-[640px]" title="导入学生">
    <div class="flex flex-col gap-4">
      <Alert
        v-if="restored"
        message="已恢复上次未完成的导入批次"
        show-icon
        type="info"
      />

      <!-- 选择文件 -->
      <template v-if="phase === 'select'">
        <div class="flex flex-col gap-2">
          <div class="font-medium">第一步：下载模板并填写</div>
          <div class="text-muted-foreground text-sm">
            按模板中的「填写说明」填写学生信息，第一行表头不可修改或删除。
          </div>
          <Button class="w-fit" @click="downloadTemplate">下载模板</Button>
        </div>
        <div class="flex flex-col gap-2">
          <div class="font-medium">第二步：选择文件并导入</div>
          <div class="text-muted-foreground text-sm">
            支持 .xlsx / .xls / .csv 文件，单次最多 1000
            行；上传后先自动校验，全部通过再确认导入。
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <Upload
              v-model:file-list="fileList"
              :before-upload="() => false"
              :max-count="1"
              accept=".csv,.xls,.xlsx"
            >
              <Button>选择文件</Button>
            </Upload>
            <Button type="primary" @click="start">开始导入</Button>
          </div>
        </div>
      </template>

      <!-- 上传 / 校验进行中 -->
      <template v-else-if="phase === 'running'">
        <div class="flex items-center gap-3">
          <Spin />
          <span>{{ statusText }}</span>
        </div>
        <template v-if="pollTimedOut">
          <Alert
            description="可点击「继续查询」再等待一轮，或关闭窗口稍后再来，导入进度不会丢失。"
            message="校验仍在进行中，耗时较长"
            show-icon
            type="warning"
          />
          <div class="flex gap-2">
            <Button type="primary" @click="continuePoll">继续查询</Button>
            <Button @click="ignoreBatch">忽略此批次</Button>
          </div>
        </template>
      </template>

      <!-- 校验结果 / 提交 -->
      <template v-else-if="phase === 'result' || phase === 'committing'">
        <template v-if="batch?.status === 'validated'">
          <Alert
            :message="`校验通过，共 ${batch.total_rows} 行数据`"
            show-icon
            type="success"
          />
          <div class="flex gap-2">
            <Button
              :loading="phase === 'committing'"
              type="primary"
              @click="confirmCommit"
            >
              确认导入
            </Button>
            <Button :disabled="phase === 'committing'" @click="ignoreBatch">
              忽略此批次
            </Button>
          </div>
        </template>
        <template v-else-if="batch?.status === 'invalid'">
          <Alert
            description="请按下方提示修正错误行后重新上传，本批次不会被导入。"
            :message="`校验完成：有效 ${batch.valid_rows} 行，错误 ${batch.invalid_rows} 行`"
            show-icon
            type="error"
          />
          <ul class="max-h-80 overflow-auto rounded-md border p-3 text-sm">
            <li v-for="row in errorRows" :key="row.row_no" class="py-0.5">
              第 {{ row.row_no }} 行：{{ formatRowErrors(row) }}
            </li>
          </ul>
          <div
            v-if="errorTotal > errorRows.length"
            class="text-muted-foreground text-sm"
          >
            仅展示前 {{ errorRows.length }} 条，共 {{ errorTotal }} 行存在错误
          </div>
          <Button class="w-fit" @click="resetToSelect">重新选择文件</Button>
        </template>
        <template v-else>
          <Alert message="校验失败，请重新上传文件" show-icon type="error" />
          <Button class="w-fit" @click="resetToSelect">重新选择文件</Button>
        </template>
      </template>

      <!-- 打开时检查未完成批次 -->
      <template v-else>
        <div class="flex items-center gap-3">
          <Spin />
          <span>正在检查是否有未完成的导入…</span>
        </div>
      </template>

      <div v-if="inlineError" class="text-sm text-red-600">
        {{ inlineError }}
      </div>
    </div>
  </Drawer>
</template>

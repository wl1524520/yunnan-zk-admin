<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ApprovalCase } from '#/api/business/approval';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Input, message, Modal, Select, Space, Tag } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getApprovalAttachmentUrl,
  getApprovalCase,
  getApprovalList,
  runApprovalAction,
  uploadApprovalAttachment,
} from '#/api/business/approval';
import { getSchoolClassOptions } from '#/api/business/school-class';

import { useColumns, useFilterSchema } from './data';

const userStore = useUserStore();
const router = useRouter();
const role = computed(() => userStore.userInfo?.roles?.[0] || '');
const ownSchoolId = computed(
  () => (userStore.userInfo as null | { school?: { id: string } })?.school?.id,
);
const ownDistrictCode = computed(
  () =>
    (userStore.userInfo as null | { district?: { code: string } })?.district
      ?.code,
);
const selected = ref<ApprovalCase>();
const saving = ref(false);
const status = ref<string>();
const workflowType = ref<string>();
const comment = ref('');
const receivingClassId = ref('');
const attachmentCategory = ref('other');
const attachmentFile = ref<File>();
const classOptions = ref<{ label: string; value: string }[]>([]);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: ({ page }) =>
          getApprovalList({
            page: page.currentPage,
            per_page: page.pageSize,
            ...(status.value ? { status: status.value } : {}),
            ...(workflowType.value
              ? { workflow_type: workflowType.value }
              : {}),
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: true, zoom: true },
  } as VxeTableGridOptions<ApprovalCase>,
});
const [FilterForm] = useVbenForm({
  layout: 'vertical',
  schema: useFilterSchema((filters) => {
    if ('status' in filters)
      status.value = filters.status ? String(filters.status) : undefined;
    if ('workflow_type' in filters)
      workflowType.value = filters.workflow_type
        ? String(filters.workflow_type)
        : undefined;
    gridApi.reload();
  }),
  showDefaultActions: false,
});

async function openCase(id: string) {
  selected.value = await getApprovalCase(id);
  comment.value = '';
  receivingClassId.value = '';
  if (
    role.value === 'school' &&
    selected.value.case_type === 'student_transfer'
  ) {
    classOptions.value = await getSchoolClassOptions();
  }
}

function isApplicant(row: ApprovalCase): boolean {
  return role.value === 'school' && row.school_id === ownSchoolId.value;
}
function isReviewer(row: ApprovalCase): boolean {
  return (
    ['city', 'county', 'province'].includes(role.value) &&
    row.direct_reviewer_district_code === ownDistrictCode.value
  );
}

async function action(
  kind: 'apply' | 'decline' | 'review' | 'submit' | 'withdraw',
  decision?: string,
) {
  if (!selected.value) return;
  const row = selected.value;
  let payload: Record<string, unknown> = {};
  if (kind === 'submit') payload = { request_id: crypto.randomUUID() };
  if (kind === 'review') {
    if (decision !== 'approve' && !comment.value.trim()) {
      message.error('请填写审核意见');
      return;
    }
    payload = {
      decision,
      comment: comment.value.trim() || null,
      expected_revision_no: row.revision_no,
      request_id: crypto.randomUUID(),
    };
  }
  if (kind === 'decline' || kind === 'withdraw') {
    if (kind === 'decline' && !comment.value.trim()) {
      message.error('请填写拒绝理由');
      return;
    }
    payload = {
      comment: comment.value.trim() || null,
      request_id: crypto.randomUUID(),
    };
  }
  if (kind === 'apply' && row.case_type === 'student_transfer') {
    if (!receivingClassId.value) {
      message.error('请选择接收班级');
      return;
    }
    payload = {
      school_class_id: receivingClassId.value,
      expected_latest_movement_id:
        row.items[0]?.expected_latest_movement_id || null,
      request_id: crypto.randomUUID(),
    };
  }
  saving.value = true;
  try {
    await runApprovalAction(row.id, kind, payload);
    message.success('办理成功');
    await openCase(row.id);
    gridApi.query();
  } finally {
    saving.value = false;
  }
}

async function downloadAttachment(id: string) {
  const result = await getApprovalAttachmentUrl(id);
  window.open(result.url, '_blank', 'noopener,noreferrer');
}

function selectAttachment(event: Event) {
  attachmentFile.value = (event.target as HTMLInputElement).files?.[0];
}

async function uploadAttachment() {
  if (!selected.value || !attachmentFile.value) {
    message.error('请选择附件');
    return;
  }
  saving.value = true;
  try {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      await attachmentFile.value.arrayBuffer(),
    );
    const sha256 = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const data = new FormData();
    data.append('category', attachmentCategory.value);
    data.append('file', attachmentFile.value);
    data.append('sha256', sha256);
    await uploadApprovalAttachment(selected.value.id, data);
    attachmentFile.value = undefined;
    message.success('附件已上传');
    await openCase(selected.value.id);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Page
    title="审批办理"
    description="申请详情按当前办理范围实时读取；材料和明细随学生当前归属过滤。"
  >
    <Grid>
      <template #toolbar-tools>
        <div class="flex flex-wrap items-end gap-3">
          <FilterForm />
          <Button
            v-if="role === 'school'"
            type="primary"
            @click="router.push('/approvals/new')"
          >
            发起申请
          </Button>
        </div>
      </template>
      <template #school="{ row }">{{ row.school?.name || '—' }}</template>
      <template #status="{ row }">
        <Tag>{{ row.status }}</Tag>
      </template>
      <template #action="{ row }">
        <Button type="link" @click="openCase(row.id)">查看办理</Button>
      </template>
    </Grid>

    <Modal
      :open="!!selected"
      width="900px"
      title="审批详情"
      :footer="null"
      @cancel="selected = undefined"
    >
      <template v-if="selected">
        <div class="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div>编号：{{ selected.case_no }}</div>
          <div>状态：{{ selected.status }}</div>
          <div>类型：{{ selected.case_type }}</div>
          <div>材料修订：{{ selected.revision_no }}</div>
          <div class="col-span-2">申请理由：{{ selected.reason }}</div>
          <div
            v-if="selected.awaiting_receipt"
            class="col-span-2 text-orange-600"
          >
            等待接收学校确认：{{ selected.awaiting_receipt_days }} 天
          </div>
        </div>
        <h3 class="mb-2 font-semibold">申请明细</h3>
        <div
          v-for="item in selected.items"
          :key="item.id"
          class="mb-3 rounded border p-3 text-sm"
        >
          <div>{{ item.student?.student_no }} {{ item.student?.name }}</div>
          <div v-if="item.target_school_id">
            目标学校：{{ item.target_school_id }}
          </div>
          <div v-if="item.applied_at">生效时间：{{ item.applied_at }}</div>
          <pre v-if="item.proposed_snapshot" class="mt-2 whitespace-pre-wrap">{{
            JSON.stringify(item.proposed_snapshot, null, 2)
          }}</pre>
        </div>
        <template v-if="selected.attachments">
          <h3 class="mb-2 font-semibold">附件</h3>
          <div
            v-for="attachment in selected.attachments"
            :key="attachment.id"
            class="mb-2 text-sm"
          >
            {{ attachment.category }} · {{ attachment.original_name }}
            <Button
              size="small"
              type="link"
              @click="downloadAttachment(attachment.id)"
            >
              下载
            </Button>
          </div>
          <Space
            v-if="
              isApplicant(selected) &&
              ['draft', 'returned'].includes(selected.status)
            "
            class="my-3"
            wrap
          >
            <Select
              v-model:value="attachmentCategory"
              :options="[
                { label: '资格证明', value: 'qualification_proof' },
                { label: '公示证明', value: 'publication_notice' },
                { label: '异议处置', value: 'objection_resolution' },
                { label: '其他材料', value: 'other' },
              ]"
              class="min-w-36"
            />
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.txt"
              @change="selectAttachment"
            />
            <Button :loading="saving" @click="uploadAttachment">
              上传附件
            </Button>
          </Space>
        </template>
        <template v-if="selected.events">
          <h3 class="mb-2 font-semibold">办理记录</h3>
          <div
            v-for="event in selected.events"
            :key="`${event.event_type}-${event.occurred_at}`"
            class="mb-1 text-sm"
          >
            {{ event.occurred_at }} · {{ event.event_type }} ·
            {{ event.comment || '—' }}
          </div>
        </template>
        <div class="mt-5 border-t pt-4">
          <Input
            v-model:value="comment"
            class="mb-3"
            placeholder="审核意见／拒绝原因"
          />
          <Select
            v-if="
              selected.case_type === 'student_transfer' &&
              selected.status === 'approved' &&
              !isApplicant(selected)
            "
            v-model:value="receivingClassId"
            :options="classOptions"
            placeholder="接收班级"
            class="mb-3 w-full"
          />
          <Space wrap>
            <Button
              v-if="
                isApplicant(selected) &&
                ['draft', 'returned'].includes(selected.status)
              "
              :loading="saving"
              type="primary"
              @click="action('submit')"
            >
              提交审核
            </Button>
            <template
              v-if="isReviewer(selected) && selected.status === 'submitted'"
            >
              <Button
                :loading="saving"
                type="primary"
                @click="action('review', 'approve')"
              >
                批准
              </Button>
              <Button :loading="saving" @click="action('review', 'return')">
                退回补正
              </Button>
              <Button
                :loading="saving"
                danger
                @click="action('review', 'reject')"
              >
                驳回
              </Button>
            </template>
            <Button
              v-if="
                isApplicant(selected) &&
                selected.status === 'approved' &&
                selected.case_type !== 'student_transfer'
              "
              :loading="saving"
              type="primary"
              @click="action('apply')"
            >
              应用批准结果
            </Button>
            <Button
              v-if="
                selected.status === 'approved' &&
                selected.case_type === 'student_transfer' &&
                !isApplicant(selected) &&
                role === 'school'
              "
              :loading="saving"
              type="primary"
              @click="action('apply')"
            >
              确认接收
            </Button>
            <Button
              v-if="
                selected.status === 'approved' &&
                selected.case_type === 'student_transfer' &&
                !isApplicant(selected) &&
                role === 'school'
              "
              :loading="saving"
              danger
              @click="action('decline')"
            >
              拒绝接收
            </Button>
            <Button
              v-if="
                isApplicant(selected) &&
                selected.status === 'approved' &&
                selected.case_type === 'student_transfer'
              "
              :loading="saving"
              @click="action('withdraw')"
            >
              撤销转学
            </Button>
          </Space>
        </div>
      </template>
    </Modal>
  </Page>
</template>

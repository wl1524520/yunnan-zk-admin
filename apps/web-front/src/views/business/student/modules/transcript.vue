<script lang="ts" setup>
import type { Student } from '#/api/business/student';
import type {
  GradeResult,
  StudentDetail,
  TermResult,
  TotalResult,
} from '#/api/business/student-detail';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Button, Card, Spin, Tag } from 'antdv-next';

import {
  getStudentDetail,
  getStudentGradeResults,
  getStudentTermResults,
  getStudentTotalResult,
} from '#/api/business/student-detail';

import { genderOptions } from '../data';

const gradeNumbers = [7, 8, 9] as const;
const gradeNames: Record<number, string> = { 7: '七', 8: '八', 9: '九' };

const studentId = ref('');
const title = ref('学生成绩单');
const student = ref<StudentDetail>();
const termResults = ref<TermResult[]>([]);
const gradeResults = ref<GradeResult[]>([]);
const totalResult = ref<TotalResult>();
const basicLoading = ref(false);
const termLoading = ref(false);
const gradeLoading = ref(false);
const totalLoading = ref(false);
const basicError = ref(false);
const termError = ref(false);
const gradeError = ref(false);
const totalError = ref(false);
let requestVersion = 0;

const semesterRows = computed(() => {
  const results = new Map<string, TermResult>();
  for (const result of termResults.value.toSorted((left, right) =>
    (left.academic_year?.code ?? '').localeCompare(
      right.academic_year?.code ?? '',
    ),
  )) {
    results.set(`${result.grade}-${result.academic_term?.term_no}`, result);
  }

  return gradeNumbers.flatMap((grade) =>
    [1, 2].map((termNo) => ({
      grade,
      termNo,
      result: results.get(`${grade}-${termNo}`),
    })),
  );
});

const gradeCards = computed(() =>
  gradeNumbers.map((grade) => ({
    grade,
    result: gradeResults.value.find((item) => item.grade === grade),
  })),
);

const totalScore = computed(() =>
  totalResult.value?.status === 'final' &&
  totalResult.value.total_score !== null
    ? totalResult.value.total_score
    : '待形成',
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(open) {
    if (!open) {
      requestVersion++;
      return;
    }

    const row = drawerApi.getData<Student>();
    studentId.value = row.id;
    title.value = row.name ? `${row.name} · 成绩单` : '学生成绩单';
    void loadTranscript(++requestVersion);
  },
});

function isCurrent(version: number): boolean {
  return version === requestVersion;
}

async function loadTranscript(version: number) {
  student.value = undefined;
  termResults.value = [];
  gradeResults.value = [];
  totalResult.value = undefined;
  basicError.value = false;
  termError.value = false;
  gradeError.value = false;
  totalError.value = false;
  basicLoading.value = true;

  try {
    const detail = await getStudentDetail(studentId.value);
    if (!isCurrent(version)) return;
    student.value = detail;
  } catch {
    if (isCurrent(version)) basicError.value = true;
    return;
  } finally {
    if (isCurrent(version)) basicLoading.value = false;
  }

  await Promise.allSettled([
    loadTerms(version),
    loadGrades(version),
    loadTotal(version),
  ]);
}

async function loadTerms(version = requestVersion) {
  termError.value = false;
  termLoading.value = true;
  try {
    const response = await getStudentTermResults(studentId.value);
    if (isCurrent(version)) termResults.value = response.items;
  } catch {
    if (isCurrent(version)) termError.value = true;
  } finally {
    if (isCurrent(version)) termLoading.value = false;
  }
}

async function loadGrades(version = requestVersion) {
  gradeError.value = false;
  gradeLoading.value = true;
  try {
    const response = await getStudentGradeResults(studentId.value);
    if (isCurrent(version)) gradeResults.value = response.items;
  } catch {
    if (isCurrent(version)) gradeError.value = true;
  } finally {
    if (isCurrent(version)) gradeLoading.value = false;
  }
}

async function loadTotal(version = requestVersion) {
  totalError.value = false;
  totalLoading.value = true;
  try {
    const response = await getStudentTotalResult(studentId.value);
    if (isCurrent(version)) totalResult.value = response;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    if (isCurrent(version) && status !== 404) totalError.value = true;
  } finally {
    if (isCurrent(version)) totalLoading.value = false;
  }
}

function gradeScore(result?: GradeResult): string {
  return result?.status === 'final' && result.grade_score !== null
    ? result.grade_score
    : '待形成';
}

function genderLabel(gender: string): string {
  return genderOptions.find((option) => option.value === gender)?.label ?? '—';
}
</script>

<template>
  <Drawer class="w-full md:w-[80%]" :title="title">
    <div class="flex flex-col gap-4">
      <Spin :spinning="basicLoading">
        <div v-if="basicLoading" class="min-h-28"></div>
        <div v-else-if="basicError" class="flex items-center gap-3">
          <Alert show-icon type="error" message="学生信息加载失败" />
          <Button size="small" @click="loadTranscript(++requestVersion)">
            重试
          </Button>
        </div>
        <div v-else-if="student" class="flex flex-col gap-4">
          <Card title="基本信息">
            <div class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span class="text-muted-foreground">姓名</span>
                <p class="mt-1 font-medium">{{ student.name }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">学籍号</span>
                <p class="mt-1 font-medium">{{ student.student_no }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">性别</span>
                <p class="mt-1 font-medium">
                  {{ genderLabel(student.gender) }}
                </p>
              </div>
              <div>
                <span class="text-muted-foreground">当前年级</span>
                <p class="mt-1 font-medium">
                  {{ student.grade ? `${gradeNames[student.grade]}年级` : '—' }}
                </p>
              </div>
              <div>
                <span class="text-muted-foreground">当前学校</span>
                <p class="mt-1 font-medium">
                  {{ student.school?.name ?? '—' }}
                </p>
              </div>
              <div>
                <span class="text-muted-foreground">当前班级</span>
                <p class="mt-1 font-medium">
                  {{ student.school_class?.name ?? '—' }}
                </p>
              </div>
            </div>
          </Card>

          <Card title="成绩汇总">
            <div class="flex flex-col gap-4">
              <div class="rounded-lg bg-primary/5 p-5 text-center">
                <div class="text-sm text-muted-foreground">总分</div>
                <Spin :spinning="totalLoading">
                  <div class="mt-2 text-3xl font-semibold">
                    {{ totalError ? '—' : totalScore }}
                  </div>
                </Spin>
                <div
                  v-if="totalError"
                  class="mt-2 flex items-center justify-center gap-2"
                >
                  <span class="text-sm text-red-500">总分加载失败</span>
                  <Button size="small" @click="loadTotal()">重试</Button>
                </div>
                <Tag
                  v-else-if="!totalLoading"
                  class="mt-2"
                  :color="totalScore === '待形成' ? 'orange' : 'green'"
                >
                  {{ totalScore === '待形成' ? '待形成' : '正式' }}
                </Tag>
              </div>

              <div v-if="gradeError" class="flex items-center gap-3">
                <Alert show-icon type="error" message="年级成绩加载失败" />
                <Button size="small" @click="loadGrades()">重试</Button>
              </div>
              <Spin v-else :spinning="gradeLoading">
                <div class="grid gap-3 sm:grid-cols-3">
                  <div
                    v-for="item in gradeCards"
                    :key="item.grade"
                    class="rounded-lg border p-4"
                  >
                    <div class="text-sm text-muted-foreground">
                      {{ gradeNames[item.grade] }}年级最终分
                    </div>
                    <div class="mt-2 text-2xl font-semibold">
                      {{ gradeScore(item.result) }}
                    </div>
                    <div
                      v-if="item.result?.academic_year?.code"
                      class="mt-1 text-xs text-muted-foreground"
                    >
                      {{ item.result.academic_year.code }} 学年
                    </div>
                    <Tag
                      class="mt-2"
                      :color="
                        item.result?.status === 'final' ? 'green' : 'orange'
                      "
                    >
                      {{ item.result?.status === 'final' ? '正式' : '待形成' }}
                    </Tag>
                  </div>
                </div>
              </Spin>
            </div>
          </Card>

          <Card title="各年级学期得分">
            <div v-if="termError" class="flex items-center gap-3">
              <Alert show-icon type="error" message="学期成绩加载失败" />
              <Button size="small" @click="loadTerms()">重试</Button>
            </div>
            <Spin v-else :spinning="termLoading">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr class="text-muted-foreground">
                      <th class="p-3 font-medium">年级</th>
                      <th class="p-3 font-medium">学期</th>
                      <th class="p-3 font-medium">学年</th>
                      <th class="p-3 font-medium">得分</th>
                      <th class="p-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in semesterRows"
                      :key="`${row.grade}-${row.termNo}`"
                      class="border-t"
                    >
                      <td class="p-3">{{ gradeNames[row.grade] }}年级</td>
                      <td class="p-3">
                        {{ row.termNo === 1 ? '上学期' : '下学期' }}
                      </td>
                      <td class="p-3">
                        {{ row.result?.academic_year?.code ?? '—' }}
                      </td>
                      <td class="p-3 font-medium">
                        {{ row.result?.term_score ?? '暂无成绩' }}
                      </td>
                      <td class="p-3">
                        <Tag
                          v-if="
                            row.result?.term_score !== null &&
                            row.result?.term_score !== undefined
                          "
                          :color="
                            row.result?.status === 'locked' ? 'green' : 'orange'
                          "
                        >
                          {{
                            row.result?.status === 'locked'
                              ? '已锁定'
                              : '未锁定'
                          }}
                        </Tag>
                        <span v-else>暂无成绩</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Spin>
          </Card>
        </div>
      </Spin>
    </div>
  </Drawer>
</template>

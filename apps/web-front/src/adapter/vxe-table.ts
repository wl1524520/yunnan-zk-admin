import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { ComponentPropsMap, ComponentType } from './component';

import { h } from 'vue';

import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';

import { Button, Image, Tag } from 'antdv-next';

import { useVbenForm } from './form';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: false,
        columnConfig: {
          resizable: true,
        },
        minHeight: 180,
        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        proxyConfig: {
          autoLoad: true,
          response: {
            result: 'items',
            total: 'total',
            list: 'items',
          },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
      } as VxeTableGridOptions,
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        return h(Image, { src: row[column.field], ...props });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          Button,
          { size: 'small', type: 'link' },
          { default: () => props?.text },
        );
      },
    });

    vxeUI.renderer.add('CellTag', {
      renderTableDefault({ options, props }, { column, row }) {
        const value = row[column.field];
        const option = options?.find(
          (item) => String(item.value) === String(value),
        );
        return h(Tag, { ...props, color: option?.color }, () =>
          String(option?.label ?? value ?? '—'),
        );
      },
    });

    vxeUI.renderer.add('CellOperation', {
      renderTableDefault({ attrs, options }, { row }) {
        const operations = (options ?? []).filter((item) => {
          const visible = item.show;
          return typeof visible === 'function'
            ? visible(row)
            : visible !== false;
        });
        return h(
          'div',
          { class: 'flex justify-center' },
          operations.map((item) =>
            h(
              Button,
              {
                danger: item.danger,
                size: 'small',
                type: 'link',
                onClick: () => attrs?.onClick?.({ code: item.code, row }),
              },
              () => item.text,
            ),
          ),
        );
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm,
});

export const useVbenVxeGrid = <T extends Record<string, any>>(
  ...rest: Parameters<typeof useGrid<T, ComponentType, ComponentPropsMap>>
) => useGrid<T, ComponentType, ComponentPropsMap>(...rest);

export type OnActionClickParams<T> = { code: string; row: T };
export type OnActionClickFn<T> = (params: OnActionClickParams<T>) => void;

export type * from '@vben/plugins/vxe-table';

import JSONBigInt from 'json-bigint';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveDistrictTree,
  getAllDistricts,
  getDistrictTree,
} from './district';

const request = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: request }));

describe('getAllDistricts', () => {
  beforeEach(() => request.get.mockReset());

  it('returns rows VXE can read after JSONBigInt parses the API response', async () => {
    request.get.mockResolvedValue(
      JSONBigInt({ storeAsString: true, strict: true }).parse(
        JSON.stringify({
          items: [
            { id: '53', parent_id: null, name: '云南省' },
            { id: '5301', parent_id: '53', name: '昆明市' },
            { id: '5303', parent_id: '53', name: '曲靖市' },
          ],
          total: 3,
        }),
      ),
    );

    const rows = await getAllDistricts();

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
      expect(typeof row.hasOwnProperty).toBe('function');
    }
  });
});

describe('getDistrictTree', () => {
  beforeEach(() => request.get.mockReset());

  it('maps the recursive tree to label/value/children options', async () => {
    request.get.mockResolvedValue({
      data: [
        {
          children: [
            {
              children: [{ id: '530102', name: '五华区' }],
              id: '5301',
              name: '昆明市',
            },
            { children: [], id: '5303', name: '曲靖市' },
          ],
          id: '53',
          name: '云南省',
        },
      ],
    });

    const tree = await getDistrictTree();

    expect(request.get).toHaveBeenCalledWith('/districts/tree', undefined);
    expect(tree).toEqual([
      {
        label: '云南省',
        value: '53',
        children: [
          {
            label: '昆明市',
            value: '5301',
            children: [{ label: '五华区', value: '530102' }],
          },
          { label: '曲靖市', value: '5303' },
        ],
      },
    ]);
  });
});

describe('getActiveDistrictTree', () => {
  beforeEach(() => request.get.mockReset());

  it('requests only active districts', async () => {
    request.get.mockResolvedValue({
      data: [{ id: '53', name: '云南省' }],
    });

    const tree = await getActiveDistrictTree();

    expect(request.get).toHaveBeenCalledWith('/districts/tree', {
      params: { status: 'active' },
    });
    expect(tree).toEqual([{ label: '云南省', value: '53' }]);
  });
});

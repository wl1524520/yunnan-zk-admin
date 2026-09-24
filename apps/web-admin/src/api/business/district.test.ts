import JSONBigInt from 'json-bigint';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveDistrictOptions,
  getAllDistricts,
  getDistrictOptions,
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

describe('getDistrictOptions', () => {
  beforeEach(() => request.get.mockReset());

  it('uses district ids from every page as option values', async () => {
    request.get
      .mockResolvedValueOnce({
        items: [{ id: '53', name: '云南省' }],
        total: 101,
      })
      .mockResolvedValueOnce({
        items: [{ id: '5301', name: '昆明市' }],
        total: 101,
      });

    const options = await getDistrictOptions();

    expect(options).toEqual([
      { label: '53 云南省', value: '53' },
      { label: '5301 昆明市', value: '5301' },
    ]);
  });
});

it('offers only active districts for new assignments', async () => {
  request.get.mockReset();
  request.get.mockResolvedValue({
    items: [
      { id: '53', name: '云南省', status: 'active' },
      { id: '5301', name: '昆明市', status: 'inactive' },
    ],
    total: 2,
  });

  expect(await getActiveDistrictOptions()).toEqual([
    { label: '53 云南省', value: '53' },
  ]);
});

import JSONBigInt from 'json-bigint';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAllDistricts, getDistrictOptions } from './district';

const request = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: request }));

describe('getAllDistricts', () => {
  beforeEach(() => request.get.mockReset());

  it('returns rows VXE can read after JSONBigInt parses the API response', async () => {
    request.get.mockResolvedValue(
      JSONBigInt({ storeAsString: true, strict: true }).parse(
        JSON.stringify({
          items: [
            { id: 'p', parent_id: null, name: '云南省' },
            { id: 'c1', parent_id: 'p', name: '昆明市' },
            { id: 'c2', parent_id: 'p', name: '曲靖市' },
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

  it('uses district codes from every page as option values', async () => {
    request.get
      .mockResolvedValueOnce({
        items: [{ code: '530000', id: 'province-id', name: '云南省' }],
        total: 101,
      })
      .mockResolvedValueOnce({
        items: [{ code: '530100', id: 'city-id', name: '昆明市' }],
        total: 101,
      });

    const options = await getDistrictOptions();

    expect(options).toEqual([
      { label: '530000 云南省', value: '530000' },
      { label: '530100 昆明市', value: '530100' },
    ]);
  });
});

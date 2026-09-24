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
            { id: 53, parent_id: null, name: '云南省' },
            { id: 5301, parent_id: 53, name: '昆明市' },
            { id: 5303, parent_id: 53, name: '曲靖市' },
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
        items: [{ id: 530_000, name: '云南省' }],
        total: 101,
      })
      .mockResolvedValueOnce({
        items: [{ id: 530_100, name: '昆明市' }],
        total: 101,
      });

    const options = await getDistrictOptions();

    expect(options).toEqual([
      { label: '530000 云南省', value: 530_000 },
      { label: '530100 昆明市', value: 530_100 },
    ]);
  });
});

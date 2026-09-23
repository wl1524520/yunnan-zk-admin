import JSONBigInt from 'json-bigint';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAllDistricts } from './district';

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

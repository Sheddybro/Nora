import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('../lib/auth', () => ({ apiRequest: apiRequestMock }));

import { searchProductsByBarcode, uploadProductImage } from '../lib/catalog';

beforeEach(() => {
  apiRequestMock.mockReset();
  vi.unstubAllGlobals();
});

describe('product image upload on web', () => {
  it('sends the selected browser image as a multipart file', async () => {
    const selectedImage = new Blob(['selected image bytes'], { type: 'image/png' });
    const fetchMock = vi.fn(async () => new Response(selectedImage));
    vi.stubGlobal('fetch', fetchMock);
    apiRequestMock.mockResolvedValue(undefined);

    await uploadProductImage(42, 'blob:http://localhost/selected-image', 'product.png', 'image/png', 'Test product');

    expect(fetchMock).toHaveBeenCalledWith('blob:http://localhost/selected-image');
    expect(apiRequestMock).toHaveBeenCalledOnce();
    const [path, request] = apiRequestMock.mock.calls[0];
    expect(path).toBe('/catalog/products/42/images/');
    expect(request.method).toBe('POST');
    expect(request.body).toBeInstanceOf(FormData);
    const body = request.body as FormData;
    expect(body.get('image')).toBeInstanceOf(Blob);
    expect(body.get('image')).toMatchObject({ name: 'product.png', type: 'image/png' });
    expect(body.get('alt_text')).toBe('Test product');
    expect(body.get('is_primary')).toBe('true');
  });

  describe('barcode lookup', () => {
    it('returns an empty result for an unknown barcode without changing the catalog', async () => {
      apiRequestMock.mockResolvedValue({ results: [] });

      await expect(searchProductsByBarcode('899900000002')).resolves.toEqual([]);

      expect(apiRequestMock).toHaveBeenCalledWith('/catalog/products/?barcode=899900000002');
    });
  });

  it('reports a selected image that cannot be read and does not submit it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));

    await expect(uploadProductImage(42, 'blob:http://localhost/missing-image', 'product.png', 'image/png', 'Test product'))
      .rejects.toThrow('Selected product image could not be read (404).');

    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

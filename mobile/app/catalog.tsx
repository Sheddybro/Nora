import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { fetchProducts, createProduct, uploadProductImage, searchProductsByBarcode, type Product } from '../lib/catalog';
import { useAuth } from './components/AuthContext';

export default function CatalogScreen() {
  const theme = useMobileTheme();
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [barcodeMatch, setBarcodeMatch] = useState<Product | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const refresh = () => fetchProducts().then(setProducts).catch((requestError: Error) => setError(requestError.message)).finally(() => setIsLoading(false));
  useEffect(() => { refresh(); }, []);

  const selectPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const saveProduct = async () => {
    if (!name.trim() || !sku.trim() || !price.trim()) return setError('Product name, SKU, and price are required.');
    setIsSaving(true);
    setError('');
    try {
      const product = await createProduct({ name: name.trim(), variants: [{ name: 'Standard', sku: sku.trim(), price: price.trim(), reorder_point: 0 }] });
      if (photo) await uploadProductImage(product.id, photo.uri, photo.fileName || 'product-image.jpg', photo.mimeType || 'image/jpeg', name.trim());
      setName(''); setSku(''); setPrice(''); setPhoto(null);
      await refresh();
      Alert.alert('Product saved', 'The product is now available in your business catalog.');
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally { setIsSaving(false); }
  };

  const lookupBarcode = async () => {
    const trimmed = barcodeQuery.trim();
    if (!trimmed) {
      setError('Enter a barcode to find a matching product.');
      return;
    }

    try {
      const results = await searchProductsByBarcode(trimmed);
      setBarcodeMatch(results[0] || null);
      setError(results.length ? '' : 'No product matches this barcode.');
      if (results.length) {
        Alert.alert('Barcode match', `${results[0].name} was found.`);
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  return <NativeWorkspaceScreen eyebrow="CATALOG" title="Products" description="Browse products and variants for your business." liveData>
    <MobilePanel eyebrow="BARCODE LOOKUP" title="Find product by code">
      <TextInput accessibilityLabel="Barcode lookup" placeholder="Scan or type the barcode" value={barcodeQuery} onChangeText={setBarcodeQuery} placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <Pressable accessibilityRole="button" onPress={lookupBarcode} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>Lookup barcode</Text></Pressable>
      {barcodeMatch ? <MobileRow icon="◇" title={barcodeMatch.name} detail={barcodeMatch.variants.map((variant) => variant.sku).join(', ')} action="Match" /> : null}
    </MobilePanel>
    <MobilePanel eyebrow="BUSINESS CATALOG" title={`${products.length} ${products.length === 1 ? 'product' : 'products'}`}>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 12, fontSize: 10 }}>{error}</Text> : null}
      {isLoading ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>Loading catalog…</Text></View> : null}
      {!isLoading && !error && products.length === 0 ? <View style={nativeStyles.empty}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>No products yet</Text><Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Products added to this business will appear here.</Text></View> : null}
      {products.map((product) => <MobileRow key={product.id} icon="◇" title={product.name} detail={`${product.category_name || 'Uncategorized'} · ${product.variants.map((variant) => variant.sku).join(', ') || 'No variants'}`} action={product.variants[0] ? `₦${Number(product.variants[0].price).toLocaleString('en-NG')}` : ''} />)}
    </MobilePanel>
    {session?.role === 'owner' ? <MobilePanel eyebrow="CATALOG MANAGEMENT" title="Add a product">
      <TextInput accessibilityLabel="Product name" placeholder="Product name" value={name} onChangeText={setName} placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <TextInput accessibilityLabel="SKU" placeholder="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <TextInput accessibilityLabel="Price" placeholder="Price (NGN)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      {photo ? <Image source={{ uri: photo.uri }} style={{ width: 76, height: 76, borderRadius: 8, marginBottom: 8 }} /> : null}
      <Pressable accessibilityRole="button" onPress={selectPhoto} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line, marginBottom: 8 }]}><Text style={{ color: theme.ink, fontSize: 11 }}>{photo ? 'Choose another photo' : 'Choose product photo'}</Text></Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={saveProduct} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: isSaving ? 0.6 : 1 }]}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{isSaving ? 'Saving…' : 'Save product'}</Text></Pressable>
    </MobilePanel> : null}
    <View style={[nativeStyles.empty, { borderColor: theme.line, borderWidth: 1, borderRadius: 9, backgroundColor: theme.card }]}>
      <Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Product and variant data is provided by the NorrisBeauty business API.</Text>
    </View>
  </NativeWorkspaceScreen>;
}

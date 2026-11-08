import React, { useCallback, useRef, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { fetchProducts, fetchCategories, createProduct, uploadProductImage, searchProductsByBarcode, type Category, type Product } from '../lib/catalog';
import { useAuth } from './components/AuthContext';
import { RequestSequence } from '../lib/requestSequence';

export default function CatalogScreen() {
  const theme = useMobileTheme();
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [barcodeMatch, setBarcodeMatch] = useState<Product | null>(null);
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [categoryId, setCategoryId] = useState(0);
  const [pendingImageProductId, setPendingImageProductId] = useState<number | null>(null);
  const requestSequence = useRef(new RequestSequence()).current;

  const refresh = useCallback(async () => {
    const request = requestSequence.begin();
    setIsLoading(true);
    setError('');
    try {
      const [nextProducts, nextCategories] = await Promise.all([fetchProducts(), fetchCategories()]);
      if (!requestSequence.isCurrent(request)) return;
      setProducts(nextProducts);
      setCategories(nextCategories);
      setCategoryId((current) => current || nextCategories[0]?.id || 0);
    } catch (requestError) {
      if (requestSequence.isCurrent(request)) setError((requestError as Error).message);
    } finally {
      if (requestSequence.isCurrent(request)) setIsLoading(false);
    }
  }, [requestSequence]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => requestSequence.invalidate();
  }, [refresh, requestSequence]));

  const selectPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const saveProduct = async () => {
    if (pendingImageProductId && !photo) {
      setError('Select a product photo to retry the upload.');
      return;
    }
    if (!pendingImageProductId && (!name.trim() || !sku.trim() || !price.trim() || !categoryId)) {
      setError('Product name, category, SKU, and price are required.');
      return;
    }
    setIsSaving(true);
    setError('');
    let productId = pendingImageProductId;
    try {
      if (!productId) {
        const product = await createProduct({ name: name.trim(), category: categoryId, variants: [{ name: 'Standard', sku: sku.trim(), price: price.trim(), reorder_point: 0 }] });
        productId = product.id;
      }
      if (photo && productId) {
        setPendingImageProductId(productId);
        await uploadProductImage(productId, photo.uri, photo.fileName || 'product-image.jpg', photo.mimeType || 'image/jpeg', name.trim());
      }
      setPendingImageProductId(null);
      setName(''); setSku(''); setPrice(''); setPhoto(null);
      await refresh();
      Alert.alert('Product saved', 'The product is now available in your business catalog.');
    } catch (requestError) {
      if (productId && photo) {
        setPendingImageProductId(productId);
        setError(`Product saved, but its photo could not be uploaded. Choose another photo and retry. ${(requestError as Error).message}`);
      } else {
        setError((requestError as Error).message);
      }
    } finally { setIsSaving(false); }
  };

  const lookupBarcode = async () => {
    const trimmed = barcodeQuery.trim();
    if (!trimmed) {
      setBarcodeMatch(null);
      setBarcodeFeedback({ message: 'Enter a barcode to find a matching product.', tone: 'error' });
      return;
    }

    setBarcodeMatch(null);
    setBarcodeFeedback(null);
    try {
      const results = await searchProductsByBarcode(trimmed);
      setBarcodeMatch(results[0] || null);
      setBarcodeFeedback(results.length
        ? { message: `${results[0].name} was found.`, tone: 'success' }
        : { message: `No product matches barcode "${trimmed}".`, tone: 'error' });
      if (results.length) {
        Alert.alert('Barcode match', `${results[0].name} was found.`);
      }
    } catch (requestError) {
      setBarcodeFeedback({ message: (requestError as Error).message, tone: 'error' });
    }
  };

  return <NativeWorkspaceScreen eyebrow="CATALOG" title="Products" description="Browse products and variants for your business.">
    {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
    <MobilePanel eyebrow="BARCODE LOOKUP" title="Find product by code">
      <TextInput accessibilityLabel="Barcode lookup" placeholder="Scan or type the barcode" value={barcodeQuery} onChangeText={(value) => { setBarcodeQuery(value); setBarcodeFeedback(null); setBarcodeMatch(null); }} placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <Pressable accessibilityRole="button" onPress={lookupBarcode} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>Lookup barcode</Text></Pressable>
      {barcodeFeedback ? <Text accessibilityRole={barcodeFeedback.tone === 'error' ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={{ color: barcodeFeedback.tone === 'error' ? theme.rose : theme.ink, paddingVertical: 8, fontSize: 11 }}>{barcodeFeedback.message}</Text> : null}
      {barcodeMatch ? <MobileRow icon="◇" title={barcodeMatch.name} detail={barcodeMatch.variants.map((variant) => variant.sku).join(', ')} action="Match" /> : null}
    </MobilePanel>
    <MobilePanel eyebrow="BUSINESS CATALOG" title={`${products.length} ${products.length === 1 ? 'product' : 'products'}`}>
      {isLoading ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>Loading catalog…</Text></View> : null}
      {!isLoading && !error && products.length === 0 ? <View style={nativeStyles.empty}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>No products yet</Text><Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Products added to this business will appear here.</Text></View> : null}
      {products.map((product) => <MobileRow key={product.id} icon="◇" title={product.name} detail={`${product.category_name || 'Uncategorized'} · ${product.variants.map((variant) => variant.sku).join(', ') || 'No variants'}`} action={product.variants[0] ? `₦${Number(product.variants[0].price).toLocaleString('en-NG')}` : ''} />)}
    </MobilePanel>
    {session?.role === 'owner' ? <MobilePanel eyebrow="CATALOG MANAGEMENT" title="Add a product">
      <TextInput accessibilityLabel="Product name" placeholder="Product name" value={name} onChangeText={setName} placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <Picker accessibilityLabel="Category" selectedValue={categoryId} onValueChange={(value) => setCategoryId(Number(value))} style={{ color: theme.ink, marginBottom: 8 }}>
        <Picker.Item label="Choose a category" value={0} />
        {categories.map((category) => <Picker.Item key={category.id} label={category.name} value={category.id} />)}
      </Picker>
      <TextInput accessibilityLabel="SKU" placeholder="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <TextInput accessibilityLabel="Price" placeholder="Price (NGN)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      {photo ? <Image source={{ uri: photo.uri }} style={{ width: 76, height: 76, borderRadius: 8, marginBottom: 8 }} /> : null}
      <Pressable accessibilityRole="button" onPress={selectPhoto} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line, marginBottom: 8 }]}><Text style={{ color: theme.ink, fontSize: 11 }}>{photo ? 'Choose another photo' : 'Choose product photo'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={saveProduct} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: isSaving ? 0.6 : 1 }]}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{isSaving ? 'Saving…' : pendingImageProductId ? 'Retry photo upload' : 'Save product'}</Text></Pressable>
    </MobilePanel> : null}
    <View style={[nativeStyles.empty, { borderColor: theme.line, borderWidth: 1, borderRadius: 9, backgroundColor: theme.card }]}>
      <Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Product and variant data is provided by the NorrisBeauty business API.</Text>
    </View>
  </NativeWorkspaceScreen>;
}

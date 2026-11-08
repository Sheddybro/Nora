import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { MobilePanel, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { checkoutSale, fetchInventoryStock, fetchProducts, fetchStockLocations, normalizeLocationId, searchProductsByBarcode, type InventoryStock, type Product, type StockLocation } from '../lib/catalog';
import { buildIdempotencyKey } from '../lib/offlineQueue';
import { RequestSequence } from '../lib/requestSequence';

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PosScreen() {
  const theme = useMobileTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [locationId, setLocationId] = useState(0);
  const [basket, setBasket] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'wallet'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [checkoutKey, setCheckoutKey] = useState(() => buildIdempotencyKey('mobile-sale'));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const requestSequence = useRef(new RequestSequence()).current;

  const refresh = useCallback(async () => {
    const request = requestSequence.begin();
    setIsLoading(true);
    setError('');
    try {
      const [nextProducts, nextStock, nextLocations] = await Promise.all([fetchProducts(), fetchInventoryStock(), fetchStockLocations()]);
      if (!requestSequence.isCurrent(request)) return;
      setProducts(nextProducts);
      setStock(nextStock);
      setLocations(nextLocations);
      setLocationId((current) => current || nextLocations[0]?.id || 0);
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
  useEffect(() => {
    setCheckoutKey(buildIdempotencyKey('mobile-sale'));
  }, [basket, locationId, paymentMethod, amountPaid]);

  const variants = products.flatMap((product) => product.variants.filter((variant) => variant.is_active).map((variant) => ({
    ...variant,
    productName: product.name,
    label: `${product.name} · ${variant.name || variant.sku}`,
    available: stock.find((line) => line.variant_id === variant.id && line.location_id === locationId)?.quantity || 0,
  })));
  const query = search.trim().toLowerCase();
  const visibleVariants = variants.filter((variant) => !query || `${variant.productName} ${variant.name} ${variant.sku} ${variant.barcode}`.toLowerCase().includes(query));
  const cartItems = Object.entries(basket).flatMap(([variantIdText, quantity]) => {
    const variant = variants.find((item) => item.id === Number(variantIdText));
    return variant ? [{ ...variant, quantity }] : [];
  });
  const count = cartItems.reduce((total, item) => total + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const changeQuantity = (variantId: number, change: number) => {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant) return;
    setBasket((current) => {
      const nextQuantity = (current[variantId] || 0) + change;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[variantId];
        return next;
      }
      if (nextQuantity > variant.available) return current;
      return { ...current, [variantId]: nextQuantity };
    });
  };

  const lookupBarcode = async () => {
    if (!barcode.trim()) {
      setError('Enter or scan a barcode.');
      return;
    }
    try {
      const matches = await searchProductsByBarcode(barcode);
      const matchedProduct = matches.find((product) => product.variants.some((variant) => variant.barcode.toLowerCase() === barcode.trim().toLowerCase()));
      const match = matchedProduct?.variants.find((variant) => variant.barcode.toLowerCase() === barcode.trim().toLowerCase());
      if (!match || !matchedProduct) {
        setError('No product matches this barcode.');
        return;
      }
      const available = stock.find((line) => line.variant_id === match.id && line.location_id === locationId)?.quantity || 0;
      if (available <= (basket[match.id] || 0)) {
        setError('This barcode has no additional stock at the selected location.');
        return;
      }
      setProducts((current) => current.some((product) => product.id === matchedProduct.id) ? current : [...current, matchedProduct]);
      setSearch(match.sku);
      setError('');
      setBasket((current) => ({ ...current, [match.id]: (current[match.id] || 0) + 1 }));
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const submitCheckout = async () => {
    if (!locationId || !cartItems.length) {
      setError('Choose a location and add at least one in-stock item.');
      return;
    }
    const paid = amountPaid.trim() ? Number(amountPaid) : total;
    if (!Number.isFinite(paid) || paid < 0) {
      setError('Enter a valid non-negative payment amount.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const sale = await checkoutSale({
        location_id: locationId,
        items: cartItems.map((item) => ({ variant_id: item.id, quantity: item.quantity, unit_price: item.price })),
        payment_method: paymentMethod,
        amount_paid: paid.toFixed(2),
        idempotency_key: checkoutKey,
      });
      setBasket({});
      setAmountPaid('');
      Alert.alert('Sale recorded', `${sale.invoice_number} · ${naira(Number(sale.total))}`);
      await refresh();
    } catch (requestError) {
      setError(`Checkout result could not be confirmed. Retry without changing the basket; the same request key prevents duplicate postings. ${(requestError as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return <NativeWorkspaceScreen eyebrow="LIVE CHECKOUT" title="Point of sale" description="Build a basket from available stock and record the sale through the business API.">
    {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
    <MobilePanel eyebrow="CHECKOUT LOCATION" title="Select stock location">
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7 }}>
        <Picker selectedValue={locationId} onValueChange={(value) => setLocationId(normalizeLocationId(value))} accessibilityLabel="Checkout location">
          <Picker.Item label="Choose location" value={0} />
          {locations.map((location) => <Picker.Item key={location.id} label={location.name} value={location.id} />)}
        </Picker>
      </View>
    </MobilePanel>
    <MobilePanel eyebrow="LIVE CATALOG" title="Add in-stock products">
      <TextInput accessibilityLabel="Search products" placeholder="Search name, SKU or barcode" value={search} onChangeText={setSearch} placeholderTextColor={theme.muted} style={{ minHeight: 44, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', gap: 7 }}>
        <TextInput accessibilityLabel="Barcode" placeholder="Scan or enter barcode" value={barcode} onChangeText={setBarcode} onSubmitEditing={lookupBarcode} placeholderTextColor={theme.muted} style={{ flex: 1, minHeight: 44, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12 }} />
        <Pressable accessibilityRole="button" onPress={lookupBarcode} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Find</Text></Pressable>
      </View>
      {isLoading ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>Loading catalog and stock…</Text></View> : visibleVariants.length ? visibleVariants.map((variant) => <View key={variant.id} style={[nativeStyles.stat, { borderBottomColor: theme.line, minHeight: 54 }]}>
        <View style={{ flex: 1, paddingRight: 8 }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '700' }}>{variant.label}</Text><Text style={{ color: theme.muted, fontSize: 9, marginTop: 3 }}>{variant.sku} · {variant.available} available</Text></View>
        <Text style={{ color: theme.ink, fontSize: 10 }}>{naira(Number(variant.price))}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Add ${variant.label}`} disabled={variant.available <= (basket[variant.id] || 0)} onPress={() => changeQuantity(variant.id, 1)} style={[nativeStyles.button, { minWidth: 44, marginLeft: 6, backgroundColor: theme.blush }]}><Text style={{ color: theme.rose, fontSize: 18 }}>+</Text></Pressable>
      </View>) : <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>{products.length ? 'No matching in-stock variants.' : 'No products are available in this business.'}</Text></View>}
    </MobilePanel>
    <MobilePanel eyebrow="CURRENT BASKET" title={`${count} ${count === 1 ? 'item' : 'items'}`}>
      {cartItems.length ? cartItems.map((item) => <View key={item.id} style={[nativeStyles.stat, { borderBottomColor: theme.line }]}>
        <View style={{ flex: 1 }}><Text style={[nativeStyles.statLabel, { color: theme.ink }]}>{item.label}</Text><Text style={{ color: theme.muted, fontSize: 9, marginTop: 3 }}>{naira(Number(item.price) * item.quantity)}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${item.label}`} onPress={() => changeQuantity(item.id, -1)} style={[nativeStyles.button, { minWidth: 40, borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink }}>−</Text></Pressable>
        <Text style={{ color: theme.ink, minWidth: 24, textAlign: 'center', fontSize: 11 }}>{item.quantity}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.label}`} disabled={item.available <= item.quantity} onPress={() => changeQuantity(item.id, 1)} style={[nativeStyles.button, { minWidth: 40, borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink }}>+</Text></Pressable>
      </View>) : <Text style={{ color: theme.muted, paddingVertical: 10, fontSize: 10 }}>Basket is empty.</Text>}
      <View style={[nativeStyles.stat, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: theme.line, marginTop: 5 }]}><Text style={[nativeStyles.statLabel, { color: theme.muted }]}>Total</Text><Text style={[nativeStyles.statValue, { color: theme.ink, fontSize: 14 }]}>{naira(total)}</Text></View>
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={paymentMethod} onValueChange={setPaymentMethod} accessibilityLabel="Payment method"><Picker.Item label="Cash" value="cash" /><Picker.Item label="Card" value="card" /><Picker.Item label="Bank transfer" value="bank_transfer" /><Picker.Item label="Wallet" value="wallet" /></Picker></View>
      <TextInput accessibilityLabel="Amount paid" placeholder={`Amount paid (default ${total.toFixed(2)})`} value={amountPaid} onChangeText={setAmountPaid} keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={{ minHeight: 44, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <Pressable accessibilityRole="button" disabled={isSaving || !cartItems.length || !locationId} onPress={submitCheckout} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: isSaving || !cartItems.length || !locationId ? 0.6 : 1 }]}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{isSaving ? 'Recording sale…' : `Complete sale · ${naira(total)}`}</Text></Pressable>
      <Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', marginTop: 8 }}>Checkout requires a connection. Retries reuse the same idempotency key.</Text>
    </MobilePanel>
  </NativeWorkspaceScreen>;
}
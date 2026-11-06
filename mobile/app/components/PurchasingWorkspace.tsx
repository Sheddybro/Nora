import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './NativeWorkspaceScreen';
import { fetchProducts, fetchStockLocations, type Product, type StockLocation } from '../../lib/catalog';
import { buildIdempotencyKey } from '../../lib/offlineQueue';
import { cancelPurchaseOrder, createPurchaseOrder, createSupplier, fetchPurchaseOrders, fetchSuppliers, placePurchaseOrder, receivePurchaseOrderLine, type PurchaseOrder, type Supplier } from '../../lib/purchasing';

const inputStyle = (theme: ReturnType<typeof useMobileTheme>) => ({ minHeight: 44, borderColor: theme.line, borderWidth: 1 as const, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 });

export default function PurchasingWorkspace() {
  const theme = useMobileTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [supplierId, setSupplierId] = useState(0);
  const [locationId, setLocationId] = useState(0);
  const [variantId, setVariantId] = useState(0);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({});
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [receiveKeys, setReceiveKeys] = useState<Record<string, string>>({});
  const [cancelReasons, setCancelReasons] = useState<Record<number, string>>({});
  const [orderIdempotencyKey, setOrderIdempotencyKey] = useState(() => buildIdempotencyKey('mobile-purchase-order'));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = async () => {
    try {
      const [nextSuppliers, nextOrders, nextProducts, nextLocations] = await Promise.all([fetchSuppliers(), fetchPurchaseOrders(), fetchProducts(), fetchStockLocations()]);
      setSuppliers(nextSuppliers);
      setOrders(nextOrders);
      setProducts(nextProducts);
      setLocations(nextLocations);
      setSupplierId((current) => current || nextSuppliers[0]?.id || 0);
      setLocationId((current) => current || nextLocations[0]?.id || 0);
      setVariantId((current) => current || nextProducts.flatMap((product) => product.variants).find((variant) => variant.is_active)?.id || 0);
      setError('');
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    setOrderIdempotencyKey(buildIdempotencyKey('mobile-purchase-order'));
  }, [supplierId, locationId, variantId, quantity, unitCost]);

  const variants = products.flatMap((product) => product.variants.filter((variant) => variant.is_active).map((variant) => ({ ...variant, label: `${product.name} · ${variant.sku}` })));
  const submitSupplier = async () => {
    if (!supplierName.trim()) return setError('Enter a supplier name.');
    setIsSaving(true);
    try {
      const supplier = await createSupplier(supplierName.trim(), supplierPhone.trim());
      setSuppliers((current) => [supplier, ...current]);
      setSupplierId(supplier.id);
      setSupplierName('');
      setSupplierPhone('');
      setError('');
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const submitOrder = async () => {
    const parsedQuantity = Number(quantity);
    const parsedCost = Number(unitCost);
    if (!supplierId || !locationId || !variantId || !Number.isInteger(parsedQuantity) || parsedQuantity < 1 || !Number.isFinite(parsedCost) || parsedCost < 0) {
      setError('Choose a supplier, location and variant, then enter a whole quantity and valid unit cost.');
      return;
    }
    setIsSaving(true);
    try {
      await createPurchaseOrder({ supplier_id: supplierId, location_id: locationId, idempotency_key: orderIdempotencyKey, lines: [{ variant_id: variantId, quantity_ordered: parsedQuantity, unit_cost: parsedCost.toFixed(2) }] });
      setQuantity('');
      setUnitCost('');
      await refresh();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const placeOrder = async (order: PurchaseOrder) => {
    setIsSaving(true);
    try {
      await placePurchaseOrder(order.id);
      await refresh();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const receiveLine = async (order: PurchaseOrder, lineId: number, lineKey: string) => {
    const batchNumber = (batchNumbers[lineKey] || '').trim();
    const received = Number(receiveQuantities[lineKey]);
    if (!batchNumber || !Number.isInteger(received) || received < 1) {
      setError('Enter a batch number and whole-unit receipt quantity.');
      return;
    }
    const idempotencyKey = receiveKeys[lineKey] || buildIdempotencyKey('mobile-purchase-receive');
    setReceiveKeys((current) => ({ ...current, [lineKey]: idempotencyKey }));
    setIsSaving(true);
    try {
      await receivePurchaseOrderLine(order.id, { line_id: lineId, quantity: received, batch_number: batchNumber, idempotency_key: idempotencyKey });
      setReceiveKeys((current) => { const next = { ...current }; delete next[lineKey]; return next; });
      setReceiveQuantities((current) => ({ ...current, [lineKey]: '' }));
      await refresh();
    } catch (requestError) {
      setError(`Receipt result could not be confirmed. Retry without changing the quantity or batch; the same key prevents duplicate posting. ${(requestError as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelOrder = async (order: PurchaseOrder) => {
    const reason = (cancelReasons[order.id] || '').trim();
    if (!reason) {
      setError('Enter a cancellation reason before cancelling an order.');
      return;
    }
    setIsSaving(true);
    try {
      await cancelPurchaseOrder(order.id, reason);
      await refresh();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return <NativeWorkspaceScreen eyebrow="PROCUREMENT" title="Purchases & suppliers" description="Create supplier orders and reconcile receipts into inventory.">
    {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
    <MobilePanel eyebrow="SUPPLIERS" title={`${suppliers.length} active suppliers`}>
      {suppliers.map((supplier) => <MobileRow key={supplier.id} icon="⇄" title={supplier.name} detail={supplier.phone || supplier.email || 'No contact details'} action="" />)}
      <TextInput accessibilityLabel="Supplier name" placeholder="Supplier name" value={supplierName} onChangeText={setSupplierName} placeholderTextColor={theme.muted} style={inputStyle(theme)} />
      <TextInput accessibilityLabel="Supplier phone" placeholder="Phone (optional)" value={supplierPhone} onChangeText={setSupplierPhone} keyboardType="phone-pad" placeholderTextColor={theme.muted} style={inputStyle(theme)} />
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={submitSupplier} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line, opacity: isSaving ? 0.6 : 1 }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Add supplier</Text></Pressable>
    </MobilePanel>
    <MobilePanel eyebrow="NEW ORDER" title="Draft purchase order">
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={supplierId} onValueChange={setSupplierId} accessibilityLabel="Supplier"><Picker.Item label="Choose supplier" value={0} />{suppliers.map((supplier) => <Picker.Item key={supplier.id} label={supplier.name} value={supplier.id} />)}</Picker></View>
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={locationId} onValueChange={setLocationId} accessibilityLabel="Receiving location"><Picker.Item label="Choose receiving location" value={0} />{locations.map((location) => <Picker.Item key={location.id} label={location.name} value={location.id} />)}</Picker></View>
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={variantId} onValueChange={setVariantId} accessibilityLabel="Product variant"><Picker.Item label="Choose variant" value={0} />{variants.map((variant) => <Picker.Item key={variant.id} label={variant.label} value={variant.id} />)}</Picker></View>
      <TextInput accessibilityLabel="Order quantity" placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholderTextColor={theme.muted} style={inputStyle(theme)} />
      <TextInput accessibilityLabel="Unit cost" placeholder="Unit cost (NGN)" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={inputStyle(theme)} />
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={submitOrder} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: isSaving ? 0.6 : 1 }]}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>Create draft order</Text></Pressable>
    </MobilePanel>
    <MobilePanel eyebrow="ORDER REGISTER" title="Purchase orders">
      {isLoading ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>Loading purchase orders…</Text></View> : orders.length ? orders.map((order) => <View key={order.id} style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.line }}>
        <Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>{order.order_number} · {order.status.replace('_', ' ')}</Text>
        <Text style={{ color: theme.muted, fontSize: 9, marginTop: 3 }}>{order.supplier_name} · {order.location_name}</Text>
        {order.lines.map((line) => {
          const lineKey = `${order.id}-${line.id}`;
          const remaining = line.quantity_ordered - line.quantity_received;
          return <View key={line.id} style={{ marginTop: 8 }}>
            <Text style={{ color: theme.ink, fontSize: 10 }}>{line.variant_sku} · {line.quantity_received}/{line.quantity_ordered} received · ₦{Number(line.unit_cost).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
            {['ordered', 'partially_received'].includes(order.status) && remaining > 0 ? <>
              <TextInput accessibilityLabel={`Batch number for ${line.variant_sku}`} placeholder="Batch number" value={batchNumbers[lineKey] || ''} onChangeText={(value) => { setBatchNumbers((current) => ({ ...current, [lineKey]: value })); setReceiveKeys((current) => { const next = { ...current }; delete next[lineKey]; return next; }); }} placeholderTextColor={theme.muted} style={[inputStyle(theme), { marginTop: 6 }]} />
              <View style={{ flexDirection: 'row', gap: 7 }}>
                <TextInput accessibilityLabel={`Receipt quantity for ${line.variant_sku}`} placeholder={`Qty (up to ${remaining})`} value={receiveQuantities[lineKey] || ''} onChangeText={(value) => { setReceiveQuantities((current) => ({ ...current, [lineKey]: value })); setReceiveKeys((current) => { const next = { ...current }; delete next[lineKey]; return next; }); }} keyboardType="number-pad" placeholderTextColor={theme.muted} style={[inputStyle(theme), { flex: 1 }]} />
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => receiveLine(order, line.id, lineKey)} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 9 }}>Receive</Text></Pressable>
              </View>
            </> : null}
          </View>;
        })}
        {order.status === 'draft' ? <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => placeOrder(order)} style={[nativeStyles.button, { alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 9 }}>Place order</Text></Pressable> : null}
        {['draft', 'ordered'].includes(order.status) ? <>
          <TextInput accessibilityLabel={`Cancellation reason for ${order.order_number}`} placeholder="Cancellation reason" value={cancelReasons[order.id] || ''} onChangeText={(value) => setCancelReasons((current) => ({ ...current, [order.id]: value }))} placeholderTextColor={theme.muted} style={[inputStyle(theme), { marginTop: 8 }]} />
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => cancelOrder(order)} style={[nativeStyles.button, { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.rose, fontSize: 9 }}>Cancel order</Text></Pressable>
        </> : null}
      </View>) : <Text style={{ color: theme.muted, fontSize: 10 }}>{isLoading ? 'Loading…' : 'No purchase orders yet.'}</Text>}
    </MobilePanel>
  </NativeWorkspaceScreen>;
}

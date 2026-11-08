import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { createStockMovement, fetchInventoryStock, fetchProducts, fetchStockLocations, searchProductsByBarcode, type InventoryStock, type Product, type StockLocation } from '../lib/catalog';
import { buildIdempotencyKey, getMutationQueueStatus, getQueuedMutations, queueOfflineMutation, removeQueuedMutation, subscribeToQueue, type OfflineMutation, type OfflineMutationStatus } from '../lib/offlineQueue';
import { useAuth } from './components/AuthContext';
import { RequestSequence } from '../lib/requestSequence';

export default function InventoryScreen() {
  const theme = useMobileTheme();
  const { session } = useAuth();
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [kind, setKind] = useState<'receipt' | 'adjustment'>('receipt');
  const [variantId, setVariantId] = useState(0);
  const [locationId, setLocationId] = useState(0);
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reason, setReason] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<OfflineMutation[]>([]);
  const [queueFeedback, setQueueFeedback] = useState<{ id: string; status: OfflineMutationStatus | 'synced' } | null>(null);
  const requestSequence = useRef(new RequestSequence()).current;

  const refresh = useCallback(async () => {
    const request = requestSequence.begin();
    setIsLoading(true);
    setError('');
    try {
      const [nextStock, nextProducts, nextLocations, nextQueue] = await Promise.all([fetchInventoryStock(), fetchProducts(), fetchStockLocations(), getQueuedMutations()]);
      if (!requestSequence.isCurrent(request)) return;
      setStock(nextStock);
      setProducts(nextProducts);
      setLocations(nextLocations);
      setPendingQueue(session ? nextQueue.filter((item) => item.userId === session.user.id && item.businessId === session.business.id) : []);
      setVariantId((current) => current || nextProducts.flatMap((product) => product.variants).find((variant) => variant.is_active)?.id || 0);
      setLocationId((current) => current || nextLocations[0]?.id || 0);
    } catch (requestError) {
      if (requestSequence.isCurrent(request)) setError((requestError as Error).message);
    } finally {
      if (requestSequence.isCurrent(request)) setIsLoading(false);
    }
  }, [requestSequence, session]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => requestSequence.invalidate();
  }, [refresh, requestSequence]));

  useEffect(() => {
    if (!session) return;
    const refreshQueue = () => {
      void getQueuedMutations(session.user.id, session.business.id)
        .then((queue) => {
          setPendingQueue(queue);
          setQueueFeedback((current) => {
            if (!current || current.status === 'conflict') return current;
            return { ...current, status: getMutationQueueStatus(current.id, queue) };
          });
        })
        .catch((requestError: Error) => setError(requestError.message));
    };
    refreshQueue();
    return subscribeToQueue(refreshQueue);
  }, [session]);

  const lookupBarcode = async () => {
    const trimmed = barcodeQuery.trim();
    if (!trimmed) {
      setError('Enter a barcode to find the matching product variant.');
      return;
    }

    try {
      const matches = await searchProductsByBarcode(trimmed);
      const variant = matches.flatMap((product) => product.variants).find((candidate) => candidate.barcode?.trim().toLowerCase() === trimmed.toLowerCase()) || matches.flatMap((product) => product.variants)[0];
      if (!variant) {
        setError('No product matches this barcode.');
        return;
      }

      setProducts((current) => current.some((product) => product.id === matches[0]?.id) ? current : [...current, ...matches]);
      setVariantId(variant.id);
      setError('');
      Alert.alert('Barcode match', `${variant.sku} selected for stock movement.`);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const units = stock.reduce((total, item) => total + item.quantity, 0);
  const value = stock.reduce((total, item) => total + Number(item.valuation), 0);
  const variants = products.flatMap((product) => product.variants.filter((variant) => variant.is_active).map((variant) => ({ ...variant, label: `${product.name} · ${variant.sku}` })));

  const saveMovement = async () => {
    const parsedQuantity = Number(quantity);
    if (!variantId || !locationId || !batchNumber.trim() || !reason.trim() || !Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
      setError('Choose a variant and location, then enter a batch, whole-unit quantity, and reason.'); return;
    }
    if (kind === 'receipt' && (parsedQuantity < 1 || !unitCost.trim())) { setError('Receipts need a positive quantity and unit cost.'); return; }
    setIsSaving(true); setError(''); setQueueFeedback(null);
    const idempotencyKey = buildIdempotencyKey('mobile-stock');
    const payload = {
      kind,
      variant_id: variantId,
      location_id: locationId,
      batch_number: batchNumber.trim(),
      quantity_delta: parsedQuantity,
      ...(kind === 'receipt' ? { unit_cost: unitCost.trim() } : {}),
      reason: reason.trim(),
      idempotency_key: idempotencyKey,
    };
    try {
      await createStockMovement(payload);
      setQuantity(''); setReason('');
      await refresh();
      Alert.alert('Stock updated', 'The movement has been recorded in the business ledger.');
    } catch (requestError) {
      const message = (requestError as Error).message;
      const status = (requestError as Error & { status?: number }).status;
      const isLikelyOffline = status === undefined || status >= 500 || status === 429;
      if (isLikelyOffline) {
        if (!session) throw requestError;
        try {
          const mutation = await queueOfflineMutation({ userId: session.user.id, businessId: session.business.id, resource: '/inventory/movements/', method: 'POST', payload, idempotencyKey });
          setQueueFeedback({ id: mutation.id, status: mutation.status });
          setPendingQueue(await getQueuedMutations(session.user.id, session.business.id));
          setError('Offline queue saved. The movement will sync when connectivity returns.');
          Alert.alert('Offline sync queued', 'The movement was stored locally and will be reconciled with the server when the device reconnects.');
        } catch (queueError) {
          setError(`The movement could not be confirmed or saved offline. Check the stock ledger before retrying. ${(queueError as Error).message}`);
        }
      } else {
        setError(message);
      }
    }
    finally { setIsSaving(false); }
  };

  return <NativeWorkspaceScreen eyebrow="STOCK CONTROL" title="Inventory" description="Review current business stock by location.">
    <MobilePanel eyebrow="LIVE SUMMARY" title="Stock at a glance">
      {[
        ['Units on hand', units.toLocaleString('en-NG')],
        ['Stock value', `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Stock lines', stock.length.toLocaleString('en-NG')],
      ].map(([label, amount]) => <View key={label} style={[nativeStyles.stat, { borderBottomColor: theme.line }]}><Text style={[nativeStyles.statLabel, { color: theme.muted }]}>{label}</Text><Text style={[nativeStyles.statValue, { color: theme.ink }]}>{amount}</Text></View>)}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
    </MobilePanel>
    <MobilePanel eyebrow="OFFLINE QUEUE" title={`Queued changes · ${pendingQueue.length}`}>
      {pendingQueue.length ? pendingQueue.map((item) => <View key={item.id} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.line }}>
        <Text style={{ color: theme.ink, fontSize: 10, fontWeight: '700' }}>{item.status === 'conflict' ? 'Needs review' : item.status === 'syncing' ? 'Syncing' : 'Waiting to sync'} · {item.resource}</Text>
        {item.conflict ? <Text style={{ color: theme.rose, fontSize: 9, lineHeight: 14, marginTop: 4 }}>{item.conflict}</Text> : <Text style={{ color: theme.muted, fontSize: 9, marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</Text>}
        {item.status === 'conflict' ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss conflicted stock movement" onPress={async () => { await removeQueuedMutation(item.id); setPendingQueue(await getQueuedMutations(session?.user.id, session?.business.id)); }} style={[nativeStyles.button, { alignSelf: 'flex-start', marginTop: 6, borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Dismiss conflict</Text></Pressable> : null}
      </View>) : <Text style={{ color: theme.muted, fontSize: 10 }}>No pending offline changes.</Text>}
    </MobilePanel>
    <MobilePanel eyebrow="BARCODE LOOKUP" title="Find a variant">
      <TextInput accessibilityLabel="Barcode lookup" placeholder="Type or scan a barcode" value={barcodeQuery} onChangeText={setBarcodeQuery} placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />
      <Pressable accessibilityRole="button" onPress={lookupBarcode} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>Lookup barcode</Text></Pressable>
    </MobilePanel>
    <MobilePanel eyebrow="BUSINESS LOCATIONS" title="Stock by product">{isLoading ? <View style={nativeStyles.empty}><Text style={[nativeStyles.emptyText, { color: theme.muted }]}>Loading inventory…</Text></View> : stock.length ? stock.map((item) => {
      const needsReorder = item.reorder_point > 0 && item.quantity <= item.reorder_point;
      return <MobileRow key={`${item.variant_id}-${item.location_id}`} icon={needsReorder ? '!' : '◇'} title={item.product_name} detail={`${item.variant_name || item.sku} · ${item.location_name} · reorder at ${item.reorder_point}`} action={needsReorder ? 'Reorder' : `${item.quantity} units`} />;
    }) : <View style={nativeStyles.empty}><Text style={[nativeStyles.emptyTitle, { color: theme.ink }]}>No stock recorded</Text><Text style={[nativeStyles.emptyText, { color: theme.muted }]}>Stock balances appear after a batch is received or adjusted.</Text></View>}</MobilePanel>
    {session?.role === 'owner' ? <MobilePanel eyebrow="STOCK CONTROL" title="Receive or adjust stock">
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={kind} onValueChange={(next) => setKind(next)} accessibilityLabel="Movement type"><Picker.Item label="Receive stock" value="receipt" /><Picker.Item label="Adjust existing batch" value="adjustment" /></Picker></View>
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={variantId} onValueChange={setVariantId} accessibilityLabel="Product variant"><Picker.Item label="Choose product variant" value={0} />{variants.map((variant) => <Picker.Item key={variant.id} label={variant.label} value={variant.id} />)}</Picker></View>
      <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, marginBottom: 8 }}><Picker selectedValue={locationId} onValueChange={setLocationId} accessibilityLabel="Stock location"><Picker.Item label="Choose stock location" value={0} />{locations.map((location) => <Picker.Item key={location.id} label={location.name} value={location.id} />)}</Picker></View>
      {[[batchNumber, setBatchNumber, 'Batch number'], [quantity, setQuantity, 'Quantity change'], [reason, setReason, 'Reason']].map(([valueText, setter, label]) => <TextInput key={label as string} accessibilityLabel={label as string} placeholder={label as string} value={valueText as string} onChangeText={setter as (value: string) => void} placeholderTextColor={theme.muted} keyboardType={label === 'Quantity change' ? 'number-pad' : 'default'} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} />)}
      {kind === 'receipt' ? <TextInput accessibilityLabel="Unit cost" placeholder="Unit cost (NGN)" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={{ minHeight: 46, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12, marginBottom: 8 }} /> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
      {queueFeedback ? <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, padding: 9, marginBottom: 8 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: queueFeedback.status === 'conflict' ? theme.rose : theme.ink, fontSize: 10, fontWeight: '700' }}>
          {queueFeedback.status === 'conflict'
            ? 'Offline change needs review'
            : queueFeedback.status === 'syncing'
              ? 'Offline change syncing'
              : queueFeedback.status === 'synced'
                ? 'Offline change synced'
                : 'Offline change saved · Waiting to sync'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss offline sync status" onPress={() => setQueueFeedback(null)} style={{ alignSelf: 'flex-start', paddingTop: 6 }}>
          <Text style={{ color: theme.muted, fontSize: 9 }}>Dismiss</Text>
        </Pressable>
      </View> : null}
      {pendingQueue.length ? <View style={{ borderColor: theme.line, borderWidth: 1, borderRadius: 7, padding: 9, marginBottom: 8 }}>
        <Text style={{ color: theme.ink, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>Offline changes · {pendingQueue.length}</Text>
        {pendingQueue.map((item) => <Text key={item.id} accessibilityLiveRegion="polite" style={{ color: item.status === 'conflict' ? theme.rose : theme.muted, fontSize: 9, lineHeight: 14 }}>
          {item.status === 'conflict' ? 'Needs review' : item.status === 'syncing' ? 'Syncing' : 'Waiting to sync'} · {item.resource}
        </Text>)}
      </View> : null}
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={saveMovement} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: isSaving ? 0.6 : 1 }]}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{isSaving ? 'Recording…' : 'Record movement'}</Text></Pressable>
    </MobilePanel> : null}
  </NativeWorkspaceScreen>;
}

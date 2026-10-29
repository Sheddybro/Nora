import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MobilePanel, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';

const sampleProducts = [
  { name: 'Radiance Serum', category: 'Skincare · demo stock 8', price: 18500, icon: '✧' },
  { name: 'Velvet Matte Lip', category: 'Makeup · demo stock 31', price: 12000, icon: '✦' },
  { name: 'Silk Repair Mask', category: 'Haircare · demo stock 14', price: 16800, icon: '◇' },
];

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

export default function PosScreen() {
  const theme = useMobileTheme();
  const [basket, setBasket] = useState<Record<string, { price: number; count: number }>>({});
  const count = Object.values(basket).reduce((total, item) => total + item.count, 0);
  const total = Object.values(basket).reduce((sum, item) => sum + item.price * item.count, 0);
  const add = (name: string, price: number) => setBasket((current) => ({ ...current, [name]: { price, count: (current[name]?.count || 0) + 1 } }));

  return <NativeWorkspaceScreen eyebrow="DEMO CHECKOUT" title="Point of sale" description="A native checkout preview. It does not create sales, take payment or update stock.">
    <MobilePanel eyebrow="SAMPLE CATALOG" title="Add to basket">{sampleProducts.map((product) => <Pressable key={product.name} accessibilityRole="button" accessibilityLabel={`Add ${product.name} to demo basket`} onPress={() => add(product.name, product.price)} style={[nativeStyles.stat, { borderBottomColor: theme.line, minHeight: 59 }]}><Text style={{ color: theme.rose, fontSize: 16, width: 25 }}>{product.icon}</Text><View style={{ flex: 1 }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '700' }}>{product.name}</Text><Text style={{ color: theme.muted, fontSize: 8, marginTop: 3 }}>{product.category}</Text></View><Text style={{ color: theme.rose, fontSize: 9, fontWeight: '700' }}>{naira(product.price)} ＋</Text></Pressable>)}</MobilePanel>
    <MobilePanel eyebrow="CURRENT BASKET" title={`${count} ${count === 1 ? 'item' : 'items'}`}>
      {count === 0 ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 23 }}>＋</Text><Text style={[nativeStyles.emptyTitle, { color: theme.ink }]}>Basket is empty</Text><Text style={[nativeStyles.emptyText, { color: theme.muted }]}>Choose a sample item above to preview the basket.</Text></View> : Object.entries(basket).map(([name, item]) => <View key={name} style={[nativeStyles.stat, { borderBottomColor: theme.line }]}><Text style={[nativeStyles.statLabel, { color: theme.ink, flex: 1 }]}>{name} × {item.count}</Text><Text style={[nativeStyles.statValue, { color: theme.ink }]}>{naira(item.price * item.count)}</Text></View>)}
  <View style={[nativeStyles.stat, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: theme.line, marginTop: 5 }]}><Text style={[nativeStyles.statLabel, { color: theme.muted }]}>Demo subtotal</Text><Text style={[nativeStyles.statValue, { color: theme.ink, fontSize: 14 }]}>{naira(total)}</Text></View>
  <Pressable accessibilityRole="button" disabled={count === 0} onPress={() => {}} style={[nativeStyles.button, { marginTop: 8, backgroundColor: count ? theme.rose : theme.line, opacity: count ? 1 : 0.65 }]}><Text style={[nativeStyles.buttonText, { color: count ? '#FFFFFF' : theme.muted }]}>Continue · preview only</Text></Pressable>
  <Text style={{ color: theme.muted, fontSize: 8, textAlign: 'center', marginTop: 8 }}>No payment, sale or stock movement will be posted.</Text>
+    </MobilePanel>
+  </NativeWorkspaceScreen>;
}

import React from 'react';
import { Text, View } from 'react-native';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';

const products = [
  ['✧', 'Radiance Serum', 'Skincare · NB-SK-104 · demo', '₦18,500'],
  ['✦', 'Velvet Matte Lip', 'Makeup · NB-MK-221 · demo', '₦12,000'],
  ['◇', 'Silk Repair Mask', 'Haircare · NB-HC-087 · demo', '₦16,800'],
  ['✧', 'Soft Glow Cleanser', 'Skincare · NB-SK-118 · demo', '₦14,200'],
];

export default function CatalogScreen() {
  const theme = useMobileTheme();
  return <NativeWorkspaceScreen eyebrow="CATALOG" title="Products" description="Browse a sample assortment. Product records are not connected to a live catalog.">
    <MobilePanel eyebrow="SAMPLE ASSORTMENT" title="Recently viewed">
      {products.map(([icon, title, detail, price]) => <MobileRow key={title} icon={icon} title={title} detail={detail} action={price} />)}
    </MobilePanel>
    <View style={[nativeStyles.empty, { borderColor: theme.line, borderWidth: 1, borderRadius: 9, backgroundColor: theme.card }]}>
      <Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>Catalog preview</Text>
      <Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Search, variants, photos and inventory links will use live catalog data in a later phase.</Text>
    </View>
  </NativeWorkspaceScreen>;
}

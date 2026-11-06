import React from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const mobileTheme = {
  light: { bg: '#FAF7F2', card: '#FFFEFC', ink: '#302D32', muted: '#827B82', rose: '#96515E', line: '#EBE5E1', blush: '#F3E4E4', gold: '#A37A3F', green: '#4F7968' },
  dark: { bg: '#1B191E', card: '#29262D', ink: '#F4EFF1', muted: '#B8AFB5', rose: '#D4939D', line: '#403B42', blush: '#4D383E', gold: '#E1BC7D', green: '#8BC0A8' },
};

export function useMobileTheme() {
  return useColorScheme() === 'dark' ? mobileTheme.dark : mobileTheme.light;
}

type WorkspaceScreenProps = { eyebrow: string; title: string; description: string; children: ReactNode };
type WorkspaceRowProps = { icon: string; title: string; detail: string; action?: string; onPress?: () => void };
type WorkspacePanelProps = { eyebrow?: string; title?: string; children: ReactNode };

export function NativeWorkspaceScreen({ eyebrow, title, description, children }: WorkspaceScreenProps) {
  const theme = useMobileTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/norris-logo.jpeg')} accessibilityLabel="Norris Beautyquest logo" resizeMode="contain" style={styles.logo} />
        <Text style={[styles.eyebrow, { color: theme.rose }]}>{eyebrow}</Text>
        <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.muted }]}>{description}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MobileRow({ icon, title, detail, action, onPress }: WorkspaceRowProps) {
  const theme = useMobileTheme();
  const content = <><Text style={[styles.rowIcon, { color: theme.rose, backgroundColor: theme.blush }]}>{icon}</Text><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: theme.ink }]}>{title}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{detail}</Text></View><Text style={[styles.rowAction, { color: theme.muted }]}>{action || '›'}</Text></>;
  if (!onPress) return <View style={[styles.row, { borderBottomColor: theme.line }]}>{content}</View>;
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, { borderBottomColor: theme.line }]}>{content}</Pressable>;
}

export function MobilePanel({ eyebrow, title, children }: WorkspacePanelProps) {
  const theme = useMobileTheme();
  return <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>{eyebrow ? <Text style={[styles.eyebrow, { color: theme.rose }]}>{eyebrow}</Text> : null}{title ? <Text style={[styles.panelTitle, { color: theme.ink }]}>{title}</Text> : null}{children}</View>;
}

export const nativeStyles = StyleSheet.create({
  stat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  statLabel: { fontSize: 10 }, statValue: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 125, gap: 7 }, emptyTitle: { fontSize: 12, fontWeight: '700' }, emptyText: { maxWidth: 250, fontSize: 9, lineHeight: 14, textAlign: 'center' },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 7, paddingHorizontal: 14 }, buttonText: { fontSize: 11, fontWeight: '700' },
});

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 18, paddingTop: 12, paddingBottom: 26, gap: 12 }, logo: { width: 112, height: 54, borderRadius: 7, backgroundColor: '#FFFFFF' }, eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }, title: { marginTop: 0, fontFamily: 'serif', fontSize: 27, lineHeight: 34, fontWeight: '600' }, description: { marginTop: -7, fontSize: 11, lineHeight: 17 },
  panel: { padding: 14, borderWidth: 1, borderRadius: 9 }, panelTitle: { marginTop: 5, marginBottom: 8, fontSize: 14, fontWeight: '700' },
  row: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth }, rowIcon: { width: 29, height: 29, borderRadius: 8, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', fontSize: 14 }, rowCopy: { flex: 1 }, rowTitle: { fontSize: 10, fontWeight: '600' }, rowDetail: { marginTop: 3, fontSize: 8 }, rowAction: { paddingHorizontal: 4, fontSize: 14 },
});

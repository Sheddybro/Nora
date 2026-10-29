import React from 'react';
import { ScrollView, Text, View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreviewRole } from './components/MobileRoleContext';

const colors = {
	light: { bg: '#FAF7F2', card: '#FFFEFC', ink: '#302D32', muted: '#827B82', rose: '#96515E', line: '#EBE5E1', blush: '#F3E4E4', gold: '#A37A3F', green: '#4F7968' },
	dark: { bg: '#1B191E', card: '#29262D', ink: '#F4EFF1', muted: '#B8AFB5', rose: '#D4939D', line: '#403B42', blush: '#4D383E', gold: '#E1BC7D', green: '#8BC0A8' },
};

const stats = [
	{ label: 'Net sales', value: '₦2.84m', delta: '↗ 12.8%', icon: '₦' },
	{ label: 'Orders', value: '214', delta: '↗ 8.2%', icon: '▤' },
	{ label: 'Average order', value: '₦13.3k', delta: '↗ 4.1%', icon: '◉' },
	{ label: 'Stock health', value: '92%', delta: '14 items to review', icon: '⌁' },
];

export default function Home() {
	const dark = useColorScheme() === 'dark';
	const theme = dark ? colors.dark : colors.light;
	const { role } = usePreviewRole();

	if (role === 'staff') {
		return (
			<SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
				<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
					<View style={styles.topline}><Text style={[styles.eyebrow, { color: theme.rose }]}>STAFF WORKSPACE</Text><Text style={[styles.date, { color: theme.muted }]}>29 OCT · LAGOS</Text></View>
					<Text style={[styles.title, { color: theme.ink }]}>Your day, at a glance.</Text>
					<Text style={[styles.subtitle, { color: theme.muted }]}>Operational tools for your shift.</Text>
					<View style={[styles.demoBanner, { backgroundColor: theme.blush, borderColor: theme.line }]}><Text style={{ color: theme.rose, fontSize: 15 }}>✦</Text><Text style={[styles.demoText, { color: theme.ink }]}>Staff preview · Sample figures, not live shift data.</Text></View>
					<View style={styles.grid}>{[['Shift sales', '₦184,200', '11 demo orders'], ['Open baskets', '2', 'Preview state'], ['Stock flags', '5', 'Sample alerts'], ['Guests served', '9', 'Today · demo']].map(([label, value, note]) => <View key={label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.line }]}><View style={styles.statTop}><Text style={[styles.statIcon, { color: theme.rose }]}>◈</Text><Text style={[styles.delta, { color: theme.green }]}>DEMO</Text></View><Text style={[styles.value, { color: theme.ink }]}>{value}</Text><Text style={[styles.label, { color: theme.muted }]}>{label}</Text><Text style={[styles.sample, { color: theme.muted }]}>{note}</Text></View>)}</View>
					<View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}><View style={styles.panelHeading}><View><Text style={[styles.eyebrow, { color: theme.rose }]}>YOUR WORKSPACE</Text><Text style={[styles.panelTitle, { color: theme.ink }]}>Everyday tasks</Text></View></View>{[['＋', 'Point of sale', 'Build a demo basket'], ['◇', 'Find a product', 'Browse sample catalog'], ['⌁', 'Check stock', 'View demo availability'], ['◎', 'Customer records', 'Search sample profiles']].map(([icon, title, detail]) => <View key={title} style={[styles.actionRow, { borderBottomColor: theme.line }]}><Text style={[styles.actionIcon, { backgroundColor: theme.blush, color: theme.rose }]}>{icon}</Text><View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: theme.ink }]}>{title}</Text><Text style={[styles.actionDetail, { color: theme.muted }]}>{detail}</Text></View><Text style={{ color: theme.muted }}>›</Text></View>)}</View>
					<Text style={[styles.disclaimer, { color: theme.muted }]}>Owner reports, purchases, staff administration and settings are not included in the Staff preview.</Text>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.topline}><Text style={[styles.eyebrow, { color: theme.rose }]}>OWNER OVERVIEW</Text><Text style={[styles.date, { color: theme.muted }]}>29 OCT · LAGOS</Text></View>
				<Text style={[styles.title, { color: theme.ink }]}>A clear view of your business.</Text>
				<Text style={[styles.subtitle, { color: theme.muted }]}>Your day, at a glance.</Text>
				<View style={[styles.demoBanner, { backgroundColor: theme.blush, borderColor: theme.line }]}><Text style={{ color: theme.rose, fontSize: 15 }}>✦</Text><Text style={[styles.demoText, { color: theme.ink }]}>Preview workspace · Sample figures, not live business data.</Text></View>
				<View style={styles.grid}>{stats.map((item) => <View key={item.label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.line }]}><View style={styles.statTop}><Text style={[styles.statIcon, { color: theme.rose }]}>{item.icon}</Text><Text style={[styles.delta, { color: theme.green }]}>{item.delta}</Text></View><Text style={[styles.value, { color: theme.ink }]}>{item.value}</Text><Text style={[styles.label, { color: theme.muted }]}>{item.label}</Text><Text style={[styles.sample, { color: theme.muted }]}>DEMO DATA</Text></View>)}</View>
				<View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}><View style={styles.panelHeading}><View><Text style={[styles.eyebrow, { color: theme.rose }]}>PERFORMANCE</Text><Text style={[styles.panelTitle, { color: theme.ink }]}>Sales overview</Text></View><Text style={[styles.period, { color: theme.rose }]}>THIS WEEK⌄</Text></View><View style={styles.chart}>{[42, 66, 51, 78, 60, 92, 71].map((height, index) => <View key={index} style={styles.barWrap}><Text style={[styles.barValue, { color: theme.muted }]}>{height}</Text><View style={[styles.bar, { height: `${height}%`, backgroundColor: index === 5 ? theme.rose : theme.blush }]} /><Text style={[styles.day, { color: theme.muted }]}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text></View>)}</View><Text style={[styles.chartCaption, { color: theme.muted }]}>Illustrative sales distribution · demo data</Text></View>
				<View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}><View style={styles.panelHeading}><View><Text style={[styles.eyebrow, { color: theme.rose }]}>ACTION REQUIRED</Text><Text style={[styles.panelTitle, { color: theme.ink }]}>Needs your attention</Text></View><Text style={[styles.count, { backgroundColor: theme.blush, color: theme.rose }]}>3</Text></View>{[['!', 'Low stock items', '14 products below reorder point'], ['↗', 'Incoming orders', '2 due this week'], ['♙', 'Team invitations', '2 awaiting response']].map(([icon, title, detail]) => <View key={title} style={[styles.actionRow, { borderBottomColor: theme.line }]}><Text style={[styles.actionIcon, { backgroundColor: theme.blush, color: theme.rose }]}>{icon}</Text><View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: theme.ink }]}>{title}</Text><Text style={[styles.actionDetail, { color: theme.muted }]}>{detail}</Text></View><Text style={{ color: theme.muted }}>›</Text></View>)}</View>
				<View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}><View style={styles.panelHeading}><View><Text style={[styles.eyebrow, { color: theme.rose }]}>SHORTCUTS</Text><Text style={[styles.panelTitle, { color: theme.ink }]}>Quick actions</Text></View></View><View style={styles.quickGrid}>{[['＋', 'Start a sale'], ['◇', 'Add product'], ['⌁', 'Review stock'], ['▥', 'View reports']].map(([icon, label]) => <View key={label} style={[styles.quickItem, { backgroundColor: theme.bg }]}><Text style={{ color: theme.rose, fontSize: 18 }}>{icon}</Text><Text style={[styles.quickText, { color: theme.ink }]}>{label}</Text></View>)}</View><Text style={[styles.disclaimer, { color: theme.muted }]}>Preview controls only · no transactions or stock changes are submitted.</Text></View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 22, gap: 14 },
	topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }, date: { fontSize: 9, fontWeight: '600' },
	title: { marginTop: 2, fontFamily: 'serif', fontSize: 27, lineHeight: 34, fontWeight: '600' }, subtitle: { marginTop: -10, fontSize: 12 },
	demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderWidth: 1, borderRadius: 8 }, demoText: { flex: 1, fontSize: 9, lineHeight: 14 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, statCard: { position: 'relative', width: '48.5%', minHeight: 112, padding: 12, borderWidth: 1, borderRadius: 9 }, statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statIcon: { fontSize: 15, fontWeight: '700' }, delta: { fontSize: 8, fontWeight: '600' }, value: { marginTop: 10, fontSize: 20, fontWeight: '700' }, label: { marginTop: 3, fontSize: 10 }, sample: { marginTop: 6, fontSize: 7, letterSpacing: 0.8 },
	panel: { padding: 14, borderWidth: 1, borderRadius: 9 }, panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, panelTitle: { marginTop: 4, fontSize: 14, fontWeight: '700' }, period: { fontSize: 8, fontWeight: '700' },
	chart: { height: 128, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7, paddingTop: 13 }, barWrap: { height: '100%', flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }, barValue: { fontSize: 7 }, bar: { width: '70%', minHeight: 12, borderRadius: 4 }, day: { fontSize: 8 }, chartCaption: { marginTop: 10, fontSize: 8 },
	count: { width: 23, height: 23, textAlign: 'center', textAlignVertical: 'center', borderRadius: 12, overflow: 'hidden', fontSize: 10, fontWeight: '700' }, actionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth }, actionIcon: { width: 27, height: 27, textAlign: 'center', textAlignVertical: 'center', borderRadius: 7, overflow: 'hidden', fontSize: 13 }, actionCopy: { flex: 1 }, actionTitle: { fontSize: 10, fontWeight: '600' }, actionDetail: { marginTop: 3, fontSize: 8 },
	quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, quickItem: { width: '48.5%', minHeight: 64, justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 7 }, quickText: { fontSize: 9, fontWeight: '600' }, disclaimer: { marginTop: 10, fontSize: 8, lineHeight: 13 },
});

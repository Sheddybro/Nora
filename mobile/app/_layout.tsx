import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileRoleContext, type PreviewRole } from './components/MobileRoleContext';

const palette = {
	light: { background: '#FAF7F2', surface: '#FFFEFC', ink: '#302D32', muted: '#827B82', rose: '#96515E', line: '#EBE5E1' },
	dark: { background: '#1B191E', surface: '#29262D', ink: '#F4EFF1', muted: '#B8AFB5', rose: '#D4939D', line: '#403B42' },
};

const ownerTabs = [
	{ name: 'index', title: 'Overview', icon: '◫' },
	{ name: 'catalog', title: 'Catalog', icon: '◇' },
	{ name: 'pos', title: 'Sell', icon: '＋' },
	{ name: 'inventory', title: 'Stock', icon: '▤' },
	{ name: 'more', title: 'More', icon: '•••' },
];

const staffTabs = [
	{ name: 'index', title: 'Today', icon: '◫' },
	{ name: 'catalog', title: 'Catalog', icon: '◇' },
	{ name: 'pos', title: 'Sell', icon: '＋' },
	{ name: 'inventory', title: 'Stock', icon: '▤' },
	{ name: 'customers', title: 'Guests', icon: '◎' },
];

function MobileTabBar({ state, navigation, role, colors }) {
	const allowed = role === 'owner' ? ownerTabs : staffTabs;
	const enabled = new Set(allowed.map((tab) => tab.name));

	return (
		<View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 7, paddingBottom: 8 }}>
			{state.routes.filter((route) => enabled.has(route.name)).map((route) => {
				const tab = allowed.find((item) => item.name === route.name);
				const focused = state.routes[state.index]?.name === route.name;
				const color = focused ? colors.rose : colors.muted;
				const onPress = () => {
					const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
					if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
				};

				return (
					<Pressable key={route.key} accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={tab.title} onPress={onPress} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
						<Text style={{ color, fontSize: route.name === 'pos' ? 23 : 18, fontWeight: focused ? '700' : '500', lineHeight: 22 }}>{tab.icon}</Text>
						<Text style={{ color, fontSize: 9, fontWeight: focused ? '700' : '500' }}>{tab.title}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export default function Layout() {
	const scheme = useColorScheme();
	const colors = scheme === 'dark' ? palette.dark : palette.light;
	const [role, setRole] = useState<PreviewRole>(process.env.EXPO_PUBLIC_PREVIEW_ROLE === 'staff' ? 'staff' : 'owner');

	return (
		<SafeAreaProvider>
			<MobileRoleContext.Provider value={{ role, setRole }}>
			<Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }} tabBar={(props) => <MobileTabBar {...props} role={role} colors={colors} />}>
				<Tabs.Screen name="index" options={{ title: 'Overview' }} />
				<Tabs.Screen name="catalog" options={{ title: 'Catalog' }} />
				<Tabs.Screen name="pos" options={{ title: 'Sell' }} />
				<Tabs.Screen name="inventory" options={{ title: 'Stock' }} />
				<Tabs.Screen name="customers" options={{ title: 'Guests', href: role === 'staff' ? '/customers' : null }} />
				<Tabs.Screen name="more" options={{ title: 'More', href: role === 'owner' ? '/more' : null }} />
				<Tabs.Screen name="login" options={{ title: 'Sign in', href: null }} />
				<Tabs.Screen name="more/[module]" options={{ title: 'Workspace detail', href: null }} />
			</Tabs>
			</MobileRoleContext.Provider>
		</SafeAreaProvider>
	);
}

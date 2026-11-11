import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './components/AuthContext';
import { tabsForRole } from '../lib/navigation';

const palette = {
	light: { background: '#FAF7F2', surface: '#FFFEFC', ink: '#302D32', muted: '#827B82', rose: '#96515E', line: '#EBE5E1' },
	dark: { background: '#1B191E', surface: '#29262D', ink: '#F4EFF1', muted: '#B8AFB5', rose: '#D4939D', line: '#403B42' },
};

function MobileTabBar({ state, navigation, role, colors }) {
	const insets = useSafeAreaInsets();
	const allowed = tabsForRole(role);
	const enabled = new Set(allowed.map((tab) => tab.name));

	return (
		<View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 8) }}>
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

function AppShell() {
	const scheme = useColorScheme();
	const colors = scheme === 'dark' ? palette.dark : palette.light;
	const { session, isLoading } = useAuth();
	if (isLoading) {
		return null;
	}

	const effectiveRole = session?.role ?? 'staff';

	return (
		<SafeAreaProvider>
			<Tabs initialRouteName={session ? 'index' : 'login'} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }} tabBar={(props) => session ? <MobileTabBar {...props} role={effectiveRole} colors={colors} /> : null}>
				<Tabs.Screen name="index" options={{ title: 'Overview', href: session ? '/index' : null }} />
				<Tabs.Screen name="catalog" options={{ title: 'Catalog', href: session ? '/catalog' : null }} />
				<Tabs.Screen name="pos" options={{ title: 'Sell', href: session ? '/pos' : null }} />
				<Tabs.Screen name="inventory" options={{ title: 'Stock', href: session ? '/inventory' : null }} />
				<Tabs.Screen name="customers" options={{ title: 'Guests', href: session && effectiveRole === 'staff' ? '/customers' : null }} />
				<Tabs.Screen name="more" options={{ title: 'More', href: session ? '/more' : null }} />
				<Tabs.Screen name="login" options={{ title: 'Sign in', href: session ? null : '/login' }} />
				<Tabs.Screen name="more/[module]" options={{ title: 'Workspace detail', href: null }} />
			</Tabs>
		</SafeAreaProvider>
	);
}

export default function Layout() {
	return (
		<AuthProvider>
			<AppShell />
		</AuthProvider>
	);
}

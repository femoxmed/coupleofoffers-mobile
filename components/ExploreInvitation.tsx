import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Palette } from '../constants/Colors';

export function ExploreInvitation() {
	const router = useRouter();
	return (
		<View style={styles.section}>
			<View pointerEvents='none' style={styles.orbit} />
			<View pointerEvents='none' style={styles.orbitSmall} />
			<View style={styles.eyebrow}>
				<Text style={styles.eyebrowText}>MAKE TIME FOR SOMETHING GOOD</Text>
			</View>
			<Text style={styles.title}>Your next great{'\n'}experience awaits.</Text>
			<Text style={styles.copy}>
				A new favourite spot. A quiet reset. A little adventure. Find a plan
				that feels like you.
			</Text>
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={() => router.push('/(tabs)/explore')}
				accessibilityRole='button'
				style={styles.button}>
				<Text style={styles.buttonText}>Explore experiences</Text>
				<ArrowRight size={16} color={Palette.aubergine} />
			</TouchableOpacity>
			<Text style={styles.note}>
				For yourself. For two. For your favourite people.
			</Text>
		</View>
	);
}
const styles = StyleSheet.create({
	section: {
		margin: 16,
		marginTop: 24,
		padding: 26,
		borderRadius: 26,
		backgroundColor: Palette.aubergine,
		overflow: 'hidden',
	},
	orbit: {
		position: 'absolute',
		width: 210,
		height: 275,
		borderRadius: 140,
		borderWidth: 1,
		borderColor: '#E5C99A28',
		right: -80,
		top: 20,
		transform: [{ rotate: '28deg' }],
	},
	orbitSmall: {
		position: 'absolute',
		width: 160,
		height: 215,
		borderRadius: 120,
		borderWidth: 1,
		borderColor: '#96527655',
		right: -55,
		top: 100,
		transform: [{ rotate: '28deg' }],
	},
	eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
	eyebrowText: {
		fontSize: 8.5,
		letterSpacing: 1.2,
		color: Palette.champagne,
		fontWeight: '700',
	},
	title: {
		marginTop: 18,
		fontSize: 29,
		lineHeight: 34,
		letterSpacing: -0.8,
		color: Palette.porcelain,
		fontWeight: '800',
	},
	copy: {
		marginTop: 12,
		maxWidth: 280,
		fontSize: 13,
		lineHeight: 21,
		color: '#DCCDD6',
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 18,
		alignSelf: 'flex-start',
		paddingHorizontal: 18,
		paddingVertical: 14,
		borderRadius: 24,
		marginTop: 24,
		backgroundColor: Palette.champagne,
	},
	buttonText: { fontSize: 13, fontWeight: '800', color: Palette.aubergine },
	note: { marginTop: 16, fontSize: 10, lineHeight: 16, color: '#C4AFC0' },
});

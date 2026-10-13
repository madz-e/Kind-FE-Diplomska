// src/navigation/TabBar.jsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarScreens } from '../config/NavigationScreens';
import Home from '../tabs/Home';
import Mood from '../tabs/Mood';
import Journal from '../tabs/Journal';
import Resources from '../tabs/Resources';
import Profile from '../tabs/Profile';
import { pastel } from '@/components';

const Tab = createBottomTabNavigator();

// CHANGED: rounder, friendlier icon per tab, filled when active / outline when idle.
const ICONS = {
  Home: { outline: 'home-variant-outline', filled: 'home-variant' },
  Mood: { outline: 'emoticon-happy-outline', filled: 'emoticon-happy' },
  Journal: { outline: 'book-open-page-variant-outline', filled: 'book-open-page-variant' },
  // CHANGED: was 'meditation' (a seated-person icon) when active — swapped
  // the air-waves icon it shows the rest of the time, so selecting the tab
  // no longer changes what icon it is.
  Resources: { outline: 'weather-windy', filled: 'weather-windy' },
  Profile: { outline: 'account-circle-outline', filled: 'account-circle' },
};

// CHANGED: 'Breathe' is the visible label for the Resources route.
const LABELS = { Home: 'Home', Mood: 'Mood', Journal: 'Journal', Resources: 'Breathe', Profile: 'Profile' };

// CHANGED: pulled the top-rim streak and side specular streak back out —
// those were the "weird white line on top" / "fuzzy white line on the left"
// artifacts. Kept the base fill, soft reflection fade, and border, which
// still reads as glossy without the two extra streaks causing visible seams.
const ActivePill = () => (
  <>
    <View style={[StyleSheet.absoluteFill, styles.pillShadow]} pointerEvents="none" />
    <View style={[StyleSheet.absoluteFill, styles.pill]} pointerEvents="none">
      {/* body fill — solid purple, CHANGED: darker top (#9C7BEA, purpleDeep)
          fading to the same light lavender bottom, for a stronger dark→light read */}
      <LinearGradient
        colors={['#6cb1ff', '#c9a0fd', '#ffbe85']}
        locations={[0.2, 0.5, 0.8]}
        start={{ x: 0, y: -0.3 }}
        end={{ x: 1, y: 1.3 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* soft overall reflection fade, top-heavy */}
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* small white petal-style highlight, diagonal fade to transparent,
          sitting inside the pill's top-left corner */}
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 0.4 }}
        style={styles.pillAccentCircle}
        pointerEvents="none"
      />
      {/* mirrored highlight in the bottom-right corner — gradient starts at
          that edge and fades to transparent heading toward the middle */}
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.6, y: 0.6 }}
        style={styles.pillAccentCircleBottomRight}
        pointerEvents="none"
      />
      {/* glass edge */}
      <View style={[StyleSheet.absoluteFillObject, styles.pillBorder]} />
    </View>
  </>
);

// CHANGED: fully custom bar so BOTH the bar and the active indicator get the glass
// treatment (gloss + reflection + border). The old built-in options couldn't border
// or add a sheen to either one.
const GlassTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}
    >
      <View style={styles.bar}>
        {/* glass bar fill — same recipe as the cards */}
        <LinearGradient
          colors={[pastel.navPink, pastel.navPurple, pastel.navBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.4 }}
          style={[StyleSheet.absoluteFillObject, styles.barFill]}
          pointerEvents="none"
        >
          {/* reflection sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 0.55, y: 0.9 }}
            style={[StyleSheet.absoluteFillObject, styles.barFill]}
          />
          {/* glossy white border */}
          <View style={[StyleSheet.absoluteFillObject, styles.barBorder]} />
        </LinearGradient>

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const tab = route.name;
            const color = focused ? '#fff' : pastel.textMuted;
            const iconName = focused ? ICONS[tab].filled : ICONS[tab].outline;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                <View style={[styles.item, focused && styles.itemActive]}>
                  {focused && <ActivePill />}
                  <MaterialCommunityIcons name={iconName} size={22} color={color} />
                  <Text
                    style={[styles.label, { color }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {LABELS[tab]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <GlassTabBar {...props} />}
  >
    <Tab.Screen name={TabBarScreens.Home} component={Home} />
    <Tab.Screen name={TabBarScreens.Mood} component={Mood} />
    <Tab.Screen name={TabBarScreens.Journal} component={Journal} />
    <Tab.Screen name={TabBarScreens.Resources} component={Resources} />
    <Tab.Screen name={TabBarScreens.Profile} component={Profile} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  bar: {
    height: 68,
    borderRadius: 999,
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  barFill: { borderRadius: 999, overflow: 'hidden' },
  barBorder: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: pastel.glassBorder,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // CHANGED: paddingTop reduced relative to paddingBottom so the icon+label
  // sit a touch higher within the tab instead of feeling pushed toward the
  // bottom edge.
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 5,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  // CHANGED: fixed width instead of content-hugging padding — every active
  // pill is now the same size no matter which tab (short "Home" vs longer
  // "Journal"/"Breathe"/"Profile"), and since all tabs stay equal flex:1,
  // this fixed size never causes neighboring tabs to reflow.
  itemActive: {
    width: 74,
    paddingTop: 5,
    paddingBottom: 10,
  },
  pill: { borderRadius: 999, overflow: 'hidden' },
  pillShadow: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  pillBorder: {
    borderRadius: 999,
    borderWidth: 1.3,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  // NEW: small white petal-style highlight sitting inside the pill's
  // top-left corner (diagonal fade to transparent, same recipe as the
  // Breathe screen's petals) — positive offsets keep it fully inside the pill.
  pillAccentCircle: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 60,
    height: 47,
    borderRadius: 999,
  },
  // NEW: mirrored highlight anchored to the bottom-right corner instead —
  // same size/shape, gradient direction flipped so it starts at that edge
  // and fades toward the middle.
  pillAccentCircleBottomRight: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 61,
    height: 48,
    borderRadius: 999,
  },
  label: { fontSize: 11, fontWeight: '700' },
});

export default AppTabs;
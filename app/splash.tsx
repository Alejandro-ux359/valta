import { useEffect, useRef } from "react";
import { Image, StyleSheet, Animated, Dimensions } from "react-native";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const fullOpacity = useRef(new Animated.Value(0)).current;
  const fullScale = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Aparece el ícono V
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 2. Pausa con el ícono
      Animated.delay(600),

      // 3. Ícono desaparece
      Animated.timing(iconOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),

      // 4. Aparece logo completo
      Animated.parallel([
        Animated.timing(fullOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(fullScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // 5. Pausa con logo completo
      Animated.delay(1200),

      // 6. Fade out
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace("/(tabs)" as any);
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      {/* Ícono V solo */}
      <Animated.View
        style={[
          styles.centered,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/logo-icon.png")}
          style={styles.iconImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Logo completo */}
      <Animated.View
        style={[
          styles.centered,
          {
            opacity: fullOpacity,
            transform: [{ scale: fullScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/logo-full.png")}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width,
    height,
  },
  iconImage: {
    width: 160,
    height: 160,
  },
  fullImage: {
    width: width * 0.75,
    height: 200,
  },
});

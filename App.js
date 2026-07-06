import React, { useState, useRef } from 'react';
import { Animated, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import LoginScreen from './screen/LoginScreen';
import MeseroScreen from './screen/MeseroScreen';
import CocinaScreen from './screen/CocinaScreen';
import CajaScreen from './screen/CajaScreen';
import AdminScreen from './screen/AdminScreen';
import { apiFetch } from './src/api';

/**
 * Coffee Code POS - Main Application
 * Routes to 4 screens based on user role:
 *   - mesero  → MeseroScreen
 *   - cocina  → CocinaScreen
 *   - caja    → CajaScreen
 *   - admin   → AdminScreen
 */

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('mesero');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Transition animation values
  const loginOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(1.05)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  /**
   * Handle user login. Validates credentials via API.
   */
  const handleLogin = async (user, pass) => {
    try {
      setLoading(true);
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ user, passw: pass })
      });
      
      setUserName(data.nombre);
      setUserRole(data.rol.toLowerCase());
      setUserId(data.id);
      
      setIsLoggedIn(true);
      Animated.parallel([
        Animated.timing(screenOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(screenScale, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      
    } catch (err) {
      Alert.alert('Error de acceso', err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Render the correct screen based on role
  const renderScreen = () => {
    switch (userRole) {
      case 'cocina': return <CocinaScreen userName={userName} onLogout={handleLogout} />;
      case 'caja':   return <CajaScreen userName={userName} onLogout={handleLogout} />;
      case 'admin':  return <AdminScreen userName={userName} onLogout={handleLogout} />;
      default:       return <MeseroScreen userName={userName} onLogout={handleLogout} />;
    }
  };

  return (
    <>
      {/* Role-based screen (behind login initially) */}
      <Animated.View
        style={[
          styles.screen,
          {
            opacity: screenOpacity,
            transform: [{ scale: screenScale }],
          },
        ]}
        pointerEvents={isLoggedIn ? 'auto' : 'none'}
      >
        {renderScreen()}
      </Animated.View>

      {/* Login screen (on top initially) */}
      {!isLoggedIn ? (
        <View style={styles.screen}>
          <LoginScreen onLogin={handleLogin} />
          {loading && <View style={[StyleSheet.absoluteFill, {justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)'}]}><ActivityIndicator size="large" color="#fff" /></View>}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
});

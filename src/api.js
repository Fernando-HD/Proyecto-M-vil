import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Detecta automaticamente la IP de tu computadora usando la info de Expo.
// Funciona tanto en el navegador web como en el celular con Expo Go,
// sin necesidad de cambiar la IP a mano cuando cambie tu red.
const getApiUrl = () => {
  // En web, localhost siempre funciona porque el navegador corre en la misma PC
  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }

  // En Expo Go (celular), tomamos la IP que Expo uso para conectar Metro
  const debuggerHost =
    Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;

  const host = debuggerHost ? debuggerHost.split(':')[0] : null;

  if (host) {
    return `http://${host}:8080/api`;
  }

  // Fallback por si no se pudo detectar (ajusta esta IP si llega a pasar)
  return 'http://192.168.100.25:8080/api';
};

export const API_URL = getApiUrl();

export const apiFetch = async (endpoint, options = {}) => {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error en la petición');
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
};
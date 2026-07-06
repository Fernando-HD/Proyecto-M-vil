import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated, StatusBar, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const C = {
  primary: '#3e2723',
  primaryDark: '#2d1b18',
  accent: '#d7ccc8',
  accentLight: '#efebe9',
  textBrown: '#4e342e',
  border: '#8d6e63',
  white: '#ffffff',
  bg: '#f5f5f5',
};

export default function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const t = setTimeout(() => setCanEdit(true), 150);
    return () => clearTimeout(t);
  }, []);

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  const handleLogin = () => { if (user.trim() && pass.trim()) onLogin(user, pass); };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={s.logo}><FontAwesome5 name="coffee" size={42} color={C.textBrown} /></View>
      <Text style={s.title}>Coffee Code</Text>
      <Text style={s.sub}>Punto de Venta y Administración</Text>
      <View style={s.form}>
        {/* Trampa para el autocompletado de Chrome */}
        <TextInput style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
        <TextInput style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} secureTextEntry />
        
        <View style={s.group}>
          <Text style={s.label}>USUARIO</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={user} onChangeText={setUser} placeholder="Usuario" placeholderTextColor={C.border} autoCapitalize="none" autoComplete="new-password" textContentType="oneTimeCode" autoCorrect={false} importantForAutofill="no" editable={canEdit} />
          </View>
        </View>
        <View style={s.group}>
          <Text style={s.label}>Contraseña</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={pass} onChangeText={setPass} placeholder="Contraseña" placeholderTextColor={C.border} secureTextEntry autoComplete="new-password" textContentType="oneTimeCode" autoCorrect={false} importantForAutofill="no" editable={canEdit} />
          </View>
        </View>
      </View>
      <View style={s.btnMargin}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity style={s.btn} onPress={handleLogin} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={0.9}>
            <Text style={s.btnText}>INICIAR SESIÓN</Text>
            <FontAwesome5 name="sign-in-alt" size={14} color={C.primary} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  title: { fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: -0.75, marginBottom: 8 },
  sub: { fontSize: 14, color: C.accentLight, textAlign: 'center', marginBottom: 48 },
  form: { width: '100%', gap: 20 },
  group: { gap: 5 },
  label: { fontSize: 12, fontWeight: '700', color: C.accentLight, textTransform: 'uppercase', letterSpacing: 0.3 },
  inputWrap: { backgroundColor: C.primaryDark, borderWidth: 1, borderColor: '#5d4037', borderRadius: 12, overflow: 'hidden' },
  input: { padding: 16, color: C.white, fontSize: 14 },
  btnMargin: { width: '100%', marginTop: 40 },
  btn: { backgroundColor: C.white, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  btnText: { fontSize: 16, fontWeight: '700', color: C.primary },
});

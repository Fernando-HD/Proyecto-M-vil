import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Animated, StatusBar, ScrollView, Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch } from '../src/api';

const C = {
  primary: '#3e2723', primaryDark: '#2d1b18', darkest: '#1c1917',
  accent: '#e5e7eb', accentLight: '#f3f4f6',
  white: '#ffffff', bg: '#f5f5f4', text: '#292524',
  textDark: '#111', textMuted: '#78716c', textGray: '#a8a29e',
  success: '#10b981', successBg: '#e8f5e9', warning: '#f59e0b', error: '#ef4444',
  border: '#f3f4f6', borderAccent: '#8d6e63', bgCard: '#f9fafb',
};

const MESAS = ['01','02','03','04','05','06','07','08','09','10'];

export default function MeseroScreen({ userName, onLogout, userId = 2 }) {
  const [activeCat, setActiveCat] = useState('todo');
  const [menu, setMenu] = useState([]);
  const [qty, setQty] = useState({});
  const [mesa, setMesa] = useState('01');
  const [showMesa, setShowMesa] = useState(false);
  const [loading, setLoading] = useState(true);

  const toastY = useRef(new Animated.Value(-120)).current;
  const toastO = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState({ t: '', m: '' });

  const loadMenu = () => {
    apiFetch('/menu')
      .then(data => {
        setMenu(data);
        setQty(prev => {
          const q = { ...prev };
          data.forEach(p => { if (q[p.id] === undefined) q[p.id] = 0; });
          return q;
        });
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenu();
    const int = setInterval(loadMenu, 5000);
    return () => clearInterval(int);
  }, []);

  const dynamicCategories = [
    { key: 'todo', label: 'Todo' },
    ...Array.from(new Set(menu.map(p => p.categoria))).map(c => ({ key: c, label: c }))
  ];

  const filtered = activeCat === 'todo' ? menu : menu.filter(p => p.categoria === activeCat);
  const total = menu.reduce((s, p) => s + (p.precio || 0) * (qty[p.id] || 0), 0);

  const inc = useCallback(id => setQty(p => ({ ...p, [id]: (p[id]||0)+1 })), []);
  const dec = useCallback(id => setQty(p => ({ ...p, [id]: Math.max(0,(p[id]||0)-1) })), []);

  const showToast = (t, m) => {
    setToast({ t, m });
    Animated.parallel([
      Animated.spring(toastY, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.timing(toastO, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastY, { toValue: -120, duration: 300, useNativeDriver: true }),
        Animated.timing(toastO, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 3000);
  };

  const send = async () => {
    if (total === 0) return;
    const items = menu.filter(p => qty[p.id] > 0).map(p => ({
      producto_id: p.id,
      cantidad: qty[p.id],
      precio_unitario: p.precio
    }));
    
    try {
      const res = await apiFetch('/pedidos', { method: 'POST', body: JSON.stringify({ usuario_id: userId, mesa, items }) });
      showToast(`Orden #${res.id}`, `Orden enviada a cocina para Mesa ${mesa}.`);
      const q = {}; menu.forEach(p => q[p.id] = 0);
      setQty(q);
    } catch(e) {
      showToast('Error', 'No se pudo enviar la orden');
    }
  };

  const renderProduct = ({ item }) => {
    const q = qty[item.id] || 0;
    return (
      <View style={[st.card, q > 0 && st.cardActive, !item.disponible && { opacity: 0.4 }]}>
        <View style={[st.cardIcon, { backgroundColor: item.disponible ? '#D7CCC8' : '#e5e7eb' }]}>
          <FontAwesome5 name={item.icon || 'coffee'} size={28} color={item.disponible ? C.primary : C.textMuted} />
        </View>
        <Text style={[st.cardName, q === 0 && { color: C.textGray }]}>{item.nombre}</Text>
        <Text style={[st.cardPrice, q === 0 && { color: C.textMuted }]}>${(item.precio || 0).toFixed(2)}</Text>
        <View style={st.qtyRow}>
          <TouchableOpacity style={st.qtyMinus} onPress={() => dec(item.id)} disabled={!item.disponible}><FontAwesome5 name="minus" size={11} color={C.textMuted} /></TouchableOpacity>
          <Text style={st.qtyVal}>{q}</Text>
          <TouchableOpacity style={[st.qtyPlus, q > 0 && { backgroundColor: C.primary }]} onPress={() => inc(item.id)} disabled={!item.disponible}><FontAwesome5 name="plus" size={11} color={C.white} /></TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* Header */}
      <View style={st.header}>
        <View><Text style={st.hRole}>Mesero</Text><Text style={st.hName}>{userName||'Gabo A.'}</Text></View>
        <Text style={st.hTitle}>Panel de Mesero</Text>
        <TouchableOpacity style={st.mesaBadge} onPress={() => setShowMesa(true)}>
          <Text style={st.mesaText}>Mesa {mesa} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* Mesa Modal */}
      <Modal visible={showMesa} transparent animationType="fade" onRequestClose={() => setShowMesa(false)}>
        <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setShowMesa(false)}>
          <View style={st.mesaDrop}>
            <Text style={st.mesaDropTitle}>Seleccionar Mesa</Text>
            <View style={st.mesaGrid}>
              {MESAS.map(m => (
                <TouchableOpacity key={m} style={[st.mesaOpt, mesa===m && st.mesaOptA]} onPress={() => { setMesa(m); setShowMesa(false); }}>
                  <Text style={[st.mesaOptT, mesa===m && { color: C.white }]}>Mesa {m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.cats} contentContainerStyle={st.catsInner}>
        {dynamicCategories.map(c => (
          <TouchableOpacity key={c.key} style={[st.catBtn, activeCat===c.key && st.catBtnA]} onPress={() => setActiveCat(c.key)}>
            <Text style={[st.catText, activeCat===c.key && { color: C.white }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products */}
      <FlatList data={filtered} renderItem={renderProduct} keyExtractor={i => String(i.id)} numColumns={2} columnWrapperStyle={st.gridRow} contentContainerStyle={st.gridContent} showsVerticalScrollIndicator={false} />

      {/* Footer */}
      <View style={st.footer}>
        <View style={st.footerTop}><Text style={st.footerLabel}>Total a cobrar:</Text><Text style={st.footerTotal}>${total.toFixed(2)}</Text></View>
        <Text style={st.footerOrder}>Enviando a API</Text>
        <TouchableOpacity style={[st.btnSend, total===0 && { opacity: 0.5 }]} onPress={send} disabled={total===0}>
          <Text style={st.btnSendText}>ENVIAR A COCINA</Text>
          <FontAwesome5 name="paper-plane" size={14} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Toast */}
      <Animated.View style={[st.toast, { transform: [{ translateY: toastY }], opacity: toastO }]} pointerEvents="none">
        <View style={st.toastIcon}><FontAwesome5 name="check-circle" size={20} color={C.success} /></View>
        <View><Text style={st.toastT}>{toast.t}</Text><Text style={st.toastM}>{toast.m}</Text></View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.primary, paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.1, shadowRadius:6, elevation:4 },
  hRole: { fontSize: 12, color: C.white, opacity: 0.8 },
  hName: { fontSize: 16, fontWeight: '700', color: C.white },
  hTitle: { position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.white },
  mesaBadge: { backgroundColor: 'rgba(239,235,233,0.2)', borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 14 },
  mesaText: { fontSize: 16, fontWeight: '700', color: C.accentLight },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mesaDrop: { backgroundColor: C.white, borderRadius: 20, padding: 24, width: '80%' },
  mesaDropTitle: { fontSize: 18, fontWeight: '700', color: C.textDark, textAlign: 'center', marginBottom: 16 },
  mesaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  mesaOpt: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f3f4f6', minWidth: 90, alignItems: 'center' },
  mesaOptA: { backgroundColor: C.primary },
  mesaOptT: { fontSize: 14, fontWeight: '600', color: C.textGray },

  cats: { backgroundColor: C.white, flexGrow: 0 },
  catsInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  catBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 9999, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  catBtnA: { backgroundColor: C.primary },
  catText: { fontSize: 14, fontWeight: '700', color: C.textGray },

  gridContent: { padding: 16, paddingBottom: 8 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  card: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 12, marginHorizontal: 4, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 },
  cardActive: { borderColor: C.borderAccent },
  cardIcon: { height: 80, backgroundColor: C.accent, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#5d4037', marginBottom: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 4 },
  qtyMinus: { width: 30, height: 30, borderRadius: 6, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  qtyPlus: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#767676', alignItems: 'center', justifyContent: 'center' },
  qtyVal: { fontSize: 16, fontWeight: '700', color: C.textDark, minWidth: 20, textAlign: 'center' },

  footer: { backgroundColor: C.white, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, shadowColor:'#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.1, shadowRadius:6, elevation:4 },
  footerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  footerLabel: { fontSize: 14, color: C.textGray },
  footerTotal: { fontSize: 22, fontWeight: '800', color: C.primary },
  footerOrder: { fontSize: 12, color: C.textMuted, marginBottom: 10 },
  btnSend: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSendText: { fontSize: 14, fontWeight: '700', color: C.white, letterSpacing: 0.5 },

  toast: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: C.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor:'#000', shadowOffset:{width:0,height:10}, shadowOpacity:0.2, shadowRadius:15, elevation:8, zIndex: 100 },
  toastIcon: { width: 44, height: 44, backgroundColor: C.successBg, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  toastT: { fontSize: 14, fontWeight: '700', color: C.textDark },
  toastM: { fontSize: 12, color: C.textGray },
});

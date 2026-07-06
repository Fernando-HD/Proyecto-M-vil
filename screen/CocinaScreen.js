import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Switch,
  StyleSheet, Animated, StatusBar, ScrollView, TextInput, Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch } from '../src/api';

const C = {
  primary: '#3e2723', primaryDark: '#2d1b18',
  accent: '#d7ccc8', accentLight: '#efebe9',
  white: '#fff', bg: '#f5f5f5',
  textDark: '#000', textGray: '#6b7280', textMuted: '#9ca3af',
  success: '#22c55e', successBg: '#e8f5e9',
  warning: '#f59e0b', warningBg: '#fef3c7', warningBorder: '#fde68a',
  error: '#ef4444',
};

export default function CocinaScreen({ userName, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [tab, setTab] = useState('ordenes');

  // Abastecer insumo form
  const [selInsumo, setSelInsumo] = useState(null);
  const [abCantidad, setAbCantidad] = useState(null);
  const [precioUnit, setPrecioUnit] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showQtyDrop, setShowQtyDrop] = useState(false);

  // Generate quantity options based on unit type
  const getQtyOptions = (unidad) => {
    if(!unidad) return [];
    const u = unidad.toLowerCase();
    if(u === 'kg') return [0.5, 1, 2, 3, 5, 10, 15, 20];
    if(u === 'l') return [0.5, 1, 2, 3, 5, 10, 15, 20];
    if(u === 'pz') return [5, 10, 15, 20, 25, 30, 50, 100];
    return [1, 2, 5, 10, 20, 50];
  };

  const costoTotal = abCantidad && precioUnit ? (abCantidad * parseFloat(precioUnit || 0)) : 0;

  const loadData = () => {
    apiFetch('/pedidos').then(setOrders).catch(console.error);
    apiFetch('/menu').then(setMenu).catch(console.error);
    apiFetch('/insumos').then(setSupplies).catch(console.error);
  };

  useEffect(() => {
    loadData();
    const int = setInterval(loadData, 5000);
    return () => clearInterval(int);
  }, []);

  const toastY = useRef(new Animated.Value(-120)).current;
  const toastO = useRef(new Animated.Value(0)).current;
  const [toastD, setToastD] = useState({ t:'', m:'', ok:true });

  const showToast = (t, m, ok=true) => {
    setToastD({t, m, ok});
    Animated.parallel([
      Animated.spring(toastY,{toValue:0,friction:6,useNativeDriver:true}),
      Animated.timing(toastO,{toValue:1,duration:200,useNativeDriver:true}),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastY,{toValue:-120,duration:300,useNativeDriver:true}),
        Animated.timing(toastO,{toValue:0,duration:200,useNativeDriver:true}),
      ]).start();
    },3000);
  };

  const updateEstado = async (id, estado, title, msg) => {
    try {
      await apiFetch(`/pedidos/${id}/estado?estado=${estado}`, { method: 'PUT' });
      setOrders(p => p.map(o => o.id===id?{...o,estado}:o));
      if(title) showToast(title, msg);
      // Reload supplies after preparing (insumos were deducted)
      if(estado === 'preparing') apiFetch('/insumos').then(setSupplies).catch(console.error);
    } catch(e) { showToast('Error', 'No se pudo actualizar', false); }
  };

  const markPreparing = id => updateEstado(id, 'preparing', 'Preparando', 'Insumos descontados automáticamente.');
  const markReady = id => updateEstado(id, 'ready', `Orden #${id}`, 'Orden Lista.');
  const cancelOrd = async id => {
    try {
      await apiFetch(`/pedidos/${id}`, { method: 'DELETE' });
      setOrders(p => p.filter(o => o.id!==id));
    } catch(e) {}
  };

  const sColor = s => s==='pending'?C.error:s==='preparing'?C.warning:C.success;
  const sLabel = s => s==='pending'?'Pendiente':s==='preparing'?'Proceso':'Listo';

  const toggleMenu = async id => {
    try {
      await apiFetch(`/menu/${id}/toggle`, { method: 'PUT' });
      setMenu(p => p.map(m => m.id===id?{...m,disponible:!m.disponible}:m));
    } catch(e) {}
  };
  const saveMenu = () => showToast('Menú Actualizado','Los cambios se guardaron en BD.');

  const lowStock = supplies.filter(s => s.low);

  // Abastecer insumo (compra) → aumenta stock + registra gasto en caja
  const abastecerInsumo = async () => {
    if(!selInsumo || !abCantidad || !precioUnit) {
      showToast('Faltan datos', 'Selecciona insumo, cantidad y precio unitario.', false);
      return;
    }
    const pu = parseFloat(precioUnit);
    if(isNaN(pu) || pu <= 0) {
      showToast('Datos inválidos', 'El precio unitario debe ser mayor a 0.', false);
      return;
    }
    try {
      const resp = await apiFetch(`/insumos/${selInsumo.id}/abastecer`, {
        method: 'POST',
        body: JSON.stringify({ cantidad: abCantidad, costo: costoTotal })
      });
      showToast('Insumo Abastecido',
        `${selInsumo.nombre}: +${abCantidad} ${selInsumo.unidad}\nGasto $${costoTotal.toFixed(2)} registrado en Caja.`);
      setSelInsumo(null); setAbCantidad(null); setPrecioUnit('');
      // Reload supplies
      apiFetch('/insumos').then(setSupplies).catch(console.error);
    } catch(e) {
      showToast('Error', 'No se pudo abastecer el insumo.', false);
    }
  };

  const menuByCat = menu.reduce((a,i) => { if(!a[i.categoria]) a[i.categoria]=[]; a[i.categoria].push(i); return a; }, {});

  const renderOrder = ({ item }) => (
    <View style={[st.oCard, { borderLeftColor: sColor(item.estado) }]}>
      <View style={st.oHeader}>
        <View style={st.oIdRow}>
          <Text style={st.oId}>Orden #{item.id}</Text>
          <View style={[st.oBadge, { backgroundColor: sColor(item.estado)+'20' }]}>
            <FontAwesome5 name={item.estado==='pending'?'clock':item.estado==='preparing'?'fire':'check-circle'} size={10} color={sColor(item.estado)} />
            <Text style={[st.oBadgeT, { color: sColor(item.estado) }]}>{sLabel(item.estado)}</Text>
          </View>
        </View>
        <View style={st.oMeta}>
          <Text style={st.oMetaT}>Mesa {item.mesa}</Text>
          <View style={st.oTime}><FontAwesome5 name="clock" size={10} color={C.textMuted} /><Text style={st.oMetaT}>{item.time}</Text></View>
        </View>
      </View>
      <View style={st.oItems}>
        {item.items.map((it,i) => <View key={i} style={st.oItemRow}><Text style={st.oItemQty}>{it.qty}x</Text><Text style={st.oItemName}>{it.nombre}</Text></View>)}
      </View>
      <View>
        {item.estado==='pending' && (<View style={st.oActions}>
          <TouchableOpacity style={[st.oBtn,{backgroundColor:C.warning}]} onPress={()=>markPreparing(item.id)}><FontAwesome5 name="fire" size={12} color="#fff" /><Text style={st.oBtnT}>INICIAR PREPARACIÓN</Text></TouchableOpacity>
          <TouchableOpacity style={[st.oBtn,{backgroundColor:'#fef2f2',marginTop:6}]} onPress={()=>cancelOrd(item.id)}><FontAwesome5 name="times" size={12} color={C.error} /><Text style={[st.oBtnT,{color:C.error}]}>CANCELAR</Text></TouchableOpacity>
        </View>)}
        {item.estado==='preparing' && <TouchableOpacity style={[st.oBtn,{backgroundColor:C.success}]} onPress={()=>markReady(item.id)}><FontAwesome5 name="check" size={12} color="#fff" /><Text style={st.oBtnT}>FINALIZAR PREPARACIÓN</Text></TouchableOpacity>}
        {item.estado==='ready' && <View style={[st.oBtn,{backgroundColor:'#e5e7eb'}]}><FontAwesome5 name="check-double" size={12} color={C.success} /><Text style={[st.oBtnT,{color:C.success}]}>ENTREGADO</Text></View>}
      </View>
    </View>
  );

  const stockPercent = (s) => {
    if(s.stock_minimo <= 0) return 100;
    const pct = (s.stock_actual / (s.stock_minimo * 3)) * 100;
    return Math.min(100, Math.max(0, pct));
  };
  const stockColor = (s) => s.low ? C.error : s.stock_actual <= s.stock_minimo * 1.5 ? C.warning : C.success;

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={st.header}>
        <View><Text style={st.hRole}>Cocina</Text><Text style={st.hName}>{userName||'Chef'}</Text></View>
        <Text style={st.hTitle}>Panel de Cocina</Text>
        <View style={st.hBadge}><Text style={st.hBadgeT}>{orders.filter(o=>o.estado==='pending').length} pend.</Text></View>
      </View>

      {/* Tabs */}
      <View style={st.tabRow}>
        {[{k:'ordenes',l:'Ordenes',i:'list-alt'},{k:'menu',l:'Menú',i:'utensils'},{k:'insumos',l:'Insumos',i:'boxes'}].map(t => (
          <TouchableOpacity key={t.k} style={[st.tab, tab===t.k && st.tabA]} onPress={()=>setTab(t.k)}>
            <FontAwesome5 name={t.i} size={12} color={tab===t.k?'#fff':C.textGray} />
            <Text style={[st.tabT, tab===t.k && {color:'#fff'}]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ORDENES */}
      {tab==='ordenes' && (<>
        <View style={st.statsRow}>
          <View style={[st.statBox,{backgroundColor:'#fef2f2'}]}><Text style={[st.statNum,{color:C.error}]}>{orders.filter(o=>o.estado==='pending').length}</Text><Text style={st.statLabel}>Pendientes</Text></View>
          <View style={[st.statBox,{backgroundColor:'#fffbeb'}]}><Text style={[st.statNum,{color:C.warning}]}>{orders.filter(o=>o.estado==='preparing').length}</Text><Text style={st.statLabel}>Preparando</Text></View>
          <View style={[st.statBox,{backgroundColor:'#f0fdf4'}]}><Text style={[st.statNum,{color:C.success}]}>{orders.filter(o=>o.estado==='ready').length}</Text><Text style={st.statLabel}>Listos</Text></View>
        </View>
        <FlatList data={orders} renderItem={renderOrder} keyExtractor={i=>String(i.id)} contentContainerStyle={{padding:12,paddingBottom:24}} showsVerticalScrollIndicator={false} />
      </>)}

      {/* MENÚ */}
      {tab==='menu' && (
        <ScrollView style={{flex:1,padding:12}} showsVerticalScrollIndicator={false}>
          {Object.keys(menuByCat).map(cat => (
            <View key={cat} style={{marginBottom:16}}>
              <Text style={st.mCatTitle}>{cat}</Text>
              <View style={st.mCard}>
                {menuByCat[cat].map(item => {
                  const cur = menu.find(m=>m.id===item.id);
                  return (
                    <View key={item.id} style={[st.mRow, !cur.disponible && {backgroundColor:'#fafafa'}]}>
                      <View style={{flex:1}}>
                        <Text style={[st.mName, !cur.disponible && {color:C.textMuted}]}>{item.nombre || item.name}</Text>
                        {cur.disponible ? <Text style={{fontSize:12,color:C.success}}>Disponible en sistema</Text>
                          : <View style={{flexDirection:'row',alignItems:'center',gap:4}}><FontAwesome5 name="exclamation-circle" size={10} color={C.error} /><Text style={{fontSize:12,color:C.error}}>Agotado / No visible</Text></View>}
                      </View>
                      <Switch value={cur.disponible} onValueChange={()=>toggleMenu(item.id)} trackColor={{false:'#e5e7eb',true:'#86efac'}} thumbColor={cur.disponible?C.success:C.textMuted} />
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          <TouchableOpacity style={st.saveBtn} onPress={saveMenu}><FontAwesome5 name="save" size={14} color="#fff" /><Text style={st.saveBtnT}>GUARDAR CAMBIOS</Text></TouchableOpacity>
          <View style={{height:30}} />
        </ScrollView>
      )}

      {/* INSUMOS */}
      {tab==='insumos' && (
        <ScrollView style={{flex:1,padding:12}} showsVerticalScrollIndicator={false}>
          {/* Alerta de stock bajo */}
          {lowStock.length>0 && (
            <View style={st.alert}>
              <View style={st.alertIcon}><FontAwesome5 name="exclamation-triangle" size={18} color={C.warning} /></View>
              <View style={{flex:1}}>
                <Text style={st.alertTitle}>Alerta de Stock Bajo</Text>
                {lowStock.map(s => <Text key={s.id} style={st.alertLine}>Queda {s.stock_actual} {s.unidad} de {s.nombre}.</Text>)}
              </View>
            </View>
          )}

          {/* Lista de inventario */}
          <Text style={{fontSize:16,fontWeight:'700',color:'#111',marginBottom:8}}>Inventario Actual</Text>
          <View style={st.supplyCard}>
            {supplies.map(s => (
              <View key={s.id} style={[st.supplyRow, s.low && {backgroundColor:'#fff5f5'}]}>
                <View style={{flex:1}}>
                  <Text style={[st.supplyName, s.low && {color:C.error}]}>{s.nombre}</Text>
                  <View style={st.barContainer}>
                    <View style={[st.barFill, {width: `${stockPercent(s)}%`, backgroundColor: stockColor(s)}]} />
                  </View>
                </View>
                <View style={[st.supplyBadge, s.low && {backgroundColor:'#fef2f2'}]}>
                  <Text style={[st.supplyQty, s.low && {color:C.error}]}>{s.stock_actual} {s.unidad}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Formulario: Abastecer Insumo */}
          <View style={st.expCard}>
            <Text style={{fontSize:16,fontWeight:'700',color:'#111',marginBottom:4}}>Comprar / Abastecer Insumo</Text>
            <Text style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Se registra automáticamente como gasto en Caja</Text>

            {/* Dropdown de insumos */}
            <Text style={st.fLabel}>Insumo</Text>
            <TouchableOpacity style={st.dropdown} onPress={()=>{setShowDropdown(!showDropdown);setShowQtyDrop(false);}}>
              <Text style={selInsumo ? st.dropdownText : st.dropdownPlaceholder}>
                {selInsumo ? `${selInsumo.nombre} (${selInsumo.unidad})` : 'Selecciona un insumo...'}
              </Text>
              <FontAwesome5 name={showDropdown?'chevron-up':'chevron-down'} size={12} color={C.textMuted} />
            </TouchableOpacity>
            {showDropdown && (
              <View style={st.dropdownList}>
                {supplies.map(s => (
                  <TouchableOpacity key={s.id} style={[st.dropdownItem, selInsumo?.id===s.id && {backgroundColor:C.accentLight}]}
                    onPress={()=>{setSelInsumo(s);setShowDropdown(false);setAbCantidad(null);}}>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:14,fontWeight:'600',color:'#111'}}>{s.nombre}</Text>
                      <Text style={{fontSize:11,color:C.textMuted}}>Stock: {s.stock_actual} {s.unidad} | Mín: {s.stock_minimo} {s.unidad}</Text>
                    </View>
                    {s.low && <View style={{backgroundColor:'#fef2f2',paddingHorizontal:8,paddingVertical:2,borderRadius:6}}>
                      <Text style={{fontSize:10,fontWeight:'700',color:C.error}}>BAJO</Text>
                    </View>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Cantidad - Dropdown list */}
            <Text style={[st.fLabel,{marginTop:12}]}>Cantidad a comprar {selInsumo ? `(${selInsumo.unidad})` : ''}</Text>
            <TouchableOpacity style={[st.dropdown, !selInsumo && {opacity:0.5}]} onPress={()=>{if(selInsumo){setShowQtyDrop(!showQtyDrop);setShowDropdown(false);}}} disabled={!selInsumo}>
              <Text style={abCantidad ? st.dropdownText : st.dropdownPlaceholder}>
                {abCantidad ? `${abCantidad} ${selInsumo?.unidad || ''}` : 'Selecciona cantidad...'}
              </Text>
              <FontAwesome5 name={showQtyDrop?'chevron-up':'chevron-down'} size={12} color={C.textMuted} />
            </TouchableOpacity>
            {showQtyDrop && selInsumo && (
              <View style={st.dropdownList}>
                {getQtyOptions(selInsumo.unidad).map(q => (
                  <TouchableOpacity key={q} style={[st.dropdownItem, abCantidad===q && {backgroundColor:C.accentLight}]}
                    onPress={()=>{setAbCantidad(q);setShowQtyDrop(false);}}>
                    <Text style={{fontSize:14,fontWeight:abCantidad===q?'700':'400',color:abCantidad===q?C.primary:'#111'}}>{q} {selInsumo.unidad}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Precio unitario */}
            <Text style={[st.fLabel,{marginTop:8}]}>Precio por {selInsumo ? selInsumo.unidad : 'unidad'} ($)</Text>
            <TextInput style={st.expInput} placeholder="$ 0.00" placeholderTextColor={C.textMuted} keyboardType="numeric" value={precioUnit} onChangeText={setPrecioUnit} />

            {/* Costo total auto-calculado */}
            {abCantidad && precioUnit ? (
              <View style={st.costoBox}>
                <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                  <Text style={{fontSize:12,color:C.textGray}}>Cantidad:</Text>
                  <Text style={{fontSize:12,fontWeight:'600',color:'#111'}}>{abCantidad} {selInsumo?.unidad}</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                  <Text style={{fontSize:12,color:C.textGray}}>Precio unitario:</Text>
                  <Text style={{fontSize:12,fontWeight:'600',color:'#111'}}>${parseFloat(precioUnit||0).toFixed(2)} / {selInsumo?.unidad}</Text>
                </View>
                <View style={{height:1,backgroundColor:'#e5e7eb',marginVertical:6}} />
                <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#111'}}>Costo Total:</Text>
                  <Text style={{fontSize:18,fontWeight:'800',color:C.primary}}>${costoTotal.toFixed(2)}</Text>
                </View>
              </View>
            ) : null}

            {/* Resumen */}
            {selInsumo && abCantidad && precioUnit && costoTotal > 0 && (
              <View style={st.summaryBox}>
                <FontAwesome5 name="info-circle" size={14} color={C.primary} />
                <View style={{flex:1,marginLeft:8}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:'#111'}}>Resumen de compra:</Text>
                  <Text style={{fontSize:12,color:C.textGray}}>+{abCantidad} {selInsumo.unidad} de {selInsumo.nombre}</Text>
                  <Text style={{fontSize:12,color:C.textGray}}>Gasto: ${costoTotal.toFixed(2)} → se registra en Caja</Text>
                  <Text style={{fontSize:12,color:C.success}}>Stock nuevo: {(selInsumo.stock_actual + abCantidad).toFixed(2)} {selInsumo.unidad}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={[st.expBtn, (!selInsumo||!abCantidad||!precioUnit) && {opacity:0.5}]} onPress={abastecerInsumo} disabled={!selInsumo||!abCantidad||!precioUnit}>
              <FontAwesome5 name="cart-plus" size={14} color="#fff" />
              <Text style={{fontSize:13,fontWeight:'700',color:'#fff',letterSpacing:0.3}}>REGISTRAR COMPRA</Text>
            </TouchableOpacity>
          </View>
          <View style={{height:30}} />
        </ScrollView>
      )}

      {/* Toast */}
      <Animated.View style={[st.toast,{transform:[{translateY:toastY}],opacity:toastO}]} pointerEvents="none">
        <View style={[st.toastIcon,{backgroundColor:toastD.ok?C.successBg:'#fef2f2'}]}>
          <FontAwesome5 name={toastD.ok?'check-circle':'exclamation-circle'} size={20} color={toastD.ok?C.success:C.error} />
        </View>
        <View style={{flex:1}}><Text style={st.toastT}>{toastD.t}</Text><Text style={st.toastM}>{toastD.m}</Text></View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex:1, backgroundColor:C.bg },
  header: { backgroundColor:C.primary, paddingTop:50, paddingBottom:14, paddingHorizontal:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  hRole: { fontSize:12, color:C.white, opacity:0.8 },
  hName: { fontSize:16, fontWeight:'700', color:C.white },
  hTitle: { position:'absolute', left:0, right:0, bottom:18, textAlign:'center', fontSize:18, fontWeight:'700', color:C.white },
  hBadge: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:9999, paddingVertical:4, paddingHorizontal:12 },
  hBadgeT: { fontSize:13, fontWeight:'700', color:C.white },

  tabRow: { flexDirection:'row', backgroundColor:C.white, padding:8, gap:6 },
  tab: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:10, backgroundColor:'#f3f4f6' },
  tabA: { backgroundColor:C.primary },
  tabT: { fontSize:12, fontWeight:'600', color:C.textGray },

  statsRow: { flexDirection:'row', padding:12, gap:8 },
  statBox: { flex:1, borderRadius:12, padding:12, alignItems:'center' },
  statNum: { fontSize:24, fontWeight:'800' },
  statLabel: { fontSize:11, color:C.textGray, fontWeight:'600', marginTop:2 },

  oCard: { backgroundColor:C.white, borderRadius:16, padding:16, marginBottom:12, borderLeftWidth:4, shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:2,elevation:1 },
  oHeader: { marginBottom:12 },
  oIdRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  oId: { fontSize:16, fontWeight:'700', color:'#111' },
  oBadge: { flexDirection:'row', alignItems:'center', gap:4, paddingVertical:4, paddingHorizontal:10, borderRadius:9999 },
  oBadgeT: { fontSize:11, fontWeight:'700' },
  oMeta: { flexDirection:'row', gap:16, marginTop:4 },
  oMetaT: { fontSize:12, color:C.textMuted },
  oTime: { flexDirection:'row', alignItems:'center', gap:4 },
  oItems: { marginBottom:12 },
  oItemRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:4 },
  oItemQty: { fontSize:14, fontWeight:'800', color:C.primary, minWidth:28 },
  oItemName: { fontSize:14, color:'#374151' },
  oActions: {},
  oBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:12, paddingHorizontal:20, borderRadius:10 },
  oBtnT: { fontSize:12, fontWeight:'700', color:'#fff', letterSpacing:0.5 },

  mCatTitle: { fontSize:16, fontWeight:'700', color:'#111', marginBottom:8 },
  mCard: { backgroundColor:C.white, borderRadius:14, overflow:'hidden', shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:2,elevation:1 },
  mRow: { flexDirection:'row', alignItems:'center', paddingVertical:14, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  mName: { fontSize:14, fontWeight:'600', color:'#111' },

  saveBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:C.primary, borderRadius:12, paddingVertical:14, marginTop:16 },
  saveBtnT: { fontSize:14, fontWeight:'700', color:'#fff', letterSpacing:0.5 },

  alert: { flexDirection:'row', backgroundColor:'#fffbeb', borderRadius:14, padding:16, gap:12, marginBottom:12, borderWidth:1, borderColor:C.warningBorder },
  alertIcon: { width:40, height:40, borderRadius:20, backgroundColor:C.warningBg, alignItems:'center', justifyContent:'center' },
  alertTitle: { fontSize:14, fontWeight:'700', color:'#92400e', marginBottom:4 },
  alertLine: { fontSize:12, color:'#a16207', lineHeight:18 },

  supplyCard: { backgroundColor:C.white, borderRadius:14, overflow:'hidden', marginBottom:16 },
  supplyRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:14, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  supplyName: { fontSize:14, fontWeight:'600', color:'#111', marginBottom:4 },
  supplyBadge: { backgroundColor:'#f0fdf4', paddingVertical:4, paddingHorizontal:12, borderRadius:8 },
  supplyQty: { fontSize:13, fontWeight:'700', color:'#065f46' },
  barContainer: { height:4, backgroundColor:'#e5e7eb', borderRadius:2, marginTop:4, width:'80%' },
  barFill: { height:4, borderRadius:2 },

  expCard: { backgroundColor:C.white, borderRadius:14, padding:16 },
  fLabel: { fontSize:12, fontWeight:'600', color:C.textGray, marginBottom:4, textTransform:'uppercase' },
  expInput: { backgroundColor:'#f9fafb', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, padding:12, fontSize:14, color:'#111', marginBottom:10 },
  expBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:C.primary, borderRadius:10, paddingVertical:14, marginTop:8 },

  dropdown: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#f9fafb', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, padding:12, marginBottom:4 },
  dropdownText: { fontSize:14, color:'#111', fontWeight:'500' },
  dropdownPlaceholder: { fontSize:14, color:C.textMuted },
  dropdownList: { backgroundColor:C.white, borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, marginBottom:8, overflow:'hidden', maxHeight:200 },
  dropdownItem: { paddingVertical:12, paddingHorizontal:14, borderBottomWidth:1, borderBottomColor:'#f3f4f6', flexDirection:'row', alignItems:'center' },

  summaryBox: { flexDirection:'row', alignItems:'flex-start', backgroundColor:'#f0f9ff', borderWidth:1, borderColor:'#bae6fd', borderRadius:10, padding:12, marginTop:4, marginBottom:4 },
  costoBox: { backgroundColor:'#fefce8', borderWidth:1, borderColor:'#fde68a', borderRadius:10, padding:12, marginBottom:8 },

  toast: { position:'absolute', top:50, left:16, right:16, backgroundColor:C.white, borderRadius:16, padding:16, flexDirection:'row', alignItems:'center', gap:14, shadowColor:'#000',shadowOffset:{width:0,height:10},shadowOpacity:0.2,shadowRadius:15,elevation:8, zIndex:100 },
  toastIcon: { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  toastT: { fontSize:14, fontWeight:'700', color:'#111' },
  toastM: { fontSize:12, color:C.textGray },
});

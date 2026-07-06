import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  StyleSheet, StatusBar, ScrollView, Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch } from '../src/api';

const C = {
  primary: '#3e2723', primaryDark: '#2d1b18',
  accent: '#d7ccc8', accentLight: '#efebe9',
  white: '#fff', bg: '#f5f5f5',
  textDark: '#000', textGray: '#6b7280', textMuted: '#9ca3af',
  success: '#22c55e', successBg: '#e8f5e9',
  error: '#ef4444',
};

export default function CajaScreen({ userName, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState('cobros');
  const [payMethods, setPayMethods] = useState({});
  const [newC, setNewC] = useState('');
  const [newA, setNewA] = useState('');

  const loadData = () => {
    apiFetch('/pedidos').then(d => setTickets(d.filter(t => t.estado === 'ready' || t.estado === 'paid'))).catch(console.error);
    apiFetch('/gastos').then(setExpenses).catch(console.error);
  };

  useEffect(() => {
    loadData();
    const int = setInterval(loadData, 5000);
    return () => clearInterval(int);
  }, []);

  const toastY = useRef(new Animated.Value(-120)).current;
  const toastO = useRef(new Animated.Value(0)).current;
  const [toastD, setToastD] = useState({ t:'', m:'', ok:true });

  const showToast = (t,m,ok=true) => {
    setToastD({t,m,ok});
    Animated.parallel([
      Animated.spring(toastY,{toValue:0,friction:6,useNativeDriver:true}),
      Animated.timing(toastO,{toValue:1,duration:200,useNativeDriver:true}),
    ]).start();
    setTimeout(()=>{
      Animated.parallel([
        Animated.timing(toastY,{toValue:-120,duration:300,useNativeDriver:true}),
        Animated.timing(toastO,{toValue:0,duration:200,useNativeDriver:true}),
      ]).start();
    },3000);
  };

  const getSub = items => items.reduce((s,i)=>s+i.price*i.qty,0);
  const getIVA = sub => Math.round(sub*0.16*100)/100;
  const getTotal = items => { const s=getSub(items); return s+getIVA(s); };
  const getPay = id => payMethods[id]||'efectivo';
  const setPay = (id,m) => setPayMethods(p=>({...p,[id]:m}));

  const markPaid = async id => {
    const tk = tickets.find(t=>t.id===id);
    try {
      await apiFetch(`/pedidos/${id}/estado?estado=paid`, { method: 'PUT' });
      setTickets(p=>p.map(t=>t.id===id?{...t,paid:true,estado:'paid'}:t));
      if(tk) showToast('¡Cobro Exitoso!',`Cobro Hecho a Mesa ${tk.mesa}.`);
    } catch(e) {
      showToast('Error', 'Fallo al procesar el cobro', false);
    }
  };

  const regExp = async () => {
    if(!newC.trim()||!newA.trim()) return;
    const amt=parseFloat(newA); if(isNaN(amt)) return;
    
    try {
      await apiFetch('/gastos', { method: 'POST', body: JSON.stringify({ concepto: newC, monto: amt }) });
      setExpenses(p=>[{id:Date.now(),concepto:newC,monto:amt}, ...p]);
      showToast('Gasto Registrado',`${newC} — $${amt.toFixed(2)}`);
      setNewC(''); setNewA('');
    } catch(e) {}
  };

  const totalSales = tickets.filter(t=>t.paid).reduce((s,t)=>s+getTotal(t.items),0);
  const totalExp = expenses.reduce((s,e)=>s+(e.monto||0),0);
  const pendCount = tickets.filter(t=>!t.paid).length;

  const renderTicket = ({item}) => {
    const sub=getSub(item.items), iva=getIVA(sub), total=sub+iva, method=getPay(item.id);
    return (
      <View style={[st.tkCard, item.paid && {opacity:0.55}]}>
        <View style={st.tkHeader}>
          <View style={st.tkMesa}><Text style={st.tkMesaT}>Mesa {item.mesa}</Text></View>
          <View style={[st.tkBadge,{backgroundColor:item.paid?'#f0fdf4':'#fef2f2'}]}>
            <FontAwesome5 name={item.paid?'check-circle':'clock'} size={10} color={item.paid?C.success:C.error} />
            <Text style={{fontSize:11,fontWeight:'700',color:item.paid?C.success:C.error}}>{item.paid?'Pagado':'Pendiente'}</Text>
          </View>
        </View>
        <View style={st.consumo}>
          <Text style={st.consumoTitle}>Consumo Mesa {item.mesa}</Text>
          {item.items.map((it,i) => <View key={i} style={st.line}><Text style={st.lineDesc}>{it.qty}x {it.nombre}</Text><Text style={st.linePrice}>${(it.price*it.qty).toFixed(2)}</Text></View>)}
          <View style={st.divider} />
          <View style={st.calcRow}><Text style={st.calcL}>Subtotal</Text><Text style={st.calcV}>${sub.toFixed(2)}</Text></View>
          <View style={st.calcRow}><Text style={st.calcL}>IVA 16%</Text><Text style={st.calcV}>${iva.toFixed(2)}</Text></View>
          <View style={st.divider} />
          <View style={st.calcRow}><Text style={st.totalL}>TOTAL</Text><Text style={st.totalA}>${total.toFixed(2)}</Text></View>
        </View>
        {!item.paid && (
          <View style={{marginTop:8}}>
            <View style={st.payRow}>
              <TouchableOpacity style={[st.payBtn, method==='efectivo' && st.payBtnA]} onPress={()=>setPay(item.id,'efectivo')}>
                <FontAwesome5 name="money-bill-wave" size={14} color={method==='efectivo'?'#fff':C.textGray} />
                <Text style={[st.payBtnT, method==='efectivo' && {color:'#fff'}]}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.payBtn, method==='tarjeta' && st.payBtnA]} onPress={()=>setPay(item.id,'tarjeta')}>
                <FontAwesome5 name="credit-card" size={14} color={method==='tarjeta'?'#fff':C.textGray} />
                <Text style={[st.payBtnT, method==='tarjeta' && {color:'#fff'}]}>Tarjeta</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={st.processBtn} onPress={()=>markPaid(item.id)}><Text style={st.processBtnT}>PROCESAR COBRO</Text></TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={st.header}>
        <View><Text style={st.hRole}>Cajero</Text><Text style={st.hName}>{userName||'Ana R.'}</Text></View>
        <Text style={st.hTitle}>Caja Principal</Text>
        <View style={st.hBadge}><Text style={st.hBadgeT}>{pendCount} pend.</Text></View>
      </View>

      <View style={st.tabRow}>
        {[{k:'cobros',l:'Cobros',i:'cash-register'},{k:'gastos',l:'Gastos',i:'receipt'}].map(t=>(
          <TouchableOpacity key={t.k} style={[st.tab, tab===t.k && st.tabA]} onPress={()=>setTab(t.k)}>
            <FontAwesome5 name={t.i} size={12} color={tab===t.k?'#fff':C.textGray} />
            <Text style={[st.tabT, tab===t.k && {color:'#fff'}]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab==='cobros' && (<>
        <View style={st.sumRow}>
          <View style={[st.sumBox,{backgroundColor:C.accentLight}]}><Text style={{fontSize:20,marginBottom:4}}>💰</Text><Text style={[st.sumNum,{color:C.primary}]}>${totalSales.toFixed(2)}</Text><Text style={st.sumLabel}>Ventas Hoy</Text></View>
          <View style={[st.sumBox,{backgroundColor:'#fef2f2'}]}><Text style={{fontSize:20,marginBottom:4}}>📋</Text><Text style={[st.sumNum,{color:C.error}]}>{pendCount}</Text><Text style={st.sumLabel}>Por Cobrar</Text></View>
        </View>
        <FlatList data={tickets} renderItem={renderTicket} keyExtractor={i=>String(i.id)} contentContainerStyle={{padding:12,paddingBottom:24}} showsVerticalScrollIndicator={false} />
      </>)}

      {tab==='gastos' && (
        <ScrollView style={{flex:1,padding:12}} showsVerticalScrollIndicator={false}>
          <View style={st.expForm}>
            <Text style={{fontSize:16,fontWeight:'700',color:'#111',marginBottom:14}}>Registrar Salida de Efectivo</Text>
            <Text style={st.fLabel}>Concepto / Artículo</Text>
            <TextInput style={st.expInput} placeholder="Ej: Compra de Leche Entera 10 kg" placeholderTextColor={C.textMuted} value={newC} onChangeText={setNewC} />
            <Text style={st.fLabel}>Monto Retirado</Text>
            <TextInput style={st.expInput} placeholder="$ 0.00" placeholderTextColor={C.textMuted} keyboardType="numeric" value={newA} onChangeText={setNewA} />
            <View style={{gap:8}}>
              <TouchableOpacity style={st.regBtn} onPress={regExp}><Text style={{fontSize:13,fontWeight:'700',color:'#fff',letterSpacing:0.5}}>REGISTRAR SALIDA</Text></TouchableOpacity>
              <TouchableOpacity style={st.cancelBtn} onPress={()=>{setNewC('');setNewA('');}}>
                <FontAwesome5 name="times" size={12} color={C.error} /><Text style={{fontSize:13,fontWeight:'700',color:C.error}}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{fontSize:16,fontWeight:'700',color:'#111',marginBottom:10}}>Gastos Registrados</Text>
          <View style={st.histCard}>
            {expenses.map(e=>(
              <View key={e.id} style={st.histRow}>
                <View style={st.histIcon}><FontAwesome5 name="shopping-cart" size={12} color={C.primary} /></View>
                <View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'600',color:'#111'}}>{e.concepto}</Text></View>
                <Text style={{fontSize:14,fontWeight:'700',color:C.error}}>-${(e.monto||0).toFixed(2)}</Text>
              </View>
            ))}
            <View style={st.histTotal}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#111'}}>Total Gastos</Text>
              <Text style={{fontSize:16,fontWeight:'800',color:C.error}}>-${totalExp.toFixed(2)}</Text>
            </View>
          </View>
          <View style={{height:30}} />
        </ScrollView>
      )}

      <Animated.View style={[st.toast,{transform:[{translateY:toastY}],opacity:toastO}]} pointerEvents="none">
        <View style={[st.toastIcon,{backgroundColor:toastD.ok?C.successBg:'#fef2f2'}]}>
          <FontAwesome5 name={toastD.ok?'check-circle':'info-circle'} size={20} color={toastD.ok?C.success:C.primary} />
        </View>
        <View><Text style={st.toastT}>{toastD.t}</Text><Text style={st.toastM}>{toastD.m}</Text></View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f8fafc' },
  header: { backgroundColor:C.primary, paddingTop:50, paddingBottom:14, paddingHorizontal:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  hRole: { fontSize:12, color:C.white, opacity:0.8 },
  hName: { fontSize:16, fontWeight:'700', color:C.white },
  hTitle: { position:'absolute', left:0, right:0, bottom:18, textAlign:'center', fontSize:18, fontWeight:'700', color:C.white },
  hBadge: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:9999, paddingVertical:4, paddingHorizontal:12 },
  hBadgeT: { fontSize:13, fontWeight:'700', color:C.white },

  tabRow: { flexDirection:'row', backgroundColor:C.white, padding:8, gap:6 },
  tab: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:10, backgroundColor:'#f3f4f6' },
  tabA: { backgroundColor:C.primary },
  tabT: { fontSize:13, fontWeight:'600', color:C.textGray },

  sumRow: { flexDirection:'row', padding:12, gap:8 },
  sumBox: { flex:1, borderRadius:12, padding:14, alignItems:'center' },
  sumNum: { fontSize:22, fontWeight:'800' },
  sumLabel: { fontSize:11, color:C.textGray, fontWeight:'600', marginTop:2 },

  tkCard: { backgroundColor:C.white, borderRadius:16, padding:16, marginBottom:12, shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:2,elevation:1 },
  tkHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  tkMesa: { backgroundColor:C.accentLight, paddingVertical:6, paddingHorizontal:14, borderRadius:8, borderWidth:1, borderColor:C.accent },
  tkMesaT: { fontSize:14, fontWeight:'700', color:C.primary },
  tkBadge: { flexDirection:'row', alignItems:'center', gap:4, paddingVertical:4, paddingHorizontal:10, borderRadius:9999 },

  consumo: { marginBottom:12 },
  consumoTitle: { fontSize:13, fontWeight:'700', color:C.textGray, marginBottom:8, textTransform:'uppercase', letterSpacing:0.3 },
  line: { flexDirection:'row', justifyContent:'space-between', paddingVertical:5 },
  lineDesc: { fontSize:14, color:'#374151' },
  linePrice: { fontSize:14, fontWeight:'600', color:'#374151' },
  divider: { height:1, backgroundColor:'#f3f4f6', marginVertical:8 },
  calcRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:3 },
  calcL: { fontSize:13, color:C.textMuted },
  calcV: { fontSize:13, color:C.textGray },
  totalL: { fontSize:15, fontWeight:'800', color:'#111' },
  totalA: { fontSize:20, fontWeight:'800', color:C.primary },

  payRow: { flexDirection:'row', gap:8, marginBottom:10 },
  payBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:10, borderRadius:10, backgroundColor:'#f3f4f6' },
  payBtnA: { backgroundColor:C.primary },
  payBtnT: { fontSize:13, fontWeight:'600', color:C.textGray },
  processBtn: { backgroundColor:C.primary, borderRadius:12, paddingVertical:14, alignItems:'center', justifyContent:'center' },
  processBtnT: { fontSize:14, fontWeight:'700', color:'#fff', letterSpacing:0.5 },

  expForm: { backgroundColor:C.white, borderRadius:14, padding:16, marginBottom:16 },
  fLabel: { fontSize:12, fontWeight:'600', color:C.textGray, marginBottom:4, textTransform:'uppercase' },
  expInput: { backgroundColor:'#f9fafb', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, padding:12, fontSize:14, color:'#111', marginBottom:12 },
  regBtn: { backgroundColor:C.primary, borderRadius:10, paddingVertical:14, alignItems:'center' },
  cancelBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:'#fef2f2', borderRadius:10, paddingVertical:12 },

  histCard: { backgroundColor:C.white, borderRadius:14, overflow:'hidden' },
  histRow: { flexDirection:'row', alignItems:'center', padding:14, borderBottomWidth:1, borderBottomColor:'#f3f4f6', gap:12 },
  histIcon: { width:36, height:36, borderRadius:18, backgroundColor:C.accentLight, alignItems:'center', justifyContent:'center' },
  histTotal: { flexDirection:'row', justifyContent:'space-between', padding:14, backgroundColor:'#f8fafc' },

  toast: { position:'absolute', top:50, left:16, right:16, backgroundColor:C.white, borderRadius:16, padding:16, flexDirection:'row', alignItems:'center', gap:14, shadowColor:'#000',shadowOffset:{width:0,height:10},shadowOpacity:0.2,shadowRadius:15,elevation:8, zIndex:100 },
  toastIcon: { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  toastT: { fontSize:14, fontWeight:'700', color:'#111' },
  toastM: { fontSize:12, color:C.textGray },
});

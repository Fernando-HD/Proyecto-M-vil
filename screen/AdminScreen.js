import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, StatusBar, Animated, Platform, useWindowDimensions, Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch } from '../src/api';

const C = {
  primary: '#3e2723', primaryDark: '#2d1b18', darkest: '#1c1917',
  accent: '#d7ccc8', accentLight: '#efebe9',
  white: '#fff', bg: '#f5f5f5',
  textDark: '#000', textGray: '#6b7280', textMuted: '#9ca3af',
  success: '#22c55e', successBg: '#e8f5e9',
  error: '#ef4444',
};

const ROLES = ['Mesero', 'Cocina', 'Caja', 'Admin'];
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DOW_FULL = { 'Dom': 'Domingo', 'Lun': 'Lunes', 'Mar': 'Martes', 'Mié': 'Miércoles', 'Jue': 'Jueves', 'Vie': 'Viernes', 'Sáb': 'Sábado' };
const ESTADOS_PEDIDO = ['todos', 'pending', 'preparing', 'ready', 'paid'];
const ESTADO_LABEL = { todos: 'Todos', pending: 'Pendiente', preparing: 'Preparando', ready: 'Listo', paid: 'Pagado' };

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export default function AdminScreen({ userName, onLogout }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [tab, setTab] = useState('usuarios');
  const [emps, setEmps] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [gastosAll, setGastosAll] = useState([]);
  const [insumos, setInsumos] = useState([]);

  const loadUsers = () => {
    apiFetch('/usuarios').then(setEmps).catch(console.error);
  };
  const loadStatsData = () => {
    apiFetch('/pedidos').then(setPedidos).catch(console.error);
    apiFetch('/gastos').then(setGastosAll).catch(console.error);
    apiFetch('/insumos').then(setInsumos).catch(console.error);
  };
  useEffect(() => {
    loadUsers();
    loadStatsData();
    const int = setInterval(() => { loadUsers(); loadStatsData(); }, 5000);
    return () => clearInterval(int);
  }, []);

  const [showPass, setShowPass] = useState({});
  const [newName, setNewName] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('Mesero');
  const [showDrop, setShowDrop] = useState(false);

  // --- Edicion de usuario (Update del CRUD) ---
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUser, setEditUser] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editRole, setEditRole] = useState('Mesero');
  const [showEditDrop, setShowEditDrop] = useState(false);

  const openEdit = (emp) => {
    setEditing(emp);
    setEditName(emp.nombre_completo);
    setEditUser(emp.username);
    setEditPass(emp.passw || '');
    setEditRole(emp.rol);
  };
  const closeEdit = () => setEditing(null);
  const saveEdit = async () => {
    if (!editName.trim() || !editUser.trim() || !editPass.trim()) return;
    try {
      await apiFetch(`/usuarios/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre_completo: editName, username: editUser, rol: editRole, passw: editPass })
      });
      loadUsers();
      showToast('Usuario Actualizado', `${editName} fue modificado.`);
      closeEdit();
    } catch (e) {
      showToast('Error', 'No se pudo actualizar usuario');
    }
  };

  const toastY = useRef(new Animated.Value(-120)).current;
  const toastO = useRef(new Animated.Value(0)).current;
  const [toastD, setToastD] = useState({ t: '', m: '' });

  const showToast = (t, m) => {
    setToastD({ t, m });
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

  const saveEmp = async () => {
    if (!newName.trim() || !newUser.trim() || !newPass.trim()) return;
    try {
      await apiFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nombre_completo: newName, username: newUser, rol: newRole, passw: newPass })
      });
      loadUsers();
      showToast('Usuario Guardado', `${newName} fue registrado.`);
      setNewName(''); setNewUser(''); setNewPass(''); setNewRole('Mesero');
    } catch (e) {
      showToast('Error', 'No se pudo crear usuario');
    }
  };
  const delEmp = async id => {
    try {
      await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
      loadUsers();
      showToast('Usuario Eliminado', `Usuario fue eliminado.`);
    } catch (e) { }
  };
  const togglePass = id => setShowPass(p => ({ ...p, [id]: !p[id] }));

  const roleBadge = r => {
    if (r === 'Cocina') return { bg: '#fef2f2', fg: '#991b1b' };
    if (r === 'Caja') return { bg: C.accentLight, fg: C.primary };
    if (r === 'Admin') return { bg: '#ecfdf5', fg: '#065f46' };
    return { bg: '#fefce8', fg: '#a16207' };
  };

  // ===================== DATOS REALES (Estadisticas) =====================
  const weekStats = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, day: DOW[d.getDay()], sales: 0, expenses: 0 });
    }
    pedidos.forEach(p => {
      if (!p.paid || !p.fecha) return;
      const key = String(p.fecha).slice(0, 10);
      const entry = days.find(x => x.key === key);
      if (entry) entry.sales += p.items.reduce((s, it) => s + it.price * it.qty, 0);
    });
    gastosAll.forEach(g => {
      if (!g.fecha) return;
      const key = String(g.fecha).slice(0, 10);
      const entry = days.find(x => x.key === key);
      if (entry) entry.expenses += (g.monto || 0);
    });
    return days;
  })();
  const totalS = weekStats.reduce((s, d) => s + d.sales, 0);
  const totalE = weekStats.reduce((s, d) => s + d.expenses, 0);
  const maxS = Math.max(1, ...weekStats.map(d => d.sales));

  const topProducts = (() => {
    const map = {};
    pedidos.forEach(p => {
      if (!p.paid) return;
      p.items.forEach(it => {
        if (!map[it.nombre]) map[it.nombre] = { name: it.nombre, sold: 0, rev: 0 };
        map[it.nombre].sold += it.qty;
        map[it.nombre].rev += it.qty * it.price;
      });
    });
    return Object.values(map).sort((a, b) => b.sold - a.sold).slice(0, 4);
  })();

  // ===================== FILTROS DE REPORTES =====================
  const [repFrom, setRepFrom] = useState(daysAgoStr(6));
  const [repTo, setRepTo] = useState(todayStr());
  const [repEstado, setRepEstado] = useState('todos');
  const [repSoloBajo, setRepSoloBajo] = useState(false);
  const [reportKind, setReportKind] = useState(null); // null | 'productos' | 'pedidos' | 'inventario'

  const inRange = (fechaStr) => {
    if (!fechaStr) return false;
    const d = String(fechaStr).slice(0, 10);
    return d >= repFrom && d <= repTo;
  };
  const pedidosFiltrados = pedidos.filter(p => inRange(p.fecha) && (repEstado === 'todos' || p.estado === repEstado));
  const insumosFiltrados = repSoloBajo ? insumos.filter(i => i.low) : insumos;
  const productosReportData = (() => {
    const map = {};
    pedidosFiltrados.forEach(p => {
      p.items.forEach(it => {
        if (!map[it.nombre]) map[it.nombre] = { name: it.nombre, cantidad: 0, ingreso: 0 };
        map[it.nombre].cantidad += it.qty;
        map[it.nombre].ingreso += it.qty * it.price;
      });
    });
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad);
  })();

  // ===================== EXPORTACION PDF / XLSX =====================
  const loadScript = (src) => new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve;
    document.head.appendChild(s);
  });

  const exportPDF = async (title, subtitle, head, rows, filename) => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(62, 39, 35);
    doc.text(title, 14, 18);
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, 25);
    doc.autoTable({
      startY: 32, head: [head], body: rows,
      headStyles: { fillColor: [62, 39, 35] }, alternateRowStyles: { fillColor: [245, 245, 244] },
    });
    doc.save(filename);
  };

  const exportXLSX = async (title, head, rows, filename) => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js');
    const wb = new window.ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Reporte');
    sheet.mergeCells(1, 1, 1, head.length);
    const t = sheet.getCell(1, 1);
    t.value = title;
    t.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E2723' } };
    t.alignment = { horizontal: 'center' };
    sheet.getRow(1).height = 26;
    sheet.addRow([]);
    const hRow = sheet.addRow(head);
    hRow.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8D6E63' } };
    });
    rows.forEach(r => sheet.addRow(r));
    head.forEach((h, i) => sheet.getColumn(i + 1).width = 22);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  };

  const notWeb = () => { showToast('Aviso', 'La descarga de reportes funciona en la version web.'); };

  const downloadVentas = async (type) => {
    if (Platform.OS !== 'web') return notWeb();
    const dayNames = DOW_FULL;
    const rows = weekStats.map(d => [dayNames[d.day] || d.day, `$${d.sales.toFixed(2)}`, `-$${d.expenses.toFixed(2)}`, `$${(d.sales - d.expenses).toFixed(2)}`]);
    try {
      if (type === 'PDF') await exportPDF('Reporte de Ventas vs Gastos', `Ultimos 7 dias - Total: $${totalS.toFixed(2)}`, ['Dia', 'Ventas', 'Gastos', 'Ganancia Neta'], rows, 'Reporte_Ventas.pdf');
      else await exportXLSX('REPORTE DE VENTAS VS GASTOS', ['Dia', 'Ventas', 'Gastos', 'Ganancia Neta'], rows, 'Reporte_Ventas.xlsx');
      showToast('Exito!', 'Reporte descargado.');
    } catch (e) { showToast('Error', 'Fallo al generar archivo.'); }
  };

  const downloadProductos = async (type) => {
    if (Platform.OS !== 'web') return notWeb();
    const rows = productosReportData.map(p => [p.name, p.cantidad, `$${p.ingreso.toFixed(2)}`]);
    const subtitle = `Del ${repFrom} al ${repTo}`;
    try {
      if (type === 'PDF') await exportPDF('Reporte de Productos', subtitle, ['Producto', 'Cantidad Vendida', 'Ingreso'], rows, 'Reporte_Productos.pdf');
      else await exportXLSX('REPORTE DE PRODUCTOS', ['Producto', 'Cantidad Vendida', 'Ingreso'], rows, 'Reporte_Productos.xlsx');
      showToast('Exito!', 'Reporte descargado.');
    } catch (e) { showToast('Error', 'Fallo al generar archivo.'); }
  };

  const downloadPedidos = async (type) => {
    if (Platform.OS !== 'web') return notWeb();
    const rows = pedidosFiltrados.map(p => {
      const sub = p.items.reduce((s, it) => s + it.price * it.qty, 0);
      const total = sub * 1.16;
      return [p.id, p.mesa, ESTADO_LABEL[p.estado] || p.estado, String(p.fecha || '').slice(0, 16).replace('T', ' '), `$${total.toFixed(2)}`];
    });
    const subtitle = `Del ${repFrom} al ${repTo} - Estado: ${ESTADO_LABEL[repEstado]}`;
    try {
      if (type === 'PDF') await exportPDF('Reporte de Pedidos', subtitle, ['ID', 'Mesa', 'Estado', 'Fecha', 'Total'], rows, 'Reporte_Pedidos.pdf');
      else await exportXLSX('REPORTE DE PEDIDOS', ['ID', 'Mesa', 'Estado', 'Fecha', 'Total'], rows, 'Reporte_Pedidos.xlsx');
      showToast('Exito!', 'Reporte descargado.');
    } catch (e) { showToast('Error', 'Fallo al generar archivo.'); }
  };

  const downloadInsumos = async (type) => {
    if (Platform.OS !== 'web') return notWeb();
    const rows = insumosFiltrados.map(i => [i.nombre, i.unidad, i.stock_actual, i.stock_minimo, i.low ? 'BAJO' : 'Normal']);
    const subtitle = repSoloBajo ? 'Solo insumos con stock bajo' : 'Todos los insumos';
    try {
      if (type === 'PDF') await exportPDF('Reporte de Inventario', subtitle, ['Insumo', 'Unidad', 'Stock Actual', 'Stock Minimo', 'Estado'], rows, 'Reporte_Inventario.pdf');
      else await exportXLSX('REPORTE DE INVENTARIO', ['Insumo', 'Unidad', 'Stock Actual', 'Stock Minimo', 'Estado'], rows, 'Reporte_Inventario.xlsx');
      showToast('Exito!', 'Reporte descargado.');
    } catch (e) { showToast('Error', 'Fallo al generar archivo.'); }
  };

  const sidebarJSX = (
    <View style={st.sidebar}>
      <View style={st.sideHeader}>
        <FontAwesome5 name="coffee" size={20} color={C.white} />
        <Text style={st.sideBrand}>Coffee Code</Text>
      </View>
      <View style={st.sideNav}>
        {[{ k: 'usuarios', l: 'Usuarios', i: 'users' }, { k: 'estadisticas', l: 'Estadisticas', i: 'chart-bar' }].map(t => (
          <TouchableOpacity key={t.k} style={[st.sideBtn, tab === t.k && st.sideBtnA]} onPress={() => setTab(t.k)}>
            <FontAwesome5 name={t.i} size={14} color={tab === t.k ? C.textDark : C.accent} />
            <Text style={[st.sideBtnT, tab === t.k && { color: C.textDark }]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const contentJSX = (
    <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {tab === 'usuarios' && (<>
        <Text style={st.secTitle}>Gestion de Personal</Text>
        <View style={st.formCard}>
          <Text style={st.formTitle}>Alta de Nuevo Trabajador</Text>
          <View style={isWide ? { flexDirection: 'row', gap: 10, marginBottom: 10 } : { marginBottom: 10 }}>
            <View style={{ flex: 1, marginBottom: isWide ? 0 : 10 }}>
              <Text style={st.fLabel}>Nombre</Text>
              <TextInput style={st.fInput} placeholder="Roque Aguirre" placeholderTextColor={C.textMuted} value={newName} onChangeText={setNewName} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.fLabel}>USUARIO</Text>
              <TextInput style={st.fInput} placeholder="Roque123M" placeholderTextColor={C.textMuted} value={newUser} onChangeText={setNewUser} autoCapitalize="none" />
            </View>
          </View>
          <View style={isWide ? { flexDirection: 'row', gap: 10, marginBottom: 10, zIndex: 50 } : { marginBottom: 10, zIndex: 50 }}>
            <View style={{ flex: 1, marginBottom: isWide ? 0 : 10 }}>
              <Text style={st.fLabel}>CONTRASEÑA</Text>
              <TextInput style={st.fInput} placeholder="12345678" placeholderTextColor={C.textMuted} value={newPass} onChangeText={setNewPass} secureTextEntry />
            </View>
            <View style={{ flex: 1, zIndex: 50 }}>
              <Text style={st.fLabel}>Rol Asignado</Text>
              <TouchableOpacity style={st.roleSelect} onPress={() => setShowDrop(!showDrop)}>
                <Text style={{ fontSize: 14, color: '#111' }}>{newRole}</Text>
                <FontAwesome5 name="chevron-down" size={10} color={C.textGray} />
              </TouchableOpacity>
              <Modal visible={showDrop} transparent animationType="fade" onRequestClose={() => setShowDrop(false)}>
                <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowDrop(false)}>
                  <View style={st.modalRoleBox}>
                    {ROLES.map(r => (
                      <TouchableOpacity key={r} style={st.roleOpt} onPress={() => { setNewRole(r); setShowDrop(false); }}>
                        <Text style={[{ fontSize: 15, color: '#374151' }, newRole === r && { color: C.primary, fontWeight: '700' }]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
          <TouchableOpacity style={st.saveBtn} onPress={saveEmp}><Text style={st.saveBtnT}>Guardar Usuario</Text></TouchableOpacity>
        </View>

        <View style={st.tableCard}>
          <View style={st.tableH}>
            <Text style={[st.tableHC, { flex: 1.6 }]}>Nombre</Text>
            <Text style={[st.tableHC, { flex: 1.1 }]}>Usuario</Text>
            <Text style={[st.tableHC, { flex: 0.7 }]}>Rol</Text>
            <Text style={[st.tableHC, { flex: 1.1 }]}>Contraseña</Text>
            <Text style={[st.tableHC, { flex: 0.5, textAlign: 'center' }]}>EDITAR</Text>
            <Text style={[st.tableHC, { flex: 0.5, textAlign: 'center' }]}>ELIMINAR</Text>
          </View>
          {emps.map((emp) => {
            const rc = roleBadge(emp.rol);
            const vis = showPass[emp.id];
            return (
              <View key={emp.id} style={st.tableR}>
                <Text style={[st.tableC, { flex: 1.6 }]}>{emp.nombre_completo}</Text>
                <Text style={[st.tableCM, { flex: 1.1 }]}>{emp.username}</Text>
                <View style={[st.rBadge, { backgroundColor: rc.bg, flex: 0.7 }]}><Text style={[st.rBadgeT, { color: rc.fg }]}>{emp.rol}</Text></View>
                <TouchableOpacity style={{ flex: 1.1, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => togglePass(emp.id)}>
                  <Text style={{ fontSize: 12, color: C.textGray }}>{vis ? emp.passw : '********'}</Text>
                  <FontAwesome5 name={vis ? 'eye' : 'eye-slash'} size={10} color={C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 0.5, alignItems: 'center' }} onPress={() => openEdit(emp)}>
                  <FontAwesome5 name="edit" size={14} color={C.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 0.5, alignItems: 'center' }} onPress={() => delEmp(emp.id)}>
                  <FontAwesome5 name="trash-alt" size={14} color={C.error} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </>)}

      {tab === 'estadisticas' && (<>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={st.secTitle}>Panel Analitico</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={st.expBtn} onPress={() => downloadVentas('PDF')}>
              <FontAwesome5 name="file-pdf" size={12} color={C.error} /><Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.expBtn, { backgroundColor: C.primary }]} onPress={() => downloadVentas('XLSX')}>
              <FontAwesome5 name="file-excel" size={12} color="#fff" /><Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>XLSX</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <View style={[st.kpi, { backgroundColor: C.accentLight }]}><Text style={{ fontSize: 12, color: C.textGray, fontWeight: '600', marginBottom: 4 }}>Ganancia (7 dias)</Text><Text style={{ fontSize: 22, fontWeight: '800', color: C.primary }}>${totalS.toLocaleString()}</Text></View>
          <View style={[st.kpi, { backgroundColor: '#fef2f2' }]}><Text style={{ fontSize: 12, color: C.textGray, fontWeight: '600', marginBottom: 4 }}>Gastos/Compras</Text><Text style={{ fontSize: 22, fontWeight: '800', color: C.error }}>${totalE.toLocaleString()}</Text></View>
        </View>

        <View style={st.chartCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FontAwesome5 name="chart-bar" size={14} color={C.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>Ventas vs Gastos (ultimos 7 dias, datos reales)</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, marginBottom: 12 }}>
            {weekStats.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <View style={{ width: 14, backgroundColor: C.primary, borderRadius: 4, height: Math.max(4, (d.sales / maxS) * 120) }} />
                  <View style={{ width: 14, backgroundColor: '#fecaca', borderRadius: 4, height: Math.max(4, (d.expenses / maxS) * 120) }} />
                </View>
                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600' }}>{d.day}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} /><Text style={{ fontSize: 11, color: C.textGray, fontWeight: '600' }}>Ventas</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.error }} /><Text style={{ fontSize: 11, color: C.textGray, fontWeight: '600' }}>Gastos</Text></View>
          </View>
        </View>

        <Text style={st.secTitle}>Productos Mas Vendidos (reales)</Text>
        {topProducts.length === 0 && <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Aun no hay pedidos pagados registrados.</Text>}
        {topProducts.map((p, i) => (
          <View key={i} style={st.topRow}>
            <View style={st.rankBadge}><Text style={st.rankT}>#{i + 1}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{p.name}</Text><Text style={{ fontSize: 12, color: C.textMuted }}>{p.sold} vendidos</Text></View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>${p.rev.toFixed(2)}</Text>
          </View>
        ))}

        <Text style={[st.secTitle, { marginTop: 12 }]}>Reportes Filtrados</Text>
        <View style={st.formCard}>
          <Text style={st.formTitle}>¿Qué quieres filtrar?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: reportKind ? 16 : 0 }}>
            {[{ k: 'productos', l: 'Productos', i: 'box' }, { k: 'pedidos', l: 'Pedidos', i: 'receipt' }, { k: 'inventario', l: 'Inventario', i: 'boxes' }].map(o => (
              <TouchableOpacity key={o.k} style={[st.kindBtn, reportKind === o.k && st.kindBtnA]} onPress={() => setReportKind(reportKind === o.k ? null : o.k)}>
                <FontAwesome5 name={o.i} size={13} color={reportKind === o.k ? '#fff' : C.primary} />
                <Text style={[st.kindBtnT, reportKind === o.k && { color: '#fff' }]}>{o.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(reportKind === 'productos' || reportKind === 'pedidos') && (<>
            <View style={isWide ? { flexDirection: 'row', gap: 10, marginBottom: 10 } : { marginBottom: 10 }}>
              <View style={{ flex: 1, marginBottom: isWide ? 0 : 10 }}>
                <Text style={st.fLabel}>Desde (AAAA-MM-DD)</Text>
                <TextInput style={st.fInput} value={repFrom} onChangeText={setRepFrom} placeholder="2026-06-29" placeholderTextColor={C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.fLabel}>Hasta (AAAA-MM-DD)</Text>
                <TextInput style={st.fInput} value={repTo} onChangeText={setRepTo} placeholder="2026-07-05" placeholderTextColor={C.textMuted} />
              </View>
            </View>
            <Text style={st.fLabel}>Estado de Pedido</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ESTADOS_PEDIDO.map(e => (
                <TouchableOpacity key={e} style={[st.chip, repEstado === e && st.chipA]} onPress={() => setRepEstado(e)}>
                  <Text style={[st.chipT, repEstado === e && { color: '#fff' }]}>{ESTADO_LABEL[e]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>)}

          {reportKind === 'inventario' && (
            <TouchableOpacity style={[st.chip, repSoloBajo && st.chipA, { alignSelf: 'flex-start', flexDirection: 'row', gap: 6 }]} onPress={() => setRepSoloBajo(!repSoloBajo)}>
              <FontAwesome5 name={repSoloBajo ? 'check-square' : 'square'} size={12} color={repSoloBajo ? '#fff' : C.textGray} />
              <Text style={[st.chipT, repSoloBajo && { color: '#fff' }]}>Solo insumos con stock bajo</Text>
            </TouchableOpacity>
          )}
        </View>

        {reportKind === 'productos' && (
        <View style={[st.reportCard, { marginBottom: 24 }]}>
          <View style={st.reportHead}>
            <Text style={st.reportTitle}>Reporte de Productos</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={st.expBtn} onPress={() => downloadProductos('PDF')}><FontAwesome5 name="file-pdf" size={12} color={C.error} /><Text style={st.expBtnT}>PDF</Text></TouchableOpacity>
              <TouchableOpacity style={[st.expBtn, { backgroundColor: C.primary }]} onPress={() => downloadProductos('XLSX')}><FontAwesome5 name="file-excel" size={12} color="#fff" /><Text style={[st.expBtnT, { color: '#fff' }]}>XLSX</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={st.reportHint}>{productosReportData.length} producto(s) en el rango seleccionado</Text>
        </View>
        )}

        {reportKind === 'pedidos' && (
        <View style={[st.reportCard, { marginBottom: 24 }]}>
          <View style={st.reportHead}>
            <Text style={st.reportTitle}>Reporte de Pedidos</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={st.expBtn} onPress={() => downloadPedidos('PDF')}><FontAwesome5 name="file-pdf" size={12} color={C.error} /><Text style={st.expBtnT}>PDF</Text></TouchableOpacity>
              <TouchableOpacity style={[st.expBtn, { backgroundColor: C.primary }]} onPress={() => downloadPedidos('XLSX')}><FontAwesome5 name="file-excel" size={12} color="#fff" /><Text style={[st.expBtnT, { color: '#fff' }]}>XLSX</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={st.reportHint}>{pedidosFiltrados.length} pedido(s) en el rango seleccionado</Text>
        </View>
        )}

        {reportKind === 'inventario' && (
        <View style={[st.reportCard, { marginBottom: 24 }]}>
          <View style={st.reportHead}>
            <Text style={st.reportTitle}>Reporte de Inventario</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={st.expBtn} onPress={() => downloadInsumos('PDF')}><FontAwesome5 name="file-pdf" size={12} color={C.error} /><Text style={st.expBtnT}>PDF</Text></TouchableOpacity>
              <TouchableOpacity style={[st.expBtn, { backgroundColor: C.primary }]} onPress={() => downloadInsumos('XLSX')}><FontAwesome5 name="file-excel" size={12} color="#fff" /><Text style={[st.expBtnT, { color: '#fff' }]}>XLSX</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={st.reportHint}>{insumosFiltrados.length} insumo(s) {repSoloBajo ? 'con stock bajo' : 'en total'}</Text>
        </View>
        )}
      </>)}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {sidebarJSX}
          {contentJSX}
        </View>
      ) : (
        <>
          <View style={st.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome5 name="coffee" size={16} color={C.white} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.white }}>Coffee Code</Text>
            </View>
            <Text style={st.headerTitle}>Administracion</Text>
            <Text style={{ fontSize: 13, color: C.accent, fontWeight: '600' }}>{userName || 'Admin'}</Text>
          </View>
          <View style={st.mTabRow}>
            {[{ k: 'usuarios', l: 'Usuarios', i: 'users' }, { k: 'estadisticas', l: 'Estadisticas', i: 'chart-bar' }].map(t => (
              <TouchableOpacity key={t.k} style={[st.mTab, tab === t.k && st.mTabA]} onPress={() => setTab(t.k)}>
                <FontAwesome5 name={t.i} size={13} color={tab === t.k ? '#fff' : C.textGray} />
                <Text style={[st.mTabT, tab === t.k && { color: '#fff' }]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {contentJSX}
        </>
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={st.modalOverlay}>
          <View style={st.editBox}>
            <Text style={st.formTitle}>Editar Usuario</Text>
            <Text style={st.fLabel}>Nombre</Text>
            <TextInput style={st.fInput} value={editName} onChangeText={setEditName} />
            <Text style={[st.fLabel, { marginTop: 10 }]}>USUARIO</Text>
            <TextInput style={st.fInput} value={editUser} onChangeText={setEditUser} autoCapitalize="none" />
            <Text style={[st.fLabel, { marginTop: 10 }]}>CONTRASEÑA</Text>
            <TextInput style={st.fInput} value={editPass} onChangeText={setEditPass} secureTextEntry />
            <Text style={[st.fLabel, { marginTop: 10 }]}>Rol Asignado</Text>
            <TouchableOpacity style={st.roleSelect} onPress={() => setShowEditDrop(!showEditDrop)}>
              <Text style={{ fontSize: 14, color: '#111' }}>{editRole}</Text>
              <FontAwesome5 name="chevron-down" size={10} color={C.textGray} />
            </TouchableOpacity>
            {showEditDrop && (
              <View style={st.modalRoleBox}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r} style={st.roleOpt} onPress={() => { setEditRole(r); setShowEditDrop(false); }}>
                    <Text style={[{ fontSize: 15, color: '#374151' }, editRole === r && { color: C.primary, fontWeight: '700' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={[st.saveBtn, { flex: 1, backgroundColor: '#f3f4f6' }]} onPress={closeEdit}><Text style={[st.saveBtnT, { color: '#374151' }]}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[st.saveBtn, { flex: 1 }]} onPress={saveEdit}><Text style={st.saveBtnT}>Guardar Cambios</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Animated.View style={[st.toast, { transform: [{ translateY: toastY }], opacity: toastO }]} pointerEvents="none">
        <View style={st.toastIcon}><FontAwesome5 name="check-circle" size={20} color={C.success} /></View>
        <View><Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{toastD.t}</Text><Text style={{ fontSize: 12, color: C.textGray }}>{toastD.m}</Text></View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  sidebar: { width: 256, backgroundColor: C.primary, paddingTop: 0 },
  sideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 24, borderBottomWidth: 1, borderBottomColor: C.primaryDark },
  sideBrand: { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.6 },
  sideNav: { padding: 16, gap: 8 },
  sideBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  sideBtnA: { backgroundColor: C.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  sideBtnT: { fontSize: 16, fontWeight: '700', color: C.accent },

  header: { backgroundColor: C.primary, paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.white },
  mTabRow: { flexDirection: 'row', backgroundColor: C.white, padding: 8, gap: 6 },
  mTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6' },
  mTabA: { backgroundColor: C.primary },
  mTabT: { fontSize: 13, fontWeight: '600', color: C.textGray },

  secTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 12 },
  formCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },
  fLabel: { fontSize: 11, fontWeight: '600', color: C.textGray, marginBottom: 4, textTransform: 'uppercase' },
  fInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111', marginBottom: 0 },
  roleSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalRoleBox: { width: 260, backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', paddingVertical: 4, marginTop: 4 },
  roleOpt: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  saveBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveBtnT: { fontSize: 14, fontWeight: '700', color: '#fff' },
  editBox: { width: 320, maxWidth: '90%', backgroundColor: C.white, borderRadius: 16, padding: 20 },

  tableCard: { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tableH: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8faf9', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableHC: { fontSize: 11, fontWeight: '700', color: C.textGray, textTransform: 'uppercase' },
  tableR: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableC: { fontSize: 13, fontWeight: '600', color: '#111' },
  tableCM: { fontSize: 12, color: C.textGray },
  rBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  rBadgeT: { fontSize: 11, fontWeight: '700' },

  kpi: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  chartCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  expBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f3f4f6' },
  expBtnT: { fontSize: 12, fontWeight: '600', color: '#374151' },

  topRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, padding: 14, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rankBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankT: { fontSize: 13, fontWeight: '800', color: C.primary },

  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: '#f3f4f6' },
  chipA: { backgroundColor: C.primary },
  chipT: { fontSize: 12, fontWeight: '600', color: C.textGray },

  kindBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.accentLight, borderWidth: 1, borderColor: C.accent },
  kindBtnA: { backgroundColor: C.primary, borderColor: C.primary },
  kindBtnT: { fontSize: 13, fontWeight: '700', color: C.primary },

  reportCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  reportHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reportTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  reportHint: { fontSize: 12, color: C.textMuted },

  toast: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: C.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8, zIndex: 100 },
  toastIcon: { width: 44, height: 44, backgroundColor: C.successBg, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
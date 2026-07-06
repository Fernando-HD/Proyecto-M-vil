from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, database
from datetime import datetime

# Crear las tablas (en caso de que no se use schema.sql directamente)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="CoffeeCode API")

# Habilitar CORS para React Native / Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Login
@app.post("/api/login")
def login(data: schemas.LoginData, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.username == data.user).first()
    if not user or user.password_hash != data.passw:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    return {"id": user.id, "nombre": user.nombre_completo, "username": user.username, "rol": user.rol}

# 2. Usuarios
@app.get("/api/usuarios", response_model=list[schemas.Usuario])
def get_usuarios(db: Session = Depends(database.get_db)):
    return db.query(models.Usuario).order_by(models.Usuario.id).all()

@app.post("/api/usuarios")
def create_usuario(data: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    db_u = models.Usuario(nombre_completo=data.nombre_completo, username=data.username, rol=data.rol, password_hash=data.passw)
    db.add(db_u)
    db.commit()
    return {"ok": True}

@app.put("/api/usuarios/{id}")
def update_usuario(id: int, data: schemas.UsuarioUpdate, db: Session = Depends(database.get_db)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u.nombre_completo = data.nombre_completo
    u.username = data.username
    u.rol = data.rol
    u.password_hash = data.passw
    db.commit()
    return {"ok": True}

@app.delete("/api/usuarios/{id}")
def delete_usuario(id: int, db: Session = Depends(database.get_db)):
    db.query(models.Usuario).filter(models.Usuario.id == id).delete()
    db.commit()
    return {"ok": True}

# 3. Menú
@app.get("/api/menu", response_model=list[schemas.Producto])
def get_menu(db: Session = Depends(database.get_db)):
    return db.query(models.Producto).all()

@app.put("/api/menu/{id}/toggle")
def toggle_menu(id: int, db: Session = Depends(database.get_db)):
    p = db.query(models.Producto).filter(models.Producto.id == id).first()
    if p:
        p.disponible = not p.disponible
        db.commit()
    return {"ok": True}

# 4. Pedidos
@app.post("/api/pedidos")
def create_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(database.get_db)):
    db_pedido = models.Pedido(usuario_id=pedido.usuario_id, mesa=pedido.mesa, estado="pending")
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    
    for item in pedido.items:
        db_det = models.DetallePedido(pedido_id=db_pedido.id, producto_id=item.producto_id, cantidad=item.cantidad, precio_unitario=item.precio_unitario)
        db.add(db_det)
    db.commit()
    return {"id": db_pedido.id, "mesa": db_pedido.mesa}

@app.get("/api/pedidos", response_model=list[schemas.PedidoOut])
def get_pedidos(db: Session = Depends(database.get_db)):
    pedidos = db.query(models.Pedido).order_by(models.Pedido.id.asc()).all()
    res = []
    for p in pedidos:
        td = datetime.utcnow() - p.fecha_creacion
        mins = int(td.total_seconds() / 60)
        items = [{"nombre": d.producto.nombre, "qty": d.cantidad, "price": float(d.precio_unitario)} for d in p.detalles]
        res.append({
            "id": p.id,
            "mesa": p.mesa,
            "estado": p.estado,
            "time": f"{mins} min",
            "fecha": p.fecha_creacion,
            "items": items,
            "paid": p.estado == "paid"
        })
    return res

@app.put("/api/pedidos/{id}/estado")
def update_estado(id: int, estado: str, db: Session = Depends(database.get_db)):
    p = db.query(models.Pedido).filter(models.Pedido.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Cuando un pedido pasa a "preparing", descontar insumos según recetas
    if estado == "preparing" and p.estado == "pending":
        for det in p.detalles:
            recetas = db.query(models.Receta).filter(models.Receta.producto_id == det.producto_id).all()
            for rec in recetas:
                insumo = db.query(models.Insumo).filter(models.Insumo.id == rec.insumo_id).first()
                if insumo:
                    cantidad_a_descontar = float(rec.cantidad_requerida) * det.cantidad
                    insumo.stock_actual = max(0, float(insumo.stock_actual) - cantidad_a_descontar)
        db.commit()
    
    p.estado = estado
    db.commit()
    return {"ok": True}

@app.delete("/api/pedidos/{id}")
def cancel_pedido(id: int, db: Session = Depends(database.get_db)):
    db.query(models.DetallePedido).filter(models.DetallePedido.pedido_id == id).delete()
    db.query(models.Pedido).filter(models.Pedido.id == id).delete()
    db.commit()
    return {"ok": True}

# 5. Gastos
@app.post("/api/gastos")
def add_gasto(gasto: schemas.GastoCreate, db: Session = Depends(database.get_db)):
    db_gasto = models.Gasto(concepto=gasto.concepto, monto=gasto.monto)
    db.add(db_gasto)
    db.commit()
    return {"ok": True}

@app.get("/api/gastos", response_model=list[schemas.GastoOut])
def get_gastos(db: Session = Depends(database.get_db)):
    return db.query(models.Gasto).order_by(models.Gasto.id.desc()).all()

# 6. Insumos
@app.get("/api/insumos", response_model=list[schemas.InsumoOut])
def get_insumos(db: Session = Depends(database.get_db)):
    insumos = db.query(models.Insumo).order_by(models.Insumo.id).all()
    result = []
    for ins in insumos:
        result.append({
            "id": ins.id,
            "nombre": ins.nombre,
            "unidad": ins.unidad,
            "stock_actual": float(ins.stock_actual),
            "stock_minimo": float(ins.stock_minimo),
            "low": float(ins.stock_actual) <= float(ins.stock_minimo),
        })
    return result

@app.post("/api/insumos/{id}/abastecer")
def abastecer_insumo(id: int, data: schemas.AbastecerInsumo, db: Session = Depends(database.get_db)):
    """
    Reabastecer un insumo: aumenta stock y registra gasto en caja.
    """
    insumo = db.query(models.Insumo).filter(models.Insumo.id == id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    
    # Aumentar stock
    insumo.stock_actual = float(insumo.stock_actual) + data.cantidad
    
    # Registrar gasto automáticamente en caja
    concepto = f"Compra de {insumo.nombre} ({data.cantidad} {insumo.unidad})"
    db_gasto = models.Gasto(concepto=concepto, monto=data.costo)
    db.add(db_gasto)
    
    db.commit()
    return {
        "ok": True,
        "nuevo_stock": float(insumo.stock_actual),
        "gasto_registrado": concepto,
        "monto": data.costo,
    }
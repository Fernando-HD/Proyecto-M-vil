from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import models

class LoginData(BaseModel):
    user: str
    passw: str

class Usuario(BaseModel):
    id: int
    nombre_completo: str
    username: str
    rol: str
    passw: str
    class Config:
        from_attributes = True

class UsuarioCreate(BaseModel):
    nombre_completo: str
    username: str
    rol: str
    passw: str

class UsuarioUpdate(BaseModel):
    nombre_completo: str
    username: str
    rol: str
    passw: str

class Insumo(BaseModel):
    id: int
    nombre: str
    unidad: str
    stock_actual: float
    stock_minimo: float
    class Config:
        from_attributes = True

class InsumoOut(BaseModel):
    id: int
    nombre: str
    unidad: str
    stock_actual: float
    stock_minimo: float
    low: bool
    class Config:
        from_attributes = True

class AbastecerInsumo(BaseModel):
    cantidad: float
    costo: float

class Producto(BaseModel):
    id: int
    nombre: str
    categoria: str
    precio: float
    disponible: bool
    class Config:
        from_attributes = True

class DetallePedidoCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float

class DetallePedidoInfo(BaseModel):
    nombre: str
    qty: int
    price: float

class PedidoCreate(BaseModel):
    usuario_id: int
    mesa: str
    items: List[DetallePedidoCreate]

class PedidoOut(BaseModel):
    id: int
    mesa: str
    estado: str
    time: str
    fecha: datetime
    items: List[DetallePedidoInfo]
    paid: bool
    class Config:
        from_attributes = True

class GastoCreate(BaseModel):
    concepto: str
    monto: float

class GastoOut(BaseModel):
    id: int
    concepto: str
    monto: float
    fecha: datetime
    class Config:
        from_attributes = True

class Gasto(BaseModel):
    id: int
    concepto: str
    monto: float
    fecha: datetime
    class Config:
        from_attributes = True
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False)
    pedidos = relationship("Pedido", back_populates="usuario")

    @property
    def passw(self):
        return self.password_hash

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    categoria = Column(String(50), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    disponible = Column(Boolean, default=True)
    recetas = relationship("Receta", back_populates="producto")

class Insumo(Base):
    __tablename__ = "insumos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    unidad = Column(String(20), nullable=False)
    stock_actual = Column(Numeric(10, 2), nullable=False, default=0)
    stock_minimo = Column(Numeric(10, 2), nullable=False, default=0)
    recetas = relationship("Receta", back_populates="insumo")

class Receta(Base):
    __tablename__ = "recetas"
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    insumo_id = Column(Integer, ForeignKey("insumos.id", ondelete="CASCADE"), nullable=False)
    cantidad_requerida = Column(Numeric(10, 4), nullable=False)
    
    producto = relationship("Producto", back_populates="recetas")
    insumo = relationship("Insumo", back_populates="recetas")

class Pedido(Base):
    __tablename__ = "pedidos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mesa = Column(String(10), nullable=False)
    estado = Column(String(20), default="pending", nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    usuario = relationship("Usuario", back_populates="pedidos")
    detalles = relationship("DetallePedido", back_populates="pedido")

class DetallePedido(Base):
    __tablename__ = "detalle_pedidos"
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto")

class Gasto(Base):
    __tablename__ = "gastos"
    id = Column(Integer, primary_key=True, index=True)
    concepto = Column(String(255), nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)

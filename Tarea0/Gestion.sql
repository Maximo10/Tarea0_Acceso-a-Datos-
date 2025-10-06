drop database Gestion;
create database Gestion;
use Gestion;
create table Empleado(
    id int auto_increment,
    Nombre varchar(50),
    Apellidos varchar(50),
    Edad int,
    Departamento varchar(100),
    Posicion varchar(100),
    primary key(id)
);
INSERT INTO Empleado (Nombre, Apellidos, Edad, Departamento, Posicion) VALUES
('Carlas', 'Navarro', 24, 'Finanzas', 'Analista financiero'),
('Laura', 'Martínez', 29, 'Recursos Humanos', 'Especialista en selección'),
('Andrés', 'Gómez', 35, 'Marketing y Publicidad', 'Coordinador de campañas'),
('María', 'Fernández', 31, 'Comercial', 'Ejecutiva de ventas'),
('Javier', 'Pérez', 27, 'Compras', 'Gestor de proveedores'),
('Sofía', 'López', 33, 'Logística', 'Supervisora de operaciones'),
('Diego', 'Ramírez', 40, 'Gestión y Administración', 'Administrador general'),
('Elena', 'Hernández', 45, 'Directivo', 'Directora general'),
('Tomás', 'Iglesias', 26, 'IT', 'Desarrollador de software');

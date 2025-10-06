"use strict";
const fs = require("fs");
require('dotenv').config();
const mysql = require("mysql2/promise");
const readline = require("readline");
const { MongoClient, ObjectId } = require("mongodb"); 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function Prompt(texto) {
    return new Promise((resolve) => {
        rl.question(texto, (respuesta) => {
            resolve(respuesta);
        });
    });
}

//Variables Globales
let lista_cartas = [];
let tipo_archivo = "";
let nombre_archivo = "";

// MongoDB
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoUri = `mongodb+srv://bferfer:${mongoPassword}@cluster0.tgbjhs7.mongodb.net/Ficha_RH?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(mongoUri);
let mongoDB, mongoCollection;

// Función para conectar a MySQL
async function conectarBD() {
    return await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "Gestion",
    });
}

// Función para conectar a MongoDB
async function conectarMongo() {
    try {
        await mongoClient.connect();
        mongoDB = mongoClient.db("Ficha_RH");
        mongoCollection = mongoDB.collection("Empleado");
        console.log("Conectado a MongoDB Atlas");
    } catch (err) {
        console.error("Error al conectar a MongoDB:", err);
    }
}

//Función carga de datos
async function leerdatos() {
    console.log("\nTipos de Archivo \n1.Json \n2.Txt \n3.SQL\n4.MongoDB\n5.Salir");
    let opcion = await Prompt("Seleccione el tipo de archivo: ");
    switch (opcion) {
        case "1":
            tipo_archivo = "json";
            nombre_archivo = "cartas.json";
            break;
        case "2":
            tipo_archivo = "txt";
            nombre_archivo = "cartas.txt";
            break;
        case "3":
            tipo_archivo = "sql";
            break;
        case "4":
            tipo_archivo = "mongo";
            await conectarMongo();
            break;
        case "5":
            console.log("Saliendo del programa...");
            rl.close();
            process.exit();
        default:
            console.log("Error, el tipo de archivo es inválido....");
            rl.close();
            return;
    }

    if (tipo_archivo === "json" || tipo_archivo === "txt") {
        if (fs.existsSync(nombre_archivo)) {
            let data = fs.readFileSync(nombre_archivo, "utf-8");
            if (data.length > 0) {
                if (tipo_archivo === "json") {
                    lista_cartas = JSON.parse(data);
                } else {
                    let info = data.split("\n");
                    for (let i = 0; i < info.length; i++) {
                        if (info[i] !== "") {
                            lista_cartas.push(JSON.parse(info[i]));
                        }
                    }
                }
            }
        }
        console.log(" Datos cargados desde archivo...");
    } else if (tipo_archivo === "sql") {
        await cargarDesdeSQL();
    } else if (tipo_archivo === "mongo") {
        await cargarDesdeMongo();
    }
}

//Función guardar de datos
async function guardardatos() {
    if (tipo_archivo === "json") {
        fs.writeFileSync(nombre_archivo, JSON.stringify(lista_cartas, null, 2));
    } else if (tipo_archivo === "txt") {
        let texto = "";
        for (let i = 0; i < lista_cartas.length; i++) {
            texto += JSON.stringify(lista_cartas[i]) + "\n";
        }
        fs.writeFileSync(nombre_archivo, texto);
    } else if (tipo_archivo === "mongo") {
        await guardarEnMongo();
    }
}

//Funciones SQL
async function cargarDesdeSQL() {
    try {
        const connection = await conectarBD();
        const [rows] = await connection.execute("SELECT * FROM Empleado");
        lista_cartas = rows.map((r) => ({
            id: r.id,
            nombre: r.Nombre,
            apellidos: r.Apellidos,
            edad: r.Edad,
            departamento: r.Departamento,
            posicion: r.Posicion,
        }));
        await connection.end();
        console.log(" Datos cargados desde SQL");
    } catch (err) {
        console.error("Error al leer datos desde SQL:", err);
    }
}

async function insertarEnSQL(ficha) {
    const connection = await conectarBD();
    await connection.execute(
        "INSERT INTO Empleado (Nombre, Apellidos, Edad, Departamento, Posicion) VALUES (?, ?, ?, ?, ?)",
        [ficha.nombre, ficha.apellidos, ficha.edad, ficha.departamento, ficha.posicion]
    );
    await connection.end();
}

async function actualizarEnSQL(id, campo, valor) {
    const connection = await conectarBD();
    await connection.execute(`UPDATE Empleado SET ${campo}=? WHERE id=?`, [valor, id]);
    await connection.end();
}

async function borrarEnSQL(id) {
    const connection = await conectarBD();
    await connection.execute("DELETE FROM Empleado WHERE id=?", [id]);
    await connection.end();
}

//Funciones MongoDB
async function cargarDesdeMongo() {
    try {
        lista_cartas = await mongoCollection.find({}).toArray();
        console.log(" Datos cargados desde MongoDB");
    } catch (err) {
        console.error("Error al leer datos desde MongoDB:", err);
    }
}

async function guardarEnMongo() {
    try {
        await mongoCollection.deleteMany({});
        if (lista_cartas.length > 0) {
            await mongoCollection.insertMany(lista_cartas);
        }
        console.log(" Datos guardados en MongoDB");
    } catch (err) {
        console.error("Error al guardar datos en MongoDB:", err);
    }
}

async function insertarEnMongo(ficha) {
    try {
        const result = await mongoCollection.insertOne(ficha);
        ficha._id = result.insertedId; // Asignamos el ID generado por MongoDB
        lista_cartas.push(ficha);      // Añadimos la ficha solo localmente
    } catch (err) {
        console.error("Error al insertar en MongoDB:", err);
    }
}

async function actualizarEnMongo(id, campo, valor) {
    try {
        await mongoCollection.updateOne({ _id: new ObjectId(id) }, { $set: { [campo]: valor } });
        const index = lista_cartas.findIndex((car) => car._id.toString() === id.toString());
        if (index !== -1) lista_cartas[index][campo] = valor;
    } catch (err) {
        console.error("Error al actualizar en MongoDB:", err);
    }
}

async function borrarEnMongo(id) {
    try {
        await mongoCollection.deleteOne({ _id: new ObjectId(id) }); // Eliminamos solo del array local
        const index = lista_cartas.findIndex((car) => car._id.toString() === id.toString());
        if (index !== -1) lista_cartas.splice(index, 1);
    } catch (err) {
        console.error("Error al borrar en MongoDB:", err);
    }
}

//Función Alta Ficha
async function alta_ficha() {
    const nombre = await Prompt("Ingrese Nombre: ");
    const apellidos = await Prompt("Ingrese Apellido: ");
    const edad = parseInt(await Prompt("Ingrese Edad: "));
    const departamento = await Prompt("Ingrese Departamento: ");
    const posicion = await Prompt("Ingrese Posición: ");

    if (isNaN(edad) || edad <= 0) {
        console.log(" Error, la edad es inválida....");
        return;
    }
    let ficha = { nombre, apellidos, edad, departamento, posicion };

    if (tipo_archivo === "sql") {
        await insertarEnSQL(ficha);
        await cargarDesdeSQL();
    } else if (tipo_archivo === "mongo") {
        await insertarEnMongo(ficha);
        await cargarDesdeMongo();
    } else {
        lista_cartas.push(ficha);
        guardardatos();
    }

    console.log(" Nueva Ficha Agregada...");
}

//Función Mostrar Fichas
async function mostrar() {
    if (lista_cartas.length === 0) {
        console.log(" No hay fichas para mostrar.");
        return;
    }
    console.log("\nOpciones de visualización:\n1. Mostrar todas\n2. Búsqueda por nombre\n3. Volver");
    let opcion = await Prompt("Seleccione opción: ");
    switch (opcion) {
        case "1":
            console.log("\n=== Todas las fichas ===");
            lista_cartas.forEach((c, i) => {
                console.log(
                    `${i + 1}. ${c.nombre} ${c.apellidos} | Edad: ${c.edad} | Dept: ${c.departamento} | Posición: ${c.posicion}`
                );
            });
            break;
        case "2":
            let nombreBuscar = await Prompt("Nombre a buscar: ");
            let encontrados = lista_cartas.filter(
                (c) => c.nombre.toLowerCase() === nombreBuscar.toLowerCase()
            );
            if (encontrados.length > 0) {
                console.log("\n=== Fichas Empleados ===");
                encontrados.forEach((c, i) => {
                    console.log(
                        `${i + 1}. ${c.nombre} ${c.apellidos} | Edad: ${c.edad} | Dept: ${c.departamento} | Posición: ${c.posicion}`
                    );
                });
            } else {
                console.log(" No se encontraron fichas con ese nombre.");
            }
            break;
        case "3":
            return;
        default:
            console.log(" Opción inválida.");
            break;
    }
}

//Función Modificar Ficha
async function modificar() {
    lista_cartas.forEach((c, i) => {
        console.log(`${i + 1} - ${c.nombre} ${c.apellidos}`);
    });
    let ide = parseInt(await Prompt("Ingrese el número de la ficha a modificar: ")) - 1;

    if (ide >= 0 && ide < lista_cartas.length) {
        console.log("1. Nombre \n2. Apellido \n3. Edad \n4. Departamento \n5. Posición");
        let opcion = parseInt(await Prompt("Seleccione apartado a modificar: "));
        let campos = ["nombre", "apellidos", "edad", "departamento", "posicion"];
        if (opcion < 1 || opcion > 5) {
            console.log(" Opción inválida");
            return;
        }

        let nuevoValor = await Prompt("Nuevo valor: ");
        if (opcion === 3) {
            nuevoValor = parseInt(nuevoValor);
            if (isNaN(nuevoValor) || nuevoValor <= 0) {
                console.log(" Error, la edad es inválida....");
                return;
            }
        }

        if (tipo_archivo === "sql") {
            await actualizarEnSQL(lista_cartas[ide].id, campos[opcion - 1], nuevoValor);
            await cargarDesdeSQL();
        } else if (tipo_archivo === "mongo") {
            await actualizarEnMongo(lista_cartas[ide]._id, campos[opcion - 1], nuevoValor);
            await cargarDesdeMongo();
        } else {
            lista_cartas[ide][campos[opcion - 1]] = nuevoValor;
            guardardatos();
        }
        console.log(" Ficha modificada");
    } else {
        console.log(" Error, opción inválida");
    }
}

// Función Borrar Ficha
async function borra() {
    if (lista_cartas.length === 0) {
        console.log(" No hay fichas para borrar.");
        return;
    }
    console.log("\nOpciones de borrado:\n1. Borrar ficha específica\n2. Borrar todas las fichas\n3. Borrar fichas desde X hasta Y");
    let opcion = await Prompt("Seleccione opción: ");
    switch (opcion) {
        case "1":
            lista_cartas.forEach((c, i) => console.log(`${i + 1} - ${c.nombre} ${c.apellidos}`));
            let num = parseInt(await Prompt("Ingrese el número de ficha a borrar: ")) - 1;
            if (num >= 0 && num < lista_cartas.length) {
                let confi = await Prompt(`Eliminar a ${lista_cartas[num].nombre}? (Si/No): `);
                if (confi.toLowerCase() === "si") {
                    if (tipo_archivo === "sql") {
                        await borrarEnSQL(lista_cartas[num].id);
                        await cargarDesdeSQL();
                    } else if (tipo_archivo === "mongo") {
                        await borrarEnMongo(lista_cartas[num]._id);
                        await cargarDesdeMongo();
                    } else {
                        lista_cartas.splice(num, 1);
                        guardardatos();
                    }
                    console.log("Ficha eliminada");
                }
            } else {
                console.log("Ficha inexistente...");
            }
            break;
        case "2":
            let confTodos = await Prompt("¿Está seguro de borrar todas las fichas? (Si/No): ");
            if (confTodos.toLowerCase() === "si") {
                if (tipo_archivo === "sql") {
                    for (let i = 0; i < lista_cartas.length; i++) {
                        await borrarEnSQL(lista_cartas[i].id);
                    }
                    await cargarDesdeSQL();
                } else if (tipo_archivo === "mongo") {
                    await mongoCollection.deleteMany({});
                    lista_cartas = [];
                } else {
                    lista_cartas = [];
                    guardardatos();
                }
                console.log("Todas las fichas han sido eliminadas");
            }
            break;
        case "3":
            let desde = parseInt(await Prompt("Desde el número de ficha: ")) - 1;
            let hasta = parseInt(await Prompt("Hasta el número de ficha: ")) - 1;
            if (desde >= 0 && hasta < lista_cartas.length && desde <= hasta) {
                let confRango = await Prompt(`¿Está seguro de borrar las fichas ${desde + 1} a ${hasta + 1}? (Si/No): `);
                if (confRango.toLowerCase() === "si") {
                    for (let i = desde; i <= hasta; i++) {
                        if (tipo_archivo === "sql") {
                            await borrarEnSQL(lista_cartas[i].id);
                        } else if (tipo_archivo === "mongo") {
                            await borrarEnMongo(lista_cartas[i]._id);
                        }
                    }
                    if (tipo_archivo === "sql") {
                        await cargarDesdeSQL();
                    } else if (tipo_archivo === "mongo") {
                        await cargarDesdeMongo();
                    } else {
                        lista_cartas.splice(desde, hasta - desde + 1);
                        guardardatos();
                    }
                    console.log(`Fichas del ${desde + 1} al ${hasta + 1} eliminadas`);
                }
            } else {
                console.log("Rango inválido");
            }
            break;
        default:
            console.log("Opción inválida");
    }
}

//Menu Principal
async function menu_princi() {
    let fin = false;
    while (!fin) {
        console.log("\n=== Menu Principal ===\n1.Alta Ficha \n2.Mostrar \n3.Modificar \n4.Borrado \n5.Volver");
        let opcion = await Prompt("Seleccione opción: ");
        switch (opcion) {
            case "1":
                await alta_ficha();
                break;
            case "2":
                await mostrar();
                break;
            case "3":
                await modificar();
                break;
            case "4":
                await borra();
                break;
            case "5":
                if (tipo_archivo !== "sql" && tipo_archivo !== "mongo") {
                    guardardatos();
                }
                console.log("Volviendo a selección de tipo de archivo...");
                fin = true;
                await leerdatos();
                await menu_princi();
                break;
            default:
                console.log(" Opción Inválida");
                break;
        }
    }
}

//Iniciar programa
(async () => {
    await leerdatos();
    await menu_princi();
})();

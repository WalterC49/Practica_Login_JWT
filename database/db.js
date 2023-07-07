const mysql = require("mysql");

const conection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
});

conection.connect((error) => {
  if (error) {
    console.log("El error de conexión fue: " + error);
  }
  console.log("¡Conectado a la base de datos MySQL!");
});

module.exports = conection;

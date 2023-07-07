const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const connection = require("../database/db");
const { promisify } = require("util");

//metodo para registrarnos
exports.register = async (req, res) => {
  try {
    const { name, user, pass } = req.body;
    let passHash = await bcryptjs.hash(pass, 8);

    connection.query(
      "INSERT INTO users SET ?",
      { name, user, pass: passHash },
      (error, results) => {
        if (error) {
          console.log(error);
        }
        res.redirect("/");
      }
    );
  } catch (error) {
    console.log(error);
  }
};

//metodo para el login
exports.login = async (req, res) => {
  try {
    const { user, pass } = req.body;

    if (!user || !pass) {
      //si no envio user o pass se redirige al a "/login" con los datos de la alerta
      res.render("login", {
        alert: true,
        alertTitle: "Advertencia",
        alertMessage: "Ingrese un usuario y contraseña",
        alertIcon: "info",
        showConfirmButton: true,
        timer: 8000,
        ruta: "login",
      });
    } else {
      // si user y pass no están vacio consulto la database
      connection.query(
        "SELECT * FROM users WHERE user=?",
        user,
        async (error, results) => {
          console.log("RESULTS" + results[0]);

          for (let index = 0; index < results.length; index++) {
            //queria ver que tiene el results
            console.log(results[index]);
          }

          if (
            results.length == 0 ||
            !(await bcryptjs.compare(pass, results[0].pass))
          ) {
            //si los pass son distintos o results viene vacio se redirige al a "/login" con los datos de la alerta
            res.render("login", {
              alert: true,
              alertTitle: "Error",
              alertMessage: "Usuario y/o contraseña incorrectos",
              alertIcon: "error",
              showConfirmButton: true,
              timer: 8000,
              ruta: "login",
            });
          } else {
            //inicio de sesión validado
            //configuro JWT
            const id = results[0].id;
            const token = jwt.sign({ id: id }, process.env.JWT_SECRETO, {
              expiresIn: process.env.JWT_TIEMPO_EXPIRA, //no escribir si no quieres que expire el token
            });

            const cookieOptions = {
              expires: new Date(
                Date.now() + process.env.JWT_COOKIE_EXPIRA * 24 * 60 * 60 * 1000
              ),
              httpOnly: true,
            };
            res.cookie("jwt", token, cookieOptions);
            res.render("login", {
              alert: true,
              alertTitle: "Conexión Exitosa",
              alertMessage: "¡LOGIN CORRECTO!",
              alertIcon: "success",
              showConfirmButton: false,
              timer: 8000,
              ruta: "",
            });
          }
        }
      );
    }
  } catch (error) {
    console.log(error);
  }
};

//metodo para autentificar
exports.isAuthenticated = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //promisify() transforma un fn callback en una fn que devuelve una promesa. la fn original debe soporta un callback
      //jwt.verify(token, secretKey)

      const decodificado = await promisify(jwt.verify)(
        // decodificado
        //llamo a la fn que devuelve promisify luego de crearla
        req.cookies.jwt,
        process.env.JWT_SECRETO
      );

      let dec2;
      jwt.verify(req.cookies.jwt, process.env.JWT_SECRETO, (error, decoded) => {
        dec2 = decoded.id;
      });
      /* console.log("dec2 "+dec2); */ /* 
      console.log("decodificado "+decodificado); */

      //consulto la database con el id que estaba en el token para ver si existe
      connection.query(
        "SELECT * FROM users WHERE id=?",
        dec2,
        (error, results) => {
          if (!results) {
            return next(); //si results no existe continua/llama al siguiente middleware
          }
          req.user = results[0]; //guardo los datos de la query en req.user
          delete req.user.pass; //borro la contraseña para que el cliente no la vea
          console.log(req.user);
          return next(); //return next() vs next() conviene usar return porque evita que se ejecute más codigo si lo hay
        }
      );
    } catch (error) {
      console.log(error);
      return next();
    }
  } else {
    //si no existe la cookie redirige a /login
    res.redirect("/login");
  }
};

exports.logout = (req, res) => {
  res.clearCookie("jwt");
  return res.redirect("/");
};

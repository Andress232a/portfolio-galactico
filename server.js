const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de MySQL para XAMPP
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // XAMPP por defecto no tiene contraseña
  database: 'portfolio',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar la conexión a la base de datos
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    console.error('Detalles del error:', {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    return;
  }
  console.log('Conexión exitosa a la base de datos MySQL (XAMPP)');

  // Crear la base de datos si no existe
  connection.query('CREATE DATABASE IF NOT EXISTS portfolio', (err) => {
    if (err) {
      console.error('Error al crear la base de datos:', err);
      return;
    }
    console.log('Base de datos portfolio creada o ya existe');

    // Usar la base de datos
    connection.query('USE portfolio', (err) => {
      if (err) {
        console.error('Error al seleccionar la base de datos:', err);
        return;
      }

      // Crear la tabla de mensajes
      connection.query(`
        DROP TABLE IF EXISTS messages;
      `, (err) => {
        if (err) {
          console.error('Error al eliminar la tabla:', err);
          return;
        }
        console.log('Tabla anterior eliminada');

        connection.query(`
          CREATE TABLE messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            asunto VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `, (err) => {
          if (err) {
            console.error('Error al crear la tabla:', err);
            console.error('Detalles del error:', {
              code: err.code,
              errno: err.errno,
              sqlState: err.sqlState,
              sqlMessage: err.sqlMessage
            });
          } else {
            console.log('Tabla de mensajes recreada exitosamente');
            
            // Verificar la estructura de la tabla
            connection.query('DESCRIBE messages', (err, results) => {
              if (err) {
                console.error('Error al verificar la estructura:', err);
              } else {
                console.log('Estructura de la tabla:', results);
              }
              connection.release();
            });
          }
        });
      });
    });
  });
});

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'suarezsotoandres7@gmail.com',
    pass: 'vtiu nlis lais ngzd'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verificar la conexión del transporter
transporter.verify(function(error, success) {
  if (error) {
    console.log('Error en la configuración del correo:', error);
  } else {
    console.log('Servidor de correo listo para enviar mensajes');
  }
});

// Endpoints
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    console.log('Recibiendo mensaje:', { name, email, subject, message });

    // Verificar que todos los campos estén presentes
    if (!name || !email || !subject || !message) {
      console.error('Faltan campos requeridos:', { name, email, subject, message });
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Guardar mensaje en la base de datos
    pool.query(
      'INSERT INTO messages (name, email, asunto, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message],
      (err, results) => {
        if (err) {
          console.error('Error al guardar el mensaje:', err);
          console.error('Detalles del error:', {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
          });
          return res.status(500).json({ error: 'Error al guardar el mensaje: ' + err.message });
        }
        console.log('Mensaje guardado en la base de datos:', results);

        // Enviar email al administrador
        const adminMailOptions = {
          from: 'suarezsotoandres7@gmail.com',
          to: 'suarezsotoandres7@gmail.com',
          subject: `Nuevo mensaje de contacto: ${subject}`,
          text: `
            Nombre: ${name}
            Email: ${email}
            Asunto: ${subject}
            Mensaje: ${message}
          `
        };

        // Enviar email de confirmación al remitente
        const confirmationMailOptions = {
          from: 'suarezsotoandres7@gmail.com',
          to: email,
          subject: 'Confirmación de mensaje recibido',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #10b981; margin-bottom: 20px;">¡Mensaje Recibido!</h2>
              <p>Hola ${name},</p>
              <p>Gracias por contactarme. He recibido tu mensaje y te responderé lo antes posible.</p>
              <p>Aquí está una copia del mensaje que enviaste:</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;">${message}</p>
              </div>
              <p>Saludos cordiales,</p>
              <p>Andres Suarez Soto</p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
          `
        };

        // Enviar ambos correos
        Promise.all([
          transporter.sendMail(adminMailOptions),
          transporter.sendMail(confirmationMailOptions)
        ]).then(() => {
          console.log('Correos enviados exitosamente');
          res.status(200).json({ message: 'Mensaje enviado correctamente' });
        }).catch((error) => {
          console.error('Error al enviar los correos:', error);
          res.status(500).json({ error: 'Error al enviar el mensaje' });
        });
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
});

// Obtener todos los mensajes
app.get('/api/messages', (req, res) => {
  console.log('Solicitando mensajes...');
  pool.query(
    'SELECT * FROM messages ORDER BY created_at DESC',
    (err, results) => {
      if (err) {
        console.error('Error al obtener mensajes:', err);
        return res.status(500).json({ error: 'Error al obtener los mensajes' });
      }
      console.log('Mensajes obtenidos:', results);
      res.json(results);
    }
  );
});

// Eliminar un mensaje
app.delete('/api/messages/:id', (req, res) => {
  console.log('Eliminando mensaje:', req.params.id);
  pool.query(
    'DELETE FROM messages WHERE id = ?',
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error('Error al eliminar mensaje:', err);
        return res.status(500).json({ error: 'Error al eliminar el mensaje' });
      }
      console.log('Mensaje eliminado:', results);
      res.json({ message: 'Mensaje eliminado correctamente' });
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
}); 
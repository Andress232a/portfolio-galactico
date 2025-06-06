const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Verificar variables de entorno
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Error: Las variables de entorno EMAIL_USER y EMAIL_PASS son requeridas');
  process.exit(1);
}

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificar la conexión del transporter
transporter.verify(function(error, success) {
  if (error) {
    console.error('Error al verificar el transporter:', error);
  } else {
    console.log('Servidor de correo listo para enviar mensajes');
  }
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Ruta para el formulario de contacto
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validar campos requeridos
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos',
        error: 'MISSING_FIELDS'
      });
    }

    console.log('Recibida solicitud de contacto:', { name, email, subject });

    // Configurar el correo
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Enviar a tu propio correo
      subject: `Nuevo mensaje de contacto: ${subject}`,
      text: `
        Nombre: ${name}
        Email: ${email}
        Asunto: ${subject}
        Mensaje: ${message}
      `
    };

    console.log('Intentando enviar correo...');

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente:', info.response);

    res.status(200).json({ message: 'Mensaje enviado con éxito' });
  } catch (error) {
    console.error('Error detallado al enviar el correo:', error);
    res.status(500).json({ 
      message: 'Error al enviar el mensaje',
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
  console.log('Variables de entorno cargadas:', {
    PORT: process.env.PORT,
    EMAIL_USER: process.env.EMAIL_USER ? 'Configurado' : 'No configurado',
    EMAIL_PASS: process.env.EMAIL_PASS ? 'Configurado' : 'No configurado'
  });
}); 
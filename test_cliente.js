import db from './src/config/db.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const test = async () => {
    const req = {
        body: {
            nombre: 'Juan',
            apellido: 'Perez',
            cedula: 'V-12345678',
            telefono: '+584141234567',
            email: 'juan@test.com',
            nacionalidad: 'Venezolana'
        }
    };
    
    let resData = null;
    const res = {
        status: (code) => {
            return {
                json: (data) => {
                    resData = { code, data };
                }
            };
        }
    };

    const crearCliente = async (req, res) => {
        const { nombre, apellido, cedula, telefono, email, nacionalidad } = req.body;
    
        try {
            const formatoCedulaRegex = /^(V|E|P)-\d{6,10}$/i;
            if (!formatoCedulaRegex.test(cedula)) {
                return res.status(400).json({ success: false, message: 'Formato de documento inválido.' });
            }
    
            const prefijo = cedula.toUpperCase().charAt(0);
            const nacNormalizada = nacionalidad.toLowerCase();
    
            if (nacNormalizada === 'venezolana' && prefijo !== 'V') {
                return res.status(400).json({ success: false, message: 'Incongruencia: Venezolano debe usar V-.' });
            }
            if (nacNormalizada === 'extranjera' && prefijo !== 'E' && prefijo !== 'P') {
                return res.status(400).json({ success: false, message: 'Incongruencia: Extranjero debe usar E o P.' });
            }
    
            const phoneNumber = parsePhoneNumberFromString(telefono);
            if (!phoneNumber || !phoneNumber.isValid()) {
                return res.status(400).json({ success: false, message: 'El número de teléfono proporcionado no es válido.' });
            }
            
            const telefonoInternacional = phoneNumber.number;
            await db.execute(
                'INSERT INTO clientes (nombre, apellido, cedula, telefono, email, nacionalidad) VALUES (?, ?, ?, ?, ?, ?)',
                [nombre, apellido, cedula.toUpperCase(), telefonoInternacional, email, nacionalidad]
            );
            
            res.status(201).json({ success: true, message: 'Cliente registrado con éxito.' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'La cédula o el correo ya se encuentran registrados.' });
            }
            res.status(500).json({ success: false, message: 'Error interno', error: error.message });
        }
    };

    await crearCliente(req, res);
    console.log(JSON.stringify(resData, null, 2));
    process.exit(0);
};

test();

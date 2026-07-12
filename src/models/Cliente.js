import { parsePhoneNumberFromString } from 'libphonenumber-js';
import db from '../config/db.js';

class Cliente {
  constructor({ id = null, nombre = '', apellido = '', cedula = '', telefono = '', email = '', nacionalidad = '' } = {}) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.cedula = cedula;
    this.telefono = telefono;
    this.email = email;
    this.nacionalidad = nacionalidad;
  }

  static fromData(data = {}) {
    return new Cliente(data);
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      apellido: this.apellido,
      cedula: this.cedula,
      telefono: this.telefono,
      email: this.email,
      nacionalidad: this.nacionalidad,
    };
  }

  validate() {
    const errors = [];

    // Validaciones obligatorias (Basadas en la estructura NOT NULL de tu base de datos)
    if (!this.nombre || typeof this.nombre !== 'string') {
      errors.push('El nombre del cliente es obligatorio.');
    }

    if (!this.apellido || typeof this.apellido !== 'string') {
      errors.push('El apellido del cliente es obligatorio.');
    }

    if (!this.cedula || typeof this.cedula !== 'string') {
      errors.push('La cédula/DNI del cliente es obligatoria.');
    }

    // Validaciones opcionales (Los campos aceptan NULL en la BD, pero si se llenan, deben ser válidos)
    if (this.email && (typeof this.email !== 'string' || !this.email.includes('@'))) {
      errors.push('Se requiere un correo electrónico válido.');
    }

    if (this.telefono && typeof this.telefono !== 'string') {
      errors.push('El formato del teléfono es inválido.');
    }

    if (this.nacionalidad && typeof this.nacionalidad !== 'string') {
      errors.push('La nacionalidad debe ser un texto válido.');
    }

    return errors;
  }
}

module.exports = Cliente;
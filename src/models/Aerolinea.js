import db from '../config/db.js';

class Aerolinea {
  constructor(data = {}) {
    this.id = data.id ?? data.id_aerolinea ?? null; 
    this.nombre = data.nombre ?? '';
    this.rif = data.rif ?? '';
    this.direccion = data.direccion ?? '';
    this.telefono = data.telefono ?? '';
    this.representante = data.representante ?? '';
  }

  static fromJSON(json = {}) {
    return new Aerolinea({
      id: json.id ?? json.id_aerolinea,
      nombre: json.nombre,
      rif: json.rif,
      direccion: json.direccion,
      telefono: json.telefono,
      representante: json.representante
    });
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      rif: this.rif,
      direccion: this.direccion,
      telefono: this.telefono,
      representante: this.representante
    };
  }

}

export default Aerolinea;

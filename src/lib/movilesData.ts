// Datos de móviles extraídos de COMBUSTIBLE 2026.xlsx (hoja Datavalidation)
export interface MovilInfo {
  marca: string;
  modelo: string;
  anio: number | null;
  consumoIdeal: number | null; // litros / 100 km
  asignacion: string;
  tipoCombustible: string;
  lugarCarga: string;
}

export const MOVILES_INFO: Record<string, MovilInfo> = {
  "OGY 250": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "MARCELO MARTINEZ", tipoCombustible: "NAFTA SUPER", lugarCarga: "MORABITO" },
  "AE990TE": { marca: "CHEVROLET", modelo: "JOY PLUS 1.4 MT JOY", anio: 2021, consumoIdeal: 7, asignacion: "COBACHO E.", tipoCombustible: "NAFTA PREMIUM", lugarCarga: "AXION" },
  "JRQ 910": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2011, consumoIdeal: 8, asignacion: "MALDONADO M.", tipoCombustible: "NAFTA SUPER", lugarCarga: "EDENRED" },
  "AE990TF": { marca: "CHEVROLET", modelo: "JOY PLUS 1.4 MT JOY", anio: 2021, consumoIdeal: 7, asignacion: "PIEDRABUENA J.", tipoCombustible: "NAFTA PREMIUM", lugarCarga: "OPESA MORON" },
  "AE990TG": { marca: "CHEVROLET", modelo: "JOY PLUS 1.4 MT JOY", anio: 2021, consumoIdeal: 7, asignacion: "FERNANDEZ M.", tipoCombustible: "NAFTA PREMIUM", lugarCarga: "OPESA MORENO" },
  "AE990TD": { marca: "CHEVROLET", modelo: "JOY PLUS 1.4 MT JOY", anio: 2021, consumoIdeal: 7, asignacion: "AUGIER ANDRES", tipoCombustible: "NAFTA PREMIUM", lugarCarga: "V/P MORABITO" },
  "AC602HP": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6 MSI", anio: 2018, consumoIdeal: 8, asignacion: "UBOLDI R.", tipoCombustible: "NAFTA SUPER", lugarCarga: "V/P AXION" },
  "LVX 589": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2012, consumoIdeal: 8, asignacion: "PARRA FABIAN", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "AE990TH": { marca: "CHEVROLET", modelo: "JOY PLUS 1.4 MT JOY", anio: 2021, consumoIdeal: 7, asignacion: "PINEDA J.", tipoCombustible: "NAFTA PREMIUM", lugarCarga: "" },
  "LTV 802": { marca: "VOLKSWAGEN", modelo: "GOL 1.4", anio: 2012, consumoIdeal: 7, asignacion: "GUTIERREZ N.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "JTC 467": { marca: "VOLKSWAGEN", modelo: "GOL 1.6", anio: 2012, consumoIdeal: 7, asignacion: "NAVAZA L.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "OGY 248": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "DUARTE N.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "LTV 805": { marca: "VOLKSWAGEN", modelo: "GOL 1.4", anio: 2012, consumoIdeal: 7, asignacion: "SOSA HECTOR", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "LVX 590": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "PELAYES M", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "LTV 803": { marca: "VOLKSWAGEN", modelo: "GOL 1.6", anio: 2012, consumoIdeal: 7, asignacion: "ROMANO O.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "LTV 804": { marca: "VOLKSWAGEN", modelo: "GOL 1.6", anio: 2012, consumoIdeal: 7, asignacion: "TRAVERSO JOSE", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "JRQ 912": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2011, consumoIdeal: 8, asignacion: "MAZZA S.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "LVX 603": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2011, consumoIdeal: 8, asignacion: "GOMEZ ROBERTO", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "HAO 651": { marca: "VOLKSWAGEN", modelo: "GOL 1.4", anio: 2012, consumoIdeal: 7, asignacion: "MANSILLA", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "AB700MT": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2017, consumoIdeal: 7, asignacion: "IBAÑEZ W.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "FGV 865": { marca: "TOYOTA", modelo: "HILUX BLANCA", anio: 2006, consumoIdeal: 10, asignacion: "CASTILLO C.", tipoCombustible: "DIESEL", lugarCarga: "" },
  "AB700MS": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2017, consumoIdeal: 7, asignacion: "LELEU J.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "LVX 588": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "DIAZ PABLO", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "OGY 247": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "BARREGO GUSTAVO", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "OGY 249": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "BENCOMO A.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "MCF 225": { marca: "TOYOTA", modelo: "HILUX BLANCA", anio: null, consumoIdeal: 10, asignacion: "FERNANDEZ R.", tipoCombustible: "DIESEL", lugarCarga: "" },
  "ECH 915": { marca: "TOYOTA", modelo: "HILUX BLANCA", anio: null, consumoIdeal: 10, asignacion: "MUÑOZ MORENO", tipoCombustible: "DIESEL", lugarCarga: "" },
  "AB700MR": { marca: "VOLKSWAGEN", modelo: "VOYAGE 1,6", anio: 2014, consumoIdeal: 8, asignacion: "ROMANO A.", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "AD508VA": { marca: "RENAULT", modelo: "LOGAN", anio: 2019, consumoIdeal: 8, asignacion: "GODOY RUBEN", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "BIDONES": { marca: "VOLKSWAGEN", modelo: "AMAROK", anio: 2012, consumoIdeal: 10, asignacion: "", tipoCombustible: "DIESEL", lugarCarga: "" },
  "HBL 504": { marca: "VOLKSWAGEN", modelo: "GOL", anio: null, consumoIdeal: 10, asignacion: "SORIA MARCELO", tipoCombustible: "NAFTA SUPER", lugarCarga: "AXION" },
  "AG809FU": { marca: "FIAT", modelo: "CRONOS", anio: 2024, consumoIdeal: null, asignacion: "", tipoCombustible: "NAFTA SUPER", lugarCarga: "" },
  "AG809FV": { marca: "FIAT", modelo: "CRONOS", anio: 2024, consumoIdeal: null, asignacion: "", tipoCombustible: "", lugarCarga: "" },
  "AG809FW": { marca: "FIAT", modelo: "CRONOS", anio: 2024, consumoIdeal: null, asignacion: "", tipoCombustible: "", lugarCarga: "" },
  "AG809FX": { marca: "FIAT", modelo: "CRONOS", anio: 2024, consumoIdeal: null, asignacion: "", tipoCombustible: "", lugarCarga: "" },
};

export const LUGARES_CARGA = [
  "MORABITO", "MORABITO HNOS", "AXION", "EDENRED", "OPESA MORON", "OPESA MORENO",
  "V/P MORABITO", "V/P AXION", "YPF", "YPF EN RUTA", "SHELL", "PUMA", "OTRO",
];

export const TIPOS_COMBUSTIBLE = ["NAFTA SUPER", "NAFTA PREMIUM", "DIESEL", "GNC"];

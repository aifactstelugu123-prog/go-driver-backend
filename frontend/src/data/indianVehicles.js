// Comprehensive Indian Vehicle Database
// Covers all major brands sold/registered in India, with models and year range

export const VEHICLE_MAKES = {
    // ── CARS / HATCHBACKS / SEDANS / SUVs ─────────────────────────────
    'Maruti Suzuki': {
        type: 'Car',
        models: {
            'Alto': ['K10', '800', 'K10B'],
            'Alto K10': [],
            'S-Presso': [],
            'Celerio': [],
            'WagonR': ['1.0', '1.2', 'Stingray'],
            'Swift': ['Dzire', 'LXI', 'VXI', 'ZXI', 'ZXI+'],
            'Swift Dzire': [],
            'Baleno': ['Alpha', 'Delta', 'Zeta', 'Sigma'],
            'Ignis': [],
            'Ciaz': [],
            'Ertiga': ['VXI', 'ZXI', 'ZXI+'],
            'XL6': [],
            'Grand Vitara': [],
            'Fronx': [],
            'Brezza': ['LXI', 'VXI', 'ZXI', 'ZXI+'],
            'Jimny': [],
            'Invicto': [],
            'Eeco': [],
            'Omni': [],
            'Gypsy': [],
        },
    },
    'Hyundai': {
        type: 'Car',
        models: {
            'i10': ['Era', 'Magna', 'Sportz', 'Asta'],
            'Grand i10 Nios': ['Era', 'Magna', 'Sportz', 'Asta'],
            'i20': ['Active', 'Era', 'Magna', 'Sportz', 'Asta', 'N Line'],
            'Aura': [],
            'Verna': ['E', 'EX', 'S', 'SX', 'SX+'],
            'Creta': ['E', 'EX', 'S', 'SX', 'SX(O)'],
            'Tucson': [],
            'Venue': ['E', 'S', 'SX', 'SX+', 'N Line'],
            'Alcazar': [],
            'Exter': [],
            'Ioniq5': [],
            'Kona Electric': [],
            'Santro': [],
        },
    },
    'Tata': {
        type: 'Car',
        models: {
            'Tiago': ['XE', 'XM', 'XT', 'XZ', 'XZ+'],
            'Tigor': ['XE', 'XM', 'XT', 'XZ', 'XZ+'],
            'Altroz': ['XE', 'XM', 'XT', 'XZ', 'XZ+', 'Dark'],
            'Nexon': ['XE', 'XM', 'XT', 'XZ', 'XZ+', 'EV'],
            'Harrier': ['XE', 'XM', 'XT', 'XZ', 'XZA'],
            'Safari': ['XE', 'XM', 'XT', 'XZ', 'XZA'],
            'Punch': ['Pure', 'Adventure', 'Accomplished', 'Creative'],
            'Curvv': [],
            'Avinya': [],
            'Nano': [],
            'Zest': [],
            'Bolt': [],
            'Indica': ['V2', 'DLS', 'DLG'],
            'Indigo': ['CS', 'eCS', 'Manza'],
            'Sumo': ['Gold', 'Spacio'],
            'Hexa': [],
            'Aria': [],
        },
    },
    'Mahindra': {
        type: 'Car',
        models: {
            'Thar': ['AX', 'LX', 'RWD', '4WD'],
            'Scorpio': ['S3', 'S5', 'S7', 'S9', 'S11'],
            'Scorpio N': ['Z2', 'Z4', 'Z6', 'Z8', 'Z8L'],
            'XUV700': ['MX', 'AX3', 'AX5', 'AX5L', 'AX7', 'AX7L'],
            'XUV300': ['W4', 'W6', 'W8', 'W8(O)'],
            'XUV400': ['EC', 'EL', 'EL Pro'],
            'Bolero': ['B4', 'B6', 'B6(O)', 'Plus'],
            'Bolero Neo': ['N4', 'N8', 'N10', 'N10(O)'],
            'KUV100': ['K2+', 'K4+', 'K6+', 'K8'],
            'TUV300': ['T4', 'T6', 'T8', 'T10'],
            'Marazzo': [],
            'Alturas G4': [],
            'Verito': [],
            'Xylo': [],
            'BE6': [],
            'XEV9e': [],
        },
    },
    'Honda': {
        type: 'Car',
        models: {
            'Amaze': ['E', 'S', 'V', 'VX'],
            'City': ['E', 'S', 'V', 'VX', 'ZX', '5th Gen', 'Hybrid'],
            'Jazz': ['S', 'V', 'VX'],
            'WR-V': ['S', 'V', 'VX'],
            'Elevate': ['SV', 'V', 'VX', 'ZX'],
            'Civic': ['V', 'VX'],
            'CR-V': [],
            'Accord': [],
            'BR-V': [],
            'Brio': [],
        },
    },
    'Toyota': {
        type: 'Car',
        models: {
            'Innova': ['G', 'V', 'GX', 'VX', 'ZX', 'Touring Sports'],
            'Innova Crysta': ['G', 'V', 'GX', 'VX', 'ZX'],
            'Innova HyCross': ['G', 'V', 'VX', 'ZX', 'GX(O)'],
            'Glanza': ['E', 'S', 'V', 'G'],
            'Hyryder': ['E', 'S', 'G', 'V', 'S-CNG'],
            'Fortuner': ['2.7 4x2', '2.8 4x2', '2.8 4x4', 'Legender'],
            'Land Cruiser': ['GR Sport', 'Standard'],
            'Camry': ['Hybrid'],
            'Vellfire': [],
            'Rumion': [],
            'Hilux': [],
            'Prius': [],
            'Corolla': [],
            'Etios': ['Liva', 'Cross', 'VD', 'VDA'],
            'Yaris': [],
        },
    },
    'Kia': {
        type: 'Car',
        models: {
            'Seltos': ['HTE', 'HTK', 'HTK+', 'HTX', 'HTX+', 'GTX', 'GTX+', 'X-Line'],
            'Sonet': ['HTE', 'HTK', 'HTK+', 'HTX', 'HTX+', 'GTX', 'GTX+', 'X-Line'],
            'Carens': ['Premium', 'Prestige', 'Prestige+', 'Luxury', 'Luxury+'],
            'EV6': ['Standard', 'GT-Line', 'GT-Line AWD'],
            'Carnival': ['Premium', 'Prestige', 'Limousine+'],
            'EV9': [],
        },
    },
    'MG': {
        type: 'Car',
        models: {
            'Hector': ['Style', 'Smart', 'Sharp', 'Savvy', 'Shine'],
            'Hector Plus': ['Style', 'Smart', 'Sharp', 'Shine Pro'],
            'Astor': ['Style', 'Smart', 'Sharp', 'Savvy', 'Shine'],
            'ZS EV': ['Excite', 'Exclusive'],
            'Comet EV': [],
            'Gloster': ['Style', 'Smart', 'Sharp', 'Savvy'],
            'Windsor': [],
            'Cyberster': [],
        },
    },
    'Volkswagen': {
        type: 'Car',
        models: {
            'Polo': ['Trendline', 'Comfortline', 'Highline', 'GT TSI'],
            'Vento': ['Trendline', 'Comfortline', 'Highline', 'GT TSI'],
            'Taigun': ['Comfortline', 'Highline', 'Topline', 'GT'],
            'Virtus': ['Dynamic', 'Comfortline', 'Highline', 'GT'],
            'Tiguan': ['Life', 'Style'],
            'Passat': [],
        },
    },
    'Skoda': {
        type: 'Car',
        models: {
            'Kushaq': ['Active', 'Ambition', 'Style'],
            'Slavia': ['Active', 'Ambition', 'Style'],
            'Octavia': ['Ambition', 'Style', 'RS'],
            'Superb': ['L&K'],
            'Kodiaq': [],
            'Karoq': [],
            'Rapid': ['Rider', 'Ambition', 'Style'],
            'Fabia': [],
        },
    },
    'Renault': {
        type: 'Car',
        models: {
            'Kwid': ['RXE', 'RXL', 'RXT', 'RXZ', 'CLIMBER', 'RACER'],
            'Triber': ['RXE', 'RXL', 'RXZ'],
            'Kiger': ['RXE', 'RXL', 'RXT', 'RXZ'],
            'Duster': ['RxE', 'RxL', 'RxS', 'RxZ', 'Adventure'],
            'Lodgy': ['Stepway'],
        },
    },
    'Nissan': {
        type: 'Car',
        models: {
            'Magnite': ['XE', 'XL', 'XV', 'XV Premium', 'XV Premium(O)', 'Turbo'],
            'Kicks': ['XL', 'XV'],
            'Terrano': ['XE', 'XV', 'XV Premium'],
            'Micra': [],
            'Sunny': [],
            'GT-R': [],
        },
    },
    'Ford': {
        type: 'Car',
        models: {
            'Figo': ['Ambiente', 'Trend', 'Titanium'],
            'Aspire': ['Ambiente', 'Trend', 'Titanium', 'Titanium+'],
            'EcoSport': ['Ambiente', 'Trend', 'Titanium', 'S'],
            'Endeavour': ['Trend', 'Titanium', 'Sport'],
            'Freestyle': ['Ambiente', 'Trend', 'Titanium'],
            'Mustang': ['GT', 'Mach-E'],
        },
    },
    'Jeep': {
        type: 'Car',
        models: {
            'Compass': ['Sport', 'Longitude', 'Limited', 'Meridian'],
            'Meridian': ['Limited', 'Limited (O)', 'Overland'],
            'Wrangler': ['Unlimited'],
            'Grand Cherokee': ['Limited', 'Overland', 'Summit'],
        },
    },
    'BMW': {
        type: 'Car',
        models: {
            '3 Series': ['330i', '320i', '318i', 'M340i'],
            '5 Series': ['530i', '520d', '540i', 'M550i'],
            '7 Series': ['740Li', '750Li', 'M760Li'],
            'X1': ['sDrive20i', 'xDrive20d'],
            'X3': ['xDrive20d', 'xDrive30i'],
            'X5': ['xDrive30d', 'xDrive40i', 'M50i'],
            'X7': ['xDrive30d', 'xDrive40i'],
            'iX': ['xDrive40', 'xDrive50'],
            'i4': ['eDrive40', 'M50'],
            'M3': [], 'M5': [],
        },
    },
    'Mercedes-Benz': {
        type: 'Car',
        models: {
            'C-Class': ['C180', 'C200', 'C220d', 'C300', 'AMG C43'],
            'E-Class': ['E200', 'E220d', 'E350d', 'AMG E53'],
            'S-Class': ['S350d', 'S400d', 'S450', 'AMG S63'],
            'GLA': ['200', '220d', 'AMG GLA35'],
            'GLB': ['200', '220d'],
            'GLC': ['220d', '300', 'AMG GLC43'],
            'GLE': ['300d', '400d', 'AMG GLE53'],
            'GLS': ['400d', '450', 'AMG GLS63'],
            'EQB': [], 'EQC': [], 'EQS': [],
            'A-Class': ['A180d'],
        },
    },
    'Audi': {
        type: 'Car',
        models: {
            'A4': ['35 TDI', '40 TFSI', '45 TFSI'],
            'A6': ['40 TDI', '45 TFSI'],
            'Q3': ['35 TDI', '40 TFSI'],
            'Q5': ['40 TDI', '40 TFSI'],
            'Q7': ['45 TFSI', '55 TFSI'],
            'Q8': ['55 TFSI'], 'e-tron': ['50', '55'],
            'Q2': [], 'RS7': [], 'R8': [],
        },
    },
    'Citroen': {
        type: 'Car',
        models: {
            'C3': ['Live', 'Feel', 'Shine'],
            'C3 Aircross': ['Feel', 'Shine'],
            'C5 Aircross': ['Feel', 'Shine'],
            'eC3': ['Feel', 'Shine'],
        },
    },
    // ── MINI TRUCKS / COMMERCIAL ──────────────────────────────────
    'Tata (Commercial)': {
        type: 'Mini Truck',
        models: {
            'Ace': ['Gold', 'HT', 'EV'],
            'Super Ace': ['Mint', 'HT'],
            'Intra': ['V10', 'V20', 'V30', 'V50'],
            'Yodha': ['2WD', '4WD'],
            'Xenon': ['KX', 'XYZ'],
            'Telcoline': [],
        },
    },
    'Mahindra (Commercial)': {
        type: 'Mini Truck',
        models: {
            'Bolero Maxi Truck': ['Plus', 'E'],
            'Bolero Pik-Up': ['1.7', '2.0', '2.5'],
            'Jeeto': ['L3', 'L4', 'L5', 'L7', 'Plus'],
            'Supro': ['Profit Truck', 'Minitruck'],
            'DI': ['750', '12', 'Turbo'],
            'Marshal': [],
        },
    },
    'Maruti Suzuki (Commercial)': {
        type: 'Mini Truck',
        models: {
            'Super Carry': ['STD', 'AC'],
        },
    },
    'Isuzu': {
        type: 'Mini Truck',
        models: {
            'D-Max': ['Regular', 'Extended', 'Space', 'Z-Prestige'],
            'V-Cross': ['4x2', '4x4'],
            'MU-X': ['3.0 4x2', '3.0 4x4'],
        },
    },
    // ── HEAVY VEHICLES / TRUCKS ────────────────────────────────────
    'Tata (Heavy)': {
        type: 'Heavy Vehicle',
        models: {
            'LPT 1109': [], 'LPT 1512': [], 'LPT 2518': [],
            'Prima 4028': [], 'Prima 5530': [],
            'Signa 2825': [], 'Signa 3525': [],
            'Ultra 814': [], 'Ultra 912': [],
            'Star Bus': ['Ultra', 'Express'],
        },
    },
    'Ashok Leyland': {
        type: 'Heavy Vehicle',
        models: {
            'Dost': ['Plus', 'Strong', 'CNG'],
            'Ecomet': ['1215', '1615', '1916'],
            'Boss': ['1315', '1615'],
            'U-Truck': ['2516', '3116', '4923'],
            'Circuit': ['EV Bus'],
            'Jan Bus': [],
        },
    },
    'BharatBenz': {
        type: 'Heavy Vehicle',
        models: {
            '1215 R': [], '1617 R': [], '2523 R': [],
            '3123 R': [], '4023 S': [],
        },
    },
    'Eicher': {
        type: 'Heavy Vehicle',
        models: {
            'Pro 2049': [], 'Pro 2059': [],
            'Pro 3015': [], 'Pro 3019': [],
            'Pro 6025': [], 'Pro 8031': [],
        },
    },
    'Force': {
        type: 'Mini Truck',
        models: {
            'Traveller': ['13', '17', '21', '26', 'School Bus', 'Ambulance'],
            'Urbania': ['12', '17'],
            'Gurkha': ['4x2', '4x4'],
            'One': [],
        },
    },
};

// Flat list of makes by vehicle type (for dropdown filtering)
export const getMakesByType = (type) =>
    Object.entries(VEHICLE_MAKES)
        .filter(([, v]) => v.type === type)
        .map(([make]) => make);

// Get models for a make
export const getModels = (make) =>
    make && VEHICLE_MAKES[make] ? Object.keys(VEHICLE_MAKES[make].models) : [];

// Get variants for make+model
export const getVariants = (make, model) =>
    make && model && VEHICLE_MAKES[make]?.models[model] ? VEHICLE_MAKES[make].models[model] : [];

// Year range 2000–current
export const YEARS = Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => 2025 - i);

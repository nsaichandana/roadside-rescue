// Verified Level 1 Trauma Centres across India
// Used as fallback when OSM returns no results
// Source: Government hospital records, AIIMS network, PIB India

export type TraumaCentre = {
    id: string;
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    phone: string;
    type: "level1" | "level2";
    capabilities: string[];
  };
  
  export const VERIFIED_TRAUMA_CENTRES: TraumaCentre[] = [
    // DELHI & NCR
    {
      id: "jpn-aiims-delhi",
      name: "JPN Apex Trauma Centre, AIIMS",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5672,
      longitude: 77.2100,
      phone: "011-26589391",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "burn_unit", "orthopaedics", "icu"],
    },
    {
      id: "safdarjung-delhi",
      name: "Safdarjung Hospital",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5687,
      longitude: 77.2060,
      phone: "011-26707444",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
    {
      id: "lnjp-delhi",
      name: "LNJP Hospital Emergency",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.6412,
      longitude: 77.2349,
      phone: "011-23232400",
      type: "level1",
      capabilities: ["emergency_surgery", "icu"],
    },
  
    // UTTARAKHAND
    {
      id: "aiims-rishikesh",
      name: "AIIMS Rishikesh Trauma Centre",
      city: "Rishikesh",
      state: "Uttarakhand",
      latitude: 30.0869,
      longitude: 78.2676,
      phone: "0135-2462940",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "icu"],
    },
  
    // PUNJAB / CHANDIGARH
    {
      id: "pgimer-chandigarh",
      name: "PGIMER Emergency & Trauma",
      city: "Chandigarh",
      state: "Punjab",
      latitude: 30.7649,
      longitude: 76.7759,
      phone: "0172-2755555",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "burn_unit", "icu"],
    },
  
    // UTTAR PRADESH
    {
      id: "kgmu-lucknow",
      name: "KGMU Trauma Centre",
      city: "Lucknow",
      state: "Uttar Pradesh",
      latitude: 26.8918,
      longitude: 80.9487,
      phone: "0522-2258888",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "orthopaedics", "icu"],
    },
  
    // BIHAR
    {
      id: "aiims-patna",
      name: "AIIMS Patna Trauma & Emergency",
      city: "Patna",
      state: "Bihar",
      latitude: 25.5580,
      longitude: 85.0722,
      phone: "0612-2451070",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  
    // RAJASTHAN
    {
      id: "sms-jaipur",
      name: "SMS Hospital Trauma Centre",
      city: "Jaipur",
      state: "Rajasthan",
      latitude: 26.9124,
      longitude: 75.8012,
      phone: "0141-2518888",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "burn_unit", "icu"],
    },
    {
      id: "aiims-jodhpur",
      name: "AIIMS Jodhpur Trauma Centre",
      city: "Jodhpur",
      state: "Rajasthan",
      latitude: 26.2389,
      longitude: 73.0243,
      phone: "0291-2740741",
      type: "level1",
      capabilities: ["emergency_surgery", "neurology", "icu"],
    },
  
    // MADHYA PRADESH
    {
      id: "aiims-bhopal",
      name: "AIIMS Bhopal Trauma Centre",
      city: "Bhopal",
      state: "Madhya Pradesh",
      latitude: 23.1988,
      longitude: 77.4304,
      phone: "0755-2960000",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  
    // GUJARAT
    {
      id: "civil-ahmedabad",
      name: "Civil Hospital Ahmedabad Emergency",
      city: "Ahmedabad",
      state: "Gujarat",
      latitude: 23.0392,
      longitude: 72.5887,
      phone: "079-22681111",
      type: "level1",
      capabilities: ["emergency_surgery", "burn_unit", "icu"],
    },
  
    // MAHARASHTRA
    {
      id: "kem-mumbai",
      name: "KEM Hospital Trauma Centre",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 18.9939,
      longitude: 72.8404,
      phone: "022-24107000",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "burn_unit", "icu"],
    },
    {
      id: "sassoon-pune",
      name: "Sassoon General Hospital Emergency",
      city: "Pune",
      state: "Maharashtra",
      latitude: 18.5236,
      longitude: 73.8478,
      phone: "020-26128000",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  
    // KARNATAKA
    {
      id: "victoria-bangalore",
      name: "Victoria Hospital Trauma Centre",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9631,
      longitude: 77.5712,
      phone: "080-26701234",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "burn_unit", "icu"],
    },
  
    // TELANGANA
    {
      id: "osmania-hyderabad",
      name: "Osmania General Hospital Trauma",
      city: "Hyderabad",
      state: "Telangana",
      latitude: 17.3822,
      longitude: 78.4772,
      phone: "040-24600124",
      type: "level1",
      capabilities: ["emergency_surgery", "neurology", "icu"],
    },
    {
      id: "nims-hyderabad",
      name: "NIMS Hospital Emergency",
      city: "Hyderabad",
      state: "Telangana",
      latitude: 17.4065,
      longitude: 78.4691,
      phone: "040-23489000",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "icu"],
    },
  
    // ANDHRA PRADESH
    {
      id: "gggh-vijayawada",
      name: "Government General Hospital Vijayawada",
      city: "Vijayawada",
      state: "Andhra Pradesh",
      latitude: 16.5062,
      longitude: 80.6480,
      phone: "0866-2430099",
      type: "level1",
      capabilities: ["emergency_surgery", "icu"],
    },
  
    // TAMIL NADU
    {
      id: "ggh-chennai",
      name: "Government General Hospital Chennai",
      city: "Chennai",
      state: "Tamil Nadu",
      latitude: 13.0819,
      longitude: 80.2785,
      phone: "044-25305000",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "burn_unit", "icu"],
    },
    {
      id: "iitm-madras-hospital",
      name: "Stanley Medical College Hospital",
      city: "Chennai",
      state: "Tamil Nadu",
      latitude: 13.1067,
      longitude: 80.2884,
      phone: "044-25281440",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  
    // KERALA
    {
      id: "gmck-kozhikode",
      name: "Government Medical College Kozhikode",
      city: "Kozhikode",
      state: "Kerala",
      latitude: 11.2588,
      longitude: 75.7804,
      phone: "0495-2350216",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
    {
      id: "gmct-thiruvananthapuram",
      name: "Government Medical College Thiruvananthapuram",
      city: "Thiruvananthapuram",
      state: "Kerala",
      latitude: 8.5241,
      longitude: 76.9366,
      phone: "0471-2528386",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "icu"],
    },
  
    // WEST BENGAL
    {
      id: "sskm-kolkata",
      name: "SSKM Hospital Trauma Centre",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5362,
      longitude: 88.3391,
      phone: "033-22041739",
      type: "level1",
      capabilities: ["neurology", "emergency_surgery", "icu"],
    },
  
    // ODISHA
    {
      id: "aiims-bhubaneswar",
      name: "AIIMS Bhubaneswar Trauma Centre",
      city: "Bhubaneswar",
      state: "Odisha",
      latitude: 20.2411,
      longitude: 85.8144,
      phone: "0674-2476789",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  
    // CHHATTISGARH
    {
      id: "aiims-raipur",
      name: "AIIMS Raipur Trauma Centre",
      city: "Raipur",
      state: "Chhattisgarh",
      latitude: 21.2148,
      longitude: 81.6285,
      phone: "0771-2572222",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  
    // ASSAM / NORTHEAST
    {
      id: "aiims-guwahati",
      name: "AIIMS Guwahati Trauma & Emergency",
      city: "Guwahati",
      state: "Assam",
      latitude: 26.1158,
      longitude: 91.7086,
      phone: "0361-2529457",
      type: "level1",
      capabilities: ["emergency_surgery", "icu"],
    },
    {
      id: "gmch-guwahati",
      name: "Gauhati Medical College Hospital",
      city: "Guwahati",
      state: "Assam",
      latitude: 26.1433,
      longitude: 91.7362,
      phone: "0361-2529457",
      type: "level1",
      capabilities: ["emergency_surgery", "orthopaedics", "icu"],
    },
  ];
  
  // ─── Haversine Distance ───────────────────────────────────────────────────────
  
  function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  // ─── Find Nearest Trauma Centre ───────────────────────────────────────────────
  
  export function findNearestTraumaCentre(
    userLat: number,
    userLon: number,
    capability?: string
  ): (TraumaCentre & { distance: number }) | null {
    let centres = VERIFIED_TRAUMA_CENTRES;
  
    if (capability) {
      const filtered = centres.filter((c) => c.capabilities.includes(capability));
      if (filtered.length > 0) centres = filtered;
    }
  
    const withDistance = centres.map((c) => ({
      ...c,
      distance: Math.round(haversineDistance(userLat, userLon, c.latitude, c.longitude) * 10) / 10,
    }));
  
    return withDistance.sort((a, b) => a.distance - b.distance)[0];
  }
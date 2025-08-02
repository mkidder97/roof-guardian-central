import { supabase } from "@/integrations/supabase/client";

// Professional deficiency categories and descriptions
export const DEFICIENCY_CATEGORIES = [
  'Perimeter Flashing',
  'Curb Flashing', 
  'Penetration',
  'Roof Top Equipment',
  'Gutters/Downspouts',
  'Roofing Drains',
  'Scuppers',
  'Debris',
  'Membrane Failures',
  'General Wear',
  'Structural Issues'
];

// Realistic deficiency templates
const DEFICIENCY_TEMPLATES = {
  'Membrane Failures': [
    {
      description: 'Multiple membrane splits observed along main roof area, approximately 8-12 linear feet total. Splits appear to be stress-related with some areas showing UV degradation.',
      severity: 'high' as const,
      budgetRange: [8000, 15000],
      locations: ['Main Roof Area', 'North Section', 'East Wing', 'Central Bay']
    },
    {
      description: 'Minor membrane bubbling and blistering in scattered locations. Areas show potential moisture intrusion beneath membrane.',
      severity: 'medium' as const,
      budgetRange: [3000, 6000],
      locations: ['Southwest Corner', 'Equipment Area', 'Perimeter Zone']
    }
  ],
  'Perimeter Flashing': [
    {
      description: 'Perimeter flashing shows signs of separation from substrate with gaps up to 1/2 inch observed. Sealant failure along multiple joints.',
      severity: 'high' as const,
      budgetRange: [5000, 10000],
      locations: ['North Perimeter', 'East Wall', 'West Elevation', 'Parapet Wall']
    },
    {
      description: 'Minor flashing corrosion and loose fasteners noted. Preventative maintenance recommended to avoid future issues.',
      severity: 'medium' as const,
      budgetRange: [1500, 3000],
      locations: ['South Wall', 'Equipment Curb', 'Drain Area']
    }
  ],
  'Penetration': [
    {
      description: 'Roof penetrations lack proper flashing and waterproofing. Multiple HVAC penetrations show signs of water intrusion.',
      severity: 'high' as const,
      budgetRange: [4000, 8000],
      locations: ['HVAC Unit #1', 'HVAC Unit #2', 'Electrical Conduit', 'Vent Penetration']
    }
  ],
  'Debris': [
    {
      description: 'Excessive debris accumulation blocking drainage systems. Organic matter and construction debris present throughout roof area.',
      severity: 'low' as const,
      budgetRange: [500, 1200],
      locations: ['Drain Areas', 'Low Slope Sections', 'Equipment Areas', 'Perimeter Zones']
    }
  ],
  'Curb Flashing': [
    {
      description: 'Equipment curb flashing shows deterioration with loose fasteners and sealant failure. Potential for water intrusion around equipment.',
      severity: 'medium' as const,
      budgetRange: [2500, 5000],
      locations: ['HVAC Curb #1', 'HVAC Curb #2', 'Exhaust Fan Curb']
    }
  ]
};

// Roof system configurations
const ROOF_SYSTEMS = {
  'TPO (45mil)': {
    description: 'Single-ply thermoplastic polyolefin membrane system with fully adhered installation over polyisocyanurate insulation.',
    layers: [
      { layer: 'Membrane', material: 'TPO 45mil', thickness: '45 mil', attachment: 'Fully Adhered' },
      { layer: 'Insulation', material: 'Polyisocyanurate', thickness: '3 inches', attachment: 'Mechanical Fasteners' },
      { layer: 'Cover Board', material: 'DensDeck', thickness: '1/2 inch', attachment: 'Mechanical Fasteners' },
      { layer: 'Vapor Barrier', material: 'SBS Modified', thickness: '40 mil', attachment: 'Hot Applied' },
      { layer: 'Substrate', material: 'Metal Deck', thickness: '22 gauge', attachment: 'Welded to Structure' }
    ]
  },
  'Modified Bitumen': {
    description: 'Two-ply modified bitumen system with granule surface cap sheet over smooth base sheet.',
    layers: [
      { layer: 'Cap Sheet', material: 'SBS Granule Surface', thickness: '180 mil', attachment: 'Hot Applied' },
      { layer: 'Base Sheet', material: 'SBS Smooth', thickness: '160 mil', attachment: 'Hot Applied' },
      { layer: 'Insulation', material: 'Polyisocyanurate', thickness: '2.6 inches', attachment: 'Mechanical Fasteners' },
      { layer: 'Vapor Barrier', material: 'SBS Modified', thickness: '40 mil', attachment: 'Hot Applied' },
      { layer: 'Substrate', material: 'Metal Deck', thickness: '22 gauge', attachment: 'Welded to Structure' }
    ]
  },
  'EPDM': {
    description: 'Single-ply ethylene propylene diene monomer rubber membrane system with ballasted installation.',
    layers: [
      { layer: 'Membrane', material: 'EPDM 60mil', thickness: '60 mil', attachment: 'Ballasted' },
      { layer: 'Separator', material: 'Geotextile', thickness: '8 oz', attachment: 'Loose Laid' },
      { layer: 'Insulation', material: 'Expanded Polystyrene', thickness: '4 inches', attachment: 'Loose Laid' },
      { layer: 'Vapor Barrier', material: 'Polyethylene', thickness: '6 mil', attachment: 'Loose Laid' },
      { layer: 'Substrate', material: 'Concrete Deck', thickness: '6 inches', attachment: 'Structural' }
    ]
  }
};

// Professional inspection notes templates
const INSPECTION_NOTES = [
  "Weather conditions were favorable for inspection with clear skies and minimal wind. Full roof access was achieved via ladder access points. Comprehensive visual inspection conducted of all roof areas, penetrations, and drainage systems.",
  "Inspection performed under clear conditions with good visibility. All safety protocols followed with proper fall protection equipment. Detailed assessment of membrane condition, flashing systems, and equipment installations completed.",
  "Annual inspection conducted with focus on preventative maintenance opportunities. Overall roof system performance evaluated against manufacturer specifications and industry standards. Recommendations prioritized by urgency and budget impact."
];

// Realistic checklist response patterns
const CHECKLIST_PATTERNS = {
  conservative: { // Lower deficiency scenario
    standingWater: false,
    roofAssemblyFailure: false,
    preventativeRepairsCompleted: true,
    squareFootageConfirmed: true,
    hasSolar: false,
    hasDaylighting: false,
    safetyPositiveRate: 0.9,
    maintenancePositiveRate: 0.8,
    waterManagementPositiveRate: 0.85
  },
  moderate: { // Typical inspection scenario
    standingWater: false,
    roofAssemblyFailure: false,
    preventativeRepairsCompleted: false,
    squareFootageConfirmed: true,
    hasSolar: Math.random() > 0.7,
    hasDaylighting: Math.random() > 0.6,
    safetyPositiveRate: 0.7,
    maintenancePositiveRate: 0.6,
    waterManagementPositiveRate: 0.7
  },
  problematic: { // Higher deficiency scenario
    standingWater: true,
    roofAssemblyFailure: false,
    preventativeRepairsCompleted: false,
    squareFootageConfirmed: true,
    hasSolar: false,
    hasDaylighting: true,
    safetyPositiveRate: 0.5,
    maintenancePositiveRate: 0.4,
    waterManagementPositiveRate: 0.3
  }
};

interface TestInspectionData {
  property: any;
  roofCompositionData: any;
  checklistData: any;
  deficiencies: any[];
  overviewPhotos: any[];
  inspectionNotes: string;
  capitalExpenses: any[];
}

/**
 * Selects the first property from the database (3535 Commerce Ctr.) for testing
 */
export async function selectFirstProperty() {
  try {
    const { data: properties, error } = await supabase
      .from('roofs')
      .select('*')
      .eq('is_deleted', false)
      .not('property_name', 'is', null)
      .order('property_name')
      .limit(1);
    
    if (error) throw error;
    
    if (!properties || properties.length === 0) {
      throw new Error('No properties found in database');
    }
    
    const selectedProperty = properties[0];
    console.log(`Selected first property for testing: ${selectedProperty.property_name}`);
    
    return selectedProperty;
  } catch (error) {
    console.error('Error selecting first property:', error);
    throw error;
  }
}

/**
 * Selects a random property from the database
 */
export async function selectRandomProperty() {
  try {
    const { data: properties, error } = await supabase
      .from('roofs')
      .select('*')
      .eq('is_deleted', false)
      .not('property_name', 'is', null)
      .limit(288);
    
    if (error) throw error;
    
    if (!properties || properties.length === 0) {
      throw new Error('No properties found in database');
    }
    
    // Select random property
    const randomIndex = Math.floor(Math.random() * properties.length);
    const selectedProperty = properties[randomIndex];
    
    console.log(`Selected random property: ${selectedProperty.property_name} (${randomIndex + 1}/${properties.length})`);
    
    return selectedProperty;
  } catch (error) {
    console.error('Error selecting random property:', error);
    throw error;
  }
}

/**
 * Generates realistic roof composition data
 */
export function generateRoofComposition(property: any) {
  const roofSystemKeys = Object.keys(ROOF_SYSTEMS);
  const randomSystem = roofSystemKeys[Math.floor(Math.random() * roofSystemKeys.length)];
  const systemConfig = ROOF_SYSTEMS[randomSystem as keyof typeof ROOF_SYSTEMS];
  
  // Installation year based on property data or random
  const installationYear = property.install_year || (2008 + Math.floor(Math.random() * 11)); // 2008-2018
  
  return {
    roofSystem: randomSystem,
    systemDescription: systemConfig.description,
    installationYear,
    layers: systemConfig.layers.map((layer, index) => ({
      id: `layer-${index}`,
      ...layer
    })),
    hasRecover: Math.random() > 0.7, // 30% chance of recover system
    totalThickness: systemConfig.layers.reduce((total, layer) => {
      const thickness = parseFloat(layer.thickness);
      return total + (isNaN(thickness) ? 0 : thickness);
    }, 0)
  };
}

/**
 * Generates realistic deficiencies based on roof age and system type
 */
export function generateDeficiencies(roofAge: number, roofSystem: string, pattern: keyof typeof CHECKLIST_PATTERNS = 'moderate') {
  const deficiencies = [];
  const currentYear = new Date().getFullYear();
  const age = currentYear - roofAge;
  
  // Determine number of deficiencies based on age and pattern
  let deficiencyCount = 2;
  if (pattern === 'conservative') deficiencyCount = 1 + Math.floor(Math.random() * 2); // 1-2
  if (pattern === 'moderate') deficiencyCount = 2 + Math.floor(Math.random() * 2); // 2-3
  if (pattern === 'problematic') deficiencyCount = 3 + Math.floor(Math.random() * 2); // 3-4
  
  // Adjust for roof age
  if (age > 15) deficiencyCount += 1;
  if (age > 20) deficiencyCount += 1;
  
  const availableCategories = Object.keys(DEFICIENCY_TEMPLATES);
  const selectedCategories = [];
  
  // Select random categories
  for (let i = 0; i < deficiencyCount && i < availableCategories.length; i++) {
    let category;
    do {
      category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    } while (selectedCategories.includes(category));
    selectedCategories.push(category);
  }
  
  // Generate deficiencies for selected categories
  selectedCategories.forEach((category, index) => {
    const templates = DEFICIENCY_TEMPLATES[category as keyof typeof DEFICIENCY_TEMPLATES];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const location = template.locations[Math.floor(Math.random() * template.locations.length)];
    const budgetAmount = template.budgetRange[0] + Math.floor(Math.random() * (template.budgetRange[1] - template.budgetRange[0]));
    
    deficiencies.push({
      id: `deficiency-${index + 1}`,
      type: category,
      category,
      location,
      description: template.description,
      severity: template.severity,
      estimatedBudget: budgetAmount,
      budgetAmount,
      photos: [], // Photos would be generated separately
      status: 'identified',
      priority: template.severity === 'high' ? 1 : template.severity === 'medium' ? 2 : 3,
      recommendedAction: `Address ${category.toLowerCase()} issues during next maintenance cycle`,
      notes: `Identified during routine inspection - ${location}`
    });
  });
  
  return deficiencies;
}

/**
 * Generates complete checklist responses
 */
export function generateChecklistData(deficiencies: any[], pattern: keyof typeof CHECKLIST_PATTERNS = 'moderate') {
  const config = CHECKLIST_PATTERNS[pattern];
  
  // Generate responses based on pattern and deficiencies
  const hasWaterIssues = deficiencies.some(d => d.category.includes('Drain') || d.category.includes('Gutters'));
  const hasFlashingIssues = deficiencies.some(d => d.category.includes('Flashing'));
  const hasMembraneIssues = deficiencies.some(d => d.category.includes('Membrane'));
  
  return {
    budgetYear: 2025,
    standingWater: config.standingWater || hasWaterIssues ? 'YES' : 'NO',
    roofAssemblyFailure: config.roofAssemblyFailure || hasMembraneIssues ? 'YES' : 'NO',
    preventativeRepairsCompleted: config.preventativeRepairsCompleted ? 'YES' : 'NO',
    squareFootageConfirmed: config.squareFootageConfirmed ? 'YES' : 'NO',
    hasSolar: config.hasSolar ? 'YES' : 'NO',
    hasDaylighting: config.hasDaylighting ? 'YES' : 'NO',
    daylightFactor: config.hasDaylighting ? Math.floor(Math.random() * 25) + 5 : 0, // 5-30%
    
    // Detailed checklist responses (would include full checklist in real implementation)
    checklist: [
      {
        id: 'budget-1',
        category: 'Budget & Planning',
        question: 'Select Inspection Budget Year',
        response: 'YES' as const,
        notes: '2025 budget year selected'
      },
      {
        id: 'water-1',
        category: 'Water Management',
        question: 'Is there standing water on the roof?',
        response: config.standingWater ? 'YES' : 'NO',
        notes: config.standingWater ? 'Standing water observed in low areas' : 'No standing water observed'
      },
      {
        id: 'water-2',
        category: 'Water Management',
        question: 'Are all drains, scuppers, and gutters clear of debris?',
        response: Math.random() > config.waterManagementPositiveRate ? 'NO' : 'YES',
        notes: 'Drainage systems inspected for blockages'
      },
      {
        id: 'assembly-1',
        category: 'Roof Assembly',
        question: 'Is there roof assembly failure?',
        response: config.roofAssemblyFailure ? 'YES' : 'NO',
        notes: config.roofAssemblyFailure ? 'Assembly issues identified' : 'No structural assembly failure observed'
      },
      {
        id: 'maintenance-1',
        category: 'Maintenance',
        question: 'Were last year\'s preventative repairs completed?',
        response: config.preventativeRepairsCompleted ? 'YES' : 'NO',
        notes: config.preventativeRepairsCompleted ? 'Previous repairs completed satisfactorily' : 'Some preventative items remain incomplete'
      },
      {
        id: 'safety-1',
        category: 'Safety',
        question: 'Are there any immediate safety concerns?',
        response: Math.random() > config.safetyPositiveRate ? 'YES' : 'NO',
        notes: 'Safety assessment completed per OSHA guidelines'
      }
    ],
    completionPercentage: 100
  };
}

/**
 * Generates mock overview photos
 */
export function generateOverviewPhotos(propertyId: string) {
  const photoDescriptions = [
    'Overall roof view from main access point showing general membrane condition',
    'North section overview displaying perimeter flashing and equipment placement',
    'Drainage system documentation showing primary roof drains and scuppers',
    'Equipment area overview with HVAC units and associated penetrations',
    'Perimeter view showing flashing details and membrane terminations'
  ];
  
  const photoCount = 3 + Math.floor(Math.random() * 3); // 3-5 photos
  const photos = [];
  
  for (let i = 0; i < photoCount; i++) {
    const description = photoDescriptions[i % photoDescriptions.length];
    photos.push({
      id: `photo-${i + 1}`,
      url: `https://placehold.co/800x600/e5e5e5/666666?text=Overview+Photo+${i + 1}`,
      file: null, // Mock file object
      type: 'overview' as const,
      location: `Area ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
      timestamp: new Date(),
      description,
      filename: `overview_${propertyId}_${i + 1}.jpg`,
      metadata: {
        latitude: 32.7767 + (Math.random() - 0.5) * 0.01,
        longitude: -96.7970 + (Math.random() - 0.5) * 0.01,
        timestamp: Date.now(),
        deviceOrientation: 'landscape',
        weather: { temperature: 72, conditions: 'Clear' }
      }
    });
  }
  
  return photos;
}

/**
 * Creates a complete test inspection using the first property
 */
export async function createTestInspection(): Promise<TestInspectionData> {
  try {
    console.log('🎯 Creating test inspection for first property...');
    
    // Step 1: Select first property (3535 Commerce Ctr.)
    const property = await selectFirstProperty();
    console.log(`📍 Selected property: ${property.property_name}`);
    
    // Step 2: Generate roof composition
    const roofCompositionData = generateRoofComposition(property);
    console.log(`🏗️ Generated roof composition: ${roofCompositionData.roofSystem}`);
    
    // Step 3: Determine inspection pattern based on roof age
    const currentYear = new Date().getFullYear();
    const roofAge = currentYear - roofCompositionData.installationYear;
    let pattern: keyof typeof CHECKLIST_PATTERNS = 'moderate';
    
    if (roofAge < 8) pattern = 'conservative';
    else if (roofAge > 18) pattern = 'problematic';
    
    console.log(`📊 Using inspection pattern: ${pattern} (roof age: ${roofAge} years)`);
    
    // Step 4: Generate deficiencies
    const deficiencies = generateDeficiencies(roofCompositionData.installationYear, roofCompositionData.roofSystem, pattern);
    console.log(`⚠️ Generated ${deficiencies.length} deficiencies`);
    
    // Step 5: Generate checklist data
    const checklistData = generateChecklistData(deficiencies, pattern);
    console.log(`✅ Generated checklist with ${checklistData.checklist.length} responses`);
    
    // Step 6: Generate overview photos
    const overviewPhotos = generateOverviewPhotos(property.id);
    console.log(`📸 Generated ${overviewPhotos.length} overview photos`);
    
    // Step 7: Generate inspection notes
    const inspectionNotes = INSPECTION_NOTES[Math.floor(Math.random() * INSPECTION_NOTES.length)];
    
    // Step 8: Generate capital expenses (optional)
    const capitalExpenses: any[] = [];
    if (deficiencies.some(d => d.severity === 'high') || roofAge > 15) {
      capitalExpenses.push({
        id: 'capex-1',
        description: 'Roof membrane replacement - major sections',
        year: 2026,
        estimatedCost: 150000 + Math.floor(Math.random() * 100000),
        scopeOfWork: 'Replace deteriorated membrane sections and upgrade insulation as needed',
        completed: false
      });
    }
    
    const testData: TestInspectionData = {
      property,
      roofCompositionData,
      checklistData,
      deficiencies,
      overviewPhotos,
      inspectionNotes,
      capitalExpenses
    };
    
    console.log('🎉 Test inspection data generated successfully!');
    return testData;
    
  } catch (error) {
    console.error('❌ Error creating test inspection:', error);
    throw error;
  }
}

/**
 * Stores the test inspection in the database
 */
export async function storeTestInspection(testData: TestInspectionData, inspectorId: string) {
  try {
    console.log('💾 Storing test inspection in database...');
    
    // Create inspection record
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .insert({
        roof_id: testData.property.id,
        inspector_id: inspectorId,
        status: 'in_progress',
        inspection_type: 'annual',
        scheduled_date: new Date().toISOString(),
        weather_conditions: 'Clear',
        notes: testData.inspectionNotes
      })
      .select()
      .single();
    
    if (inspectionError) throw inspectionError;
    
    // Create inspection session with complete data
    const sessionData = {
      roofComposition: testData.roofCompositionData,
      checklist: testData.checklistData,
      deficiencies: testData.deficiencies,
      overviewPhotos: testData.overviewPhotos,
      inspectionNotes: testData.inspectionNotes,
      capitalExpenses: testData.capitalExpenses,
      completionStatus: {
        roofComposition: true,
        checklist: true,
        deficiencies: testData.deficiencies.length > 0,
        photos: testData.overviewPhotos.length > 0,
        notes: true,
        readyForCompletion: true
      }
    };
    
    const { error: sessionError } = await supabase
      .from('inspection_sessions')
      .insert({
        property_id: testData.property.id,
        inspector_id: inspectorId,
        status: 'active', // Use 'active' so the autosave system can find it
        session_data: sessionData,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
        last_updated: new Date().toISOString()
      });
    
    if (sessionError) throw sessionError;
    
    console.log('✅ Test inspection stored successfully!');
    console.log(`🆔 Inspection ID: ${inspection.id}`);
    console.log(`🏢 Property: ${testData.property.property_name}`);
    console.log(`📊 Deficiencies: ${testData.deficiencies.length}`);
    console.log(`📸 Photos: ${testData.overviewPhotos.length}`);
    
    return {
      inspectionId: inspection.id,
      propertyId: testData.property.id,
      propertyName: testData.property.property_name
    };
    
  } catch (error) {
    console.error('❌ Error storing test inspection:', error);
    throw error;
  }
}
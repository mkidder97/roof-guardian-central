
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExcelRow {
  [key: string]: any;
}

interface ImportResult {
  success: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
  clientsCreated: number;
  propertyManagerAssignments: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { headers, rows } = await req.json();
    
    console.log(`Processing ${rows.length} rows from Excel import`);

    const result: ImportResult = {
      success: 0,
      updated: 0,
      errors: [],
      clientsCreated: 0,
      propertyManagerAssignments: 0
    };

    // Create maps to track existing data
    const clientMap = new Map<string, string>();
    const propertyManagerMap = new Map<string, any>();
    const existingPropertiesMap = new Map<string, any>();
    
    // Get existing clients
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, company_name');
    
    if (existingClients) {
      existingClients.forEach(client => {
        clientMap.set(client.company_name.toLowerCase(), client.id);
      });
    }

    // Get existing property managers from client_contacts
    const { data: propertyManagers } = await supabase
      .from('client_contacts')
      .select('id, first_name, last_name, email, client_id')
      .eq('role', 'property_manager');

    if (propertyManagers) {
      propertyManagers.forEach(pm => {
        const fullName = `${pm.first_name} ${pm.last_name}`.toLowerCase();
        const firstName = pm.first_name.toLowerCase();
        propertyManagerMap.set(fullName, pm);
        propertyManagerMap.set(firstName, pm); // Also match by first name only
        if (pm.email) {
          propertyManagerMap.set(pm.email.toLowerCase(), pm);
        }
      });
    }

    // Get existing properties to detect duplicates
    const { data: existingProperties } = await supabase
      .from('roofs')
      .select('id, property_name, address, property_code')
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (existingProperties) {
      existingProperties.forEach(prop => {
        // Create multiple keys for matching
        const nameAddressKey = `${prop.property_name}_${prop.address}`.toLowerCase();
        if (prop.property_code) {
          existingPropertiesMap.set(prop.property_code.toLowerCase(), prop);
        }
        existingPropertiesMap.set(nameAddressKey, prop);
      });
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and we skipped header

      try {
        // Map Excel columns to our database fields
        const roofData = mapExcelRowToRoof(headers, row);
        
        if (!roofData.property_name || !roofData.address) {
          result.errors.push({
            row: rowNumber,
            error: 'Missing required fields: Property Name or Address'
          });
          continue;
        }

        // Check if property already exists
        const nameAddressKey = `${roofData.property_name}_${roofData.address}`.toLowerCase();
        const propertyCodeKey = roofData.property_code?.toLowerCase();
        
        let existingProperty = null;
        if (propertyCodeKey && existingPropertiesMap.has(propertyCodeKey)) {
          existingProperty = existingPropertiesMap.get(propertyCodeKey);
        } else if (existingPropertiesMap.has(nameAddressKey)) {
          existingProperty = existingPropertiesMap.get(nameAddressKey);
        }

        // Handle client creation/lookup
        let clientId = null;
        if (roofData.customer) {
          const customerKey = roofData.customer.toLowerCase();
          
          if (clientMap.has(customerKey)) {
            clientId = clientMap.get(customerKey);
          } else {
            // Create new client
            const { data: newClient, error: clientError } = await supabase
              .from('clients')
              .insert({
                company_name: roofData.customer,
                contact_name: roofData.site_contact,
                phone: roofData.site_contact_office_phone || roofData.site_contact_mobile_phone,
                email: roofData.site_contact_email,
                address: roofData.address,
                city: roofData.city,
                state: roofData.state,
                zip: roofData.zip
              })
              .select('id')
              .single();

            if (clientError) {
              console.error('Error creating client:', clientError);
              result.errors.push({
                row: rowNumber,
                error: `Failed to create client: ${clientError.message}`
              });
              continue;
            }

            if (newClient) {
              clientId = newClient.id;
              clientMap.set(customerKey, clientId);
              result.clientsCreated++;
            }
          }
        }

        // Enhanced property manager matching
        let propertyManagerInfo = null;
        const pmFields = ['property_manager_name', 'site_contact'];
        
        for (const field of pmFields) {
          if (roofData[field]) {
            const pmName = roofData[field].toLowerCase().trim();
            // Try exact match first
            if (propertyManagerMap.has(pmName)) {
              propertyManagerInfo = propertyManagerMap.get(pmName);
              break;
            }
            // Try partial matches
            for (const [key, pm] of propertyManagerMap.entries()) {
              if (key.includes(pmName) || pmName.includes(key)) {
                propertyManagerInfo = pm;
                break;
              }
            }
            if (propertyManagerInfo) break;
          }
        }

        // Set property manager fields if found
        if (propertyManagerInfo) {
          roofData.property_manager_name = `${propertyManagerInfo.first_name} ${propertyManagerInfo.last_name}`;
          roofData.property_manager_email = propertyManagerInfo.email;
        }

        roofData.client_id = clientId;

        if (existingProperty) {
          // UPDATE existing property
          console.log(`Updating existing property: ${roofData.property_name}`);
          
          // Filter out null/undefined values to avoid overwriting existing data with blanks
          const updateData = Object.fromEntries(
            Object.entries(roofData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
          );

          const { error: updateError } = await supabase
            .from('roofs')
            .update(updateData)
            .eq('id', existingProperty.id);

          if (updateError) {
            console.error('Error updating roof:', updateError);
            result.errors.push({
              row: rowNumber,
              error: `Failed to update roof: ${updateError.message}`
            });
          } else {
            result.updated++;
            
            // Handle property manager assignment
            if (propertyManagerInfo) {
              await handlePropertyManagerAssignment(supabase, existingProperty.id, propertyManagerInfo.id);
              result.propertyManagerAssignments++;
            }
          }
        } else {
          // INSERT new property
          console.log(`Creating new property: ${roofData.property_name}`);
          
          const { data: newRoof, error: roofError } = await supabase
            .from('roofs')
            .insert(roofData)
            .select('id')
            .single();

          if (roofError) {
            console.error('Error inserting roof:', roofError);
            result.errors.push({
              row: rowNumber,
              error: `Failed to insert roof: ${roofError.message}`
            });
          } else {
            result.success++;
            
            // Handle property manager assignment
            if (propertyManagerInfo && newRoof) {
              await handlePropertyManagerAssignment(supabase, newRoof.id, propertyManagerInfo.id);
              result.propertyManagerAssignments++;
            }

            // Create site contact if available and no property manager was matched
            if (roofData.site_contact && !propertyManagerInfo && clientId) {
              await createSiteContact(supabase, clientId, roofData);
            }
          }
        }

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Import completed: ${result.success} created, ${result.updated} updated, ${result.errors.length} errors, ${result.clientsCreated} clients created, ${result.propertyManagerAssignments} PM assignments`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handlePropertyManagerAssignment(supabase: any, roofId: string, contactId: string) {
  try {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('property_contact_assignments')
      .select('id')
      .eq('roof_id', roofId)
      .eq('contact_id', contactId)
      .eq('assignment_type', 'property_manager')
      .single();

    if (!existing) {
      // Create new assignment
      await supabase
        .from('property_contact_assignments')
        .insert({
          roof_id: roofId,
          contact_id: contactId,
          assignment_type: 'property_manager',
          is_active: true
        });
    }
  } catch (error) {
    console.error('Error handling property manager assignment:', error);
  }
}

async function createSiteContact(supabase: any, clientId: string, roofData: any) {
  try {
    if (roofData.site_contact) {
      const nameParts = roofData.site_contact.split(' ');
      const firstName = nameParts[0] || roofData.site_contact;
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: contactError } = await supabase
        .from('client_contacts')
        .insert({
          client_id: clientId,
          first_name: firstName,
          last_name: lastName,
          email: roofData.site_contact_email,
          office_phone: roofData.site_contact_office_phone,
          mobile_phone: roofData.site_contact_mobile_phone,
          role: 'site_contact',
          is_primary: true,
          is_active: true
        });

      if (contactError) {
        console.error('Error creating contact:', contactError);
      }
    }
  } catch (error) {
    console.error('Error creating site contact:', error);
  }
}

function mapExcelRowToRoof(headers: string[], row: any[]): any {
  const data: any = {};
  
  // Create a mapping object from the row
  const rowData: { [key: string]: any } = {};
  headers.forEach((header, index) => {
    if (header && row[index] !== undefined) {
      rowData[header] = row[index];
    }
  });

  // Map Excel columns to database columns
  const columnMapping: { [key: string]: string } = {
    'Customer': 'customer',
    'Region': 'region',
    'Market': 'market',
    'Roof Group': 'roof_group',
    'Porperty Code': 'property_code', // Note: keeping the typo from original schema
    'Property Code': 'property_code',
    'Property Name': 'property_name',
    'Roof Section': 'roof_section',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'Zip': 'zip',
    'Site Contact': 'site_contact',
    'Site Contact Office Phone': 'site_contact_office_phone',
    'Site Contact Mobile Phone': 'site_contact_mobile_phone',
    'Site Contact Email': 'site_contact_email',
    'Customer Sensitivity': 'customer_sensitivity',
    'Roof Access': 'roof_access',
    'Roof Access Requirements': 'roof_access_requirements',
    'Roof Access Safety Concern': 'roof_access_safety_concern',
    'Roof Access Location': 'roof_access_location',
    'Roof Area': 'roof_area',
    'Roof Area Unit': 'roof_area_unit',
    'Roof System': 'roof_system',
    'Roof System Description': 'roof_system_description',
    'Roof Category': 'roof_category',
    'Manufacturer': 'manufacturer',
    'Installing Contractor': 'installing_contractor',
    'Repair Contractor': 'repair_contractor',
    'Manufacturer Has Warranty': 'manufacturer_has_warranty',
    'Manufacturer Warranty Term': 'manufacturer_warranty_term',
    'Manufacturer Warranty Number': 'manufacturer_warranty_number',
    'Manufacturer Warranty Expiration': 'manufacturer_warranty_expiration',
    'Installer Has Warranty': 'installer_has_warranty',
    'Installer Warranty Term': 'installer_warranty_term',
    'Installer Warranty Number': 'installer_warranty_number',
    'Installer Warranty Expiration': 'installer_warranty_expiration',
    'Install Year': 'install_year',
    'Capital Budget Year': 'capital_budget_year',
    'Capital Budget Estimated': 'capital_budget_estimated',
    'Capital Budget Actual': 'capital_budget_actual',
    'Capital Budget Completed': 'capital_budget_completed',
    'Capital Budget Category': 'capital_budget_category',
    'Capital Budget ScopeOfWork': 'capital_budget_scope_of_work',
    'Preventative Budget Year': 'preventative_budget_year',
    'Preventative Budget Estimated': 'preventative_budget_estimated',
    'Preventative Budget Actual': 'preventative_budget_actual',
    'Preventative Budget Completed': 'preventative_budget_completed',
    'Preventative Budget Category': 'preventative_budget_category',
    'Preventative Budget Scope Of Work': 'preventative_budget_scope_of_work',
    'Total Leaks 12 mo': 'total_leaks_12mo',
    'Total Leak Expense 12mo': 'total_leak_expense_12mo',
    'Property Manager': 'property_manager_name',
    'Property Manager Name': 'property_manager_name',
    'Property Manager Email': 'property_manager_email',
    'Property Manager Phone': 'property_manager_phone',
    'Asset Manager': 'asset_manager_name',
    'Asset Manager Name': 'asset_manager_name',
    'Asset Manager Email': 'asset_manager_email',
    'Asset Manager Phone': 'asset_manager_phone'
  };

  // Map the data
  Object.entries(rowData).forEach(([excelColumn, value]) => {
    const dbColumn = columnMapping[excelColumn];
    if (dbColumn && value !== null && value !== undefined && value !== '') {
      // Handle specific data type conversions
      if (dbColumn === 'zip' || dbColumn === 'install_year') {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) data[dbColumn] = numValue;
      } else if (dbColumn === 'roof_area' || dbColumn.includes('budget_estimated') || dbColumn.includes('budget_year')) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) data[dbColumn] = numValue;
      } else if (dbColumn.includes('warranty_expiration')) {
        // Handle date conversion
        if (value instanceof Date) {
          data[dbColumn] = value.toISOString().split('T')[0];
        } else if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            data[dbColumn] = date.toISOString().split('T')[0];
          }
        }
      } else if (dbColumn.includes('has_warranty')) {
        // Convert to boolean
        data[dbColumn] = value === 'Yes' || value === 'yes' || value === 'TRUE' || value === true || value === 1;
      } else {
        data[dbColumn] = String(value);
      }
    }
  });

  // Set default roof type if not provided
  if (!data.roof_type && data.roof_system) {
    data.roof_type = data.roof_system;
  }

  // Set default status
  if (!data.status) {
    data.status = 'active';
  }

  return data;
}

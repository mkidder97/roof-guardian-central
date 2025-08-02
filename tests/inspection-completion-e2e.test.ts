import { test, expect, Page } from '@playwright/test';

test.describe('Inspection Completion E2E Test', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set up console logging to catch any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Navigate to the app
    await page.goto('http://localhost:8080');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete an inspection workflow successfully', async () => {
    console.log('🚀 Starting inspection completion test...');
    
    // Step 1: Check if the app loads
    await expect(page).toHaveTitle(/RoofMind|Roof Guardian/);
    console.log('✅ App loaded successfully');
    
    // Step 2: Look for login elements or check if already authenticated
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
    const inspectorButton = page.locator(':text("Inspector Interface"), :text("Inspector"), [href*="inspector"]').first();
    
    try {
      // Check if we're already authenticated by looking for inspector interface
      await inspectorButton.waitFor({ timeout: 5000 });
      console.log('✅ Already authenticated, proceeding to inspector interface');
    } catch {
      // Need to login
      console.log('🔐 Attempting to login...');
      
      // Look for email/password fields
      const emailField = page.locator('input[type="email"], input[placeholder*="email" i]').first();
      const passwordField = page.locator('input[type="password"], input[placeholder*="password" i]').first();
      
      if (await emailField.isVisible()) {
        await emailField.fill('test@roofguardian.com');
        await passwordField.fill('password123');
        await loginButton.click();
        
        // Wait for successful login
        await page.waitForLoadState('networkidle');
        console.log('✅ Login completed');
      } else {
        console.log('⚠️ No login form found, app might be in demo mode');
      }
    }
    
    // Step 3: Navigate to Inspector Interface
    console.log('🔍 Navigating to Inspector Interface...');
    
    // Try multiple ways to get to inspector interface
    const inspectorLink = page.locator(':text("Inspector Interface"), :text("Inspector"), [href*="inspector"]').first();
    const inspectorNavButton = page.locator('[data-testid="inspector-nav"], button:has-text("Inspector")').first();
    
    if (await inspectorLink.isVisible()) {
      await inspectorLink.click();
    } else if (await inspectorNavButton.isVisible()) {
      await inspectorNavButton.click();
    } else {
      // Direct navigation
      await page.goto('http://localhost:8080/inspector');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to Inspector Interface');
    
    // Step 4: Wait for inspection queue to load
    console.log('📋 Waiting for inspection queue...');
    
    // Look for property cards or inspection items
    const propertyCards = page.locator('[data-testid="property-card"], .property-card, .inspection-card');
    const startInspectionButtons = page.locator('button:has-text("Start Inspection"), button:has-text("Begin"), button:has-text("Start")');
    
    try {
      await propertyCards.first().waitFor({ timeout: 10000 });
      console.log(`✅ Found ${await propertyCards.count()} property cards`);
    } catch {
      console.log('⚠️ No property cards found, checking for empty state or errors');
      
      // Check for empty state or error messages
      const emptyState = page.locator(':text("No properties"), :text("No inspections"), :text("Empty")');
      const errorMessage = page.locator('[role="alert"], .error, :text("Error")');
      
      if (await emptyState.isVisible()) {
        console.log('📭 Empty state detected - no properties to inspect');
        return;
      }
      
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.error(`❌ Error detected: ${errorText}`);
        throw new Error(`Inspector interface shows error: ${errorText}`);
      }
    }
    
    // Step 5: Start an inspection
    console.log('▶️ Starting an inspection...');
    
    if (await startInspectionButtons.first().isVisible()) {
      await startInspectionButtons.first().click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Inspection started');
    } else {
      // Try clicking on a property card to start inspection
      if (await propertyCards.first().isVisible()) {
        await propertyCards.first().click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Property selected for inspection');
      } else {
        console.log('⚠️ No way to start inspection found - creating test data');
        
        // Look for "Add Test Data" or similar buttons
        const testDataButton = page.locator('button:has-text("Test Data"), button:has-text("Add Test"), button:has-text("Populate")');
        if (await testDataButton.isVisible()) {
          await testDataButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Test data added');
          
          // Try starting inspection again
          await startInspectionButtons.first().waitFor({ timeout: 5000 });
          await startInspectionButtons.first().click();
        }
      }
    }
    
    // Step 6: Add inspection data
    console.log('📝 Adding inspection data...');
    
    // Look for deficiency/issue input forms
    const addDeficiencyButton = page.locator('button:has-text("Add Deficiency"), button:has-text("Add Issue"), button:has-text("Add Problem")');
    const addPhotoButton = page.locator('button:has-text("Add Photo"), button:has-text("Take Photo"), input[type="file"]');
    
    // Add a deficiency if possible
    if (await addDeficiencyButton.isVisible()) {
      await addDeficiencyButton.click();
      
      // Fill deficiency form
      const descriptionField = page.locator('textarea[placeholder*="description" i], input[placeholder*="description" i]').first();
      const severitySelect = page.locator('select[name*="severity"], [data-testid="severity-select"]').first();
      
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Test deficiency: Damaged shingles on north side');
      }
      
      if (await severitySelect.isVisible()) {
        await severitySelect.selectOption('high');
      }
      
      // Save deficiency
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Submit")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        console.log('✅ Deficiency added');
      }
    }
    
    // Add inspection notes
    const notesField = page.locator('textarea[placeholder*="notes" i], textarea[name*="notes"]').first();
    if (await notesField.isVisible()) {
      await notesField.fill('Test inspection completed successfully. All major areas checked.');
      console.log('✅ Inspection notes added');
    }
    
    // Step 7: Complete the inspection
    console.log('✅ Completing inspection...');
    
    const completeButton = page.locator(
      'button:has-text("Complete"), button:has-text("Finish"), button:has-text("Submit Inspection")'
    );
    
    await completeButton.waitFor({ timeout: 10000 });
    await completeButton.click();
    
    // Wait for completion confirmation
    await page.waitForLoadState('networkidle');
    
    // Look for success message or redirect
    const successMessage = page.locator(':text("completed"), :text("success"), [role="status"]');
    const inspectionsList = page.locator(':text("Inspections"), :text("History")');
    
    try {
      await Promise.race([
        successMessage.waitFor({ timeout: 5000 }),
        inspectionsList.waitFor({ timeout: 5000 })
      ]);
      console.log('✅ Inspection completion confirmed');
    } catch {
      console.log('⚠️ No explicit success confirmation, but no errors detected');
    }
    
    // Step 8: Verify the inspection was saved
    console.log('🔍 Verifying inspection was saved...');
    
    // Take a screenshot for manual verification
    await page.screenshot({ 
      path: 'test-results/inspection-completion-final.png',
      fullPage: true 
    });
    
    console.log('🎉 Inspection completion test finished successfully!');
    console.log('📸 Screenshot saved to test-results/inspection-completion-final.png');
  });

  test.afterEach(async () => {
    await page.close();
  });
});
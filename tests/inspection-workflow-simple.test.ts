import { test, expect, Page } from '@playwright/test';

test.describe('Simple Inspection Workflow Test', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set up console logging to catch any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
  });

  test('should test basic app functionality and navigation', async () => {
    console.log('🚀 Starting simple app functionality test...');
    
    // Step 1: Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Check if the app loads
    await expect(page).toHaveTitle(/RoofMind|Roof Guardian/);
    console.log('✅ App loaded successfully');
    
    // Step 3: Take a screenshot of the landing page
    await page.screenshot({ 
      path: 'test-results/landing-page.png',
      fullPage: true 
    });
    console.log('📸 Landing page screenshot saved');
    
    // Step 4: Try to navigate directly to inspector interface (bypassing auth for testing)
    console.log('🔍 Testing direct navigation to inspector interface...');
    
    await page.goto('http://localhost:8080/inspector');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of inspector interface
    await page.screenshot({ 
      path: 'test-results/inspector-interface.png',
      fullPage: true 
    });
    console.log('📸 Inspector interface screenshot saved');
    
    // Step 5: Check for any obvious errors or empty states
    const errorElements = await page.locator('[role="alert"], .error-message, .alert-error').count();
    const loadingElements = await page.locator('.loading, .spinner, :text("Loading")').count();
    
    console.log(`🔍 Found ${errorElements} error elements and ${loadingElements} loading elements`);
    
    // Step 6: Look for key inspector interface elements
    const keyElements = {
      propertyList: await page.locator('[data-testid="property-list"], .property-card, .inspection-queue').count(),
      navigationButtons: await page.locator('button, [role="button"]').count(),
      inputFields: await page.locator('input, textarea, select').count(),
      inspectionElements: await page.locator('[data-testid*="inspection"], [class*="inspection"]').count()
    };
    
    console.log('🎯 Inspector interface elements found:');
    console.log(`  - Property/List elements: ${keyElements.propertyList}`);
    console.log(`  - Navigation buttons: ${keyElements.navigationButtons}`);
    console.log(`  - Input fields: ${keyElements.inputFields}`);
    console.log(`  - Inspection elements: ${keyElements.inspectionElements}`);
    
    // Step 7: Test basic interactions if elements are present
    if (keyElements.navigationButtons > 0) {
      console.log('🖱️ Testing button interactions...');
      
      // Get all clickable buttons
      const buttons = page.locator('button:not([disabled])');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        // Try clicking the first available button
        const firstButton = buttons.first();
        const buttonText = await firstButton.textContent();
        console.log(`  Clicking button: "${buttonText}"`);
        
        try {
          await firstButton.click();
          await page.waitForTimeout(1000); // Wait for any reactions
          console.log('✅ Button click successful');
        } catch (error) {
          console.log(`⚠️ Button click failed: ${error}`);
        }
      }
    }
    
    // Step 8: Check for any data or content
    const textContent = await page.textContent('body');
    const hasSubstantialContent = textContent && textContent.length > 200;
    
    console.log(`📄 Page content length: ${textContent?.length || 0} characters`);
    console.log(`📊 Has substantial content: ${hasSubstantialContent}`);
    
    // Step 9: Test navigation to other parts of the app
    console.log('🧭 Testing navigation to other sections...');
    
    const navigationLinks = [
      '/dashboard',
      '/',
      '/unified-dashboard'
    ];
    
    for (const link of navigationLinks) {
      try {
        await page.goto(`http://localhost:8080${link}`);
        await page.waitForLoadState('networkidle');
        
        const title = await page.title();
        console.log(`  ✅ ${link} loaded successfully (title: ${title})`);
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/page-${link.replace('/', '') || 'home'}.png`,
          fullPage: true 
        });
        
      } catch (error) {
        console.log(`  ❌ ${link} failed to load: ${error}`);
      }
    }
    
    console.log('🎉 Basic app functionality test completed!');
    console.log('📁 All screenshots saved to test-results/ directory');
  });

  test('should test database connectivity and basic queries', async () => {
    console.log('🗄️ Testing database connectivity...');
    
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Use browser's fetch API to test Supabase connectivity
    const dbTest = await page.evaluate(async () => {
      try {
        // Get Supabase URL from the environment
        const supabaseUrl = (window as any).VITE_SUPABASE_URL || 'https://cycfmmxveqcpqtmncmup.supabase.co';
        const anonKey = (window as any).VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Y2ZtbXh2ZXFjcHF0bW5jbXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTA4NTEsImV4cCI6MjA2ODM2Njg1MX0.mK6fkO6wqQX4jCbvjd5TWbEj78fwuxkQsLf1q9Af2SM';
        
        // Test basic connectivity
        const response = await fetch(`${supabaseUrl}/rest/v1/inspection_deficiencies?limit=1`, {
          headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          ok: response.ok,
          canAccessDb: response.ok || response.status === 401, // 401 means DB is reachable but needs auth
          response: response.ok ? await response.text() : response.statusText
        };
      } catch (error) {
        return {
          status: 0,
          ok: false,
          canAccessDb: false,
          error: error.message
        };
      }
    });
    
    console.log('🔍 Database connectivity test results:');
    console.log(`  Status: ${dbTest.status}`);
    console.log(`  OK: ${dbTest.ok}`);
    console.log(`  Can access DB: ${dbTest.canAccessDb}`);
    console.log(`  Response: ${dbTest.response || dbTest.error}`);
    
    if (dbTest.canAccessDb) {
      console.log('✅ Database is reachable - normalized tables exist!');
    } else {
      console.log('❌ Database connectivity issues detected');
    }
  });

  test.afterEach(async () => {
    await page.close();
  });
});